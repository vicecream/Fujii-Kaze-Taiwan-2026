# 29 首逐字同步：實作與聽校交接

## 2026-11-19 正式匯入

已驗證使用者儲存的影片版本錨點、校對者／日期、原始音訊與歌詞指紋，以及通過時的字詞時間指紋，匯入〈Hachikō〉1 句（第 42 行）、〈Prema〉1 句（第 6 行）、〈It's Alright〉8 句（第 4、15、17、23–26、30 行），合計 10 句。行號從 1 起算，其他句子繼續逐行播放。

已通過播放資料位於 `src/song-word-timing.js`，人工紀錄位於 `lyrics/word-timing/reviews/`。同句字詞可重疊並各自漸進反白，主頁與 PiP 共用字詞秒數；0.35 秒提前量只用於預捲動。尚未聽校的自動候選不會載入正式播放器。下列舊日期段落保留處理歷程。

## 2026-11-18 續跑與異常修復

批次延續既有結果，新增第二個本機處理程序分擔剩餘歌曲；每首使用 Windows 程序鎖，避免同曲重複寫入，已完成的候選會直接沿用，人工 `reviews.json` 保持獨立。校對頁即時進度以實際候選與處理程序狀態計算，可同時顯示多首處理中。

〈へでもねーよ (LASA edit)〉17 行因模型不支援小假名「ぃ」，已將 CTC **對齊目標**正規化為對應母音，輸出仍保留原文與變換紀錄。另修正 CTC 浮點運算取整造成的 3 處 1 毫秒重疊：統一用音訊取樣格點計算相鄰邊界。這些是自動候選修復，沒有新增聽校通過紀錄。

可獨立檢查已產生候選的影片／歌詞／音訊指紋、重複句行序、原文覆蓋及時間順序：

```powershell
node scripts/check-karaoke-candidates.mjs D:/Codex/.karaoke-qa-tools --write-report
```

結果寫入 [候選驗證報告](../artifacts/karaoke-candidate-validation.json)。加上 `--strict` 會要求 29 首均已產生且沒有結構待修行；檢查通過仍不代表已實際聽校。

〈Okay, Goodbye〉曾因 Windows 暫時鎖檔而在第 35 行寫入後中斷；前段已保留，後續 31 行採同一音訊、同一原文的既有 CTC 候選補齊，逐行註記來源與原因，仍待聽校。後續檔案置換加入有限次重試，並統一處理日誌的 UTF-8 編碼；人工修正檔維持獨立保存。

## 2026-11-17 全曲批次

依使用者指示，29 首都套用〈It's Alright〉的流程。全部指定影片音訊已取得，影片 ID 與來源頻道核對見 [音訊來源檢查](../artifacts/karaoke-audio-source-audit.json)；這是來源中繼資料確認，尚非實際聽校。

外部 `run-all.py` 可重跑、接續處理，來源音訊與人工修正分開保存；`record-batch.mjs --watch` 將處理狀態及各曲異常寫入本專案的進度與候選紀錄。各首完成即出現在本機選歌清單，可先聽校；29 首目前狀態以 [處理清單](../artifacts/karaoke-processing.json) 與本機頁面頂部為準。

CTC 遇到模型詞彙表未收錄的漢字時，使用專案既有 ruby 讀音作對齊目標，再映回同一原文字／ruby 詞組；不猜測讀音、不拆分或平均分配 ruby 內部時間。〈Workin’ Hard〉首行的「攫」已使用此後備，修正來源與處理指紋記錄於候選紀錄，仍待聽校。

本機頁已新增完整歌詞的漸進反白預覽：日文沿用 ruby／字詞，英文以單字顯示，當前單元按實測起訖由左至右填色，可跟隨播放句子、倒帶及即時反映時間修正。正式播放器共用進度樣式，仍只啟用有聽校通過紀錄的句子。

