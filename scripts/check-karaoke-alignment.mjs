import fs from "node:fs";
import vm from "node:vm";
import { SONG_LYRICS as SONGS } from "../src/song-lyrics.js";
import { FURIGANA_CORRECTIONS, ROMAJI_CORRECTIONS } from "../src/furigana-corrections.js";

const source = fs.readFileSync(new URL("../karaoke-sources.js", import.meta.url), "utf8");
const sourceContext = { window: {} };
vm.runInNewContext(source, sourceContext, { filename: "karaoke-sources.js" });
const karaoke = sourceContext.window.KARAOKE_SOURCES;

// Provider discovery must never accept another artist, a live edit, or a
// similarly named track as the requested studio recording.
{
  const catalog = await import("../src/song-metadata.js");
  const sample = catalog.SONGS.find(song => song.id === "Matsuri");
  const calls = [];
  const context = { URL, window: {
    AbortController, setTimeout, clearTimeout,
    async fetch(rawUrl) {
      const url = new URL(rawUrl);
      calls.push(url);
      const amll = url.hostname === "api.amll.dev";
      const title = url.searchParams.get(amll ? "musicName" : "track_name");
      const candidates = title === "Matsuri" ? (amll ? [
        { id: "correct", musicNames: ["まつり"], artistNames: ["藤井風"] },
        { id: "wrong", musicNames: ["Matsuri"], artistNames: ["Another Artist"] },
      ] : [
        { id: 1, trackName: "まつり", artistName: "藤井風", syncedLyrics: "[00:01]Example" },
        { id: 2, trackName: "Matsuri Live", artistName: "Fujii Kaze", syncedLyrics: "[00:01]Example" },
        { id: 3, trackName: "Matsuri", artistName: "Another Artist", syncedLyrics: "[00:01]Example" },
        { id: 4, trackName: "Matsuri", artistName: "Fujii Kaze", instrumental: true, syncedLyrics: "[00:01]Example" },
      ]) : [];
      return { ok: true, async json() { return amll ? { status: 200, data: { items: candidates } } : candidates; } };
    }
  } };
  vm.runInNewContext(source, context);
  const result = await context.window.KARAOKE_SOURCES.discover(sample);
  assert(result.amll.state === "found" && result.amll.candidates.length === 1, "AMLL must require a matching artist and title");
  assert(result.lrclib.state === "found" && result.lrclib.candidates.length === 1, "LRCLIB must reject covers, live edits and instrumental tracks");
  assert(!JSON.stringify(result).includes("Example"), "Discovery must expose metadata without lyric text");
  assert(calls.some(url => url.searchParams.get("track_name") === "まつり"), "Search must include the original Japanese title");
  assert(calls.some(url => url.searchParams.get("track_name") === "Matsuri"), "Search must try the romanized alias after a miss");
  context.window.fetch = async () => { throw new Error("fixture unavailable"); };
  const unavailable = await context.window.KARAOKE_SOURCES.discover(sample);
  assert(unavailable.amll.state === "error" && unavailable.lrclib.state === "error", "A provider error must remain distinct from a miss");
  context.window.fetch = async rawUrl => {
    const url = new URL(rawUrl);
    let payload = {};
    if (url.hostname === "api.amll.dev") payload = { status: 200, data: { items: [] } };
    if (url.hostname === "lrclib.net") payload = [{
      id: 5, trackName: "Matsuri", artistName: "Fujii Kaze",
      ...(url.searchParams.get("track_name") === "Matsuri"
        ? { syncedLyrics: "[00:01]Example" } : { plainLyrics: "Example" }),
    }];
    return { ok: true, async json() { return payload; } };
  };
  const loaded = await context.window.KARAOKE_SOURCES.load(sample);
  assert(loaded && loaded.trackId === 5, "A plain-only alias must not prevent a later alias with synchronized lyrics from loading");
}

