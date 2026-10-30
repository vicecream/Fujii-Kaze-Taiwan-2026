# 19 首 LRC 來源清單

整理日期：2026-10-29（Asia/Taipei）。19 首皆以 LRCLIB 作為 LRC 搜尋來源；另保留使用者提供的 marumaru 參考連結。這是歌曲預習目錄的來源候選，不代表演唱會歌單。

LRCLIB 的歌名、歌手、專輯、長度及有無同步資料，記錄於 `artifacts/karaoke-source-search.json`。以下四筆使用使用者指定的 ID：`CasketGirl` → `34071868`、`You` → `39063308`、`OkayGoodbye` → `33609447`、`ForeverYoung` → `24040288`。四筆均出現在先前的搜尋結果中，歌名與歌手相符且帶同步資料；本次直接查詢四筆 `/api/get/:id` 均回傳 HTTP 503，診斷另存於 `artifacts/lrclib-selected-records.json`，不能宣稱已重新讀取成功。

其餘歌曲各列一筆搜尋候選，優先採與目錄專輯相符的紀錄；有明顯 live、remix 或不合理長度的其他紀錄不列作首選。這項篩選僅依中繼資料，不證明歌詞完整或時間準確。marumaru 連結照使用者提供內容保留，本次未擷取或核對其歌詞、翻譯與時間。

| ID | 歌曲 | LRCLIB 紀錄 | 選取依據 | 使用者提供的參考頁 |
|---|---|---|---|---|
| CasketGirl | Casket Girl | [34071868](https://lrclib.net/tracks/34071868) | 使用者指定 | 同左 |
| INeedUBack | I Need U Back | [24709697](https://lrclib.net/tracks/24709697) | 搜尋候選，專輯標為 Prema | [marumaru](https://www.marumaru-x.com/japanese-song/play-vxn5w3jln9) |
| Hachiko | Hachikō | [24709636](https://lrclib.net/tracks/24709636) | 搜尋候選，專輯標為 Prema | [marumaru](https://www.marumaru-x.com/japanese-song/play-pynpv14pnd) |
| LoveLikeThis | Love Like This | [23816202](https://lrclib.net/tracks/23816202) | 搜尋候選，專輯標為 Prema | [marumaru](https://www.marumaru-x.com/japanese-song/play-v7n3k09zok) |
| Prema | Prema | [24517270](https://lrclib.net/tracks/24517270) | 搜尋候選，專輯標為 Prema | [marumaru](https://www.marumaru-x.com/japanese-song/play-evr8434pnm) |
| ItAintOver | It Ain’t Over | [24025678](https://lrclib.net/tracks/24025678) | 搜尋候選，專輯標為 Prema | [marumaru](https://www.marumaru-x.com/japanese-song/play-evr84xwdnm) |
| You | You | [39063308](https://lrclib.net/tracks/39063308) | 使用者指定 | 同左 |
| OkayGoodbye | Okay, Goodbye | [33609447](https://lrclib.net/tracks/33609447) | 使用者指定 | 同左 |
| ForeverYoung | Forever Young | [24040288](https://lrclib.net/tracks/24040288) | 使用者指定 | 同左 |
| Matsuri | まつり | [12492714](https://lrclib.net/tracks/12492714) | 搜尋候選，專輯標為 Best of Fujii Kaze 2020–2024 | [marumaru](https://www.marumaru-x.com/japanese-song/play-vxn5wx0wn9) |
| WorkinHard | Workin’ Hard | [12400390](https://lrclib.net/tracks/12400390) | 搜尋候選，專輯標為 Best of Fujii Kaze 2020–2024 | [marumaru](https://www.marumaru-x.com/japanese-song/play-lvnw1950o7) |
| NanNan | 何なんw | [8346846](https://lrclib.net/tracks/8346846) | 搜尋候選，專輯標為 HELP EVER HURT NEVER | [marumaru](https://www.marumaru-x.com/japanese-song/play-wzrv4zxwr3) |
| Kirari | きらり | [14510544](https://lrclib.net/tracks/14510544) | 搜尋候選，專輯標為 Best of Fujii Kaze 2020–2024 | [marumaru](https://www.marumaru-x.com/japanese-song/play-14o717y7ok) |
| Hana | 花 | [31183752](https://lrclib.net/tracks/31183752) | 搜尋候選，專輯標為 Best of Fujii Kaze 2020–2024 | [marumaru](https://www.marumaru-x.com/japanese-song/play-2go28v63o3) |
| Garden | ガーデン | [20946392](https://lrclib.net/tracks/12659449) | 搜尋候選，專輯標為 Best of Fujii Kaze 2020–2024 | [marumaru](https://www.marumaru-x.com/japanese-song/play-94ogl3p0r0) |
| Damn | damn | [11917118](https://lrclib.net/tracks/11917118) | 搜尋候選，專輯標為 Best of Fujii Kaze 2020–2024 | [marumaru](https://www.marumaru-x.com/japanese-song/play-ywn1zkkjr7) |
| ShinunogaEWa | 死ぬのがいいわ | [21695208](https://lrclib.net/tracks/21695208) | 搜尋候選，專輯標為 Best of Fujii Kaze 2020–2024 | [marumaru](https://www.marumaru-x.com/japanese-song/play-14o71m3dok) |
| Tabiji | 旅路 | [35676924](https://lrclib.net/tracks/35676924) | 搜尋候選，專輯標為 Best of Fujii Kaze 2020–2024 | [marumaru](https://www.marumaru-x.com/japanese-song/play-vxn5w758n9) |
| MichiTeyuKu | 満ちてゆく | [30423403](https://lrclib.net/tracks/30423403) | 搜尋候選，專輯標為満ちてゆく | [marumaru](https://www.marumaru-x.com/japanese-song/play-wzrv48xlr3) |

## 取得檔案後

使用者已直接提供 19 首 LRC，並依 [匯入說明](karaoke-import.md) 整理為 936 行原文；另於 2026-10-30 提供這 15 首的 PDF，已加入 672 列中文，詳見 [中文匯入紀錄](translation-import.md)。網站可依 LRC 時間逐句試播，尚未核對影片同步；日文讀音及未提供的中文仍待整理。原檔使用上表 ID，例如 `CasketGirl.lrc`、`INeedUBack.lrc`，並保留供後續校正。

LRC 的音源時間不一定等於網站官方 MV 的時間。匯入前須核對 `src/song-metadata.js` 的目前影片版本；未核對時只匯入原文，保留同步待補。尤其候選的錄音長度存在差異，不能僅憑同名及帶時間碼就啟用影片同步。