```powershell
D:/Codex/.karaoke-qa-tools/Scripts/python.exe D:/Codex/.karaoke-qa-tools/run-all.py
node D:/Codex/.karaoke-qa-tools/record-batch.mjs --watch
```

處理中可使用校對頁；尚未完成的歌曲會明示狀態。模型未對齊、長音、重複句、和聲及日英切換均保留異常，不把候選自動標記通過。舊版本以下記錄保留為第一階段歷程。

## 2026-11-14 進度（Asia/Taipei）

播放器、來源驗證、外部校對及匯入管線已建立；**第一階段仍待使用者實際聽校，尚未完成正式逐字交付**。

- [處理清單](../artifacts/karaoke-processing.json)：29 首、1,364 行，記錄影片、LRC 與歌詞／時間線指紋、偏移、重複句、缺少句尾、批次與待辦狀態。
- 〈It's Alright〉全曲 43 行、295 個自動時間單元已備妥。42 行有模型低分、重複句、長音或和聲提示；提示不是不準確率，沒有提示的句子也要聽校。[候選產生紀錄](../lyrics/word-timing/ItsAlright-candidate-record.json) 保留來源指紋、模型修訂、實際依賴版本與異常清單。
- 第 24、26 行（從 1 起算）的括號和聲因 Whisper 零長度時間，改用同音訊 CTC 後備；括號符號不當作演唱字詞。必須核對主唱與和聲。
- 目前正式逐字通過 **0 行**。`src/song-word-timing.js` 保持空白資料，全曲仍依既有逐行時間試播。
- 第二批：〈Hachikō〉、〈ガーデン〉、〈Workin’ Hard〉、〈満ちてゆく〉、〈へでもねーよ (LASA edit)〉。其他 23 首依曲庫順序分成 5、5、5、5、3 首；尚待各批來源確認、音訊、候選及聽校。
- 208 行缺少中文翻譯獨立列管，不補造譯文，也不阻擋原文聽校。

## 使用本機校對頁

工具完全位於專案外 `D:\Codex\.karaoke-qa-tools`：

```powershell
node D:/Codex/.karaoke-qa-tools/server.mjs
```

開啟 <http://127.0.0.1:5174/>。服務只綁定 `127.0.0.1`，不註冊 Service Worker，不提供正式網站入口。更新 `jobs.json` 後須重啟服務；候選更新只需按「重新載入候選」。

1. 選〈It's Alright〉、填校對者姓名或代號。先核對目前影片 ID `HA3WzXw8vM8`，實聽開頭、中段、結尾，填三個錨點秒數及版本特徵，再按版本確認。
2. 使用原音／分離人聲、速度與逐句／逐詞循環聽校。清楚詞頭以約 ±0.2 秒為目標；長音尾端依主唱調整，保留間奏與停頓。
3. 可改每個字詞起訖或整句平移。同句字詞可重疊、可同時開始，起點依原文順序排列；各詞獨立反白，句尾取所有字詞的最晚終點。改時間會取消通過標記；不完整、零長度、起點倒退或超出範圍的句子不能通過，不平均補齊時間。
4. 勾選實聽聲明後按「標記本句通過」。不能可靠對齊則選「保留逐行」並填原因；繼續修正則選「待修」。
5. 修正自動存到外部 `<歌曲ID>/reviews.json`；「儲存並匯出修正 JSON」另存副本。自動候選與人工修正分開，重新對齊不覆寫人工檔。

來源改變時，頁面拒絕沿用舊修正；先封存舊人工紀錄，再重新確認來源。

## 驗證與正式匯入

在專案目錄先預覽，再寫入。音訊參數必須是當初的完整原始影片音訊，不能改用 MP3 或分離人聲。

