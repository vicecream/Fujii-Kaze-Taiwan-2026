import assert from "node:assert/strict";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { SONG_LYRICS } from "../src/song-lyrics.js";
import { FURIGANA_CORRECTIONS, ROMAJI_CORRECTIONS } from "../src/furigana-corrections.js";
import { songCapabilities } from "../src/song-content.js";

const read = file => fs.readFile(new URL(`../${file}`, import.meta.url), "utf8");
const before = JSON.parse(await read("artifacts/lasa-readings-2026-11-14/before.json"));
const report = JSON.parse(await read("artifacts/lasa-readings-2026-11-14/readings-report.json"));
const originalContent = songs => JSON.parse(JSON.stringify(songs)).map(song => {
  for (const line of song.lyrics) {
    delete line.time; delete line.endTime;
    if (song.id === "Masshiro") { delete line.sourceTime; delete line.sourceEnd; }
  }
  if (song.timingPreview) delete song.timingPreview.offsetSeconds;
  // These four songs gained complete readings after the historical snapshot.
  if (["ItsAlright", "Masshiro", "MoEhWa", "Kaerou"].includes(song.id)) delete song.readingsStatus;
  // This historical snapshot predates the user's Masshiro timestamp update.
  if (song.id === "Masshiro") for (const key of ["timingStatus", "timingPreview", "timingSourceUrl", "lyricsUsageBasis"]) delete song[key];
  return song;
});
assert.deepEqual(originalContent(SONG_LYRICS.slice(0,23)), originalContent(before.songs.slice(0,23)), "Preserve the original 23 songs and their photo versions; playback timing is checked against current LRC manifests by check:guide/check:karaoke");
for (const [key,value] of Object.entries(before.furiganaCorrections)) assert.equal(FURIGANA_CORRECTIONS[key], value);
for (const [key,value] of Object.entries(before.romajiCorrections)) assert.equal(ROMAJI_CORRECTIONS[key], value);
const source = await read(report.sourceFile);
assert.equal(crypto.createHash("sha256").update(source).digest("hex"), report.sha256);
assert.equal(report.uniqueLines, 194);
assert.equal(report.japaneseLyricRows, 251);
for (const song of SONG_LYRICS.slice(23)){
  const previous = before.songs.find(previous => previous.id === song.id);
  const timeline = lyrics => lyrics.map(({jp,sourceTime,sourceEnd}) => ({jp,sourceTime,sourceEnd}));
  assert.deepEqual(timeline(song.lyrics), timeline(previous.lyrics), `${song.id}: readings do not change the original or timeline`);
  if (song.id !== "HedemoNeYoLasa") assert.deepEqual(song.lyrics.map(line => line.tr), previous.lyrics.map(line => line.tr));
  assert.equal(song.readingsStatus,"ready");
  assert.equal(songCapabilities(song).readings,true);
  for (const line of song.lyrics){
    if (!/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(line.jp)) continue;
    const markup = FURIGANA_CORRECTIONS[line.jp];
    assert.ok(markup && ROMAJI_CORRECTIONS[line.jp]);
    assert.equal(markup.replace(/<ruby>([^<>]+)<rt>[^<>]+<\/rt><\/ruby>/g, "$1"), line.jp);
  }
}
const hedemo = SONG_LYRICS.find(song => song.id === "HedemoNeYoLasa");
assert.equal(hedemo.lyrics.length,53);
assert.equal(hedemo.lyrics.filter(line => line.tr).length,53);
assert.equal(hedemo.lyrics[3].jp,hedemo.lyrics[7].jp);
assert.equal(hedemo.lyrics[3].tr,"該死啊(怒)");
assert.equal(hedemo.lyrics[7].tr,"起舞吧");
assert.deepEqual(hedemo.photoTranslation.paragraphs.slice(5),before.songs.find(song => song.id === hedemo.id).photoTranslation.paragraphs);
const seishun = SONG_LYRICS.find(song => song.id === "SeishunSick");
assert.match(FURIGANA_CORRECTIONS[seishun.lyrics[45].jp],/<ruby>知<rt>し<\/rt>/);
assert.match(ROMAJI_CORRECTIONS[seishun.lyrics[45].jp],/shiru dake/);
console.log("PASS LASA readings: 251 Japanese rows / 194 unique exact-text ruby and romaji mappings; Hedemo 53/53 Chinese cues; original inputs, existing songs and timing preserved.");
