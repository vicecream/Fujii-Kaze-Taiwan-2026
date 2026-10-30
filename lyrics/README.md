# 放入這 19 首 LRC 的位置

把各首完整 LRC 內容貼進同名檔案，或用下載好的 LRC 覆蓋對應空白檔。請使用 UTF-8 編碼，保留 `.lrc` 副檔名，例如 `CasketGirl.lrc`、`INeedUBack.lrc`；注意不要存成 `.lrc.txt`。

19 個檔名依 `src/song-metadata.js` 的歌曲 ID 建立，歌名與候選來源可對照 [19 首 LRC 來源清單](../docs/lyric-sources.md)。檔案起初完全空白，可一次放齊，也可以分批提供。

放好後告訴我「LRC 已放好」，我會檢查內容、時間碼與影片版本，再處理匯入。

`import-manifest.json` 已預填 19 首的檔名與候選來源，供後續匯入使用；來源說明與完整狀態留待檔案提供後確認，現在只要填入 LRC 即可。若實際來源不同，匯入時一併更新。操作細節見 [匯入說明](../docs/karaoke-import.md)。

要保留 marumaru 的中文譯詞時，請將中文或雙語對照貼入 [translations 資料夾](translations/README.md) 裡對應的 `.zh.txt` 檔；15 首空白檔與來源對照已備妥，不必自行填入時間碼。
