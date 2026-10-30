# 23 首 LRC 與中文來源清單

整理日期：2026-10-29（Asia/Taipei）。19 首皆以 LRCLIB 作為 LRC 搜尋來源；另保留使用者提供的 marumaru 參考連結。這是歌曲預習目錄的來源候選，不代表演唱會歌單。

2026-10-30 補查新增四首，LRCLIB 均找到帶同步資料的候選，並找到 marumaru 中文對照頁。此次只保存來源中繼資料與連結，未下載或匯入歌詞及譯詞全文。

同日後續由使用者直接提供四份 LRC 與四份 PDF，已完成本機內容匯入。三份 LRC 可試播；〈真っ白.lrc〉初次誤放〈まつり〉，後續已由使用者替換為正確原文，但仍無時間碼。〈真っ白〉採更新後的 34 行原文與 PDF 中文供閱讀，等待含時間碼的 LRC；來源候選網址不作為本機檔案確切下載出處的證明。

LRCLIB 的歌名、歌手、專輯、長度及有無同步資料，記錄於 `artifacts/karaoke-source-search.json`。以下四筆使用使用者指定的 ID：`CasketGirl` → `34071868`、`You` → `39063308`、`OkayGoodbye` → `33609447`、`ForeverYoung` → `24040288`。四筆均出現在先前的搜尋結果中，歌名與歌手相符且帶同步資料；本次直接查詢四筆 `/api/get/:id` 均回傳 HTTP 503，診斷另存於 `artifacts/lrclib-selected-records.json`，不能宣稱已重新讀取成功。

其餘歌曲各列一筆搜尋候選，優先採與目錄專輯相符的紀錄；有明顯 live、remix 或不合理長度的其他紀錄不列作首選。這項篩選僅依中繼資料，不證明歌詞完整或時間準確。marumaru 連結照使用者提供內容保留，本次未擷取或核對其歌詞、翻譯與時間。

| ID | 歌曲 | LRCLIB 紀錄 | 選取依據 | 使用者提供的參考頁 |
|---|---|---|---|---|
| CasketGirl | Casket Girl | [34071868](https://lrclib.net/tracks/34071868) | 使用者指定 | 使用者直接提供全曲中譯，譯者未註明 |
| INeedUBack | I Need U Back | [24709697](https://lrclib.net/tracks/24709697) | 搜尋候選，專輯標為 Prema | [marumaru](https://www.marumaru-x.com/japanese-song/play-vxn5w3jln9) |
| Hachiko | Hachikō | [24709636](https://lrclib.net/tracks/24709636) | 搜尋候選，專輯標為 Prema | [marumaru](https://www.marumaru-x.com/japanese-song/play-pynpv14pnd) |
| LoveLikeThis | Love Like This | [23816202](https://lrclib.net/tracks/23816202) | 搜尋候選，專輯標為 Prema | [marumaru](https://www.marumaru-x.com/japanese-song/play-v7n3k09zok) |
| Prema | Prema | [24517270](https://lrclib.net/tracks/24517270) | 搜尋候選，專輯標為 Prema | [marumaru](https://www.marumaru-x.com/japanese-song/play-evr8434pnm) |
| ItAintOver | It Ain’t Over | [24025678](https://lrclib.net/tracks/24025678) | 搜尋候選，專輯標為 Prema | [marumaru](https://www.marumaru-x.com/japanese-song/play-evr84xwdnm) |
| You | You | [39063308](https://lrclib.net/tracks/39063308) | 使用者指定 | [Vocus：Vince](https://vocus.cc/article/68ccd735fd897800018757ad)，中譯待提供 |
| OkayGoodbye | Okay, Goodbye | [33609447](https://lrclib.net/tracks/33609447) | 使用者指定 | [Vocus：Vince](https://vocus.cc/article/68c6eb64fd89780001188c3c)，中譯待提供 |
| ForeverYoung | Forever Young | [24040288](https://lrclib.net/tracks/24040288) | 使用者指定 | 使用者直接提供部分中譯，譯者未註明 |
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

## 10/30 新增四首來源

| ID | 歌曲 | LRCLIB 同步候選 | 專輯／長度 | 中文對照頁 |
|---|---|---|---|---|
| Masshiro | 真っ白 | [33296576](https://lrclib.net/tracks/33296576) | Pre: Prema／296 秒 | [marumaru](https://www.marumaru-x.com/japanese-song/play-lkrz5qk6re) |
| MoEhWa | もうええわ | [8346844](https://lrclib.net/tracks/8346844) | HELP EVER HURT NEVER／302 秒 | [marumaru](https://www.marumaru-x.com/japanese-song/play-g9r059j0nv) |
| Kaerou | 帰ろう | [8346849](https://lrclib.net/tracks/8346849) | HELP EVER HURT NEVER／284 秒 | [marumaru](https://www.marumaru-x.com/japanese-song/play-evr849dxnm) |
| ItsAlright | It's Alright | [38050371](https://lrclib.net/tracks/38050371) | Pre: Prema／200 秒 | [marumaru](https://www.marumaru-x.com/japanese-song/play-y7okw6yvoq) |

表內候選依歌名、Fujii Kaze 歌手名稱、所屬專輯及同步資料欄位篩選；來源 API 的完整候選中繼資料保存在 `artifacts/karaoke-source-search.json`，不含歌詞文字。AMLL 的四首查詢均未取得候選。〈帰ろう〉另有 311 秒候選；版本長度不同，未對照目前官方 MV 前不判定同步可用。

四個 marumaru 頁面均列有中文對照，並標示翻譯轉自各首官方 YouTube 影片；這是頁面所列出處，未獨立核對影片的中文字幕作者。連結與供稿狀態保存在 `lyrics/translations/external-sources.json`。目前採使用者提供的 PDF 匯入中文，來源標示為「MARUMARU 提供（PDF 未列譯者）」；內容與時間進度見 [中文匯入紀錄](translation-import.md)。

## 取得檔案後

使用者已直接提供 19 首 LRC，並依 [匯入說明](karaoke-import.md) 整理為 936 行原文；另提供 15 份 PDF 的 672 列中文，以及〈Casket Girl〉全曲 55 列、〈Forever Young〉節錄 16 列，目前共 743 列中文，詳見 [中文匯入紀錄](translation-import.md)。網站可依 LRC 時間逐句試播，尚未核對影片同步；未提供的中文仍待整理。原檔使用上表 ID，例如 `CasketGirl.lrc`、`INeedUBack.lrc`，並保留供後續校正。

LRC 的音源時間不一定等於網站官方 MV 的時間。匯入前須核對 `src/song-metadata.js` 的目前影片版本；未核對時只匯入原文，保留同步待補。尤其候選的錄音長度存在差異，不能僅憑同名及帶時間碼就啟用影片同步。
