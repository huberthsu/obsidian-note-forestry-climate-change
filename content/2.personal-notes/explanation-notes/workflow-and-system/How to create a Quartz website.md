---
publish: true
aliases:
  - 如何建立quartz網站
title: 如何建立quartz網站
created: 2026-09-04T10:21:54.205Z
modified: 2026-09-04T10:21:54.226Z
published: 2026-09-04T10:21:54.226Z
tags:
  - 數位花園
  - 網站
  - ai-agent
category:
  - "[[Explanation notes]]"
  - Workflow and system
in:
  - 2.personal-notes
parent:
sibling:
  - "[[Quartz website troubleshooting report|quartz建站問題排查紀錄]]"
child:
  - "[[How to create a Quartz website - giscus comments]]"
  - "[[How to create a Quartz website - custom 404]]"
  - "[[How to create a Quartz website - patch-package]]"
  - "[[How to create a Quartz website - timestamp links]]"
  - "[[How to create a Quartz website - GitHub PAT management]]"
  - "[[Quartz glossary]]"
---

# 核心功能與用途

## 🌱 Quartz 是什麼

- Quartz 是一套**靜態網站產生器（Static Site Generator）**，專門設計來把 Obsidian vault 轉成可公開瀏覽的網站（數位花園）
- 目前用的是 **Quartz 5**（架構整個重寫過，跟舊版 v4 差很多）：功能拆成一個個獨立的 npm 套件（`@quartz-community/*`），設定檔從 `quartz.config.ts` 改成 `quartz.config.yaml`
- 官方 repo：`jackyzha0/quartz`（分支 `v5`），我的網站是這個 repo 的 **fork**：`<你的帳號>/obsidian-note-forestry-climate-change`

## ☁️ Cloudflare 是什麼、扮演什麼角色

- **Cloudflare Workers**：負責「架站」，把 build 出來的靜態網站檔案放上去給大家瀏覽，網址是 `obsidian-note-forestry-climate-change.hubertxx1211.workers.dev`
- Cloudflare 會**自動偵測** GitHub repo 有新的 push，自動重新 build、重新部署，不用自己手動上傳

## 🔗 Quartz Syncer 是什麼、扮演什麼角色

- **Quartz Syncer** 是 Obsidian 的社群外掛，負責「連接 Obsidian vault 跟 Quartz 網站 repo」這一段
- 它會讀取 vault 裡標記為「要公開」的筆記，編譯（處理 wikilink、frontmatter 等）之後，用 git 自動 commit + push 到網站的 GitHub repo

## 🧩 完整架構圖

```
Obsidian vault（本機，中文筆記）
      │  用 Quartz Syncer 的 Publication Center 手動勾選要發布的筆記
      ▼
GitHub repo（<你的帳號>/obsidian-note-forestry-climate-change，branch v5）
      │  push 後 Cloudflare 自動偵測
      ▼
Cloudflare Workers 自動 build（npx quartz build）+ 部署
      ▼
正式網站（obsidian-note-forestry-climate-change.hubertxx1211.workers.dev）
```

# 使用說明

## 一、第一次建站的完整步驟

### Step 1：準備 GitHub 上的網站 repo

1. 到官方 `jackyzha0/quartz` repo 頁面，用 GitHub 的 **Fork** 功能，複製一份到自己帳號底下（我的就是 `<你的帳號>/obsidian-note-forestry-climate-change`）
2. 分支選 `v5`（Quartz 5，跟舊版 v4 架構差很多，兩者不能混用）

### Step 2：把 repo clone 到本機

1. 在自己電腦上找一個要放程式碼的資料夾位置（不是 Obsidian vault 那個資料夾，是**另外獨立**的一個資料夾）
2. 用 `git clone <repo網址>` 把剛剛 fork 出來的 repo 完整下載下來
3. 進到這個資料夾，用 `git remote -v` 確認顯示的是自己的 fork（`<你的帳號>/...`），不是官方原始 repo

