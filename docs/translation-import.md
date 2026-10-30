# 中文譯詞匯入紀錄

2026-10-30（Asia/Taipei）整理。目前共 **907 列中文**：使用者直接提供的 19 份 PDF 對應 836 列，另貼出的〈Casket Girl〉全曲對應 55 列、〈Forever Young〉節錄對應 16 列。原有 19 首、936 行原文及來源時間均保留；新增四首共 175 行原文，目前全站 1,111 行。22 首、1,077 行為 LRC 試播，〈真っ白〉34 行依使用者更新的原文檔提供無時間碼閱讀；影片同步尚未宣稱已校正。

## 匯入結果

| 歌曲 | 已有中文／字幕列數 |
|---|---|
| Casket Girl | 55／55 |
| I Need U Back | 33／41 |
| Hachikō | 50／50 |
| Love Like This | 59／59 |
| Prema | 40／43 |
| It Ain’t Over | 37／38 |
| You | 0／63 |
| Okay, Goodbye | 0／66 |
| Forever Young | 16／51 |
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
| It's Alright | 38／43 |
| 真っ白 | 28／34（無時間碼） |
| もうええわ | 51／51 |
| 帰ろう | 47／47 |

〈Casket Girl〉已採用使用者最新貼出的全曲版本；〈Forever Young〉只匯入已提供的前兩段主歌、副歌前段與第一次副歌，其餘 35 列維持待補。〈You〉、〈Okay, Goodbye〉只有外部來源連結，中文文字尚未提供，維持待補。

## 新增四首的本機供稿

使用者直接提供 `(歌詞)It's+Alright.pdf`、`(歌詞)真っ白.pdf`、`(歌詞)もうええわ.pdf`、`(歌詞)帰ろう.pdf`，分別抽取 30、26、36、42 組雙語對照；四份共 15 頁均經渲染核對。新增中文共 164 列，保留 PDF 措辭、標點及 MARUMARU 提供註記，不推定個別譯者。

- 〈It's Alright〉使用 `It's Alright.lrc` 的 43 行；PDF 的 `ur` 與 LRC 的 `your`、和聲括號、重複副歌逐句核對。`Give it up, kama` 的既有譯文拆到兩個 LRC 句；感嘆詞及 `It's al-` 等五行無對應完整譯文，維持留白。
- 〈もうええわ〉使用 `もうええわ.lrc` 的 51 行。PDF 合寫的口號、主句與笑聲依原譯文片段拆列；跨句的「並傷害對方」與後句譯文連接，不改寫內容。
- 〈帰ろう〉使用 `帰ろう.lrc` 的 47 行，保留 `5時`／PDF「五時」、`夜明け`／PDF「夜明」等原文差異。第 26–27 列共用 PDF 第 22 組的完整中文句，因中日語序不同，不自行改寫譯文。
- `真っ白.lrc` 初次內容為〈まつり〉，未匯入；使用者後續已替換為正確的 34 行原文，但沒有時間碼。採最新原文保留哼唱、和聲與分句，PDF 的 26 組對照映射為 28 列中文，六行哼唱留白。兩處「先に進まなければゴール／できぬゲームなのよ」依既有中譯拆列；沒有 `time`、`sourceTime` 或虛構時間碼。歷次檔案雜湊分別記錄，須補上含時間碼的 LRC 後才能逐句試播。

新增四首的 134 行日文讀音仍待整理，讀音控制保持停用。LRC 原始來源時間與目前影片偏移分開保存；翻譯映射及基準雜湊依來源時間驗證，不覆蓋既有影片偏移設定。

## 使用者直接提供的中譯與外部來源

