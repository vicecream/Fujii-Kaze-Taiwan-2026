// Verify generated candidates without inventing listening attestations.
import fs from "node:fs/promises";
import path from "node:path";
import { buildCatalog, fileHash } from "./word-timing-catalog.mjs";
import { normalizeTimingText } from "../src/karaoke-timing.js";

const directory = process.argv[2];
if (!directory) throw new Error("Usage: node scripts/check-karaoke-candidates.mjs external-work-directory [--strict] [--write-report]");
const catalog = await buildCatalog();
const report = { format: "karaoke-candidate-validation-v1", checkedAt: new Date().toISOString(), songs: [], errors: [] };
for (const job of catalog.songs){
  const work = path.resolve(directory, job.songId);
  let candidate;
  try { candidate = JSON.parse(await fs.readFile(path.join(work, "candidate.json"), "utf8")); }
  catch (error){
    if (error.code !== "ENOENT") throw error;
    report.songs.push({ songId: job.songId, expectedLines: job.lineCount, state: "pending" });
    continue;
  }
  const fail = message => report.errors.push(`${job.songId}: ${message}`);
  for (const key of ["youtubeId", "sourceFingerprint", "lrcSha256"])
    if (candidate[key] !== job[key]) fail(`${key} differs from current source`);
  if (candidate.format !== "karaoke-candidate-v1" || candidate.status !== "unreviewed") fail("Candidate must remain explicitly unreviewed");
  for (const [file, key] of [["source.webm", "audioSha256"], ["vocals.wav", "alignmentAudioSha256"]]){
    try { if (await fileHash(path.join(work, file)) !== candidate[key]) fail(`${file} hash changed`); }
    catch (error){ if (error.code === "ENOENT") fail(`Missing ${file}`); else throw error; }
  }
  const seen = new Set(), issues = [];
  let previousIndex = -1, units = 0;
  for (const line of candidate.lines || []){
    const source = job.lines[line.index];
    if (!source || seen.has(line.index) || line.index <= previousIndex){ fail(`Invalid occurrence index ${line.index}`); continue; }
    seen.add(line.index); previousIndex = line.index;
    for (const key of ["lineId", "text", "textSha256", "sourceStart", "sourceEnd"])
      if (line[key] !== source[key]) fail(`Line ${line.index}: ${key} differs from LRC occurrence`);
    if (line.review?.status !== "pending") fail(`Line ${line.index}: automatic output cannot approve listening`);
    const reasons = [];
    if (!Array.isArray(line.words) || !line.words.length) reasons.push("no-word-timing");
    const words = line.words || [];
    if (normalizeTimingText(words.map(word => word.text).join("")) !== normalizeTimingText(source.text)) reasons.push("incomplete-text");
    let previousStart = line.windowStart;
    for (const word of words){
      if (!Number.isFinite(word.start) || !Number.isFinite(word.end) || word.end <= word.start
        || word.start < previousStart || word.end > line.windowEnd || word.end > candidate.duration) reasons.push("invalid-order-or-bounds");
      previousStart = word.start;
      units++;
    }
    if (words.length && (line.start !== words[0].start || line.end !== Math.max(...words.map(word => word.end)))) reasons.push("line-boundary-mismatch");
    if (reasons.length) issues.push({ index: line.index, reasons: [...new Set(reasons)] });
  }
  report.songs.push({ songId: job.songId, expectedLines: job.lineCount, generatedLines: candidate.lines.length,
    units, state: candidate.lines.length === job.lineCount ? "generated-unreviewed" : "processing", structuralIssues: issues });
}
report.generatedSongs = report.songs.filter(song => song.state === "generated-unreviewed").length;
report.generatedLines = report.songs.reduce((sum, song) => sum + (song.generatedLines || 0), 0);
report.unresolvedLines = report.songs.reduce((sum, song) => sum + (song.structuralIssues?.length || 0), 0);
if (process.argv.includes("--write-report")){
  const target = "artifacts/karaoke-candidate-validation.json";
  await fs.writeFile(target + ".tmp", JSON.stringify(report, null, 2) + "\n");
  await fs.rename(target + ".tmp", target);
}
console.log(`${report.generatedSongs}/29 complete candidates; ${report.generatedLines} generated lines; ${report.unresolvedLines} lines need structural repair; ${report.errors.length} source/identity errors.`);
console.log("Generated timing is unreviewed. These checks do not certify auditory accuracy.");
for (const error of report.errors) console.error(error);
if (report.errors.length || (process.argv.includes("--strict") && (report.generatedSongs !== 29 || report.unresolvedLines))) process.exitCode = 1;
