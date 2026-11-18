// Shared by the player and the offline importer. All times use the video clock.
export const TIMING_FORMAT = "reviewed-karaoke-v1";
export const normalizeTimingText = value => String(value ?? "").normalize("NFKC")
  .toLowerCase().replace(/[\p{P}\p{Z}\s]/gu, "");
export const lineId = (song, index) => `${song.id}:${index}:${song.lyrics[index].sourceTime}`;

export async function sha256(value){
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function sourceSnapshot(song){
  return JSON.stringify({
    songId: song.id, youtubeId: song.youtubeId,
    offset: song.timingPreview?.offsetSeconds ?? song.timingAlignment?.offsetSeconds ?? 0,
    lines: song.lyrics.map((line, index) => ({
      index, text: line.jp, sourceStart: line.sourceTime, sourceEnd: line.sourceEnd ?? null,
      start: line.time, end: line.endTime ?? null,
    })),
  });
}
export const sourceFingerprint = song => sha256(sourceSnapshot(song));
export const timingFingerprint = line => sha256(JSON.stringify({
  start: line.start, end: line.end,
  words: (line.words || []).map(({ text, start, end }) => ({ text, start, end })),
}));

const requireValue = (ok, message) => { if (!ok) throw new Error(message); };
const finite = value => typeof value === "number" && Number.isFinite(value);
const hash = value => /^[a-f0-9]{64}$/.test(value || "");
export function validateAttestation(record, label){
  requireValue(typeof record?.reviewer === "string" && record.reviewer.trim(), `${label}: reviewer required`);
  requireValue(typeof record.reviewedAt === "string" && /T/.test(record.reviewedAt)
    && Number.isFinite(Date.parse(record.reviewedAt)), `${label}: reviewedAt required`);
}

export async function validateReviewedTiming(song, data){
  requireValue(data?.format === TIMING_FORMAT && data.songId === song.id, "Wrong timing format or song");
  requireValue(data.youtubeId === song.youtubeId, `${song.id}: video changed`);
  requireValue(data.sourceFingerprint === await sourceFingerprint(song), `${song.id}: lyric/timeline source changed`);
  requireValue(hash(data.lrcSha256) && hash(data.audioSha256) && hash(data.alignmentAudioSha256), "Source hashes required");
  requireValue(finite(data.duration) && data.duration > 0, "Audio duration required");
  validateAttestation(data.sourceReview, "Source review");
  requireValue(data.sourceReview.audioSha256 === data.audioSha256, "Source review uses different audio");
  for (const position of ["start", "middle", "end"]){
    const anchor = data.sourceReview.anchors?.find(item => item.position === position);
    requireValue(finite(anchor?.time) && anchor.time >= 0 && anchor.time <= data.duration
      && typeof anchor.note === "string" && anchor.note.trim(), `Missing ${position} version anchor`);
  }
  const anchors = ["start", "middle", "end"].map(position => data.sourceReview.anchors.find(item => item.position === position).time);
  requireValue(anchors[0] < anchors[1] && anchors[1] < anchors[2], "Version anchors must be ordered");
  requireValue(Array.isArray(data.lines), "Timing lines required");
  const indexed = {};
  let previousIndex = -1;
  for (const line of data.lines){
    const local = song.lyrics[line.index];
    requireValue(Number.isInteger(line.index) && line.index > previousIndex && local, "Duplicate or unordered occurrence");
    previousIndex = line.index;
    requireValue(line.lineId === lineId(song, line.index) && line.text === local.jp
      && line.sourceStart === local.sourceTime && (line.sourceEnd ?? null) === (local.sourceEnd ?? null), "Line identity changed");
    requireValue(line.textSha256 === await sha256(line.text), "Line text hash changed");
    requireValue(line.review?.status === "passed", "Only listened, passed lines may ship");
    validateAttestation(line.review, line.lineId);
    requireValue(line.review.timingFingerprint === await timingFingerprint(line), "Timing edited after listening");
    requireValue(finite(line.start) && finite(line.end) && line.start >= 0
      && line.end > line.start && line.end <= data.duration, "Invalid line range");
    requireValue(Array.isArray(line.words) && line.words.length > 0, "Missing word timing");
    requireValue(normalizeTimingText(line.words.map(word => word.text).join("")) === normalizeTimingText(line.text), "Incomplete word text");
    // Overlapping tails and simultaneous starts are valid; source order stays fixed.
    let previousStart = line.start;
    for (const word of line.words){
      requireValue(typeof word.text === "string" && normalizeTimingText(word.text), "Empty timing word");
      requireValue(finite(word.start) && finite(word.end) && word.start >= previousStart
        && word.end > word.start && word.end <= line.end, "Invalid, unordered or zero-duration word");
      previousStart = word.start;
    }
    requireValue(line.start === line.words[0].start && line.end === Math.max(...line.words.map(word => word.end)), "Line bounds must equal measured word bounds");
    indexed[line.index] = { ...line, granularity: "word", reviewed: true };
  }
  // Validate the mixed timeline, including fallback lines between passed rows.
  const starts = song.lyrics.map((line, index) => indexed[index]?.start ?? line.time);
  for (let index = 0; index < starts.length; index++){
    requireValue(finite(starts[index]) && (index === 0 || starts[index] >= starts[index - 1]), "Mixed timeline reverses");
    if (indexed[index] && index + 1 < starts.length)
      requireValue(indexed[index].end <= starts[index + 1], "Reviewed line overlaps the next occurrence");
  }
  return { songId: song.id, lines: indexed, matchedLines: data.lines.length, totalLines: song.lyrics.length };
}
