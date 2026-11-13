import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { SONGS } from "../src/song-metadata.js";
import { SONG_LYRICS } from "../src/song-lyrics.js";
import { LASA_PHOTOS } from "../src/lasa-photo-data.js";
import { prepareSong } from "./import-song-lyrics.mjs";

const root = new URL("../", import.meta.url);
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = async file => JSON.parse(await fs.readFile(new URL(file, root), "utf8"));
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const sourceText = photo => photo.paragraphs.join("\n").split("\n");

export function translationFromParts(parts, photo){
  const lines = sourceText(photo);
  return parts.map(part => {
    const sourceLine = typeof part === "number" ? part : part.sourceLine;
    const source = lines[sourceLine];
    requireValue(Number.isInteger(sourceLine) && source !== undefined, `${photo.id}: invalid photo line reference`);
    const fragment = typeof part === "number" ? source : part.text;
    requireValue(typeof fragment === "string" && fragment.trim() && source.includes(fragment), `${photo.id}: translation is absent from the supplied photo`);
    return fragment;
  }).join("／");
}

export function applyPhotoAlignment(song, entry, photo){
  requireValue(song?.id === entry.id && photo?.id === entry.id, "Photo alignment song mismatch");
  requireValue(hash(JSON.stringify(photo)) === entry.photoSha256, `${song.id}: photo transcription changed; review the alignment`);
  requireValue(song.lyrics.length === entry.lines.length, `${song.id}: LRC line count changed`);
  const lyrics = song.lyrics.map((line, index) => {
    const row = entry.lines[index];
    requireValue(row.index === index && row.jp === line.jp && row.sourceTime === line.sourceTime
      && row.sourceEnd === line.sourceEnd, `${song.id}#${index}: original text or LRC timeline changed`);
    const next = { ...line };
    delete next.tr;
    delete next.translationPendingReason;
    delete next.translationPhotoRef;
    delete next.translationMapping;
    if (row.parts.length){
      next.tr = translationFromParts(row.parts, photo);
      next.translationPhotoRef = row.parts;
      next.translationMapping = "reviewed-photo-lrc-alignment";
    } else {
      requireValue(row.pendingReason, `${song.id}#${index}: an untranslated line needs a reason`);
      next.translationPendingReason = row.pendingReason;
    }
    return next;
  });
  return {
    ...song, lyrics,
    translationStatus: lyrics.every(line => line.tr) ? "ready" : lyrics.some(line => line.tr) ? "partial" : "pending",
    translationCredit: LASA_PHOTOS.credit,
    translationCreditRole: "source",
    translationProvenance: {
      method: "user-provided photos; manually reviewed LRC line alignment",
      file: "lyrics/translations/lasa-alignment.json", photos: photo.photos,
      photoSha256: entry.photoSha256, lrcSha256: entry.lrcSha256,
      importedAt: "2026-11-14",
    },
  };
}

export async function compileAlignment(){
  const manifest = await readJson("lyrics/lasa-import-manifest.json");
  const plan = await readJson("lyrics/translations/lasa-alignment-plan.json");
  requireValue(new Set(plan.songs.map(song => song.id)).size === 6 && manifest.songs.length === 6, "Expected six unique supplied LASA files");
  const songs = [];
  for (const recipe of plan.songs){
    const entry = manifest.songs.find(song => song.id === recipe.id);
    requireValue(entry, `${recipe.id}: missing import manifest`);
    const bytes = await fs.readFile(new URL(entry.file, new URL("lyrics/", root)));
    const parsed = prepareSong(entry, bytes.toString("utf8"), SONGS.find(song => song.id === entry.id));
    const photo = LASA_PHOTOS.songs.find(song => song.id === entry.id);
    requireValue(recipe.sourceLines.length === parsed.lyrics.length, `${entry.id}: reviewed plan no longer matches the supplied LRC`);
    const lines = parsed.lyrics.map((line, index) => {
      const selection = recipe.sourceLines[index];
      const parts = selection === null ? [] : Array.isArray(selection) ? selection : [selection];
      if (parts.length) translationFromParts(parts, photo);
      const pendingReason = parts.length ? undefined : recipe.pendingReasons?.[index] || recipe.defaultPendingReason;
      requireValue(parts.length || pendingReason, `${entry.id}#${index}: missing reason for an untranslated line`);
      return { index, jp: line.jp, sourceTime: line.sourceTime, ...(line.sourceEnd === undefined ? {} : { sourceEnd: line.sourceEnd }), parts,
        ...(pendingReason ? { pendingReason } : {}) };
    });
    songs.push({ id: entry.id, lrcFile: entry.file, lrcSha256: hash(bytes), photoSha256: hash(JSON.stringify(photo)), notes: recipe.notes || [], lines });
  }
  return { reviewedAt: plan.reviewedAt, timing: "Supplied LRC anchors retained; YouTube offset remains unverified.", songs };
}

