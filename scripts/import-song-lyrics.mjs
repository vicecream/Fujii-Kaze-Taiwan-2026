import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { pathToFileURL } from "node:url";
import { SONGS } from "../src/song-metadata.js";
import { SONG_LYRICS } from "../src/song-lyrics.js";
import { FURIGANA_CORRECTIONS, ROMAJI_CORRECTIONS } from "../src/furigana-corrections.js";
import "../karaoke-sources.js";

const karaoke = globalThis.KARAOKE_SOURCES;
const readingContext = { window: {} };
vm.runInNewContext(await fs.readFile(new URL("../furigana.js", import.meta.url), "utf8"), readingContext);
const japanese = /[ぁ-ゖ゠-ヿ一-鿿]/u;

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

// Only user-supplied local files are read. This importer makes no network requests.
export function prepareSong(entry, text, song) {
  requireValue(song, `Unknown song: ${entry.id}`);
  requireValue(typeof entry.sourceUrl === "string" && /^https?:\/\//.test(entry.sourceUrl), `${entry.id}: sourceUrl is required`);
  requireValue(typeof entry.usageBasis === "string" && entry.usageBasis.trim(), `${entry.id}: usageBasis is required`);
  requireValue(!/^\s*\[offset:\s*(?!0\s*\])[^\]]+\]/im.test(text), `${entry.id}: normalize the LRC offset before import`);
  let timed;
  let boundaries = [];
  if (entry.file.endsWith(".lrc")) {
    // The local display model stores line anchors; inline word stamps stay in the provider adapter.
    timed = karaoke.parseLrclibSyncedLyrics(text.replace(/<\d+:\d+(?:[.:]\d+)?>/g, ""));
    boundaries = [...text.matchAll(/^\s*\[(\d+):(\d{1,2}(?:\.\d+)?)\]/gm)]
      .map(match => Number(match[1]) * 60 + Number(match[2])).sort((a, b) => a - b);
  } else if (entry.file.endsWith(".json")) {
    const payload = JSON.parse(text);
    timed = karaoke.parseLrclib(payload) || karaoke.normaliseBeautifulLyrics(payload);
  }
  requireValue(timed?.lines?.length, `${entry.id}: expected a synced LRC or supported provider JSON file`);
  if (entry.pairedRomaji) {
    // Some supplied LRCs contain Japanese plus a romanization at the same
    // timestamp. Keep that reading as metadata, not a second sung line.
    timed.lines = timed.lines.filter((line, index, lines) => {
      if (japanese.test(line.text)) return true;
      const original = lines.find(other => other.start === line.start && japanese.test(other.text));
      if (!original) return true;
      requireValue(!original.providedRomaji, `${entry.id}: multiple readings at one timestamp`);
      original.providedRomaji = line.text;
      return false;
    });
  }
  const alignment = entry.alignment;
  const preview = entry.timingMode === "preview";
  requireValue(!preview || !alignment, `${entry.id}: preview and verified alignment must be separate`);
  if (alignment) {
    requireValue(alignment.youtubeId === song.youtubeId, `${entry.id}: alignment must use the guide's YouTube version`);
    requireValue(typeof alignment.offsetSeconds === "number" && Number.isFinite(alignment.offsetSeconds), `${entry.id}: a verified numeric offsetSeconds is required`);
    requireValue(/^\d{4}-\d{2}-\d{2}$/.test(alignment.checkedAt || ""), `${entry.id}: alignment.checkedAt is required`);
  }
  const lyrics = timed.lines.map(line => {
    requireValue(Number.isFinite(line.start) && line.start >= 0, `${entry.id}: invalid line timestamp`);
    const jp = line.text || line.words.map(word => word.text).join("");
    requireValue(jp.trim() && !/[<>]/.test(jp), `${entry.id}: lyric text must be plain text`);
    const nextRawBoundary = boundaries.find(value => value > line.start);
    const nextBoundary = nextRawBoundary === undefined ? undefined : Math.round(nextRawBoundary * 1000) / 1000;
    const sourceTime = Math.round(line.start * 1000) / 1000;
    const source = {
      jp, sourceTime,
      ...(nextBoundary !== undefined ? { sourceEnd: nextBoundary } : {}),
      ...(line.providedRomaji ? { providedRomaji: line.providedRomaji } : {}),
    };
    if (!alignment && !preview) return source;
    const offset = alignment ? alignment.offsetSeconds : 0;
    const time = sourceTime + offset;
    requireValue(time >= 0, `${entry.id}: video alignment puts a lyric before zero`);
    return { ...source, time: Math.round(time * 1000) / 1000,
      ...(nextBoundary !== undefined ? { endTime: Math.round((nextBoundary + offset) * 1000) / 1000 } : {}) };
  });
  requireValue(lyrics.every((line, index) => index === 0 || !alignment || line.time >= lyrics[index - 1].time), `${entry.id}: non-monotonic video timing`);
  return {
    lyrics,
    lyricsStatus: entry.complete === true ? "ready" : entry.complete === false ? "partial" : "imported",
    translationStatus: "pending",
    timingStatus: preview ? "preview" : alignment ? "ready" : "pending",
    lyricsSourceUrl: entry.sourceUrl,
    lyricsUsageBasis: entry.usageBasis,
    timingSourceUrl: entry.sourceUrl,
    ...(alignment ? { timingAlignment: alignment } : {}),
    ...(preview ? { timingPreview: { youtubeId: song.youtubeId, offsetSeconds: 0, source: "user-provided LRC" } } : {}),
  };
}

