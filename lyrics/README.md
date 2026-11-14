# 歌詞檔案與匯入引導

[線上指南](https://fujii-kaze-taiwan-2026.pages.dev/) · [專案首頁](https://github.com/vicecream/Fujii-Kaze-Taiwan-2026#readme) · [文件導覽](../README.md#文件導覽) · [最新程式碼](https://github.com/vicecream/Fujii-Kaze-Taiwan-2026/tree/main)

目前曲庫收錄 29 首，可由 [線上歌曲預習](https://fujii-kaze-taiwan-2026.pages.dev/#/guide) 開啟播放器。請使用 UTF-8 編碼維護各首原文與 `.lrc` 時間碼，保留既有檔名、歌曲 ID 與來源註記。線上檔案入口為 [main 的 lyrics 資料夾](https://github.com/vicecream/Fujii-Kaze-Taiwan-2026/tree/main/lyrics)。

| 歌曲範圍 | 匯入設定 | 操作與來源 |
|---|---|---|
| 原有 19 首 | [import-manifest.json](import-manifest.json) | [匯入步驟](../docs/karaoke-import.md) · [來源清單](../docs/lyric-sources.md) |
| It's Alright、真っ白、もうええわ、帰ろう | [additional-import-manifest.json](additional-import-manifest.json) | [四首匯入說明](../docs/karaoke-import.md#1030-新增四首的本機檔案) · [讀音對照](../docs/furigana.md) |
| LASA 新增六首 | [lasa-import-manifest.json](lasa-import-manifest.json) | [LOVE ALL SERVE ALL 匯入紀錄](../docs/love-all-serve-all.md) |

更新檔案後，先依對應 manifest 預覽，再確認是否寫入；完整指令與驗證方式見 [同步歌詞匯入說明](../docs/karaoke-import.md)。影片播放偏移與原始 LRC 時間分開保存，重新匯入前須確認各首既有偏移設定，避免覆蓋已校正的播放時間。

〈真っ白〉已有 34 行時間碼；全 20 首含日文歌曲的 776 行均已提供假名及羅馬字。四首新增歌曲的讀音維護於 `additional-import-manifest.json` 的 `readings`，LASA 六首維護於 [lasa-readings.txt](readings/lasa-readings.txt)，詳見 [日文讀音整理](../docs/furigana.md)。

中文或雙語對照請依 [中文供稿說明](translations/README.md) 放入對應檔案，保留譯者與來源註記。前端整合資料由匯入流程更新至 [src/song-lyrics.js](../src/song-lyrics.js)，不要直接修改 `dist/`。
