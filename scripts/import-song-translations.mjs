import fs from "node:fs/promises";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { SONGS } from "../src/song-metadata.js";
import { SONG_LYRICS } from "../src/song-lyrics.js";

const normalise = text => String(text).normalize("NFKC").replace(/[\s\p{P}\p{S}]/gu, "");
function requireValue(condition, message) { if (!condition) throw new Error(message); }

export function applyTranslationAlignment(song, alignment, evidence) {
  requireValue(song && song.id === alignment.id && evidence.id === song.id, "Translation song ID mismatch");
  requireValue(alignment.lines.length === song.lyrics.length, `${song.id}: line count changed; realign the translations`);
  requireValue(alignment.sha256 === evidence.sha256, `${song.id}: translation evidence changed`);
  const lyrics = song.lyrics.map((line, index) => {
    const row = alignment.lines[index];
    requireValue(row.index === index && row.jp === line.jp && row.time === line.time, `${song.id}#${index}: original text or timeline changed`);
    if (!row.tr) return { ...line };
    requireValue(typeof row.tr === "string" && !/[<>]/.test(row.tr), `${song.id}#${index}: translation must be plain text`);
    requireValue(Array.isArray(row.sourcePairs) && row.sourcePairs.length, `${song.id}#${index}: missing PDF evidence`);
    const source = row.sourcePairs.map(sourceIndex => {
      const pair = evidence.pairs[sourceIndex];
      requireValue(pair && pair.index === sourceIndex, `${song.id}#${index}: invalid PDF pair reference`);
      return pair.translation;
    }).join("");
    requireValue(normalise(source).includes(normalise(row.tr)), `${song.id}#${index}: translation differs from the supplied PDF`);
    return { ...line, tr: row.tr, translationRef: row.sourcePairs, translationMapping: row.method };
  });
  return { ...song, lyrics, translationStatus: lyrics.every(line => line.tr?.trim()) ? "ready" : lyrics.some(line => line.tr?.trim()) ? "partial" : "pending" };
}

export async function importTranslations({ write = false, root = new URL("../", import.meta.url) } = {}) {
  const directory = new URL("lyrics/translations/", root);
  const sources = JSON.parse(await fs.readFile(new URL("sources.json", directory), "utf8"));
  const evidence = JSON.parse(await fs.readFile(new URL("extracted-pairs.json", directory), "utf8"));
  const alignment = JSON.parse(await fs.readFile(new URL("alignment.json", directory), "utf8"));
  requireValue(alignment.songs.length === sources.songs.length && evidence.length === sources.songs.length, "Incomplete translation input set");
  const updates = new Map();
  const report = { source: "user-provided PDF files", videoTiming: "unchanged; LRC preview remains unverified", songs: [] };
  for (const entry of alignment.songs) {
    requireValue(!updates.has(entry.id), `Duplicate translation alignment: ${entry.id}`);
    const source = sources.songs.find(song => song.id === entry.id);
    const proof = evidence.find(song => song.id === entry.id);
    requireValue(source && proof && proof.pdf === entry.pdf, `${entry.id}: missing source metadata`);
    const bytes = await fs.readFile(new URL(encodeURIComponent(entry.pdf), directory));
    requireValue(crypto.createHash("sha256").update(bytes).digest("hex") === entry.sha256, `${entry.id}: PDF changed; extract it again`);
    const song = applyTranslationAlignment(SONG_LYRICS.find(song => song.id === entry.id), entry, proof);
    const translated = song.lyrics.filter(line => line.tr?.trim()).length;
    song.translationCredit = source.translationCredit || "MARUMARU 提供（PDF 未列譯者）";
    song.translationCreditRole = source.translationCreditRole || "source";
    song.translationCreditUrl = source.translationCreditUrl || source.referenceUrl;
    song.translationSourceUrl = source.translationSourceUrl || source.referenceUrl;
    song.translationProvenance = { file: entry.pdf, sha256: entry.sha256, method: "user-provided PDF; original wording retained", importedAt: "2026-10-30" };
    updates.set(entry.id, song);
    Object.assign(source, {
      pdf: entry.pdf, sha256: entry.sha256, translationCredit: song.translationCredit,
      translationCreditRole: song.translationCreditRole, translationCreditUrl: song.translationCreditUrl,
      translationSourceUrl: song.translationSourceUrl, status: song.translationStatus, translatedLines: translated,
    });
    report.songs.push({
      id: entry.id, pdf: entry.pdf, sha256: entry.sha256, totalLines: song.lyrics.length, translatedLines: translated,
      status: song.translationStatus,
      sharedLines: entry.lines.filter(line => line.method === "shared-pdf-sentence").map(line => line.index),
      pending: song.lyrics.flatMap((line, index) => line.tr?.trim() ? [] : [{ index, time: line.time, original: line.jp, reason: "No corresponding Chinese translation in the supplied PDF" }]),
    });
    console.log(`${entry.id}: ${translated}/${song.lyrics.length} lines; translation ${song.translationStatus}`);
  }
  report.translatedLines = report.songs.reduce((sum, song) => sum + song.translatedLines, 0);
  report.pendingLines = report.songs.reduce((sum, song) => sum + song.pending.length, 0);
  if (!write) { console.log("Preview only. Add --write to import the aligned translations."); return report; }
  const stableFields = new Set(SONGS.flatMap(song => Object.keys(song)).filter(key => !key.endsWith("Status")));
  const prepared = Object.fromEntries(SONG_LYRICS.map(song => {
    const updated = updates.get(song.id) || song;
    return [song.id, Object.fromEntries(Object.entries(updated).filter(([key]) => !stableFields.has(key)))];
  }));
  const serialize = value => JSON.stringify(value, null, 2).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  await fs.writeFile(new URL("src/song-lyrics.js", root),
    `// Imported from user-supplied local files; source and alignment are recorded per song.\nimport { SONGS } from "./song-metadata.js";\nconst prepared = ${serialize(prepared)};\nexport const SONG_LYRICS = SONGS.map(song => ({ ...song, lyrics: [], ...prepared[song.id] }));\n`, "utf8");
  await fs.writeFile(new URL("sources.json", directory), serialize(sources) + "\n", "utf8");
  await fs.writeFile(new URL("artifacts/translations-import-report.json", root), serialize(report) + "\n", "utf8");
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  requireValue(args.length === 0 || (args.length === 1 && args[0] === "--write"), "Usage: node scripts/import-song-translations.mjs [--write]");
  importTranslations({ write: args.includes("--write") }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