### Step 3：安裝本機環境與相依套件

1. 確認 Node.js 版本 ≥ 22：`node --version`
2. 在 repo 資料夾裡執行 `npm install`：把 `quartz.config.default.yaml` 裡列出的所有插件（含 `@quartz-community/canvas-page`、`@quartz-community/bases-page`）實際下載安裝進 `node_modules`（這一步之前沒做的話，就算設定檔寫了插件也不會真的生效）

### Step 4：建立正式生效的設定檔

1. 複製一份 `quartz.config.default.yaml`，另存成 `quartz.config.yaml`——這份才是網站**真正讀取**的設定檔，`quartz.config.default.yaml` 只是官方範本，改它沒有用
2. 確認 `canvas-page`、`bases-page` 插件的 `enabled` 是 `true`，網站才會把 `.canvas`、`.base` 檔渲染成可互動頁面
3. 可以先在本機用 `npx quartz build` 測試建置一次，確認沒有錯誤訊息

### Step 5：申請 GitHub Personal Access Token（PAT）

Quartz Syncer 要「代替你」把筆記自動 push 到 GitHub，單純知道帳號密碼是不夠的（GitHub 已經不支援用密碼做 git 操作了），需要另外申請一組\*\*權杖（token）\*\*當作專用密碼：

1. 登入 GitHub，右上角頭像 → **Settings**
2. 左側選單最下面找 **Developer settings**
3. 選 **Personal access tokens**（建議選 **Fine-grained tokens**，權限可以縮到最小、只給單一 repo）
4. 按 **Generate new token**：
   - **Repository access**：選「Only select repositories」，只勾自己的網站 repo（`obsidian-note-forestry-climate-change`），不要整個帳號都開放
   - **Permissions**：至少要給 `Contents` 的 **Read and write** 權限（讓 Quartz Syncer 能 push 新內容）
   - **Expiration（有效期限）**：可以設短一點（例如 90 天），到期前 GitHub 會提醒重新申請，比較安全
5. 產生後，**這組 token 只會顯示一次**，要立刻複製起來存好（例如存進密碼管理工具），關掉頁面就再也看不到了，只能重新申請一組新的
6. 這組 token 之後要貼到 Quartz Syncer 設定裡（見 Step 6），**不要**分享給別人、不要貼到公開的地方——它等同於「能幫你 push 程式碼」的密碼
   - 關於pat的管理可參考[[How to create a Quartz website - GitHub PAT management|GitHub PAT 管理與維護]]

### Step 6：在 Obsidian 裡設定 Quartz Syncer

1. 安裝 Quartz Syncer 這個社群外掛（如果還沒裝）
2. 到外掛設定頁，填入：
   - Git remote URL：自己網站 repo 的網址
   - Git branch：`v5`
   - 驗證方式：填入 GitHub 帳號、以及 Step 5 申請到的 **Personal access token**（貼在密碼/token 欄位，不是真正的帳號密碼）
3. 存好設定後，可以先試著發布一篇測試筆記，確認能不能成功連上、push 進去

### Step 7：開啟需要的 Integrations

到 Quartz Syncer 設定的 Integrations 分頁，依需求開關：

- `useCanvas` / `useBases`：開，才能發布 `.canvas`/`.base` 檔
- `useDataview`：**建議先關**，避免內文的 inline field 被誤判塞進 frontmatter（詳見 [[Quartz website troubleshooting report]]）
- `includeAllFrontmatter`：**建議開**，讓自訂 frontmatter 屬性（如 `類別`、`in`）也能一起發布

### Step 8：發布筆記

1. 幫要公開的筆記加上 `publish: true`（或用指令 `Quartz Syncer: add publication flag`）
2. 開啟 **Publication Center**（指令 `Quartz Syncer: Open publication center`，或按左側工具列的葉子圖示）
3. 勾選要發布的筆記，按左下角 **PUBLISH SELECTED CHANGES**