- 〈Casket Girl〉完整來源保存於 `lyrics/translations/CasketGirl.zh.txt`，包含中文歌名「棺木女孩」、Intro、段落標題及括號。68 組原譯句依現有分句合併為 55 列，逐句保留措辭與標點，取代先前的 10 列節錄。橋段 `and find a way to make it better` 跨原有第 45–46 列，完整中譯保留於第 46 列，對齊註記存於供稿資料，不改動 LRC。
- 〈Forever Young〉保存於 `ForeverYoung.zh.txt`；18 句中譯對應 16 列，其中 `Come on over / Let's go higher` 及 `Don't you be scared / We're together` 各合併成一列，以「／」保留兩句原譯。
- 兩首都標示「使用者提供（譯者未註明）」，不假定使用者是譯者，也不將其他歌曲的來源掛到這兩首。供稿原文、範圍與逐列映射保存於 `user-supplied.json`，匯入時檢查原文、時間及供稿文字。
- [〈You 你〉歌詞翻譯](https://vocus.cc/article/68ccd735fd897800018757ad) 與 [〈Okay, Goodbye 就這樣吧〉歌詞翻譯](https://vocus.cc/article/68c6eb64fd89780001188c3c) 的作者均為 [Vince](https://vocus.cc/user/@vinceverse)。已核對其對應歌曲、作者與日期，記錄於 `external-sources.json`；文章譯文尚未匯入。它們不是〈Casket Girl〉或〈Forever Young〉的譯文來源。

## 對齊與來源處理

- 依 PDF 的原文對照 LRC，處理大小寫、拼寫差異、合併句及重複副歌；不以列數直接配對。
- 只採用 PDF 已有的中文，未新增自譯。修復 PDF 字型抽出的相容部首，例如 `⼼` 還原為 `心`，保留原譯詞及標點。
- 頁首、歌手名稱、假名小字與頁尾不當作歌詞。PDF 只有「MARUMARU 提供」註記，未列個別譯者；歌曲頁因此標示「中文譯詞來源」，不把提供網站當成已確認的譯者。
- 〈Love Like This〉、〈満ちてゆく〉及〈旅路〉有共 8 列共用原 PDF 的合併句譯文，避免為了拆句而改寫。
- 〈きらり〉跨頁處有重複前句及中文片段跨段落的情況，已按原文將 PDF 既有片段分回對應字幕；映射記錄保留其原始段落索引。

PDF 批次共 **40 列**沒有對應中文。原有 15 份 PDF 的 29 列中，18 列是哼唱、感嘆詞或間奏記號，其餘 11 列如下；新增〈It's Alright〉另有 5 列、〈真っ白〉另有 6 列列於表後。PDF 未提供相應中譯時保留空白：

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

新增〈It's Alright〉待補五行：`0:06.40`、`1:29.04`、`3:02.37` 的 `Ay` 感嘆詞，以及 `1:27.78`、`3:01.15` 的截斷句 `It's al-`。〈真っ白〉另有開頭兩行 `Hmm` 及中段四行 `Aah` 哼唱無對應中譯。這些句子不以自譯或猜測補齊。

## 維護與驗證

原 PDF 保留原檔名；同目錄的 `*.zh.txt` 是抽取後的雙語對照。`extracted-pairs.json` 記錄 PDF 頁碼、原文、中譯及檔案 SHA-256；`alignment.json` 記錄逐列原文、時間與所用譯文片段。`sources.json` 保留來源連結、提供者與完成狀態。實際網站字幕在 `src/song-lyrics.js`。

完整匯入與待補清單見 [匯入報告](../artifacts/translations-import-report.json)，其中 PDF 與聊天供稿分別統計，`totalTranslatedLines` 為總數。[時間基準](../artifacts/translations-timing-baseline.json) 與檢查腳本確認此次中譯匯入未更動原文或時間；原檔 PDF 與供稿文字的雜湊亦有保留。

重新抽取先預覽，確認版型適用後才加 `--write`；工具會保護人工修改過的 `.zh.txt`。PDF 若更新，須重新檢視映射，不沿用過期對齊：

```bash
python scripts/extract-translation-pdfs.py
node scripts/import-song-translations.mjs
node scripts/import-song-translations.mjs --write
node scripts/check-song-translations.mjs
```

另須通過 `check:guide`、`check:lyrics`、`check:karaoke`、DOM smoke、正式建置及 `git diff --check`。這些檢查不代表實際影片的聽感校正已完成。
