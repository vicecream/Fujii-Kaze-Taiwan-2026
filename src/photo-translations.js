import { LASA_PHOTOS } from "./lasa-photo-data.js";

const byId = new Map(LASA_PHOTOS.songs.map(song => [song.id, song]));

// Photo-only Chinese must never become invented Japanese or synchronized cues.
// Existing bilingual subtitles retain their wording, timing and provenance.
export function withPhotoTranslations(song){
  const entry = byId.get(song.id);
  if (!entry) return song;
  const photoTranslation = { ...entry, credit: LASA_PHOTOS.credit, importedAt: LASA_PHOTOS.importedAt };
  if (song.lyrics?.some(line => String(line.jp || "").trim())) return { ...song, photoTranslation };
  return {
    ...song,
    lyrics: entry.paragraphs.flatMap((paragraph, paragraphIndex) => paragraph.split("\n").map(tr => ({
      jp: "", tr, photoParagraph: paragraphIndex,
    }))),
    lyricsStatus: "pending",
    translationStatus: entry.complete ? "ready" : "partial",
    timingStatus: "pending",
    readingsStatus: "pending",
    translationCredit: LASA_PHOTOS.credit,
    translationCreditRole: "source",
    photoTranslation,
  };
}
