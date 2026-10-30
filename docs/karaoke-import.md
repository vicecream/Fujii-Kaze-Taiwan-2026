# 同步歌詞來源搜尋與本機匯入

沿用 [原專案 karaoke-sources.js](https://github.com/watain666/Vaundy-Taiwan-2026/blob/main/karaoke-sources.js) 的資料轉換與來源架構：原文由本地維護，外部時間依序由聚合服務、AMLL、LRCLIB 補充。搜尋到來源候選不代表已完成全文匯入或目前 YouTube 影片的時間核對。

## 搜尋這 19 首的來源

```bash
node scripts/find-karaoke-sources.mjs
```

輸出為 `artifacts/karaoke-source-search.json`，只儲存來源 ID、歌名、歌手、專輯、長度、來源連結及有無同步資料，不儲存歌詞文字。AMLL 搜尋僅查目錄，不下載 TTML；LRCLIB 搜尋回應中的歌詞欄位不寫入報告。公開 API 可用性依查詢當時而定；`error` 表示連線／服務失敗，`miss` 才是查詢成功但無相符結果。此報告不探測聚合服務的全文端點。

日文與英文歌名別名放在 `src/song-metadata.js`；搜尋要求歌名和歌手相符，不接受其他歌手、同名翻唱或另有 live 等後綴的版本。精確搜尋失敗或無結果時，繼續嘗試別名及 LRCLIB 關鍵字後備搜尋。中繼資料可能仍有誤，例如同一首的長度相差很大，因此候選不能直接視為已核實的錄音。

僅重試報告中的查詢失敗歌曲：

```bash
node scripts/find-karaoke-sources.mjs --retry-errors
```

暫時性錯誤不會覆蓋先前找到的來源候選；來源保留各自的查核時間，另記最後失敗嘗試。

公司代理環境若使用系統憑證，可由 Node 使用既有代理與系統信任庫：

```bash
node --use-system-ca --use-env-proxy scripts/find-karaoke-sources.mjs
```

### 2026-10-29 搜尋結果

AMLL 的 19 首搜尋均未取得相符候選。LRCLIB 第一輪有 10 首找到同步候選，另外 9 首查詢失敗；補上別名、關鍵字後備搜尋並重試 HTTP 503 失敗後，**19 首皆找到帶同步資料的候選**。完整候選 ID、來源連結及各自的查核時間見 JSON 報告。

| 歌曲 | LRCLIB |
|---|---|
| Casket Girl | 有同步候選 |
| I Need U Back | 有同步候選 |
| Hachikō | 有同步候選 |
| Love Like This | 有同步候選 |
| Prema | 有同步候選 |
| It Ain’t Over | 有同步候選 |
| You | 有同步候選 |
| Okay, Goodbye | 有同步候選 |
| Forever Young | 有同步候選 |
| まつり | 有同步候選 |
| Workin’ Hard | 有同步候選 |
| 何なんw | 有同步候選 |
| きらり | 有同步候選 |
| 花 | 有同步候選 |
| ガーデン | 有同步候選 |
| damn | 有同步候選 |
| 死ぬのがいいわ | 有同步候選 |
| 旅路 | 有同步候選 |
| 満ちてゆく | 有同步候選 |

使用者已直接提供這 19 首 LRC；目前已匯入 936 行原文，依使用者要求先啟用逐行時間試播，保留原檔時間供校正。另提供的 15 份 PDF 已加入 672 列中文，詳見 [中文匯入紀錄](translation-import.md)。尚未核對影片同步，日文讀音及未提供的中文維持待整理。

逐首 LRCLIB 候選、使用者指定的四筆 ID 與 marumaru 參考連結，另整理於 [19 首 LRC 來源清單](lyric-sources.md)。

## 匯入自行提供的本機檔案

本次 `lyrics/import-manifest.json` 已設定 `timingMode: "preview"`，原始時間保存在 `sourceTime`／`sourceEnd`，播放起點先沿用來源時間。歌曲頁顯示時間與待校正狀態，可點句跳轉、逐行跟隨；逐字高亮維持關閉，也不連線套用其他提供者時間。`allowPendingReadings: true` 表示先處理原文與時間線，日文讀音未備妥時停用讀音控制，不填入推測讀法。〈死ぬのがいいわ〉另以 `pairedRomaji: true` 將同時間羅馬字列保存在 `providedRomaji`，避免重複顯示。

匯入器不連線下載全文，讀取本機 `.lrc`，或既有轉換器支援的 LRCLIB／Beautiful Lyrics `.json`。維持 `{ jp, tr, time }` 的原顯示結構，不產生翻譯。檔案路徑相對於 manifest 所在目錄；以 `src/song-metadata.js` 的歌曲 ID 對應，不改動影片與專輯資料。

準備 manifest，例如：

```json
{
  "songs": [
    {
      "id": "Prema",
      "file": "Prema.lrc",
      "sourceUrl": "https://example.com/source",
      "usageBasis": "填寫此歌詞檔的來源與可使用依據",
      "complete": true,
      "alignment": {
        "youtubeId": "UJgPpzZcxGU",
        "offsetSeconds": 0,
        "checkedAt": "2026-10-29"
      }
    }
  ]
}
```

範例的時間對齊僅說明欄位，不能當作歌曲已核對的證據。`offsetSeconds` 是「來源秒數 + 位移 = 目前影片秒數」；必須逐段對照目前官方影片。若兩個版本的段落或速度不同，單一位移不足，須先人工整理。沒有核對過影片時，省略整個 `alignment`，匯入器只加入原文、保留同步待補；不會把音源版時間直接標為影片同步完成。LRC 非零 `[offset:]` 應先正規化，避免重複套用位移。

`complete: true` 僅在全文完整時填寫；未填時顯示部分整理。`sourceUrl` 與 `usageBasis` 必填，用於追溯，並非匯入器自行判斷授權有效。日文歌曲還需提供每行的讀音（`readings.furigana` 與 `readings.romaji`），或先補至現有的讀音檔；工具不猜測漢字讀法。現有相同行原文的翻譯會保留，不自動添加翻譯。

先預覽，不修改網站資料：

```bash
node scripts/import-song-lyrics.mjs path/to/manifest.json
```

確定內容後寫入：

```bash
node scripts/import-song-lyrics.mjs path/to/manifest.json --write
```

所有輸入先通過驗證，才更新 `src/song-lyrics.js`；有提供讀音才更新 `src/furigana-corrections.js`。保留未列入此次匯入的既有歌曲內容。匯入後執行：

```bash
node scripts/check-lyrics-import.mjs
npm run check:guide
npm run check:lyrics
npm run check:karaoke
npm run build
git diff --check
```