const furiganaSource = fs.readFileSync(new URL("../furigana.js", import.meta.url), "utf8");
const furiganaContext = { window: {} };
vm.runInNewContext(furiganaSource, furiganaContext, { filename: "furigana.js" });
const furiganaByLine = {
  ...(furiganaContext.window.JP_FURIGANA || {}),
  ...FURIGANA_CORRECTIONS,
};
const romajiByLine = {
  ...(furiganaContext.window.JP_ROMAJI || {}),
  ...ROMAJI_CORRECTIONS,
};

const textOf = value => Array.isArray(value)
  ? value.map(part => typeof part === "string" ? part : part?.text || "").join("")
  : String(value ?? "");

const ICON_TOKEN_RE = /[\[(](?:wave|clap|mic|chant|jump|spin|turn)[\])]/giu;
const ROMAJI_WORD_CHAR_RE = /[\p{Script=Latin}\p{N}]/u;
const ROMAJI_WORD_CONTINUATION_RE = /[\p{Script=Latin}\p{N}'’_-]/u;

function stripMarkup(value){
  return String(value || "").replace(/<[^>]*>/g, "");
}

/* Mirror the karaoke decorator: a ruby is one visible unit, plain text is
   split by character, and whitespace/icons do not become timed units. */
function referenceReadings(markup){
  const value = String(markup || "").replace(ICON_TOKEN_RE, "");
  const units = [];
  const rubyRe = /<ruby(?:\s[^>]*)?>([\s\S]*?)<\/ruby>/giu;
  let cursor = 0;
  let match;

  const appendPlain = plain => {
    Array.from(stripMarkup(plain)).forEach(char => {
      if (!/\s/u.test(char)) units.push(char);
    });
  };

  while ((match = rubyRe.exec(value))) {
    appendPlain(value.slice(cursor, match.index));
    const inner = match[1];
    const reading = inner.match(/<rt(?:\s[^>]*)?>([\s\S]*?)<\/rt>/iu);
    const base = stripMarkup(reading ? inner.slice(0, reading.index) : inner);
    if (base && !/^\s*$/u.test(base)) {
      units.push(reading ? stripMarkup(reading[1]) : base);
    }
    cursor = rubyRe.lastIndex;
  }
  appendPlain(value.slice(cursor));
  return units;
}

function romajiUnits(value){
  const chars = Array.from(String(value || "").replace(ICON_TOKEN_RE, ""));
  const units = [];
  for (let index = 0; index < chars.length;) {
    const char = chars[index];
    if (/\s/u.test(char)) {
      index += 1;
      continue;
    }
    if (ROMAJI_WORD_CHAR_RE.test(char)) {
      let end = index + 1;
      while (end < chars.length && ROMAJI_WORD_CONTINUATION_RE.test(chars[end])) end += 1;
      units.push(chars.slice(index, end).join(""));
      index = end;
      continue;
    }
    units.push(char);
    index += 1;
  }
  return units;
}

function isTimed(value){
  return value && Number.isFinite(Number(value.start)) && Number.isFinite(Number(value.end));
}

function assert(condition, message){
  if (!condition) throw new Error(message);
}

function checkFixture(label, unitTexts, referenceTexts, expected){
  const referenceTimings = referenceTexts.map((_, index) => ({
    start: index + 100,
    end: index + 101,
  }));
  const mapped = karaoke.mapUnitsToReferenceTimings(unitTexts, referenceTexts, referenceTimings);
  assert(mapped.complete, `${label}: unmatched romaji units ${JSON.stringify(mapped.unmatched)}`);
  unitTexts.forEach((unit, index) => {
    if (!karaoke.normaliseRomajiText(unit)) return;
    assert(isTimed(mapped.timings[index]), `${label}: missing timing for ${unit}`);
  });
  if (expected) {
    const timing = mapped.timings[expected.unitIndex];
    assert(timing.start === expected.start && timing.end === expected.end,
      `${label}: expected ${expected.start}-${expected.end}, got ${timing.start}-${timing.end}`);
  }
  return mapped;
}

assert(karaoke && typeof karaoke.mapUnitsToReferenceTimings === "function",
  "KARAOKE_SOURCES.mapUnitsToReferenceTimings is unavailable");
// Synthetic fixtures exercise the mapper independently of the current catalog.
// Artist-specific reading corrections belong in the corresponding content data.

checkFixture(
  "sokuon",
  ["kitte"],
  ["き", "っ", "て"],
  { unitIndex: 0, start: 100, end: 103 }
);
checkFixture(
  "grouped kana",
  ["koko", "de", "hanasō"],
  ["こ", "こ", "で", "はな", "そ", "う"],
  { unitIndex: 0, start: 100, end: 102 }
);
checkFixture(
  "long vowel",
  ["kōsu"],
  ["コ", "ー", "ス"],
  { unitIndex: 0, start: 100, end: 103 }
);
checkFixture(
  "yōon",
  ["kya", "ku"],
  ["き", "ゃ", "く"],
  { unitIndex: 0, start: 100, end: 102 }
);
checkFixture(
  "mixed punctuation and English",
  ["kon'ya", "EXAMPLE", "42", "km", "!"],
  ["こ", "ん", "や", "EXAMPLE", "42", "km", "!"],
  { unitIndex: 0, start: 100, end: 103 }
);

const failures = [];
let lineCount = 0;
let pendingReadingLines = 0;
for (const song of SONGS) {
  for (const [index, line] of (song.lyrics || []).entries()) {
    lineCount += 1;
    if (song.timingStatus === "preview") {
      const offset = song.timingPreview?.offsetSeconds;
      assert(Number.isFinite(offset), `${song.id}: preview must declare a finite offset`);
      assert(Number.isFinite(line.sourceTime) && line.sourceTime >= 0 && line.time >= 0
        && line.time === Math.round((line.sourceTime + offset) * 1000) / 1000,
        `${song.id}#${index}: preview start must match the supplied LRC timestamp plus its offset`);
      if (line.sourceEnd !== undefined) {
        assert(Number.isFinite(line.sourceEnd) && line.endTime >= line.time
          && line.endTime === Math.round((line.sourceEnd + offset) * 1000) / 1000,
          `${song.id}#${index}: preview end must match the supplied LRC timestamp plus its offset`);
      }
      assert(index === 0 || line.time >= song.lyrics[index - 1].time, `${song.id}: preview timestamps must be monotonic`);
      assert(!song.timingAlignment, `${song.id}: preview must not claim verified video alignment`);
    }
    const sourceText = textOf(line.jp);
    if (song.readingsStatus === "pending" && /[\u3040-\u30ff\u3400-\u9fff]/u.test(sourceText)) {
      pendingReadingLines += 1;
      continue;
    }
    const markup = furiganaByLine[sourceText] || sourceText;
    const romaji = typeof romajiByLine[sourceText] === "string"
      ? romajiByLine[sourceText]
      : sourceText;
    const referenceTexts = referenceReadings(markup);
    const unitTexts = romajiUnits(romaji);
    const referenceTimings = referenceTexts.map((_, unitIndex) => ({
      start: unitIndex + 1,
      end: unitIndex + 2,
    }));
    const mapped = karaoke.mapUnitsToReferenceTimings(unitTexts, referenceTexts, referenceTimings);
    const missing = unitTexts.filter((unit, unitIndex) =>
      karaoke.normaliseRomajiText(unit) && !isTimed(mapped.timings[unitIndex])
    );
    if (!mapped.complete || missing.length) {
      failures.push({
        song: song.id,
        index,
        source: sourceText,
        romaji,
        reference: referenceTexts.join("|"),
        unmatched: mapped.unmatched,
        missing,
      });
    }
  }
}

console.log(`Checked ${SONGS.length} songs / ${lineCount} lyric lines.`);
if (pendingReadingLines) console.log(`${pendingReadingLines} lines retain pending readings; source timestamps are still validated.`);

if (failures.length) {
  console.error(`Karaoke alignment failures: ${failures.length}`);
  failures.slice(0, 80).forEach(failure => console.error(JSON.stringify(failure)));
  process.exitCode = 1;
} else {
  console.log("Synthetic timing fixtures pass; all prepared romaji units map to reference timing spans.");
}