export async function importSongs(manifestPath, { write = false, root = new URL("../", import.meta.url) } = {}) {
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  requireValue(Array.isArray(manifest.songs) && manifest.songs.length, "manifest.songs must contain local files");
  const seen = new Set();
  const furigana = { ...FURIGANA_CORRECTIONS };
  const romaji = { ...ROMAJI_CORRECTIONS };
  const stableFields = new Set(SONGS.flatMap(song => Object.keys(song)).filter(key => !key.endsWith("Status")));
  const prepared = Object.fromEntries(SONG_LYRICS.filter(song => song.lyrics.length).map(song => [song.id,
    Object.fromEntries(Object.entries(song).filter(([key]) => !stableFields.has(key)))]));
  for (const entry of manifest.songs) {
    requireValue(!seen.has(entry.id), `Duplicate import: ${entry.id}`);
    seen.add(entry.id);
    requireValue(typeof entry.file === "string", `${entry.id}: file is required`);
    const song = SONGS.find(item => item.id === entry.id);
    const localFile = path.resolve(path.dirname(manifestPath), entry.file);
    const content = prepareSong(entry, await fs.readFile(localFile, "utf8"), song);
    if (entry.readings) {
      Object.assign(furigana, entry.readings.furigana);
      Object.assign(romaji, entry.readings.romaji);
    }
    let readingsPending = false;
    for (const line of content.lyrics) {
      if (song.language !== "ja" || !japanese.test(line.jp)) continue;
      const reading = romaji[line.jp] || readingContext.window.JP_ROMAJI?.[line.jp];
      if (entry.allowPendingReadings && (!reading || !(furigana[line.jp] || readingContext.window.JP_FURIGANA?.[line.jp]))) {
        readingsPending = true;
        continue;
      }
      requireValue(typeof reading === "string" && reading.trim() && !japanese.test(reading), `${entry.id}: supply romaji for every Japanese line in readings.romaji`);
      const ruby = furigana[line.jp] || readingContext.window.JP_FURIGANA?.[line.jp];
      requireValue(typeof ruby === "string" && ruby.trim(), `${entry.id}: supply readings.furigana for every Japanese line`);
    }
    content.readingsStatus = song.language !== "ja" ? "not-applicable" : readingsPending ? "pending" : "ready";
    // Preserve an existing translation when the original line is unchanged.
    const previous = SONG_LYRICS.find(item => item.id === entry.id);
    content.lyrics = content.lyrics.map((line, index) => previous?.lyrics[index]?.jp === line.jp
      ? { ...previous.lyrics[index], ...line, ...(!content.timingAlignment && !content.timingPreview ? { time: undefined, endTime: undefined } : {}) } : line);
    const translated = content.lyrics.filter(line => line.tr).length;
    content.translationStatus = translated === content.lyrics.length ? "ready" : translated ? "partial" : "pending";
    prepared[entry.id] = { ...prepared[entry.id], ...content };
    if (!content.timingAlignment) delete prepared[entry.id].timingAlignment;
    if (!content.timingPreview) delete prepared[entry.id].timingPreview;
    console.log(`${entry.id}: ${content.lyrics.length} lines; lyrics ${content.lyricsStatus}; timing ${content.timingStatus}`);
  }
  if (!write) {
    console.log("Preview only. Add --write to import these validated local files.");
    return;
  }
  const serialize = value => JSON.stringify(value, null, 2).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  await fs.writeFile(new URL("src/song-lyrics.js", root),
    `// Imported from user-supplied local files; source and alignment are recorded per song.\nimport { SONGS } from "./song-metadata.js";\nconst prepared = ${serialize(prepared)};\nexport const SONG_LYRICS = SONGS.map(song => ({ ...song, lyrics: [], ...prepared[song.id] }));\n`, "utf8");
  if (manifest.songs.some(entry => entry.readings)) {
    await fs.writeFile(new URL("src/furigana-corrections.js", root),
      `export const FURIGANA_CORRECTIONS = ${serialize(furigana)};\nexport const ROMAJI_CORRECTIONS = ${serialize(romaji)};\n`, "utf8");
  }
  console.log("Imported. Run check:guide, check:lyrics, check:karaoke and build before shipping.");
}

async function main() {
  const [manifestPath, mode] = process.argv.slice(2);
  requireValue(manifestPath && (!mode || mode === "--write"), "Usage: node scripts/import-song-lyrics.mjs manifest.json [--write]");
  await importSongs(manifestPath, { write: mode === "--write" });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
