import fs from "node:fs/promises";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { LOVE_ALL_SERVE_ALL_TRACKS } from "../src/song-metadata.js";

const root = new URL("../", import.meta.url);
const source = JSON.parse(await fs.readFile(new URL("lyrics/translations/lasa-photos.json", root), "utf8"));
assert.equal(new Set(source.songs.map(song => song.id)).size, source.songs.length);
const photos = {};
for (const song of source.songs){
  assert.equal(LOVE_ALL_SERVE_ALL_TRACKS[song.track - 1], song.id, "Photo track number must match the official album");
  assert.ok(song.paragraphs.length && song.paragraphs.every(text => typeof text === "string" && text.trim()));
  for (const file of song.photos){
    assert.match(file, /^PXL_\d+_\d+\.jpg$/);
    const bytes = await fs.readFile(new URL(`lyrics/translations/love-all-serve-all-photos/${file}`, root));
    photos[file] = crypto.createHash("sha256").update(bytes).digest("hex");
  }
  await fs.writeFile(new URL(`lyrics/translations/${song.id}.lasa.zh.txt`, root), song.paragraphs.join("\n\n") + "\n", "utf8");
}
await fs.writeFile(new URL("src/lasa-photo-data.js", root),
  `// Generated from user-provided photos by scripts/import-lasa-photos.mjs.\nexport const LASA_PHOTOS = ${JSON.stringify(source, null, 2)};\n`, "utf8");
await fs.writeFile(new URL("artifacts/lasa-import-2026-11-14/photo-provenance.json", root),
  JSON.stringify({ checkedAt: source.importedAt, source: source.providedArchive, additionalPhotos: source.additionalPhotos || [], photos }, null, 2) + "\n", "utf8");
console.log(`Imported ${source.songs.length} photo translations; ${Object.keys(photos).length} source images verified. No original lyrics or timestamps were inferred.`);
