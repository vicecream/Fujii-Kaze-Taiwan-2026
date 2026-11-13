import fs from "node:fs/promises";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { SONG_LYRICS } from "../src/song-lyrics.js";
import { FURIGANA_CORRECTIONS, ROMAJI_CORRECTIONS } from "../src/furigana-corrections.js";

const root = new URL("../", import.meta.url);
const sourceFile = "lyrics/readings/lasa-readings.txt";
const text = await fs.readFile(new URL(sourceFile, root), "utf8");
const songIds = new Set(SONG_LYRICS.slice(23).map(song => song.id));
const furigana = { ...FURIGANA_CORRECTIONS };
const romaji = { ...ROMAJI_CORRECTIONS };
const entries = new Map();
let songId;
const decode = value => value.replace(/&(amp|lt|gt|quot|#39);/g, (_,key) => ({amp:"&",lt:"<",gt:">",quot:'"',"#39":"'"})[key]);
for (const raw of text.split(/\r?\n/)){
  if (!raw.trim()) continue;
  if (raw.startsWith("# ")){
    const heading = raw.slice(2).trim();
    if (songIds.has(heading)) songId = heading;
    continue;
  }
  assert.ok(songId, "Readings must belong to one of the six LASA additions");
  const parts = raw.split(" | ");
  assert.equal(parts.length, 2, `Invalid reading row: ${raw}`);
  const [markup, reading] = parts;
  const ruby = /<ruby>([^<>]+)<rt>([\p{Script=Hiragana}\p{Script=Katakana}ー]+)<\/rt><\/ruby>/gu;
  const jp = decode(markup.replace(ruby, (_,base) => base));
  const outsideRuby = decode(markup.replace(ruby, ""));
  assert.doesNotMatch(outsideRuby, /[<>\p{Script=Han}々]/u, `${songId}: malformed or uncovered kanji`);
  assert.doesNotMatch(reading, /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u, `${songId}: romaji still contains Japanese`);
  assert.ok(reading.trim());
  assert.ok(SONG_LYRICS.find(song => song.id === songId).lyrics.some(line => line.jp === jp), `${songId}: ruby must preserve an exact supplied LRC line: ${jp}`);
  assert.ok(!entries.has(jp), `Duplicate reading row: ${jp}`);
  entries.set(jp, { songId, markup, romaji: reading });
  furigana[jp] = markup;
  romaji[jp] = reading;
}
let lineCount = 0;
for (const song of SONG_LYRICS.slice(23)){
  for (const line of song.lyrics){
    if (!/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(line.jp)) continue;
    assert.ok(entries.has(line.jp), `${song.id}: missing manually prepared reading: ${line.jp}`);
    lineCount += 1;
  }
}
await fs.writeFile(new URL("src/furigana-corrections.js", root),
  `// LASA readings are maintained in ${sourceFile}; regenerate with scripts/import-lasa-readings.mjs.\nexport const FURIGANA_CORRECTIONS = ${JSON.stringify(furigana, null, 2)};\nexport const ROMAJI_CORRECTIONS = ${JSON.stringify(romaji, null, 2)};\n`, "utf8");
await fs.writeFile(new URL("artifacts/lasa-readings-2026-11-14/readings-report.json", root), JSON.stringify({
  preparedAt: "2026-11-14", sourceFile, sha256: crypto.createHash("sha256").update(text).digest("hex"),
  method: "Manually annotated supplied LRC text; standard readings and supplied dialect spelling retained. Not an artist-approved phonetic transcript.",
  uniqueLines: entries.size, japaneseLyricRows: lineCount,
  songs: SONG_LYRICS.slice(23).map(song => ({ id: song.id, japaneseLines: song.lyrics.filter(line => entries.has(line.jp)).length })),
}, null, 2) + "\n", "utf8");
console.log(`Prepared furigana and romaji for ${lineCount} Japanese lyric rows / ${entries.size} unique lines. Reimport the supplied LRC manifest to update readiness.`);
