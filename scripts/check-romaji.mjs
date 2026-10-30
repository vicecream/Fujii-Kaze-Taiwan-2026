import fs from "node:fs";
import vm from "node:vm";
import { SONG_LYRICS as SONGS } from "../src/song-lyrics.js";
import { FURIGANA_CORRECTIONS, ROMAJI_CORRECTIONS } from "../src/furigana-corrections.js";
import { JP_CHANT_GUIDES } from "../src/chant-guide.js";

const furiganaSource = fs.readFileSync(new URL("../furigana.js", import.meta.url), "utf8");
const generated = { window: {} };
vm.runInNewContext(furiganaSource, generated, { filename: "furigana.js" });

const romajiByLine = {
  ...(generated.window.JP_ROMAJI || {}),
  ...ROMAJI_CORRECTIONS,
};
const furiganaByLine = {
  ...(generated.window.JP_FURIGANA || {}),
  ...FURIGANA_CORRECTIONS,
};
const japaneseCharacters = /[ぁ-ゖ゠-ヿ一-鿿]/u;
const kanjiCharacters = /[\p{Script=Han}々]/u;
const decodeEntities = value => value.replace(/&(amp|lt|gt|quot|#39);/g,
  (_, name) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[name]);

function furiganaIssue(source, markup){
  if (typeof markup !== "string" || !markup.trim()) return "missing kana mapping";
  const ruby = /<ruby>([^<>]+)<rt>([\p{Script=Hiragana}\p{Script=Katakana}ー]+)<\/rt><\/ruby>/gu;
  const plain = markup.replace(ruby, "");
  if (/[<>]/u.test(plain)) return "invalid ruby markup or reading";
  if (kanjiCharacters.test(decodeEntities(plain))) return "kanji without furigana";
  if (decodeEntities(markup.replace(ruby, (_, base) => base)) !== source) return "ruby changes the original lyric";
  return null;
}

const textOf = value => Array.isArray(value)
  ? value.map(part => typeof part === "string" ? part : part?.text || "").join("")
  : String(value ?? "");

const missing = [];
const missingChantSegments = [];
const leaking = [];
const invalidFurigana = [];
const seenMissing = new Set();
let pendingReadings = 0;

for (const song of SONGS) {
  for (const [index, line] of (song.lyrics || []).entries()) {
    const source = textOf(line.jp);
    if (!source || !japaneseCharacters.test(source)) continue;

    const romaji = romajiByLine[source];
    if (song.readingsStatus === "pending" && typeof romaji !== "string") {
      pendingReadings += 1;
      continue;
    }
    const issue = furiganaIssue(source, furiganaByLine[source]);
    if (issue) invalidFurigana.push({ song: song.id, index, source, issue });
    if (typeof romaji !== "string") {
      if (!seenMissing.has(source)) {
        seenMissing.add(source);
        missing.push({ song: song.id, index, time: line.time, source });
      }
      continue;
    }

    if (japaneseCharacters.test(romaji)) {
      leaking.push({ song: song.id, index, time: line.time, source, romaji });
    }

    for (const segment of line.jpSegments || []) {
      if (!segment || segment.tag !== "chant"
        || !japaneseCharacters.test(String(segment.text || ""))) continue;
      const segmentRomaji = romajiByLine[segment.text];
      if (typeof segmentRomaji !== "string") {
        missingChantSegments.push({ song: song.id, index, time: line.time, source: segment.text });
      } else if (japaneseCharacters.test(segmentRomaji)) {
        leaking.push({
          song: song.id,
          index,
          time: line.time,
          source: segment.text,
          romaji: segmentRomaji,
          kind: "chant segment",
        });
      }
    }
  }
}

for (const [song, guide] of Object.entries(JP_CHANT_GUIDES || {})) {
  for (const [index, segment] of (guide.chantSegments || []).entries()) {
    if (!segment || typeof segment.romaji !== "string") continue;
    if (japaneseCharacters.test(segment.romaji)) {
      leaking.push({
        song,
        index,
        time: segment.time,
        source: segment.text,
        romaji: segment.romaji,
        kind: "chant segment",
      });
    }
  }
}

const lyricCount = SONGS.reduce((count, song) => count + (song.lyrics || []).length, 0);
console.log(`Checked ${SONGS.length} songs / ${lyricCount} lyric lines.`);
if (pendingReadings) console.log(`${pendingReadings} Japanese lines have explicitly pending readings; reading controls must stay disabled for those songs.`);

if (missing.length || missingChantSegments.length || leaking.length || invalidFurigana.length) {
  if (invalidFurigana.length) {
    console.error(`Invalid furigana mappings (${invalidFurigana.length} lines):`);
    invalidFurigana.forEach(item => console.error(`- ${item.song}#${item.index}: ${item.issue}: ${item.source}`));
  }
  if (missing.length) {
    console.error(`Missing romaji mappings (${missing.length} unique lines):`);
    missing.forEach(item => console.error(`- ${item.song}#${item.index} @ ${item.time}: ${item.source}`));
  }
  if (missingChantSegments.length) {
    console.error(`Missing romaji mappings (${missingChantSegments.length}) for Japanese chant segments:`);
    missingChantSegments.forEach(item => console.error(`- ${item.song}#${item.index} @ ${item.time}: ${item.source}`));
  }
  if (leaking.length) {
    console.error(`Romaji mappings containing Japanese (${leaking.length} lines):`);
    leaking.forEach(item => console.error(`- ${item.kind || "lyric"} ${item.song}#${item.index} @ ${item.time}: ${item.romaji}`));
  }
  process.exitCode = 1;
} else {
  console.log("All available kana and romaji mappings are valid; missing readings remain explicitly pending.");
}