```powershell
node scripts/import-word-timing.mjs D:/Codex/.karaoke-qa-tools/ItsAlright/reviews.json D:/Codex/.karaoke-qa-tools/ItsAlright/candidate.json D:/Codex/.karaoke-qa-tools/ItsAlright/source.webm
node scripts/import-word-timing.mjs D:/Codex/.karaoke-qa-tools/ItsAlright/reviews.json D:/Codex/.karaoke-qa-tools/ItsAlright/candidate.json D:/Codex/.karaoke-qa-tools/ItsAlright/source.webm --write
node scripts/word-timing-catalog.mjs
npm.cmd run check:guide
npm.cmd run check:lyrics
npm.cmd run check:karaoke
npm.cmd run check:word-timing
npm.cmd run build
```

匯入器驗證目前影片、原始音訊與 LRC SHA-256、全曲歌詞／時間線指紋、行序與來源秒數、原文指紋、三個版本錨點、校對者與時間，以及聽校時的字詞時間指紋。部分匯入保留先前人工決定；明確撤銷通過會移除該句正式逐字時間。來源改變須先封存舊紀錄再重新確認。

正式專案保留 `src/song-word-timing.js` 的已通過播放資料、`lyrics/word-timing/reviews/<歌曲ID>.json` 的人工決定、共用資料驗證／匯入／檢查，以及來源與進度紀錄。完整音訊、模型、中間檔與校對介面留在外部。

播放器優先用已核對句子的原始影片秒數，其餘沿用 LRC 逐行時間。0.35 秒只用於預捲動；字詞高亮、當前句、點句跳轉、合唱與 PiP 不再提早計時。讀音不能完整對應時整句退回逐行，不分配假造的字詞時間。逐字資料經 Vite 分塊納入既有建置資產離線快取，YouTube 仍需網路。

〈真っ白〉、〈青春病〉最後一句缺少結尾，繼續待聽校，不以固定秒數補句尾。五首偏移已保存至 manifest：〈You〉+4、〈何なんw〉+5.33、〈満ちてゆく〉+13.42、〈きらり〉−0.1、〈青春病〉+2 秒。新檢查逐首重建匯入結果，比對原文、來源與播放時間，防止重複套用或遺失偏移。

## 後續批次與重跑

```powershell
node scripts/word-timing-catalog.mjs artifacts/karaoke-processing.json D:/Codex/.karaoke-qa-tools/jobs.json
D:/Codex/.karaoke-qa-tools/Scripts/python.exe D:/Codex/.karaoke-qa-tools/run-job.py Hachiko
```

外部環境沿用先前試作的固定依賴。工具依清單 YouTube ID 取得音訊，進行 Demucs 分離、CTC 後備及 Whisper medium 已知歌詞對齊。既有音訊可傳 `--source path/to/audio.webm`。

`align.py` 接受歌曲 ID、音訊、`--lrc`、`--from-line`（包含）、`--to-line`（不包含）及 `--windows` 分段錨點 JSON。格式如 `{"23":{"start":110.1,"end":117.4}}`，均為影片秒數。局部重跑只合併相同來源的自動候選，不覆蓋其他候選或人工紀錄。

先完成第一階段真實聽校，再依實際聽校耗時與修改量估算後續工期；目前只有自動處理耗時，不能據此宣稱人工工期。

## 驗證與結束清理

已用隔離合成資料測試來源失效、修改後撤銷、局部匯入保留紀錄、混合播放、影片秒數、日英與讀音切換、倒帶、倍速、暫停、緩衝、快速換歌、句尾停頓與 PiP。合成資料未寫入真實聽校檔；實際音訊聽校及正式匯入後播放確認仍待使用者進行。

舊試作 HTML、樣式、互動程式、專用伺服器、分離／對齊腳本、依賴清單及未核對時間資料已搬至外部 `legacy-experiment`。所有批次完成後，依序匯出、驗證匯入、正式播放確認、停止服務，再移除外部 `index.html`、`style.css`、`app.js`、`server.mjs` 與舊校對頁資產；保留來源資訊、人工紀錄與已核對資料。**目前分批聽校尚未完成，因此外部工具暫時保留。**
