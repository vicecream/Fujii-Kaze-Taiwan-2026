import fs from "node:fs/promises";
import path from "node:path";
import { SONGS } from "../src/song-metadata.js";
import "../karaoke-sources.js";

const args = process.argv.slice(2);
const retryErrors = args.includes("--retry-errors");
const output = args.find(arg => arg !== "--retry-errors") || "artifacts/karaoke-source-search.json";
let previous;
try { previous = JSON.parse(await fs.readFile(output, "utf8")); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const report = {
  checkedAt: new Date().toISOString(),
  architecture: "https://github.com/watain666/Vaundy-Taiwan-2026/blob/main/karaoke-sources.js",
  note: "Source candidates only. No lyric text is saved. Video alignment and permission to use text remain unverified.",
  songs: [],
};
for (const song of SONGS) {
  const old = previous?.songs.find(item => item.id === song.id);
  if (retryErrors && old && Object.values(old.sources).every(source => source.state !== "error")) {
    report.songs.push(old);
    continue;
  }
  const sources = await globalThis.KARAOKE_SOURCES.discover(song, { timeoutMs: 10000 });
  for (const provider of Object.keys(sources)) {
    sources[provider].checkedAt = new Date().toISOString();
    if (sources[provider].state === "error" && old?.sources[provider]?.state === "found") {
      sources[provider] = {
        ...old.sources[provider],
        checkedAt: old.sources[provider].checkedAt || previous.checkedAt,
        lastAttempt: { state: "error", checkedAt: sources[provider].checkedAt },
      };
    }
  }
  report.songs.push({ id: song.id, title: song.title, youtubeId: song.youtubeId, sources });
  console.log(`${song.id}: AMLL ${sources.amll.state}; LRCLIB ${sources.lrclib.state}`);
}
await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Saved metadata for ${report.songs.length} songs to ${output}`);
