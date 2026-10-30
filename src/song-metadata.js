export const ALBUMS = Object.freeze({
  prema: { title: "Prema", url: "https://fujiikaze.com/music/prema/", language: "en" },
  best: { title: "Best of Fujii Kaze 2020–2024", url: "https://fujiikaze.com/music/best_of_fujii_kaze_2020-2024/", language: "ja" },
  prePrema: { title: "Pre: Prema", url: "https://fujiikaze.com/music/pre_prema/", language: "ja", checkedAt: "2026-10-30" },
  hehn: { title: "HELP EVER HURT NEVER", url: "https://fujiikaze.com/music/help-ever-hurt-never/", language: "ja", checkedAt: "2026-10-30" },
});
// Album order is for preparation, never the show order.
// IDs checked against the official archive / artist channel on 2026-10-27.
const tracks = [
  ["CasketGirl", "Casket Girl", "prema", "gFOu5r-OuQ4"],
  ["INeedUBack", "I Need U Back", "prema", "ud0lMojStCs"],
  ["Hachiko", "Hachikō", "prema", "OodEsjZ88TQ"],
  ["LoveLikeThis", "Love Like This", "prema", "RoY_ZoWe-eI"],
  ["Prema", "Prema", "prema", "UJgPpzZcxGU"],
  ["ItAintOver", "It Ain’t Over", "prema", "BKFxq3D_dGU"],
  ["You", "You", "prema", "s4UW__ysPEM"],
  ["OkayGoodbye", "Okay, Goodbye", "prema", "EAtRDZQLsgk"],
  ["ForeverYoung", "Forever Young", "prema", "tU953HcYdxU"],
  ["Matsuri", "まつり (Matsuri)", "best", "NwOvu-j_WjY"],
  ["WorkinHard", "Workin’ Hard", "best", "88wHgiUAKoI"],
  ["NanNan", "何なんw (Nan-Nan)", "best", "Nt6ZwuVzOS4"],
  ["Kirari", "きらり (Kirari)", "best", "TcLLpZBWsck"],
  ["Hana", "花 (Hana)", "best", "SfPkl7lol7g"],
  ["Garden", "ガーデン (Garden)", "best", "53rIic2lvKc"],
  ["Damn", "damn", "best", "yP7K2lXr6GA"],
  ["ShinunogaEWa", "死ぬのがいいわ (Shinunoga E-Wa)", "best", "3zh9Wb1KuW8"],
  ["Tabiji", "旅路 (Tabiji)", "best", "29p8FvT_puU"],
  ["MichiTeyuKu", "満ちてゆく (Michi Teyu Ku / Overflowing)", "best", "ptiK8U4WlSc"],
  // Added on 2026-10-30; preserve the original 19 track numbers.
  ["ItsAlright", "It's Alright", "prePrema", "HA3WzXw8vM8"],
  ["Masshiro", "真っ白 (masshiro / pure white)", "prePrema", "XwgL4C2WaU8"],
  ["MoEhWa", "もうええわ (Mo-Eh-Wa)", "hehn", "y4FYCJRjHBg"],
  ["Kaerou", "帰ろう (Kaerou)", "hehn", "goU1Ei8I8uk"],
];
// Provider spellings are separate from the titles shown in the guide.
const KARAOKE_TITLES = {
  Hachiko: ["Hachikō", "Hachiko"],
  ItAintOver: ["It Ain't Over"],
  WorkinHard: ["Workin' Hard", "Workin Hard"],
  OkayGoodbye: ["Okay, Goodbye", "Okay Goodbye"],
  Matsuri: ["まつり", "Matsuri"],
  NanNan: ["何なんw", "Nan-Nan", "Nan Nan"],
  Kirari: ["きらり", "Kirari"],
  Hana: ["花", "Hana"],
  Garden: ["ガーデン", "Garden"],
  ShinunogaEWa: ["死ぬのがいいわ", "Shinunoga E-Wa"],
  Tabiji: ["旅路", "Tabiji"],
  MichiTeyuKu: ["満ちてゆく", "Michi Teyu Ku (Overflowing)", "Michi Teyu Ku", "Overflowing"],
  ItsAlright: ["It's Alright", "It’s Alright"],
  Masshiro: ["真っ白", "masshiro (pure white)", "masshiro", "pure white"],
  MoEhWa: ["もうええわ", "Mo-Eh-Wa", "Mo Eh Wa"],
  Kaerou: ["帰ろう", "Kaerou"],
};
export const SONGS = tracks.map(([id, title, album, youtubeId]) => ({
  id, title, album, youtubeId, artist: "Fujii Kaze",
  language: ALBUMS[album].language, sourceUrl: ALBUMS[album].url,
  karaokeTitle: id === "MichiTeyuKu" ? "Michi Teyu Ku (Overflowing)" : undefined,
  karaokeTitles: KARAOKE_TITLES[id] || [title],
  karaokeArtists: ["Fujii Kaze", "藤井風", "藤井 風"],
  videoSourceUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
  listenUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
  lyricsStatus: "pending", translationStatus: "pending", timingStatus: "pending",
  ...(ALBUMS[album].language === "ja" ? { readingsStatus: "pending" } : {}),
}));
