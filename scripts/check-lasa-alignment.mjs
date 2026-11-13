import assert from "node:assert/strict";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { SONG_LYRICS } from "../src/song-lyrics.js";
import { LASA_PHOTOS } from "../src/lasa-photo-data.js";
import { songCapabilities } from "../src/song-content.js";
import { applyPhotoAlignment } from "./import-lasa-alignment.mjs";

const read = file => fs.readFile(new URL(`../${file}`, import.meta.url), "utf8");
const alignment = JSON.parse(await read("lyrics/translations/lasa-alignment.json"));
const report = JSON.parse(await read("artifacts/lasa-lrc-alignment-2026-11-14/report.json"));
const before = JSON.parse(await read("artifacts/lasa-lrc-alignment-2026-11-14/before.json"));
const inputs = JSON.parse(await read("artifacts/lasa-lrc-alignment-2026-11-14/lrc-inputs.json"));
const withoutPhoto = ({ photoTranslation, ...song }) => JSON.parse(JSON.stringify(song));
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
assert.deepEqual(originalContent(SONG_LYRICS.slice(0, 23).map(withoutPhoto)), originalContent(before.songs.slice(0, 23)), "Original 23 songs and their translations must remain unchanged; playback timing is checked against current LRC manifests by check:guide/check:karaoke");
const expected = { HedemoNeYoLasa: [53, 53], Yaba: [43, 43], MoEhYo: [43, 43], LonelyRhapsody: [41, 40], ByeForNow: [24, 24], SeishunSick: [49, 46] };
for (const entry of alignment.songs){
  const song = SONG_LYRICS.find(song => song.id === entry.id);
  const original = inputs.find(input => input.id === entry.id);
  const photo = LASA_PHOTOS.songs.find(photo => photo.id === entry.id);
  const bytes = await fs.readFile(new URL(entry.lrcFile, new URL("../lyrics/", import.meta.url)));
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), original.sha256, "Never rewrite the supplied LRC file");
  assert.equal(entry.lrcSha256, original.sha256);
  const timeline = lyrics => lyrics.map(({jp,sourceTime,sourceEnd}) => ({jp,sourceTime,sourceEnd}));
  assert.deepEqual(timeline(song.lyrics), timeline(original.lyrics), `${song.id}: preserve every original phrase and time boundary`);
  assert.deepEqual(applyPhotoAlignment(song, entry, photo), song, `${song.id}: exact photo evidence must reproduce the applied translations`);
  assert.deepEqual([song.lyrics.length, song.lyrics.filter(line => line.tr).length], expected[song.id]);
  assert.equal(songCapabilities(song).timed, true);
  assert.equal(song.timingStatus, "preview");
  assert.equal(song.readingsStatus, "ready");
  assert.ok(!song.timingAlignment, "A local LRC must not certify YouTube offset alignment");
  for (const line of song.lyrics) assert.ok(line.tr || line.translationPendingReason);
  const cues = new Map((await read(`lyrics/translations/${song.id}.zh.lrc`)).trimEnd().split("\n").map(line => {
    const match = line.match(/^\[(\d+):(\d+\.\d+)\](.*)$/);
    assert.ok(match);
    return [Math.round((Number(match[1])*60+Number(match[2]))*1000)/1000, match[3]];
  }));
  for (const line of song.lyrics){
    assert.equal(cues.get(line.sourceTime), line.tr || "", "Chinese exports must use real anchors and clear missing translations");
    if (line.sourceEnd !== undefined && !song.lyrics.some(other => other.sourceTime === line.sourceEnd)) assert.equal(cues.get(line.sourceEnd), "", "Interlude boundaries clear the previous subtitle");
  }
  const shifted = structuredClone(entry); shifted.lines[0].sourceTime += 0.01;
  assert.throws(() => applyPhotoAlignment(song, shifted, photo), /timeline changed/);
  const invented = structuredClone(entry);
  const translated = invented.lines.find(line => line.parts.length);
  translated.parts = [{ sourceLine: 0, text: "Not supplied by the user" }];
  assert.throws(() => applyPhotoAlignment(song, invented, photo), /absent from the supplied photo/);
}
assert.equal(report.totalLines, 253);
assert.equal(report.translatedLines, 249);
assert.equal(report.pendingLines, 4);
const yaba = SONG_LYRICS.find(song => song.id === "Yaba");
assert.equal(yaba.lyrics[6].tr, "趕緊出發吧");
assert.equal(yaba.lyrics[7].tr, "往遠方去／直到抵達高處");
const bye = SONG_LYRICS.find(song => song.id === "ByeForNow");
assert.equal(bye.lyrics[2].tr, "你引導了方向／給搖擺不定的我");
assert.equal(bye.lyrics[3].tr, bye.lyrics[2].tr);
console.log("PASS LASA alignment: six supplied LRCs / 253 original cues / 249 source-backed Chinese rows; original songs and input files unchanged; pending conflicts, exports and interlude clearing verified.");
