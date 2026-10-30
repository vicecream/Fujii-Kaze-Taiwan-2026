const textOf = part => Array.isArray(part)
  ? part.map(item => typeof item === "string" ? item : item?.text || "").join("")
  : String(part ?? "");
export function songCapabilities(song){
  const lines = Array.isArray(song?.lyrics) ? song.lyrics : [];
  const hasOriginal = lines.some(line => textOf(line.jp).trim());
  const hasTranslation = lines.some(line => textOf(line.tr).trim());
  const originalLines = lines.filter(line => textOf(line.jp).trim());
  const translationComplete = hasTranslation && originalLines.length > 0
    && originalLines.every(line => textOf(line.tr).trim());
  const timed = hasOriginal && lines.every((line, index) =>
    typeof line.time === "number" && Number.isFinite(line.time) && line.time >= 0
    && (index === 0 || line.time >= lines[index - 1].time));
  return {
    hasOriginal, hasTranslation, translationComplete, timed,
    readings: song?.language === "ja" && hasOriginal && song?.readingsStatus !== "pending",
    japanese: song?.language === "ja",
  };
}
