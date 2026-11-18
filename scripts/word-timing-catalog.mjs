import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import vm from "node:vm";
import { SONG_LYRICS } from "../src/song-lyrics.js";
import { FURIGANA_CORRECTIONS } from "../src/furigana-corrections.js";
import { SONG_WORD_TIMING } from "../src/song-word-timing.js";
import { sourceFingerprint, lineId, sha256 } from "../src/karaoke-timing.js";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const fileHash = async file => createHash("sha256").update(await fs.readFile(file)).digest("hex");
const readingContext = { window: {} };
vm.runInNewContext(await fs.readFile(path.join(root, "furigana.js"), "utf8"), readingContext);
function ctcUnits(text){
  const markup = FURIGANA_CORRECTIONS[text] || readingContext.window.JP_FURIGANA?.[text] || text;
  const units = [];
  const plain = value => { for (const hit of value.replace(/<[^>]*>/g, "").matchAll(/[\p{Script=Latin}\p{N}]+(?:['’_-][\p{Script=Latin}\p{N}]+)*|[^\s\p{P}]/gu)) units.push({ text: hit[0], reading: hit[0] }); };
  let cursor = 0;
  for (const hit of markup.matchAll(/<ruby(?:\s[^>]*)?>(.*?)<rt(?:\s[^>]*)?>(.*?)<\/rt>\s*<\/ruby>/gu)){
    plain(markup.slice(cursor, hit.index));
    units.push({ text: hit[1].replace(/<[^>]*>/g, ""), reading: hit[2].replace(/<[^>]*>/g, "") });
    cursor = hit.index + hit[0].length;
  }
  plain(markup.slice(cursor));
  return units;
}
export async function buildCatalog(){
  const entries = [];
  for (const file of ["import-manifest.json", "additional-import-manifest.json", "lasa-import-manifest.json"]){
    const manifest = JSON.parse(await fs.readFile(path.join(root, "lyrics", file), "utf8"));
    entries.push(...manifest.songs.map(entry => ({ ...entry, manifest: `lyrics/${file}` })));
  }
  const phase2 = ["Hachiko", "Garden", "WorkinHard", "MichiTeyuKu", "HedemoNeYoLasa"];
  let phase3 = 0;
  const songs = [];
  for (const song of SONG_LYRICS){
    const entry = entries.find(item => item.id === song.id);
    if (!entry) throw new Error(`Missing LRC manifest: ${song.id}`);
    const lrcFile = path.join(root, "lyrics", entry.file);
    const counts = new Map();
    song.lyrics.forEach(line => counts.set(line.jp, (counts.get(line.jp) || 0) + 1));
    const lines = await Promise.all(song.lyrics.map(async (line, index) => ({
      index, lineId: lineId(song, index), text: line.jp, textSha256: await sha256(line.jp),
      sourceStart: line.sourceTime, sourceEnd: line.sourceEnd ?? null,
      windowStart: line.time, windowEnd: line.endTime ?? null,
      language: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(line.jp) ? "ja" : "en",
      repeated: counts.get(line.jp) > 1,
      ctcUnits: ctcUnits(line.jp),
    })));
    songs.push({
      songId: song.id, title: song.title, youtubeId: song.youtubeId,
      listenUrl: song.listenUrl, manifest: entry.manifest, lrcFile,
      lrcSha256: await fileHash(lrcFile), sourceFingerprint: await sourceFingerprint(song),
      previewOffsetSeconds: song.timingPreview?.offsetSeconds ?? 0,
      batch: song.id === "ItsAlright" ? 1 : phase2.includes(song.id) ? 2 : 3 + Math.floor(phase3++ / 5),
      lineCount: lines.length, untranslatedLines: song.lyrics.filter(line => !line.tr?.trim()).length,
      repeatedLines: lines.filter(line => line.repeated).length,
      missingEndLines: lines.filter(line => line.windowEnd === null).map(line => line.index),
      sourceStatus: "awaiting-listening", candidateStatus: "awaiting-audio",
      reviewedLines: 0, playerVerification: "pending", lines,
    });
  }
  return { format: "karaoke-jobs-v1", songs };
}

export async function writeProcessingCatalog(target = path.join(root, "artifacts/karaoke-processing.json"), externalTarget){
  const catalog = await buildCatalog();
  let previous = { songs: [] };
  try { previous = JSON.parse(await fs.readFile(target, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const summary = { ...catalog, songs: await Promise.all(catalog.songs.map(async ({ lines, ...song }) => {
    const old = previous.songs.find(item => item.songId === song.songId);
    const unchanged = old?.sourceFingerprint === song.sourceFingerprint && old?.lrcSha256 === song.lrcSha256;
    const shipped = SONG_WORD_TIMING[song.songId];
    const shippedValid = shipped?.sourceFingerprint === song.sourceFingerprint && shipped?.lrcSha256 === song.lrcSha256;
    const shippedTimingFingerprint = shippedValid ? await sha256(JSON.stringify(shipped)) : null;
    return { ...song, lrcFile: path.relative(root, song.lrcFile).replaceAll("\\", "/"),
      ...(unchanged ? Object.fromEntries(["sourceStatus", "candidateStatus", "candidateLines", "candidateAnomalies", "candidateRecord", "playerVerification", "notes"].filter(key => old[key] !== undefined).map(key => [key, old[key]])) : {}),
      shippedTimingFingerprint,
      reviewedLines: shippedValid ? shipped.lines.length : 0,
      sourceStatus: shippedValid && shipped.sourceReview ? "listened-confirmed" : unchanged ? old.sourceStatus : song.sourceStatus,
      playerVerification: unchanged && old.shippedTimingFingerprint === shippedTimingFingerprint ? old.playerVerification : "pending",
      ...(old && !unchanged ? { notes: ["Source changed; prior listening and player verification must be reconfirmed."] } : {}),
    };
  })) };
  await fs.mkdir(path.dirname(path.resolve(target)), { recursive: true });
  await fs.writeFile(target, JSON.stringify(summary, null, 2) + "\n");
  if (externalTarget) await fs.writeFile(externalTarget, JSON.stringify(catalog, null, 2) + "\n");
  return catalog;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href){
  const target = process.argv[2] || "artifacts/karaoke-processing.json";
  const catalog = await writeProcessingCatalog(target, process.argv[3]);
  console.log(`${catalog.songs.length} songs, ${catalog.songs.reduce((sum, song) => sum + song.lineCount, 0)} lines; catalog written to ${target}`);
}
