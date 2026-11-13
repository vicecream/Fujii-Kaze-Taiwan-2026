import assert from "node:assert/strict";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { SONGS, LOVE_ALL_SERVE_ALL_TRACKS } from "../src/song-metadata.js";
import { SONG_LYRICS } from "../src/song-lyrics.js";
import { LASA_PHOTOS } from "../src/lasa-photo-data.js";
import { songCapabilities } from "../src/song-content.js";
import { withPhotoTranslations } from "../src/photo-translations.js";

const read = file => fs.readFile(new URL(`../${file}`, import.meta.url), "utf8");
assert.deepEqual(LASA_PHOTOS, JSON.parse(await read("lyrics/translations/lasa-photos.json")), "Generated photo data must match the reviewed transcription");
const provenance = JSON.parse(await read("artifacts/lasa-import-2026-11-14/photo-provenance.json"));
for (const [file, expected] of Object.entries(provenance.photos)){
  const bytes = await fs.readFile(new URL(`../lyrics/translations/love-all-serve-all-photos/${file}`, import.meta.url));
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), expected, file);
}
assert.deepEqual(SONGS.filter(song => song.album === "lasa").sort((a,b) => a.albumTrack - b.albumTrack).map(song => song.id), LOVE_ALL_SERVE_ALL_TRACKS);
assert.equal(SONGS.length, 29);
assert.deepEqual(SONGS.slice(19, 23).map(song => song.id), ["ItsAlright", "Masshiro", "MoEhWa", "Kaerou"]);
for (const entry of LASA_PHOTOS.songs){
  const song = SONG_LYRICS.find(song => song.id === entry.id);
  assert.ok(song, entry.id);
  assert.equal(song.photoTranslation.track, song.albumTrack);
  assert.equal(await read(`lyrics/translations/${song.id}.lasa.zh.txt`), entry.paragraphs.join("\n\n") + "\n");
  const caps = songCapabilities(song);
  if (!caps.hasOriginal){
    assert.equal(caps.hasTranslation, true);
    assert.equal(caps.translationComplete, false, "Unpaired Chinese does not certify original-line alignment");
    assert.equal(caps.timed, false);
    assert.equal(caps.readings, false);
    assert.ok(song.lyrics.every(line => line.jp === "" && line.time === undefined && line.sourceTime === undefined));
    assert.deepEqual(song.lyrics.map(line => line.tr), entry.paragraphs.join("\n").split("\n"));
  } else {
    assert.equal(caps.timed, true, "Existing timed subtitles remain available beside the separate photo version");
  }
}
// The reading-only fallback remains available if an original is absent, even
// though the six supplied LRCs now provide real Japanese and timing anchors.
const fallbackSongs = SONGS.slice(23).map(song => withPhotoTranslations({ ...song, lyrics: [] }));
for (const song of fallbackSongs){
  const caps = songCapabilities(song);
  assert.equal(caps.hasOriginal, false);
  assert.equal(caps.hasTranslation, true);
  assert.equal(caps.timed, false);
  assert.ok(song.lyrics.every(line => line.time === undefined));
}
assert.equal(fallbackSongs.reduce((sum, song) => sum + song.lyrics.length, 0), 226);
assert.equal(SONG_LYRICS.find(song => song.id === "HedemoNeYoLasa").photoTranslation.complete, true);
for (const id of ["Kirari", "Matsuri"]) assert.equal(SONG_LYRICS.find(song => song.id === id).photoTranslation, undefined);
const search = JSON.parse(await read("artifacts/lasa-import-2026-11-14/karaoke-source-search.json"));
assert.equal(search.songs.length, 6);
assert.doesNotMatch(JSON.stringify(search), /syncedLyrics|plainLyrics|\[\d{2}:\d{2}/);
console.log("PASS LASA: 11 album tracks, nine photo transcriptions, source image hashes and the untimed Chinese fallback remain valid.");