### Step 9：Cloudflare 自動部署

push 成功之後，Cloudflare Workers 會自動偵測到 repo 有新內容，自動重新 `build` 並部署，通常幾分鐘內網站就會更新，全程不用手動上傳任何檔案。

## 二、筆記要被 Quartz Syncer 看到，需要什麼條件

- **一般 Markdown 筆記**：frontmatter 要有 `publish: true`（這個屬性名稱本身可在設定裡自訂），可用指令 `Quartz Syncer: add publication flag` 快速加上
- **`.canvas` / `.base` 檔**：不是看 frontmatter，而是看 Quartz Syncer 全域的 `useCanvas` / `useBases` 開關有沒有打開，打開後 vault 裡「所有」該類型檔案都會變成候選項目，要在 Publication Center 手動勾選才會真的發布

## 三、我目前調整過的關鍵設定

| 設定位置                                     | 選項                                | 目前值                                                          | 用途                                                                    |
| ---------------------------------------- | --------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| Quartz Syncer                            | `useCanvas`                       | 開                                                            | 允許發布 `.canvas` 檔                                                      |
| Quartz Syncer                            | `useBases`                        | 開                                                            | 允許發布 `.base` 檔                                                        |
| Quartz Syncer                            | `useDataview`                     | **關**                                                        | 避免內文的 `parent::`/`sibling::` 等 inline field 被誤判塞進 frontmatter（詳見問題紀錄） |
| Quartz Syncer                            | `includeAllFrontmatter`           | **開**                                                        | 讓自訂 frontmatter 屬性（如 `類別`、`in`）也一起發布過去，不然只會保留固定幾個標準欄位                 |
| `quartz.config.yaml` → `note-properties` | `includeAll`                      | `true`                                                       | 頁面上的屬性面板顯示「所有」frontmatter 屬性，不是只有預設白名單（description/tags/aliases）      |
| `quartz.config.yaml` → `note-properties` | `excludedProperties`              | `[publish, published, permalink, title, created, modified]`  | 把對讀者沒意義的內部欄位從屬性面板隱藏                                                   |
| `quartz.config.yaml` → `ignorePatterns`  | `[private, templates, .obsidian]` | 建置時完全跳過這些路徑，不會出現在最終網站（注意：沒加 `**/` 前綴的話，只會擋最外層同名資料夾，不是任何深度都擋） |                                                                       |

## 四、發布模板筆記，又不想讓「用模板建立的新筆記」被自動公開

- 模板本身（掛在 Obsidian「模板」設定裡、實際拿來建立新筆記的那份）**不要**寫 `publish: true`，明確寫 `publish: false`
- 如果想公開「模板長怎樣」給人參考，另外複製一份放在會公開的資料夾，那份才寫 `publish: true`，跟真正的操作模板分開成兩個檔案

## 五、開啟留言功能（Giscus，基於 GitHub Discussions）

Quartz 內建 `@quartz-community/comments` 插件，用 **Giscus** 這個第三方服務把留言功能建立在 GitHub Discussions 上，不用自己架資料庫或留言用的伺服器。完整設定步驟（申請 App、選 Discussion Category、填 `quartz.config.yaml`、管理留言）另見 [[How to create a Quartz website - giscus comments]]。

## 六、兩條完全獨立的「改動 → 上線」路徑：Quartz Syncer vs 直接在本機 clone 操作

網站的更新其實有兩種完全不同來源，容易搞混：

