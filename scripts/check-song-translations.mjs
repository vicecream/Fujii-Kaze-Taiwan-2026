import assert from "node:assert/strict";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { SONG_LYRICS } from "../src/song-lyrics.js";
import { applyTranslationAlignment } from "./import-song-translations.mjs";

const readJson = async file => JSON.parse(await fs.readFile(new URL(`../${file}`, import.meta.url), "utf8"));
const baseline = await readJson("artifacts/translations-timing-baseline.json");
const alignment = await readJson("lyrics/translations/alignment.json");
const evidence = await readJson("lyrics/translations/extracted-pairs.json");
const report = await readJson("artifacts/translations-import-report.json");
const originalTimeline = SONG_LYRICS.map(song => ({ id: song.id, lyrics: song.lyrics.map(({ jp, time, endTime, sourceTime, sourceEnd }) => ({ jp, time, endTime, sourceTime, sourceEnd })) }));
const timingHashes = originalTimeline.map(song => ({ id: song.id, lines: song.lyrics.length,
  sha256: crypto.createHash("sha256").update(JSON.stringify(song.lyrics)).digest("hex") }));
assert.deepEqual(timingHashes, baseline, "Importing Chinese must preserve every original line and timing field");
assert.equal(alignment.songs.length, 15);
let count = 0;
for (const entry of alignment.songs) {
  const song = SONG_LYRICS.find(song => song.id === entry.id);
  const proof = evidence.find(item => item.id === entry.id);
  const validated = applyTranslationAlignment(song, entry, proof);
  assert.deepEqual(validated.lyrics, song.lyrics, `${song.id}: imported text must match the reviewed PDF alignment`);
  assert.equal(song.translationCreditRole, "source", "The PDF provider must not be represented as an identified translator");
  assert.equal(song.timingStatus, "preview", "Chinese alignment must not certify video timing");
  count += song.lyrics.filter(line => line.tr?.trim()).length;
}
assert.equal(count, report.translatedLines);
assert.equal(count, 672);
assert.equal(report.pendingLines, 29);
const sample = alignment.songs.find(song => song.id === "Prema");
const song = SONG_LYRICS.find(song => song.id === sample.id);
const proof = evidence.find(item => item.id === sample.id);
const shifted = structuredClone(sample);
shifted.lines[0].time += 1;
assert.throws(() => applyTranslationAlignment(song, shifted, proof), /timeline changed/);
const invented = structuredClone(sample);
invented.lines[0].tr = "This fixture text is absent from the PDF";
assert.throws(() => applyTranslationAlignment(song, invented, proof), /differs from the supplied PDF/);
for (const pendingId of ["CasketGirl", "You", "OkayGoodbye", "ForeverYoung"]) {
  assert.equal(SONG_LYRICS.find(song => song.id === pendingId).lyrics.some(line => line.tr), false, `${pendingId}: no translation was supplied`);
}
console.log(`PASS ${alignment.songs.length} PDF translations / ${count} translated subtitle rows; 29 source gaps retained; all original lyrics and timestamps unchanged.`);