const stamp = seconds => {
  const value = Math.round(seconds * 100);
  return `[${String(Math.floor(value / 6000)).padStart(2, "0")}:${String(Math.floor(value % 6000 / 100)).padStart(2, "0")}.${String(value % 100).padStart(2, "0")}]`;
};

export async function importPhotoAlignments({ write = false } = {}){
  const alignment = await readJson("lyrics/translations/lasa-alignment.json");
  requireValue(alignment.songs.length === 6 && new Set(alignment.songs.map(song => song.id)).size === 6, "Expected six unique LASA alignments");
  const updates = new Map();
  const report = { importedAt: "2026-11-14", timing: alignment.timing, songs: [] };
  const outputs = [];
  // Validate every source and row before any content is written.
  for (const entry of alignment.songs){
    const bytes = await fs.readFile(new URL(entry.lrcFile, new URL("lyrics/", root)));
    requireValue(hash(bytes) === entry.lrcSha256, `${entry.id}: supplied LRC changed; review the alignment`);
    const photo = LASA_PHOTOS.songs.find(song => song.id === entry.id);
    const song = applyPhotoAlignment(SONG_LYRICS.find(song => song.id === entry.id), entry, photo);
    requireValue(song.timingStatus === "preview", `${entry.id}: import the LRC in preview mode before applying translations`);
    updates.set(song.id, song);
    const rows = song.lyrics.map((line, index) => ({ index, time: line.sourceTime, original: line.jp, ...(line.tr ? { translation: line.tr } : { reason: line.translationPendingReason }) }));
    report.songs.push({ id: song.id, file: entry.lrcFile, lrcSha256: entry.lrcSha256, totalLines: rows.length,
      translatedLines: rows.filter(row => row.translation).length, pending: rows.filter(row => !row.translation), notes: entry.notes });
    const cues = new Map(song.lyrics.map(line => [line.sourceTime, line]));
    // Blank source boundaries clear the previous translation during interludes.
    for (const match of bytes.toString("utf8").matchAll(/^\s*\[(\d+):(\d{1,2}(?:\.\d+)?)\]/gm)){
      const time = Math.round((Number(match[1]) * 60 + Number(match[2])) * 1000) / 1000;
      if (!cues.has(time)) cues.set(time, { jp: "", sourceTime: time });
    }
    const timeline = [...cues.values()].sort((a,b) => a.sourceTime - b.sourceTime);
    const zh = timeline.map(line => `${stamp(line.sourceTime)}${line.tr || ""}`).join("\n") + "\n";
    const bilingual = timeline.flatMap(line => [`${stamp(line.sourceTime)}${line.jp}`, ...(line.tr ? [`${stamp(line.sourceTime)}${line.tr}`] : [])]).join("\n") + "\n";
    outputs.push([`lyrics/translations/${song.id}.zh.lrc`, zh], [`lyrics/translations/${song.id}.bilingual.lrc`, bilingual]);
  }
  report.totalLines = report.songs.reduce((sum, song) => sum + song.totalLines, 0);
  report.translatedLines = report.songs.reduce((sum, song) => sum + song.translatedLines, 0);
  report.pendingLines = report.totalLines - report.translatedLines;
  for (const song of report.songs) console.log(`${song.id}: ${song.translatedLines}/${song.totalLines} Chinese rows aligned to supplied LRC`);
  if (!write) return report;
  const stableFields = new Set(SONGS.flatMap(song => Object.keys(song)).filter(key => !key.endsWith("Status")));
  const prepared = Object.fromEntries(SONG_LYRICS.filter(song => song.lyrics.some(line => line.jp)).map(song => [song.id,
    Object.fromEntries(Object.entries(updates.get(song.id) || song).filter(([key]) => key !== "photoTranslation" && !stableFields.has(key)))]));
  await fs.writeFile(new URL("src/song-lyrics.js", root),
    `// Imported from user-supplied local files; source and alignment are recorded per song.\nimport { SONGS } from "./song-metadata.js";\nimport { withPhotoTranslations } from "./photo-translations.js";\nconst prepared = ${JSON.stringify(prepared, null, 2)};\nexport const SONG_LYRICS = SONGS.map(song => withPhotoTranslations({ ...song, lyrics: [], ...prepared[song.id] }));\n`, "utf8");
  for (const [file, text] of outputs) await fs.writeFile(new URL(file, root), text, "utf8");
  await fs.writeFile(new URL("artifacts/lasa-lrc-alignment-2026-11-14/report.json", root), JSON.stringify(report, null, 2) + "\n", "utf8");
  return report;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url){
  const mode = process.argv[2];
  requireValue([undefined, "--compile", "--write"].includes(mode), "Usage: node scripts/import-lasa-alignment.mjs [--compile|--write]");
  if (mode === "--compile"){
    const alignment = await compileAlignment();
    await fs.writeFile(new URL("lyrics/translations/lasa-alignment.json", root), JSON.stringify(alignment, null, 2) + "\n", "utf8");
    console.log(`Compiled reviewed photo alignment for ${alignment.songs.length} supplied LRC files.`);
  } else await importPhotoAlignments({ write: mode === "--write" });
}
