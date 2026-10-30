import assert from "node:assert/strict";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { SONG_LYRICS } from "../src/song-lyrics.js";
import { applyTranslationAlignment, applyUserProvidedTranslation } from "./import-song-translations.mjs";

const readJson = async file => JSON.parse(await fs.readFile(new URL(`../${file}`, import.meta.url), "utf8"));
const baseline = await readJson("artifacts/translations-timing-baseline.json");
const alignment = await readJson("lyrics/translations/alignment.json");
const evidence = await readJson("lyrics/translations/extracted-pairs.json");
const report = await readJson("artifacts/translations-import-report.json");
// Translation alignment follows the supplied source, independent of video offsets.
const originalTimeline = SONG_LYRICS.map(song => ({ id: song.id, lyrics: song.lyrics.map(({ jp, time, endTime, sourceTime, sourceEnd }) => ({ jp,
  time: song.timingStatus === "preview" ? sourceTime : time,
  endTime: song.timingStatus === "preview" ? sourceEnd : endTime, sourceTime, sourceEnd })) }));
const timingHashes = originalTimeline.filter(song => song.lyrics.length || baseline.some(entry => entry.id === song.id)).map(song => ({ id: song.id, lines: song.lyrics.length,
  sha256: crypto.createHash("sha256").update(JSON.stringify(song.lyrics)).digest("hex") }));
assert.deepEqual(timingHashes, baseline, "Importing Chinese must preserve every original line and timing field");
assert.equal(alignment.songs.length, 19);
let count = 0;
for (const entry of alignment.songs) {
  const song = SONG_LYRICS.find(song => song.id === entry.id);
  const proof = evidence.find(item => item.id === entry.id);
  const validated = applyTranslationAlignment(song, entry, proof);
  assert.deepEqual(validated.lyrics, song.lyrics, `${song.id}: imported text must match the reviewed PDF alignment`);
  assert.equal(song.translationCreditRole, "source", "The PDF provider must not be represented as an identified translator");
  assert.equal(song.timingStatus, entry.id === "Masshiro" ? "pending" : "preview", "Chinese alignment must not certify video timing");
  count += song.lyrics.filter(line => line.tr?.trim()).length;
}
assert.equal(count, report.translatedLines);
assert.equal(count, 836);
assert.equal(report.pendingLines, 40);
const sample = alignment.songs.find(song => song.id === "Prema");
const song = SONG_LYRICS.find(song => song.id === sample.id);
const proof = evidence.find(item => item.id === sample.id);
const shifted = structuredClone(sample);
shifted.lines[0].time += 1;
assert.throws(() => applyTranslationAlignment(song, shifted, proof), /timeline changed/);
const invented = structuredClone(sample);
invented.lines[0].tr = "This fixture text is absent from the PDF";
assert.throws(() => applyTranslationAlignment(song, invented, proof), /differs from the supplied PDF/);
const supplied = await readJson("lyrics/translations/user-supplied.json");
let suppliedCount = 0;
for (const entry of supplied.songs) {
  const song = SONG_LYRICS.find(song => song.id === entry.id);
  const text = await fs.readFile(new URL(`../lyrics/translations/${entry.file}`, import.meta.url), "utf8");
  assert.deepEqual(applyUserProvidedTranslation(song, entry, text), song, `${entry.id}: supplied excerpt must match the subtitle data`);
  assert.equal(song.translationStatus, entry.complete ? "ready" : "partial");
  assert.equal(song.lyrics.filter(line => line.tr).length, entry.entries.length, "Do not apply a supplied verse to later repetitions");
  suppliedCount += entry.entries.length;
  const shiftedExcerpt = structuredClone(entry);
  shiftedExcerpt.entries[0].time += 1;
  assert.throws(() => applyUserProvidedTranslation(song, shiftedExcerpt, text), /timeline changed/);
  if (entry.complete) {
    const incomplete = structuredClone(entry);
    incomplete.entries.pop();
    assert.throws(() => applyUserProvidedTranslation(song, incomplete, text), /cover every subtitle row/);
  }
}
assert.equal(suppliedCount, report.userProvidedTranslatedLines);
assert.equal(count + suppliedCount, report.totalTranslatedLines);
assert.equal(SONG_LYRICS.reduce((sum, song) => sum + song.lyrics.filter(line => line.tr).length, 0), report.totalTranslatedLines);
const casketEntry = supplied.songs.find(song => song.id === "CasketGirl");
const casketText = await fs.readFile(new URL(`../lyrics/translations/${casketEntry.file}`, import.meta.url), "utf8");
const providedChinese = casketText.split(/\r?\n/).filter(line => /[\u3400-\u9fff]/u.test(line) && !/^#|^歌名：/.test(line));
assert.deepEqual(casketEntry.entries.flatMap(row => row.tr.split("／")), providedChinese, "Every supplied Casket Girl sentence must be preserved in order, including parentheses and repeated lines");
assert.equal(casketEntry.entries.length, 55);
assert.equal(SONG_LYRICS.find(song => song.id === "CasketGirl").translationTitle, "棺木女孩");
for (const pendingId of ["You", "OkayGoodbye"]) {
  assert.equal(SONG_LYRICS.find(song => song.id === pendingId).lyrics.some(line => line.tr), false, `${pendingId}: no translation was supplied`);
}
console.log(`PASS ${alignment.songs.length} PDFs / ${count} translated rows plus ${suppliedCount} supplied excerpt rows; original lyrics and timestamps unchanged.`);
