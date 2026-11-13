# LOVE ALL SERVE ALL 曲目與照片譯詞匯入

2026-11-14（Asia/Taipei）整理。本機版本 v2.1.2，尚未部署。

依 [藤井風官方專輯頁](https://fujiikaze.com/music/love_all_serve_all/) 收錄通常盤 11 首，未包含《LOVE ALL COVER ALL》翻唱附碟。原網站已有 5 首，新增 6 首後合計 29 首，沒有重複歌曲。原有 23 首 ID、歌曲編號、原文、字幕時間及中譯保留；5 首移至 LASA 分組，畫面依官方專輯曲序排列。

## 內容狀態

| 曲序 | 歌曲 | 程式 ID | 目前中文狀態 |
|---|---|---|---|
| 01 | きらり | Kirari | 照片不足，保留既有同步字幕 |
| 02 | まつり | Matsuri | 僅裁切片段，保留既有同步字幕 |
| 03 | へでもねーよ (LASA edit) | HedemoNeYoLasa | 53／53 行依 LRC 對齊；新增照片已補齊前段 |
| 04 | やば。 | Yaba | 43／43 行依 LRC 對齊 |
| 05 | 燃えよ | MoEhYo | 43／43 行依 LRC 對齊；與〈もうええわ〉不同曲 |
| 06 | ガーデン | Garden | 48 行照片版本，與既有字幕分開呈現 |
| 07 | damn | Damn | 50 行照片版本，含照片保留的英文段落 |
| 08 | ロンリーラプソディ | LonelyRhapsody | 40／41 行依 LRC 對齊；一處原文差異待確認 |
| 09 | それでは、 | ByeForNow | 24／24 行依 LRC 對齊 |
| 10 | 青春病 | SeishunSick | 46／49 行依 LRC 對齊；一處文字差異與兩段哼唱待補 |
| 11 | 旅路 | Tabiji | 44 行照片版本，與既有字幕分開呈現 |

照片原始轉錄為 368 行。使用者提供六首日文 LRC，共 253 個非空原文句；依照片拆句、合併與實際重複段落對齊後，249 行有中文，4 行待補。全站目前 1,364 行原文、1,156 行中文。六首的 251 行含日文歌詞、194 組不重複句已補齊振り仮名與羅馬拼音；兩行英文哼唱維持原文。LRC 時間原樣保留，可逐行試播、點句跳轉、中文跟隨與讀音切換；影片偏移及逐字時間尚未聽感校正。

### 逐句對齊與缺漏

- 〈やば。〉將照片「趕緊出發吧，往遠方去」拆至 `0:49.76` 與 `0:52.10`，後者再合併「直到抵達高處」；省寫的重複句以相同日文對應既有譯詞。
- 〈燃えよ〉尾段 `4:00.58`、`4:10.94` 的三次「燃えよ」以照片的「燃燒吧」保留相同重複次數。
- 〈それでは、〉`0:38.66`、`0:43.75` 的日文跨句修飾與中文語序不同，兩列共用「你引導了方向／給搖擺不定的我」，不顛倒照片譯文。
- 〈へでもねーよ (LASA edit)〉新增照片 `PXL_20261113_180511229.jpg` 補入前段 21 行中文，完成 53／53 句對齊。`0:36.02` 與 `0:46.90` 雖同為「おどれ」，依照片語境分別採「該死啊(怒)」與「起舞吧」；重複副歌及尾段短句使用相應的完整譯詞或原有片語。
- 〈ロンリーラプソディ〉`3:14.14` 的 LRC 是「君は誰なの 僕は君だよ」（我是你），照片卻印「你是誰？我就是我」。保留原 LRC，該列中文留白待確認。
- 〈青春病〉`4:19.36` 的 LRC 是「いつの日か粉になって知るだけ」，和前段「散るだけ」及照片「化為塵土消散殆盡」不同，該列中文留白。`4:28.05` 的 Oh、`4:42.38` 的 Ah 無照片中譯，也留白。

完整逐句對應與待補原因見 `artifacts/lasa-lrc-alignment-2026-11-14/report.json`。原有 23 首原文、翻譯與時間均與匯入前快照核對不變。

照片依歌曲標題、官方曲序、重疊段落核對，不依檔案排序直接分配。〈へでもねーよ〉前後段已由兩張照片接合，原有照片轉錄內容保留。〈damn〉照片上的英文原樣保留，沒有另加中文。〈きらり〉、〈まつり〉照片未完整涵蓋，沿用既有譯詞。照片頁尾可見「中譯歌詞僅供參考」，未標示個別譯者，來源因此記為「使用者提供的專輯中文歌詞照片（譯者未註明）」。

## 網路來源搜尋

先前已保存六首 LRCLIB 同步候選，沒有代下載網路歌詞全文。本次只讀取使用者已放入工作區的六份 LRC；候選網址仍僅供參考，不宣稱是原檔確切下載來源。單曲、專輯及 MV 可能有時間差異。

| 歌曲 | 同步來源候選 |
|---|---|
| へでもねーよ (LASA edit) | [LRCLIB 4046740](https://lrclib.net/tracks/4046740) |
| やば。 | [LRCLIB 4046742](https://lrclib.net/tracks/4046742) |
| 燃えよ | [LRCLIB 8512511](https://lrclib.net/tracks/8512511) |
| ロンリーラプソディ | [LRCLIB 4046743](https://lrclib.net/tracks/4046743) |
| それでは、 | [LRCLIB 4046739](https://lrclib.net/tracks/4046739) |
| 青春病 | [LRCLIB 3429379](https://lrclib.net/tracks/3429379) |

完整候選見 `artifacts/lasa-import-2026-11-14/karaoke-source-search.json`。〈へでもねーよ〉使用專輯 LASA edit 官方音源，避免混入不同單曲版。其他新增歌曲的官方影片入口記錄在 `src/song-metadata.js`。

## 檔案與維護

- `lyrics/translations/love-all-serve-all-photos/`：原始 11 張與新增 1 張照片，共 12 張，保留原檔名。
- `lyrics/translations/lasa-photos.json`：人工核對的段落、歌曲 ID、照片檔名與缺漏註記；這是照片譯詞維護來源。
- `lyrics/translations/*.lasa.zh.txt`：逐首中文閱讀檔，保留段落。
- `src/lasa-photo-data.js`：由匯入程式產生，供前端延後載入。
- `src/photo-translations.js`：將照片譯詞對應歌曲；已有日文與同步資料時只附加獨立照片版本，不覆蓋原字幕。
- `src/song-lyrics.js`：仍是前端整合歌詞入口；原有 prepared 資料保留。
- `lyrics/lasa-import-manifest.json`：六份使用者 LRC 的匯入設定；〈それでは、〉直接讀取 `docs/それでは、 .lrc`，未移動或改名。
- `lyrics/translations/lasa-alignment-plan.json`：人工核對的照片行參照、片語拆分與缺漏原因。
- `lyrics/translations/lasa-alignment.json`：逐句日文、原始時間、照片片段參照及來源雜湊；原文或時間改變時拒絕沿用。
- `lyrics/translations/*.zh.lrc`、`*.bilingual.lrc`：新增六首的中文與中日雙語匯出；缺譯及間奏使用來源中的空白時間標記清除前句字幕，不填入占位歌詞。
- `artifacts/lasa-import-2026-11-14/photo-provenance.json`：12 張照片 SHA-256。
- `lyrics/readings/lasa-readings.txt`：人工整理的 194 組原文振り仮名與羅馬字；去除 ruby 後必須與 LRC 原文完全一致。
- `src/furigana-corrections.js`：既有修正與本次新增的讀音對照，由 `scripts/import-lasa-readings.mjs` 產生。

更正照片轉錄後執行：

```sh
node scripts/import-lasa-photos.mjs
node scripts/check-lasa-photos.mjs
npm run check:guide
npm run check:lyrics
npm run check:karaoke
node scripts/check-song-translations.mjs
npm run build
```

重做本次 LRC 與中譯匯入：

```sh
node scripts/import-lasa-readings.mjs
node scripts/import-song-lyrics.mjs lyrics/lasa-import-manifest.json --write
node scripts/import-lasa-alignment.mjs --write
npm run check:lasa
npm run check:lasa-readings
```

若原 LRC 或照片轉錄更新，先人工重查 `lasa-alignment-plan.json`，再用 `node scripts/import-lasa-alignment.mjs --compile` 更新逐句指紋。未核對就不能沿用舊對齊；一般重做匯入不執行 `--compile`。

## 驗證範圍

曲庫、原有 23 首歌詞與時間、照片雜湊、讀音、卡拉 OK 對齊、匯入流程、DOM 路由及正式建置皆有檢查。Chrome 桌機 1440×1000 與手機 390×844 檢查了照片中文、缺漏提示、既有同步字幕與無頁面錯誤；測試阻擋外部媒體請求，沒有宣稱驗證 YouTube 播放或實際聽感同步。截圖與結果在 `artifacts/lasa-import-2026-11-14/`。

v2.1.1 另外核對了六首的 253 個原文句、218 行中譯、35 行待補、間奏字幕清除與原 LRC 的 SHA-256。DOM 播放時鐘測試驗證了中日文同列高亮與點句跳至 `0:52.10`；Chrome 桌機／手機檢查六首雙語畫面、同步控制與無頁面錯誤。最新結果與截圖在 `artifacts/lasa-lrc-alignment-2026-11-14/`。

v2.1.2 補齊〈へでもねーよ〉至 53／53 行，並驗證六首的假名、羅馬字及並列切換。讀音依使用者 LRC 的日文原字逐句整理，保留方言、口語與英文，未宣稱為藝人審定的演唱音標。`知る` 保留「しる」，不改寫為其他副歌的「散る」；其餘 23 首與 LRC 原始時間未更動。最新報告與畫面在 `artifacts/lasa-readings-2026-11-14/`。