| | Quartz Syncer 這條路 | 直接在本機 clone 操作這條路 |
|---|---|---|
| 改的是什麼 | **筆記內容**（vault 裡標記 `publish: true` 的 markdown、`.canvas`、`.base` 檔） | **網站本身的設定/程式碼**（`quartz.config.yaml`、`package.json`、插件原始碼、模板檔等） |
| 在哪裡操作 | Obsidian 裡（vault 資料夾） | `<本機路徑>\obsidian-note-forestry-climate-change`（網站 repo 的本機 clone） |
| 怎麼 push 上去 | Quartz Syncer 外掛內建的機制，用它自己設定裡存的 GitHub PAT | 最原始的 `git add` / `git commit` / `git push` 指令，靠電腦上已裝好的 **Git Credential Manager** 記住的 GitHub 登入狀態驗證身份，不需要另外存一組 PAT |
| 什麼時候用 | 平常寫筆記、想公開新內容時 | 要調整網站行為本身（例如加留言功能、修 Graph 顯示 bug、改 Dataview 查詢模板）時 |

**為什麼會有這條「直接在本機操作」的路**：Quartz Syncer 的設計目的單純是「把 vault 裡的筆記內容送到 repo 的 `content/` 資料夾」，它不負責、也沒辦法改網站本身的設定檔或程式碼（那些檔案根本不在 vault 裡）。要調整這些，就得像前面 Step 2「把 repo clone 到本機」那樣，有一份**真正下載到電腦上的完整 repo 副本**，才能實際打開、編輯、跑 `npm install`/本地測試，改完用一般的 git 指令 push 回 GitHub。

**`git clone` 本身在做的事**：把 GitHub 上的 repo（所有檔案 + 版本歷史）完整下載一份到本機資料夾，變成一個可以直接編輯、跑指令測試的副本。GitHub 上的 repo 只是雲端存放的版本，沒辦法直接在網頁上跑建置指令，一定要先 clone 到本機才能實際動手做事。詳見下方名詞解釋「Clone（複製）」。

> [!tip] 兩條路徑互不衝突、也不會互相覆蓋
> 因為一個動的是 `content/` 資料夾裡的筆記檔案，一個動的是設定檔/程式碼/插件，正常情況下不會改到同一個檔案，兩邊各自 `git push` 都是對同一個 GitHub repo 累加新的 commit，不會互相打架。

## 七、自訂 404（找不到頁面）

`.base`／`.canvas` 或任何還沒發布的頁面，如果直接打開對應網址，正常應該看到 Quartz 自己 build 出來的 404 頁面，而不是瀏覽器內建的空白錯誤畫面——這牽涉到 Cloudflare Workers Static Assets 的 `not_found_handling` 設定。完整原因、修法、本機測試方式另見 [[How to create a Quartz website - custom 404]]。

## 八、修改第三方套件（`@quartz-community/*`）內部行為：`patch-package`

`quartz.config.yaml` 只能「開關」插件既有的功能，改不了套件**本身寫死**的行為，這時可以用 `patch-package` 直接改 `node_modules` 裡編譯好的檔案並固化成 patch。操作步驟、已經用過的例子、風險另見 [[How to create a Quartz website - patch-package]]。

## 九、讓 Timestamp Notes 外掛的時間戳記在網站上可以點擊跳轉

[[Timestamp note plugins|Timestamp Notes]] 外掛本身是 desktop-only，發布到網站後留下的 code block 原本完全沒作用。新增了一個 vendor plugin，在 build 時把這些 code block 轉成可點擊按鈕，點擊後用 `postMessage` 控制頁面上既有的 YouTube iframe 跳到對應秒數並播放。完整原理、遇到的坑（iframe autoplay 權限、Windows 本機 symlink 權限）另見 [[How to create a Quartz website - timestamp links]]。

# 參考資料

- [Quartz 官方文件](https://quartz.jzhao.xyz/)
- [Quartz Syncer 文件](https://saberzero1.github.io/quartz-syncer-docs/)
- [Quartz Syncer GitHub](https://github.com/saberzero1/quartz-syncer)
- [giscus 官方網站](https://giscus.app)
- [giscus GitHub App 安裝頁](https://github.com/apps/giscus)
- 詳細問題排查過程另見 [[Quartz website troubleshooting report]]

# 名詞解釋

完整名詞解釋見共用詞彙表 [[Quartz glossary]]。
