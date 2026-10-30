# Cloudflare Pages 部署指南

本次目標儲存庫為 [vicecream/Fujii-Kaze-Taiwan-2026](https://github.com/vicecream/Fujii-Kaze-Taiwan-2026)，使用免費 Pages 與 GitHub Integration。本文的設定及本機驗證已準備完成；**尚未建立 Cloudflare Pages 專案或發布線上網站**。預定專案名稱是否可用，以 Cloudflare 建立時的結果為準。

## 1. 專案架構與既有部署

- Vite 7＋原生 JavaScript／CSS，沒有 React、Vue、後端或資料庫。
- 入口為 `index.html`；`npm run build` 產生 `dist/`，不要直接編輯輸出。
- `vite.config.js` 已設定 `base: "./"`，並保留首頁預先產生、根目錄靜態檔複製與 Service Worker 資源清單外掛。
- 使用 Hash 路由，例如 `/#/guide`、`/#/song/prema`；歌曲路由不會傳送到伺服器，因此重新整理仍請求網站根目錄，不必新增 `_redirects`。
- 既有 `.github/workflows/pages.yml` 是 GitHub Pages 流程，本次保留；Cloudflare 自行監聽 GitHub，不必新增 Actions。推送目標儲存庫的 `main` 仍可能觸發既有流程，請在目標儲存庫確認 Pages 設定與執行結果。
- PWA 已有 `manifest.json`、`sw.js` 與圖示；`start_url`、`scope`、圖示及 SW 註冊均使用相對路徑。正式版載入約 8 秒後才開始註冊 SW。
- 保留 19 首預習歌曲與既有歌詞、翻譯、讀音、時間軸、YouTube、應援提示、深淺色及播放器功能。預習清單不代表正式演出歌單。

本機 Git remote：`personal` 指向本次目標，`origin` 指向原作者的 `watain666/Vaundy-Taiwan-2026`。**本次不得推送 `origin/main`**。保留原專案歷史與來源署名。

## 2. 可以直接填入的建置設定

| Cloudflare 欄位 | 設定值 |
| --- | --- |
| 產品 | Workers & Pages → Pages → 連接 Git 儲存庫 |
| GitHub Repository | `vicecream/Fujii-Kaze-Taiwan-2026` |
| Project name | `fujii-kaze-taiwan-2026`，建立時確認是否可用 |
| Production branch | `main`，已由遠端 HEAD 確認 |
| Framework preset | `None`，手動填寫以下 Vite 指令；不是 React／Vue 專案 |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 留空，使用儲存庫根目錄 |
| Node.js | `.node-version` 指定 `24.16.0`；若控制台另設 `NODE_VERSION`，須與檔案一致 |
| Runtime bindings／Functions | 不需要 |
| 付費方案／自訂網域 | 不需要 |

Pages 在建置前安裝 npm 相依套件；請一併提交 `package-lock.json`。本機驗證使用 `npm ci`。

### 網址與分享資訊

建置網址依下列順序選用：

1. 控制台自訂的 `SITE_URL`。
2. Cloudflare 自動注入的 `CF_PAGES_URL`，即此次部署的網址。
3. 原始 `src/data.js` 的 `SITE.url`，保留非 Cloudflare 建置的原行為。

建置會同步處理 `index.html` 的 canonical、Open Graph 網址／圖示、`robots.txt` 與 `sitemap.xml`。網址必須為 HTTPS 網站根目錄，不含帳密、查詢參數或 hash。不要把 Token 填入這些欄位。

第一次建立時可先不設定 `SITE_URL`，讓 Pages 提供當次實際網址。成功建立後，從專案 Overview 複製穩定的正式網址，在 Production 環境設定 `SITE_URL` 並重新部署，讓分享及搜尋資訊採用正式網址。Preview 環境可以不設 `SITE_URL`，沿用各次部署網址；不要手動覆寫 `CF_PAGES_URL`。

預定的 `fujii-kaze-taiwan-2026.pages.dev` **尚未取得或驗證**。不要把預定名稱當成已發布網址。

原始 `CNAME`、規劃網域與 GitHub Pages workflow 保留相容性。Cloudflare 建置（`CF_PAGES=1`）不複製 `CNAME`；本站不會替該網域設定 DNS 或購買服務。

## 3. 連接 GitHub 與首次發布

1. 先在本機執行 `git status --short --branch`、`git remote -v`，確認操作的是目標儲存庫。此工作目錄原有未提交的讀音、歌詞及文件變更，應分別檢視，不要用 `git add .` 全部納入本次部署。
2. 將本次部署檔案透過目標儲存庫的 PR／發版流程合併至 `main`。正式發版的 PR 歸屬、SemVer、版本標記及 changelog 連結仍須依 `AGENTS.md` 處理，但發布儲存庫以本次指定的 `vicecream/Fujii-Kaze-Taiwan-2026` 為準，不推送原作者儲存庫。
3. 使用自己的帳號登入 [Cloudflare 控制台](https://dash.cloudflare.com/)，進入 Workers & Pages，選擇建立 Pages 專案及連接 Git 儲存庫。不要選成僅能手動上傳的 Direct Upload 專案。
4. 授權 Cloudflare GitHub App；只開放需要部署的目標儲存庫。若清單找不到專案，先確認 GitHub 登入帳號及該 App 的儲存庫授權。
5. 選取目標儲存庫，填入上一節設定，確認免費方案後儲存並部署。
6. 等待建置與發布成功；檢查安裝、Vite 建置及上傳紀錄，確認 commit SHA 是預期版本。
7. 從 Cloudflare 專案 Overview／正式部署紀錄複製實際 `pages.dev` 網址，以 HTTPS 開啟首頁、預習清單及歌曲頁，並重新整理歌曲頁。
8. 設定正式環境的 `SITE_URL` 後重新部署，檢查網頁原始碼、`robots.txt` 與 `sitemap.xml` 都採用正式網址。

本次環境沒有可用的 Cloudflare 連線或 CLI 認證，因此以上控制台步驟尚未執行。不需要在聊天中提供密碼或 API Token，也不要把登入憑證提交到 GitHub。

官方說明：[Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)、[建置設定與內建環境變數](https://developers.cloudflare.com/pages/configuration/build-configuration/)、[Node 版本設定](https://developers.cloudflare.com/pages/configuration/build-image/)。

## 4. 更新內容與檢查部署紀錄

網站內容依既有維護位置編輯：活動資訊在 `src/data.js`，曲目資料在 `src/song-metadata.js`，歌詞／翻譯／時間在 `src/song-lyrics.js`。部署任務不應更動這些內容。

提交前執行：

```powershell
npm ci
npm run check:guide
npm run check:lyrics
npm run check:karaoke
npm run build
git diff --check
```

審閱後推送到**目標儲存庫**；GitHub Integration 會自動建置 `main` 的正式部署，其他分支依 Pages 的 Preview 設定產生預覽。到 Pages 專案的 Deployments 查看分支、SHA、建置紀錄與部署狀態；失敗時開啟該次 build log，修正後重新部署。不要把 GitHub Pages workflow 成功當成 Cloudflare 發布成功。

變更對外發布版本時，依既有規則同步更新 `package.json`、鎖檔兩個根版本、`src/main.js` 的 `BUILD`、`sw.js` 的 `CACHE_VERSION` 與 `CHANGELOG.md`。本次僅完成部署準備，保留尚未發佈的 `2.0.0`，未建立或宣稱 release commit。

## 5. 回復前一個正常版本

在 Pages → Deployments 的正式部署紀錄中，找到先前成功的 production deployment，使用該筆選單的 **Rollback to this deployment** 並確認。Preview deployment 不能作為正式回復目標。回復後重新確認正式網址、歌曲頁及離線狀態。操作步驟見 [Cloudflare Rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/)。

Pages 的回復不會修改 GitHub `main`；下一次推送仍可能部署有問題的程式。需要修正來源時，用一般新提交或 `git revert`，不強制推送或改寫歷史。

PWA 的已安裝快取可能暫時保留新版資源。保持連線重新開啟頁面，等候 SW 檢查更新；必要時在瀏覽器網站資料中移除本站快取後再測試。清除網站資料也會移除該來源的本機偏好與歌詞快取。不要只用一個已有快取的視窗判斷回復是否成功。

## 6. 手機、電腦與 PWA 驗收

本次沒有可用的瀏覽器測試工具，僅檢查現有響應式 CSS；未修改版面。請上線後用瀏覽器裝置模式依序測試：

| Viewport | 驗收內容 |
| --- | --- |
| 375 × 667 | 首頁／歌曲頁沒有水平溢出，底部按鈕不遮住最後一行歌詞 |
| 390 × 844 | 選歌、原文／翻譯、日文讀音切換與手動播放可觸控操作 |
| 430 × 932 | 長歌詞與播放器縮放正常 |
| 768 × 1024 | 平板直向閱讀、捲動與選歌正常 |
| 1440 × 900 | 雙欄播放器與歌詞區正確分配，控制列可操作 |

每種尺寸至少開啟一首英文歌與一首日文歌，檢查歌詞、繁中翻譯、假名／羅馬字、換歌、主題切換與 YouTube。外部影片可能被瀏覽器阻擋自動播放；應仍可手動播放或開啟官方 YouTube。時間軸既有的「待校正」狀態不因部署變成已驗證。

請另以實機 iPhone Safari、Android Chrome，以及 Windows／macOS 瀏覽器確認觸控、影音與加入主畫面；裝置模式不能代替這些驗證。

離線測試必須使用正式建置，不使用 `npm run dev`：

1. 線上開啟實際 HTTPS 網址，至少等候 8 秒，再於瀏覽器開發工具確認 Service Worker 已啟用，核心快取下載完成。
2. 確認 manifest 的啟動網址、scope 及圖示都屬於目前來源，SW 位於同來源根目錄。
3. 瀏覽首頁與歌曲頁，之後切換飛航模式／開發工具 Offline，重新整理首頁，並首次開啟另一首歌曲。已整理的本地歌詞及地圖應仍能讀取。
4. YouTube 與外部網站需連線；外部逐字時間、日文字型僅能使用已取得的快取。不可宣稱完整離線影音播放。
5. 恢復網路後檢查播放器重試；新版本發布後確認更新提示、重新整理及舊快取清理。

SW 的建置清單包含目前所有 Vite 輸出的延後載入區塊；舊的 `public/assets/` 相容檔仍保留。更換網域屬於新來源，原網域的快取與設定不會自動搬過去。

## 7. 安全標頭與外部服務

`public/_headers` 由 Vite 複製到 `dist/_headers`，套用 `X-Content-Type-Options: nosniff` 與 `Referrer-Policy: strict-origin-when-cross-origin`。Pages 解析此檔案後設定回應標頭；一般 Vite preview 不會套用，必須在線上用 Network 面板或 HTTP 工具驗證。語法見 [Cloudflare Headers](https://developers.cloudflare.com/pages/configuration/headers/)。

保留跨來源 referrer 資訊，以維持 YouTube 嵌入識別。此次未加入 CSP、跨來源隔離或自訂長效快取規則。

既有外部請求包含 YouTube IFrame API／影片、Google Fonts、`lyrics.txw.qzz.io`、`api.amll.dev` 與 `lrclib.net`；皆使用 HTTPS。票務、地圖、Instagram 等為外部連結。外部服務的可用性、CORS 與影片嵌入仍須線上實測。未新增第三方執行程式、後端、帳密或付費服務。

## 8. 常見錯誤

| 問題 | 處理方式 |
| --- | --- |
| 找不到 GitHub 儲存庫 | 確認登入帳號、Cloudflare GitHub App 的單一儲存庫存取權及目標名稱 |
| 專案名稱無法使用 | 以控制台可用名稱建立，採用實際分配的網址；不要猜測正式網址 |
| Node 版本不支援 | 確認 `.node-version` 已提交，並移除不一致的 `NODE_VERSION` 覆寫 |
| 找不到 `index.html` | 建置目錄必須為 `dist`、Root directory 留空，確認 Vite build 成功 |
| 首頁空白或資源 404 | 檢查上傳的是 `dist`、`base: "./"` 未被改動，Network 的 JS／CSS 是否回傳正確內容與 MIME |
| 歌曲網址重新整理失敗 | 沿用 `/#/song/...` 格式，不改成 `/song/...`；不要任意加入 `_redirects` |
| 分享連結仍是舊網域 | 檢查 Production 的 `SITE_URL` 及最新部署 SHA，重新建置；不要只改 `dist/` |
| 網頁顯示舊內容 | 確認正式部署成功、SW 更新與版本標記，使用新的瀏覽器工作階段交叉檢查 |
| YouTube 無法播放 | 檢查網路、嵌入限制及手動播放提示；使用 HTTPS 網域與官方觀看入口 |
| Windows `npm ci` 顯示 `EPERM` | 確認是否有開發伺服器鎖住 `esbuild.exe`；自行停止該伺服器後重試，或在獨立目錄安裝。不要刪除使用者檔案或終止不明程序 |
| 公司代理造成憑證鏈錯誤 | 先確認系統已信任公司憑證；Node 24 可在該次 PowerShell 工作階段設定 `$env:NODE_USE_SYSTEM_CA = '1'` 後重試。不要停用 TLS 憑證驗證 |

## 9. 本次驗證與交付狀態（2026-10-30，Asia/Taipei）

- 確認遠端 `main` 為 `87a0aca925ed02ab0ac8cf780064a0956a1a38c8`，與本機 HEAD 相同；只執行 Git 推送預檢，尚未實際推送。
- 原工作目錄 `npm ci` 因 `esbuild.exe` 鎖定而失敗；使用相同來源與鎖檔的隔離目錄完成乾淨安裝。公司憑證鏈問題經使用系統信任憑證解決，未停用 HTTPS 驗證。
- 初次 audit 找到兩個 high 弱點；在原套件範圍內將 Vite `7.3.6 → 7.3.7`、source-map-js `1.2.1 → 1.2.2`，再次乾淨安裝的 npm audit 回報 0 項弱點，未使用 `--force`。
- `check:guide`、`check:lyrics`、`check:karaoke` 通過，確認 19 首、936 行；SW 模擬生命週期、舊命名空間清理與離線回應檢查通過。
- 初次建置受本機沙箱的子程序限制阻擋；以允許執行 esbuild 的環境完成 production build。
- 原工作目錄亦已完成 `npm run build`。隔離環境分別確認非 Cloudflare 的既有網域／CNAME 行為、`CF_PAGES_URL` 自動注入、`SITE_URL` 優先順序與網址正規化，以及不合法網址會使建置失敗。
- 建置輸出的 10 個 Vite 資源、20 個預快取項目及 manifest 圖示均存在；本機 HTTP 驗證入口、歌曲 Hash 網址及 20 個資源回應為 200，JS／CSS／圖片 MIME 正確，安全標頭檔亦已複製至 `dist/_headers`。此測試不代表瀏覽器影音、畫面或 Pages 線上驗收通過。
- 既有六個未提交檔案與初始快照逐位元組相同；原工作目錄的產生式相依檔已補回，未停止既有程序。
- 靜態掃描 50 個程式／設定檔，未發現常見憑證格式或 HTTP 載入資源；此結果不等同完整安全稽核。
- 響應式 CSS 已靜態檢視，包含手機斷點、900px 雙欄、影片比例、歌詞換行及安全區留白。五種 viewport 的實際渲染、Safari／Android、影音、真實離線與線上安全標頭尚未驗證。

程式碼與本機建置可準備交付；GitHub 更新、Pages 建立、名稱可用性及線上發布均須另行完成，沒有已驗證的正式網站網址。

## 10. 未來的自訂網域

日後確定需要自訂網域時，再使用 Pages 專案的 Custom domains 流程設定 DNS 與 HTTPS，並把 Production 的 `SITE_URL` 更新成驗證成功的網域後重建。目前使用 Pages 免費提供的網址即可；本次未設定網域或新增付費服務。
