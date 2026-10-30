# 放入 marumaru 中文譯詞

這裡保存你提供的 19 份 PDF，並已抽取為同名歌曲 ID 的 `.zh.txt` 雙語對照，例如 `Prema.zh.txt`、`Matsuri.zh.txt`。中文已加入目前字幕，共 836 列；PDF 未提供對應中文的部分保留待補。完整結果與待補時間見 [匯入紀錄](../../docs/translation-import.md)。

另外已完整保存使用者新貼出的 `CasketGirl.zh.txt` 全曲，以及 `ForeverYoung.zh.txt` 的 18 句節錄，分別對應 55 列與 16 列字幕；兩首供稿都記錄在 `user-supplied.json`。目前全站共 907 列中文，個別譯者尚未註明，不掛上其他歌曲的署名。

`You.zh.txt` 與 `OkayGoodbye.zh.txt` 已備妥供貼入中文或雙語對照；兩篇 Vocus 的作者與來源記錄在 `external-sources.json`，不等同於已提供或匯入譯文。

〈真っ白〉、〈もうええわ〉、〈帰ろう〉與〈It's Alright〉已依新提供的四份 PDF 匯入 164 列中文，雙語對照保存於 `Masshiro.zh.txt`、`MoEhWa.zh.txt`、`Kaerou.zh.txt`、`ItsAlright.zh.txt`。〈真っ白〉已改採使用者更新的正確原文，但沒有時間碼，先供閱讀；其中六行哼唱沒有 PDF 中譯。〈It's Alright〉另有五行感嘆詞或截斷句沒有對應中文，保持待補。

可以貼入純中文，或整段原文與中文的雙語對照。雙語內容有助於處理不同版本的分句與重複段落；不用自行補時間碼，也不用強制與 LRC 行數一致。若內容附有譯者及原始來源註記，請一併保留，後續匯入時核對署名。

放好後告訴我「中文譯詞已放好」，我會對照現有 LRC 原文，將譯文加入對應字幕列；無法確定對應位置的部分會另列待確認，不直接依行號硬配。

`sources.json` 保存檔名、PDF 雜湊、marumaru 參考頁及匯入狀態。PDF 僅註記「MARUMARU 提供」，未列個別譯者，因此記錄為提供來源；不自行推定作者。`extracted-pairs.json` 與 `alignment.json` 分別保存抽取段落及已核對的字幕映射。各頁連結亦可查看 [23 首 LRC 與中文來源清單](../../docs/lyric-sources.md)。
