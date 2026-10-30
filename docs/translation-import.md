# 使用者提供 PDF 的中文譯詞匯入

2026-10-30（Asia/Taipei）整理。使用者直接放入 `lyrics/translations/` 的 15 份 PDF 已轉為中外文對照文字，並對齊現有字幕時間線，共加入 **672 列中文**。原有 19 首、936 行原文及各時間欄位均保留；影片時間仍為 LRC 試播，尚未宣稱已校正。

## 匯入結果

| 歌曲 | 已有中文／字幕列數 |
|---|---|
| I Need U Back | 33／41 |
| Hachikō | 50／50 |
| Love Like This | 59／59 |
| Prema | 40／43 |
| It Ain’t Over | 37／38 |
| まつり | 55／56 |
| Workin’ Hard | 64／64 |
| 何なんw | 48／48 |
| きらり | 44／45 |
| 花 | 40／42 |
| ガーデン | 48／48 |
| damn | 35／43 |
| 死ぬのがいいわ | 39／44 |
| 旅路 | 46／46 |
| 満ちてゆく | 34／34 |

另四首 Casket Girl、You、Okay, Goodbye、Forever Young 沒有提供中文 PDF，維持中文待補。

## 對齊與來源處理

- 依 PDF 的原文對照 LRC，處理大小寫、拼寫差異、合併句及重複副歌；不以列數直接配對。
- 只採用 PDF 已有的中文，未新增自譯。修復 PDF 字型抽出的相容部首，例如 `⼼` 還原為 `心`，保留原譯詞及標點。
- 頁首、歌手名稱、假名小字與頁尾不當作歌詞。PDF 只有「MARUMARU 提供」註記，未列個別譯者；歌曲頁因此標示「中文譯詞來源」，不把提供網站當成已確認的譯者。
- 〈Love Like This〉、〈満ちてゆく〉及〈旅路〉有共 8 列共用原 PDF 的合併句譯文，避免為了拆句而改寫。
- 〈きらり〉跨頁處有重複前句及中文片段跨段落的情況，已按原文將 PDF 既有片段分回對應字幕；映射記錄保留其原始段落索引。

仍有 **29 列**沒有對應中文。其中 18 列是哼唱、感嘆詞或間奏記號；其餘 11 列如下，PDF 未提供相應中譯，故保留空白：

| 歌曲 | LRC 試播時間 | 原文 |
|---|---|---|
| damn | 3:15.93 | Damn, damn don't give a damn |
| damn | 3:18.26 | Just love in my head (Hey little father won't you come with me) |
| damn | 3:23.16 | We'll just dancing away |
| damn | 3:25.61 | From bullshits ahead ('Kay it's okay yeah we gotta believe) |
| damn | 3:52.94 | I love me, and I |
| damn | 3:54.83 | Will keep him in a |
| damn | 3:56.79 | Safest, fairest, happiest place baby |
| damn | 4:14.79 | Damn |
| Prema | 3:02.63 | Hello, can I talk to you now? |
| Prema | 3:08.88 | Okay, cool |
| Prema | 3:10.78 | I love you, bye |

## 維護與驗證

原 PDF 保留原檔名；同目錄的 `*.zh.txt` 是抽取後的雙語對照。`extracted-pairs.json` 記錄 PDF 頁碼、原文、中譯及檔案 SHA-256；`alignment.json` 記錄逐列原文、時間與所用譯文片段。`sources.json` 保留來源連結、提供者與完成狀態。實際網站字幕在 `src/song-lyrics.js`。

完整匯入與待補清單見 [匯入報告](../artifacts/translations-import-report.json)。[時間基準](../artifacts/translations-timing-baseline.json) 與檢查腳本確認此次中譯匯入未更動原文或時間；原檔 PDF 的雜湊亦會在匯入前核對。

重新抽取先預覽，確認版型適用後才加 `--write`；工具會保護人工修改過的 `.zh.txt`。PDF 若更新，須重新檢視映射，不沿用過期對齊：

```bash
python scripts/extract-translation-pdfs.py
node scripts/import-song-translations.mjs
node scripts/import-song-translations.mjs --write
node scripts/check-song-translations.mjs
```

另須通過 `check:guide`、`check:lyrics`、`check:karaoke`、DOM smoke、正式建置及 `git diff --check`。這些檢查不代表實際影片的聽感校正已完成。
