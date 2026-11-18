import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { SONG_LYRICS } from "../src/song-lyrics.js";
import { SONG_WORD_TIMING } from "../src/song-word-timing.js";
import { validateReviewedTiming, sourceFingerprint, timingFingerprint, sha256, lineId } from "../src/karaoke-timing.js";
import { normalizeTimingText } from "../src/karaoke-timing.js";
import { buildCatalog, fileHash } from "./word-timing-catalog.mjs";
import { prepareWordImport, importWordTiming } from "./import-word-timing.mjs";
import { prepareSong } from "./import-song-lyrics.mjs";

const catalog = await buildCatalog();
assert.equal(catalog.songs.length, 29);
assert.equal(catalog.songs.reduce((sum, song) => sum + song.lineCount, 0), 1364);
const offsets = { You: 4, NanNan: 5.33, MichiTeyuKu: 13.42, Kirari: -0.1, SeishunSick: 2 };
for (const job of catalog.songs){
  for (const line of job.lines) assert.equal(normalizeTimingText(line.ctcUnits.map(unit => unit.text).join("")), normalizeTimingText(line.text), "CTC readings must preserve all original text");
  const song = SONG_LYRICS.find(item => item.id === job.songId);
  const manifest = JSON.parse(await fs.readFile(job.manifest, "utf8"));
  const entry = manifest.songs.find(item => item.id === job.songId);
  const imported = prepareSong(entry, await fs.readFile(job.lrcFile, "utf8"), song);
  assert.deepEqual(imported.lyrics.map(line => [line.jp, line.sourceTime, line.sourceEnd, line.time, line.endTime]),
    song.lyrics.map(line => [line.jp, line.sourceTime, line.sourceEnd, line.time, line.endTime]), `${song.id}: reimport changed the timeline`);
  if (song.id in offsets) assert.equal(entry.previewOffsetSeconds, offsets[song.id]);
  const data = SONG_WORD_TIMING[job.songId];
  if (data){
    assert.equal(data.lrcSha256, job.lrcSha256);
    await validateReviewedTiming(song, data);
    const archived = JSON.parse(await fs.readFile(`lyrics/word-timing/reviews/${song.id}.json`, "utf8"));
    assert.deepEqual(archived.lines.filter(line => line.review.status === "passed"), data.lines, "Shipped lines must retain their listening audit");
  }
}
for (const id of Object.keys(SONG_WORD_TIMING)) assert(catalog.songs.some(song => song.songId === id), "Unknown shipped song");
// Synthetic verification only. Never write these attestations into production data.
const song = SONG_LYRICS.find(item => item.id === "ItsAlright");
const job = catalog.songs.find(item => item.songId === song.id);
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "kaze-word-timing-"));
try {
  const audioFile = path.join(temporary, "synthetic-audio.txt");
  await fs.writeFile(audioFile, "Synthetic test fixture; not an audio recording");
  const audioHash = await fileHash(audioFile);
  const source = job.lines[1];
  const chars = Array.from(source.text).filter(text => /[\p{L}\p{N}]/u.test(text));
  const words = chars.map((text, index) => ({ text, start: 9 + index * 0.2, end: 9 + (index + 1) * 0.2 }));
  const line = { ...source, start: words[0].start, end: words.at(-1).end, words };
  line.review = { status: "passed", reviewer: "synthetic-test-only", reviewedAt: "2026-11-14T00:00:00.000Z", timingFingerprint: await timingFingerprint(line) };
  const data = { format: "reviewed-karaoke-v1", songId: song.id, youtubeId: song.youtubeId,
    sourceFingerprint: await sourceFingerprint(song), lrcSha256: job.lrcSha256,
    audioSha256: audioHash, alignmentAudioSha256: audioHash, duration: 200,
    sourceReview: { reviewer: "synthetic-test-only", reviewedAt: "2026-11-14T00:00:00.000Z", audioSha256: audioHash,
      anchors: ["start", "middle", "end"].map((position, index) => ({ position, time: index * 70, note: "synthetic fixture" })) }, lines: [line] };
  const result = await validateReviewedTiming(song, data);
  const overlap = structuredClone(data);
  overlap.lines[0].words[0].end = 13;
  overlap.lines[0].words[1].start = overlap.lines[0].words[0].start;
  overlap.lines[0].end = 13;
  overlap.lines[0].review.timingFingerprint = await timingFingerprint(overlap.lines[0]);
  const overlapping = await validateReviewedTiming(song, overlap);
  assert.equal(overlapping.lines[1].words[0].end, 13, "A sustained word may outlast all following words");
  assert.equal(overlapping.lines[1].words[1].start, 9, "Simultaneous word starts must be accepted");
  const reversed = structuredClone(overlap);
  reversed.lines[0].words[2].start = 8.9;
  reversed.lines[0].review.timingFingerprint = await timingFingerprint(reversed.lines[0]);
  await assert.rejects(validateReviewedTiming(song, reversed), /unordered/);
  const wrongEnd = structuredClone(overlap);
  wrongEnd.lines[0].end = wrongEnd.lines[0].words.at(-1).end;
  wrongEnd.lines[0].review.timingFingerprint = await timingFingerprint(wrongEnd.lines[0]);
  await assert.rejects(validateReviewedTiming(song, wrongEnd), /Invalid, unordered/);
  assert.equal(result.lines[1].start, 9, "Video seconds must not get an additional LRC offset");
  assert.equal(result.lines[2], undefined, "Unreviewed neighbors stay line-level");
  const reject = async (mutate, pattern) => {
    const changed = structuredClone(data); mutate(changed);
    await assert.rejects(validateReviewedTiming(song, changed), pattern);
  };
  await reject(value => { value.youtubeId = "wrong"; }, /video changed/);
  await reject(value => { value.sourceFingerprint = "0".repeat(64); }, /source changed/);
  await reject(value => { value.lines[0].review.status = "pending"; }, /Only listened/);
  await reject(value => { value.lines[0].words[0].start += 0.01; }, /edited after/);
  await reject(value => { value.lines[0].review.reviewer = ""; }, /reviewer required/);
  await reject(value => { value.sourceReview.anchors.pop(); }, /end version/);
  await reject(value => { value.lines.push(value.lines[0]); }, /Duplicate/);
  const badWords = structuredClone(data);
  badWords.lines[0].words[0].end = badWords.lines[0].words[0].start;
  badWords.lines[0].review.timingFingerprint = await timingFingerprint(badWords.lines[0]);
  await assert.rejects(validateReviewedTiming(song, badWords), /zero-duration/);
  const conflict = structuredClone(data);
  conflict.lines[0].end = 18; conflict.lines[0].words.at(-1).end = 18;
  conflict.lines[0].review.timingFingerprint = await timingFingerprint(conflict.lines[0]);
  await assert.rejects(validateReviewedTiming(song, conflict), /overlaps/);
  const changedSong = structuredClone(song); changedSong.lyrics[1].jp += "!";
  await assert.rejects(validateReviewedTiming(changedSong, data), /source changed/);
  const candidate = { ...data, format: "karaoke-candidate-v1", models: { synthetic: true }, versions: { fixture: "test-only" } };
  const review = { ...data, format: "karaoke-review-v1" };
  const imported = await prepareWordImport(review, candidate, audioFile);
  assert.equal(imported.data.lines.length, 1);
  const overlapReview = { ...review, lines: overlap.lines };
  const overlapImport = await prepareWordImport(overlapReview, candidate, audioFile);
  assert.equal(overlapImport.data.lines[0].words[0].end, 13, "Import must not shorten overlapping words");
  const second = { ...job.lines[2], words: [], review: { status: "line-only", note: "Synthetic incomplete mapping" } };
  const saved = { ...review, lines: [line, second] };
  const preserved = await prepareWordImport(review, candidate, audioFile, saved);
  assert.equal(preserved.archive.lines.length, 2, "Partial imports must retain earlier manual decisions");
  const revoked = await prepareWordImport({ ...review, lines: [{ ...line, review: { status: "pending" } }] }, candidate, audioFile, saved);
  assert.equal(revoked.data.lines.length, 0, "Edited or revoked review cannot retain a shipped word clock");
  const staleAudio = { ...review, audioSha256: "0".repeat(64) };
  await assert.rejects(prepareWordImport(staleAudio, candidate, audioFile), /audioSha256 changed/);
  const productionBefore = await fs.readFile("src/song-word-timing.js", "utf8");
  const reviewFile = path.join(temporary, "review.json"), candidateFile = path.join(temporary, "candidate.json");
  await fs.mkdir(path.join(temporary, "src"));
  await fs.writeFile(reviewFile, JSON.stringify(overlapReview));
  await fs.writeFile(candidateFile, JSON.stringify(candidate));
  await importWordTiming(reviewFile, candidateFile, audioFile, { write: true, destination: temporary });
  const generated = await fs.readFile(path.join(temporary, "src/song-word-timing.js"), "utf8");
  const module = await import(`data:text/javascript;base64,${Buffer.from(generated).toString("base64")}`);
  await validateReviewedTiming(song, module.SONG_WORD_TIMING[song.id]);
  assert.equal(module.SONG_WORD_TIMING[song.id].lines.length, 1, "Generated playback module must load");
  assert.equal(module.SONG_WORD_TIMING[song.id].lines[0].end, 13);
  assert.equal(module.SONG_WORD_TIMING[song.id].lines[0].words[1].start, 9);
  const audit = JSON.parse(await fs.readFile(path.join(temporary, `lyrics/word-timing/reviews/${song.id}.json`), "utf8"));
  assert.equal(audit.lines[0].review.reviewer, "synthetic-test-only");
  assert.equal(await fs.readFile("src/song-word-timing.js", "utf8"), productionBefore, "Isolated writes must not affect production");
  assert.equal(lineId(song, 1), line.lineId);
  assert.equal(await sha256(line.text), line.textSha256);
} finally {
  // Only the known fixture directory created above is removed.
  assert(path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep));
  await fs.rm(temporary, { recursive: true, force: true });
}
const context = { window: {} };
vm.runInNewContext(await fs.readFile("karaoke-sources.js", "utf8"), context);
const api = context.window.KARAOKE_SOURCES;
const words = [{ text: "a", start: 1, end: 1.1 }, { text: "b", start: 2, end: 2.1 }];
const nested = [{ text: "a", start: 1, end: 5 }, { text: "b", start: 2, end: 3 }];
assert.equal(api.mapUnitsToWords(["ab"], nested, { strict: true }).timings[0].end, 5, "Ruby groups must keep overlapping source tails");
assert.equal(api.mapUnitsToReferenceTimings(["ab"], ["a", "b"], nested, { strict: true }).timings[0].end, 5, "Readings must keep overlapping reference tails");
assert(api.mapUnitsToWords(["a", "b"], words, { strict: true }).complete);
assert(!api.mapUnitsToWords(["b", "a"], words, { strict: true }).complete, "Repeated matching must never jump backwards");
assert(!api.mapUnitsToWords(["a"], words, { strict: true }).complete, "Partial coverage cannot enable words");
const missing = api.mapUnitsToReferenceTimings(["unknown"], ["あ"], [{ start: 1, end: 2 }], { strict: true });
assert.equal(missing.complete, false);
assert.equal(missing.timings[0], null, "Reading mismatches must not receive invented timing");
for (const removed of ["experiments/its-alright.html", "experiments/its-alright.js", "experiments/its-alright.css", "scripts/serve-karaoke-sample.mjs"]){
  await assert.rejects(fs.access(removed), { code: "ENOENT" }, `${removed} must stay outside production`);
}
console.log(`PASS reviewed timing: ${catalog.songs.length} songs / 1364 lines; source, listening, audio, occurrence, mixed timeline, offsets, reimport, manual preservation and strict reading mapping.`);
console.log("Synthetic fixtures verify integrity and behavior; they do not certify listening accuracy.");
