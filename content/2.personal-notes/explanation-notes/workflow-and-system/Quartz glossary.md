---
publish: true
aliases:
  - Quartz 名詞解釋
title: Quartz 名詞解釋
created: 2026-09-04T10:21:54.633Z
modified: 2026-09-04T10:21:54.653Z
published: 2026-09-04T10:21:54.653Z
tags:
  - 數位花園
  - 網站
  - ai-agent
category:
  - "[[Explanation notes]]"
  - Workflow and system
parent:
  - "[[Quartz website troubleshooting report]]"
  - "[[How to create a Quartz website]]"
sibling:
child:
"| **Integration（整合功能）** | Quartz Syncer 裡的一組開關，各自負責把 Obsidian 裡不同外掛的內容（Dataview、Canvas、Bases、Excalidraw 等）轉換成 Quartz 網站看得懂的格式 |\n| **useCanvas / useBases / useDataview / includeAllFrontmatter** | 都是 Quartz Syncer 設定裡的具體開關名稱：前三個屬於上面說的 Integration，分別控制要不要發布 `.canvas`、`.base` 檔、要不要轉換 Dataview 語法；`includeAllFrontmatter` 則決定要不要把筆記裡自訂的 frontmatter 欄位一起發布出去 |\n| **`tryQueryMarkdown()`** | Dataview 外掛自己提供的一個 API 函式，功能是「執行一個 dataview 查詢，並把結果直接轉成一段 Markdown 文字」。Quartz Syncer 發布 dataview 區塊時就是呼叫這個函式，把結果原封不動寫進發布出去的筆記檔案裡 |\n| **正則表達式（Regex, Regular Expression）** | 一種用特定語法描述「文字比對規則」的工具，常用來從一大段文字裡找出符合某種格式的片段。Quartz Syncer 用它來找 Dataview 的 `key": value` 格式 |
"| **貪婪比對（Greedy matching）** | 正則表達式的一種行為：比對時會盡可能吃進最多字元才停下來，而不是找到最短、最精準的片段就停。Dataview 轉換功能亂抓一大段文字當 key，就是貪婪比對搭配跨行比對造成的 |\n| **Dataview** | Obsidian 的一款熱門社群外掛，可以用類似資料庫查詢的語法，動態列出/篩選符合條件的筆記；也支援在筆記內文用 `key": value` 這種「inline field」語法直接寫欄位資料 |
---

# Quartz 名詞解釋

[[Quartz website troubleshooting report]] 跟 [[How to create a Quartz website]] 共用的詞彙表，兩篇都會用到的名詞統一收在這裡，避免兩邊各自維護一份、內容慢慢兜不起來。

## 基礎概念

| 名詞 | 解釋 |
|---|---|
| **Quartz** | 把 Obsidian vault 轉成靜態網站的產生器工具，本身是開源專案，我用的是它的第 5 個大版本（Quartz 5） |
| **靜態網站產生器（Static Site Generator, SSG）** | 一種工具：吃進原始內容（這裡是 Markdown 筆記），事先「編譯」成一堆固定的 HTML/CSS/JS 檔案，之後訪客瀏覽時直接讀這些現成檔案，不用即時運算，速度快、不需要資料庫 |
| **渲染（Render）** | 把「原始資料」轉換成「最終呈現給使用者看的畫面」的過程。以這個網站來說，就是 Quartz 把你的 Markdown 筆記、`.canvas` 檔、`.base` 檔，轉換成瀏覽器看得懂、排版好的 HTML 網頁的動作。渲染可以發生在**build 時**（伺服器端／建置時就轉換好，存成固定的 HTML，Quartz 的頁面大多是這種）或**瀏覽器裡**（訪客打開頁面當下，用 JavaScript 即時轉換，例如 Explorer 側邊欄的檔案樹） |
| **數位花園（Digital Garden）** | 泛指「把個人筆記/知識庫公開發布成網站」這種形式的統稱，Quartz 就是常見的實現工具之一 |
| **`contentIndex.json`** | Quartz 建置網站時自動產生的一份 JSON 檔，裡面記錄每篇已發布頁面的網址（slug）、標題、內文、標籤、連到哪些其他頁面等資訊，網站上的 graph（關聯圖）、搜尋功能都是讀這份檔案運作的 |
| **Slug** | 一篇頁面最終呈現在網址列上的那串字（例如 `test-folder/note-a`），通常是根據檔案在資料夾裡的實際路徑自動產生 |

## Git / GitHub 相關

| 名詞 | 解釋 |
|---|---|
| **Fork** | git／GitHub 的概念：把別人的 repo 複製一份到自己帳號底下，變成一個獨立、可以自己修改的版本。我的網站 repo 就是 `jackyzha0/quartz` 的 fork |
| **Clone（複製）** | 把某個 GitHub 上的 repo「完整下載一份到本機」的動作，下載下來的本機資料夾就叫這個 repo 的 clone。**為什麼需要這個動作**：GitHub 上的 repo 只是雲端存放的版本，沒辦法直接在網頁上跑 `npm install`、build、改程式碼測試效果，一定要先把整個 repo（所有檔案＋版本歷史）下載到本機，才能實際動手操作。跟 fork 不一樣：fork 是在 GitHub 上多一份**屬於自己帳號**的 repo；clone 則是把（不管是別人的、還是自己 fork 出來的）某個 repo 抓一份**到自己電腦上**才能實際編輯、測試。同一個 repo 可以 clone 到本機好幾個不同資料夾，彼此獨立、互不影響 |
| **repo（repository）** | git 的「倉庫」，存放專案所有檔案跟版本歷史紀錄的地方，可以放在本機，也可以同步到 GitHub 這類遠端平台 |
| **commit / push** | `commit`：把改動存成一筆有紀錄的版本；`push`：把本機的 commit 上傳同步到遠端 repo（例如 GitHub） |
| **`HEAD` / `origin/main`** | git 的常見代稱：`HEAD` 通常指「本機目前所在的版本」；`origin` 是遠端 repo 的預設代稱，`origin/main` 就是指「遠端 repo 的 main 分支」 |
| **Merge conflict（合併衝突）** | 用 git 同步時，如果同一個檔案在本機跟遠端各自被改過、內容衝突，git 沒辦法自動判斷該用哪一邊，就會標記成「衝突」，需要人工選擇或合併後才能繼續 |
| **Git Credential Manager** | Windows／Mac 上常見的 git 身份驗證輔助工具，第一次對某個 repo 做 git 操作（例如 push）時會跳出視窗要求登入 GitHub 帳號授權，授權過一次之後會把憑證安全地存在系統裡，之後同一台電腦對同一個 repo 下 `git push`／`git pull` 就不用每次重新輸入帳密。跟 Quartz Syncer 自己存的 GitHub PAT 是**兩組互相獨立**的身份驗證機制 |
| **Personal Access Token（PAT，個人存取權杖）** | GitHub 核發給使用者的一組專用「密碼」，用來讓程式（例如 Quartz Syncer）代替你做 git 操作（如 push）。因為 GitHub 已經不允許直接用帳號密碼做這件事，才需要另外申請這組 token。申請時可以限制它的**權限範圍（scope）**和**有效期限**，比真正的帳號密碼安全，外流時也能單獨撤銷、不影響帳號本身 |
| **Fine-grained token / Classic token** | GitHub PAT 的兩種類型：**Classic** 是舊式的，權限開放範圍比較粗（例如整個帳號的所有 repo）；**Fine-grained** 是新式的，可以精細限制「只給某一個 repo」、「只給某幾種權限」，安全性較高，是目前 GitHub 官方建議優先使用的類型 |
| **Scope / Permission（權限範圍）** | 申請 PAT 時要設定這組 token「能做什麼事」，例如「讀寫某個 repo 的內容（Contents: Read and write）」。範圍設得越小，就算 token 外流，能造成的傷害也越小 |
| **Issue / PR（Pull Request）** | GitHub 上的兩種機制：Issue 是回報問題、提出需求的討論串；PR 是有人已經寫好修復程式碼，提交給專案維護者審核、合併進正式版本的請求 |
| **Upstream（上游）** | 指「原始／源頭」的專案或套件本身（相對於自己在用的那份）。例如 bug 出在 `@quartz-community/graph` 套件本身，就會說這是「upstream 的 bug」，不是自己設定錯 |

## Quartz Syncer / 發布流程

| 名詞 | 解釋 |
|---|---|
| **Quartz Syncer** | Obsidian 的社群外掛，負責把 vault 裡標記好的筆記，編譯、透過 git 自動發布到 Quartz 網站的 repo |
| **Publication Center（發布中心）** | Quartz Syncer 裡的操作介面，列出哪些筆記已發布/有變更/待發布，可以勾選後一次性發布 |
| **Frontmatter** | Markdown 檔案最上方，用 `---` 包起來的 YAML 區塊，用來存放這篇筆記的中繼資料（標題、標籤、發布狀態等），不算正文內容 |
| **Publish flag（發布旗標）** | 指 frontmatter 裡的 `publish: true` 這個屬性，Quartz Syncer 用它判斷一篇筆記要不要被視為「可發布」 |
| **Integration（整合功能）** | Quartz Syncer 裡的一組開關，各自負責把 Obsidian 裡不同外掛的內容（Dataview、Canvas、Bases、Excalidraw 等）轉換成 Quartz 網站看得懂的格式 |
| **useCanvas / useBases / useDataview / includeAllFrontmatter** | 都是 Quartz Syncer 設定裡的具體開關名稱：前三個屬於上面說的 Integration，分別控制要不要發布 `.canvas`、`.base` 檔、要不要轉換 Dataview 語法；`includeAllFrontmatter` 則決定要不要把筆記裡自訂的 frontmatter 欄位一起發布出去 |
| **`tryQueryMarkdown()`** | Dataview 外掛自己提供的一個 API 函式，功能是「執行一個 dataview 查詢，並把結果直接轉成一段 Markdown 文字」。Quartz Syncer 發布 dataview 區塊時就是呼叫這個函式，把結果原封不動寫進發布出去的筆記檔案裡 |
| **正則表達式（Regex, Regular Expression）** | 一種用特定語法描述「文字比對規則」的工具，常用來從一大段文字裡找出符合某種格式的片段。Quartz Syncer 用它來找 Dataview 的 `key:: value` 格式 |
| **貪婪比對（Greedy matching）** | 正則表達式的一種行為：比對時會盡可能吃進最多字元才停下來，而不是找到最短、最精準的片段就停。Dataview 轉換功能亂抓一大段文字當 key，就是貪婪比對搭配跨行比對造成的 |
| **Dataview** | Obsidian 的一款熱門社群外掛，可以用類似資料庫查詢的語法，動態列出/篩選符合條件的筆記；也支援在筆記內文用 `key:: value` 這種「inline field」語法直接寫欄位資料 |
| **Breadcrumbs 外掛** | Obsidian 的另一款社群外掛，透過筆記內文裡的 `parent::`、`sibling::`、`child::` 等 inline field，建立筆記之間的階層關係，做出麵包屑導航、關係圖等功能 |
| **`WITHOUT ID`** | Dataview `TABLE` 查詢的語法關鍵字，作用是「取消掉查詢預設自動加上的第一欄（`file.link`，一個帶別名的雙向連結）」，讓你可以完全自己決定第一欄要顯示什麼內容、用什麼格式 |
| **`join()`（Dataview 函式）** | Dataview 提供的內建函式，把一個陣列（list）用指定的分隔符號接成一段純文字字串，例如 `join(file.tags, " ")` 會把 `["#a", "#b"]` 變成字串 `"#a #b"` |
| **mdast「html」節點** | Markdown 在被程式解析時，會先轉成一棵樹狀結構（mdast，Markdown Abstract Syntax Tree），樹上每個節點都有一個「類型」。純文字內容的節點類型是「text」，而**寫死在原文裡的原始 HTML 標籤**會被歸類成另一種類型「html」。很多針對「文字內容」設計的處理邏輯（例如把 `#tag` 轉成連結）只掃描 text 節點，不會自動處理 html 節點裡的內容，除非額外設定要它也處理 |
| **AST 往返序列化（parse → transform → stringify round-trip）** | 很多筆記處理工具（remark、mdast 系列都是）不是直接對文字做字串替換，而是先把 Markdown「解析」成一棵樹狀結構（AST），在樹上做修改，最後再「序列化」回文字。這個來回過程如果**解析邏輯**跟**序列化邏輯**沒有完全對稱，資料就會在「解析出來、序列化回去」這一來一回之間憑空消失或跑位，即使當初解析階段完全沒出錯 |
| **Markdown 連結語法裡的角括號 `<url>`** | 標準 Markdown 連結 `[顯示文字](網址)` 的網址部分，如果直接放空格會讓解析器在空格處提前結束、切斷網址；用角括號把網址包起來寫成 `[顯示文字](<網址>)`，就能讓網址裡含有空格也正常被解析成一整段 |

## 網站端設定與插件

| 名詞 | 解釋 |
|---|---|
| **`quartz.config.yaml` / `quartz.config.default.yaml`** | 前者是網站**真正生效**的設定檔（要自己建立）；後者只是官方提供的**預設範本**，本身不會被讀取，通常拿來複製當作 `quartz.config.yaml` 的起點 |
| **note-properties** | Quartz 網站端的一個插件，負責在每篇筆記頁面上方顯示一個「屬性面板」，把 frontmatter 內容視覺化呈現給讀者看 |
| **`includeAll` / `excludedProperties`** | `note-properties` 插件的兩個設定：前者決定要不要顯示「全部」屬性，後者是無論如何都要排除、不顯示的屬性清單 |
| **`ignorePatterns`** | `quartz.config.yaml` 裡的設定，列出建置網站時要完全跳過、不處理的檔案／資料夾路徑（例如私人內容） |
| **fast-glob** | 一套比對「檔案路徑樣式」的語法規則（跟 bash 的萬用字元寫法不完全一樣），Quartz 的 `ignorePatterns` 就是用這套語法 |
| **YAML** | 一種簡潔易讀的資料格式，Obsidian 的 frontmatter 預設就是用 YAML 語法書寫（也是 `quartz.config.yaml` 這個設定檔採用的格式） |
| **`canvas-page` / `bases-page`** | Quartz 網站端負責把 `.canvas`、`.base` 檔渲染成可互動網頁的插件名稱 |
| **`.canvas` 檔 / `.base` 檔** | Obsidian 的兩種特殊檔案格式：`.canvas` 是「畫布」（視覺化白板，JSON Canvas 標準格式）；`.base` 是「Bases」資料庫視圖（用查詢條件篩選/呈現筆記的表格） |
| **`title` / `aliases` / `permalink`** | 都是 frontmatter 常見屬性：`title` 是頁面顯示的標題（沒填就用檔名）；`aliases` 是這篇筆記的其他別名，可用來搜尋/連結；`permalink` 是額外指定的自訂網址別名（只是「別名」，不會取代真正的網址） |
| **`AliasRedirects`** | Quartz 的一個插件，會幫筆記的每一個 `aliases`／`permalink` 值各自產生一個小的轉址頁面，讓別人用那個別名的網址也能連到正確的筆記 |
| **`ENAMETOOLONG`** | Linux／Unix 系統的一種標準錯誤代碼，意思是「檔名（或路徑）太長」。Node.js 在檔案系統操作失敗時，會直接把作業系統回傳的這種錯誤代碼原封不動顯示出來 |
| **Byte（位元組）vs 字元數** | 「字元數」是人眼看到的字有幾個；「byte 數」是電腦實際儲存這些字要用掉多少空間。英文字母/數字在 UTF-8 編碼下 1 個字元＝1 byte，但**中文字一個字通常要 3 bytes**。很多系統對檔名長度的限制算的是 **byte 數，不是字元數** |
| **`markdownLinkResolution: shortest`** | Quartz 網站的全域設定（`crawl-links` 外掛的選項），決定 `[[wikilink]]` 只寫筆記名稱、沒寫完整資料夾路徑時要怎麼找到對應頁面：在全站所有頁面裡比對檔名，如果唯一匹配到一篇就自動連過去；如果同名筆記有很多篇，才需要打更完整的路徑來消除歧義 |

## npm / 套件與建置工具

| 名詞 | 解釋 |
|---|---|
| **npm / `npm install`** | npm 是 JavaScript/Node.js 的套件管理工具，`npm install` 會讀取 `package.json` 列出的套件清單，把它們實際下載安裝進 `node_modules` 資料夾，Quartz 的所有插件都是透過這個方式安裝 |
| **`package-lock.json`** | npm 套件管理工具產生的檔案，記錄專案實際安裝的每個套件「精確版本號」，確保不同時間、不同人安裝出來的套件版本完全一致 |
| **tsup** | 一個把 TypeScript 原始碼打包、壓縮成正式發布用 JS 檔的建置工具，很多 npm 套件用它來產生 `dist/` 資料夾裡的成品 |
| **Entry point（進入點）** | 一個套件對外提供的「起始匯入路徑」，例如 `@quartz-community/graph` 同時提供 `.`（主入口）跟 `./components` 兩個 entry point。用 `tsup` 這類工具打包時，每個 entry point 通常會各自產生一份獨立的輸出檔，即使內容大部分重複，也不會自動互相共用，改一份不代表另一份也會跟著改 |
| **`npx` 快取** | `npx` 執行套件時，如果本機沒有現成的安裝，會下載一份放到系統的全域快取資料夾，之後同樣的指令可能會直接重用這份全域快取，而不是專案資料夾自己的 `node_modules`。兩者是完全獨立的兩份安裝 |
| **vendor（把第三方套件複製進自己的 repo）** | 一種管理第三方依賴的做法：不透過套件管理工具在建置時動態抓取，而是直接把改過的套件原始碼／編譯結果整份複製、提交進自己專案的版本控制裡（通常放在一個叫 `vendor/` 的資料夾）。跟 `patch-package`（只存差異 patch）的差別是：vendor 存的是**整份完整內容**，patch-package 存的是**修改的差異** |
| **patch-package** | 一個 npm 套件，可以把你對 `node_modules` 裡某個第三方套件做的修改，記錄成一份 `.patch` 檔存進 repo（放在 `patches/` 資料夾，git 會追蹤這份 patch 檔，但不會追蹤 `node_modules` 本身）。搭配 `package.json` 裡的 `postinstall` script 使用，每次重新 `npm install` 之後會自動重新套用這份 patch，讓「改第三方套件原始碼」這種做法也能撐過重新部署，不用真的 fork 整個套件自己維護一份 |
| **`postinstall` script** | `package.json` 的 `scripts` 裡一個有特殊意義的欄位名稱，`npm install` 完成後會自動執行這個 script，不需要另外手動下指令。這個 repo 用它來自動跑 `patch-package`，確保 `patches/` 資料夾裡存的每一份修改，每次重新安裝套件時都會被自動重新套用 |

## 網址編碼 / 識別字相關

| 名詞 | 解釋 |
|---|---|
| **URL encoding / percent-encoding（網址編碼）** | 瀏覽器規定網址（`window.location.pathname`）裡不能直接放某些字元（包含中文等非 ASCII 字元），必須轉換成 `%E5%B7%A5` 這種以 `%` 開頭的編碼格式才能放進網址列，這個轉換過程就叫 percent-encoding |
| **`decodeURIComponent` / `decodeURI`** | JavaScript 內建函式，功能是把 percent-encoding 過的字串**還原**回原本的文字（例如把 `%E5%B7%A5` 還原成「工」） |
| **CJK** | Chinese, Japanese, Korean 的縮寫，泛指中文、日文、韓文這些「非 ASCII、非拉丁字母」的東亞文字系統，很多軟體工具原生只支援英文，對 CJK 的處理常常沒考慮周全，容易出這類 bug |
| **解析器 / Lexer / Tokenize（詞法分析）** | 程式要「讀懂」一段文字之前，第一步通常會先把文字切成一個個有意義的片段（token），這個切字的步驟跟負責切字的元件，就叫 lexer／tokenize |
| **識別字（Identifier）** | 程式語言/查詢語言裡，用來代表「變數名稱」、「欄位名稱」的文字片段（例如 `類別`、`file`、`category`） |

## Graph 相關

| 名詞 | 解釋 |
|---|---|
| **Local graph / Global graph** | Quartz 網站上兩種關聯圖：local graph 是每篇筆記側邊欄的「小圖」，只顯示跟目前頁面直接相關的鄰居；global graph 是點開後顯示「全站」所有頁面關聯的大圖 |
| **BFS（Breadth-First Search，廣度優先搜尋）** | 一種從某個起點開始，一層一層向外擴散尋找相鄰節點的演算法。Local graph 就是用 BFS 從「目前頁面」這個起點，往外找出直接相連的鄰居筆記 |
| **d3-force** | 一套 JavaScript 的力導向圖（force-directed graph）模擬函式庫，用「互斥力」「聚合力」「碰撞防重疊力」等虛擬物理力，讓一堆節點自動排列成看起來自然、不會全部疊在一起的圖形。Quartz 的 Graph 頁面用它算每個節點的位置 |
| **力導向圖（Force-directed graph）** | 一種畫關聯圖的方式：節點的位置不是人工排好的，而是靠模擬物理力自動運算出來，每次運算的起始條件如果是隨機的，最終排列結果也會每次略有不同 |
| **`forceCollide`（碰撞力）** | d3-force 提供的一種力，作用是讓節點之間保持一定距離、避免互相重疊，可以設定「判定半徑」和「疊代次數」。疊代次數愈高，模擬愈精確地把節點推開，但**不保證** 100% 零重疊 |
| **PIXI.js** | 一套用來在網頁 `<canvas>` 上繪製 2D 圖形的 JavaScript 函式庫，效能比直接操作 DOM 元素好很多，Quartz 的 Graph 頁面就是用它把節點、連接線畫出來 |
| **`eventMode`（PIXI 互動模式）** | PIXI.js 裡設定一個圖形物件「要不要參與滑鼠/觸控互動」的屬性，設成 `"static"` 代表這個物件會主動偵測滑鼠事件 |
| **命中測試（Hit-testing）** | 程式判斷「滑鼠游標目前在哪個圖形物件上面」的過程。如果畫面上有多個物件的判定範圍互相重疊，命中測試通常只會回傳其中一個 |
| **疊放順序（z-order / stacking order）** | 畫面上多個圖形物件重疊時，決定「誰畫在誰上面、誰擋住誰」的順序，通常由加入畫面的先後順序決定：後加入的疊在更上層 |
| **`pointermove` 事件** | 瀏覽器原生的滑鼠/觸控移動事件，只要游標在該元素範圍內移動就會持續觸發 |
| **SPA（Single Page Application，單頁應用）navigation** | Quartz 開啟 `enableSPA` 後，點擊站內連結不會觸發瀏覽器真正重新載入整頁，而是攔截 `<a>` 點擊事件、用 JavaScript 抓新頁面內容替換畫面、並用 `history.pushState` 更新網址列。但這個攔截機制只認得真正的 `<a>` 標籤點擊，如果是程式直接改 `window.location.href`，不會被攔截，會變成瀏覽器真正的整頁重新載入 |
| **`history.pushState`** | 瀏覽器提供的 API，可以在**不觸發真正頁面重新載入**的情況下，直接改變網址列顯示的網址、並在瀏覽紀錄裡加一筆紀錄 |
| **硬導航（Hard navigation）vs 軟導航（Soft navigation）** | 硬導航：瀏覽器真正重新載入整個頁面；軟導航：頁面沒有真的重新載入，只是用 JavaScript 模擬出「換頁」的效果。硬導航會讓網址經過瀏覽器完整的 URL 正規化流程（可能把某些符號 percent-encode），軟導航則直接沿用程式碼裡準備好的網址字串 |

## CORS / Cloudflare 部署相關

| 名詞 | 解釋 |
|---|---|
| **CORS（Cross-Origin Resource Sharing，跨來源資源共用）** | 瀏覽器的一種安全機制：網頁上的程式碼要跨網域抓取資源時，瀏覽器會先檢查被抓的那個網域有沒有在回應標頭裡明確允許這個來源存取，沒有的話就直接擋下請求 |
| **`Access-Control-Allow-Origin`** | CORS 機制裡的一個 HTTP 回應標頭，由「被抓資源的那一方」設定，用來明確宣告「允許哪些來源網域跨網域讀取我這份資源」 |
| **iframe（inline frame，行內框架）** | 一種 HTML 標籤，可以在自己的網頁裡「嵌入」另一個完全獨立的網頁，兩者的程式碼、cookie、儲存空間預設是隔離的。Giscus 留言區實際上就是嵌入一個指向 `giscus.app` 的 iframe |
| **`_headers` 檔案** | Cloudflare Pages／Cloudflare Workers（靜態資源模式）都支援的一種設定檔慣例：放在網站輸出的根目錄，用簡單的縮排語法宣告「符合某個路徑規則的檔案，要額外帶哪些 HTTP 回應標頭」 |
| **Cloudflare Workers** | 這次用來實際「架站」、提供網站服務的平台，會自動偵測 GitHub repo 有新內容就重新建置部署 |
| **Cloudflare Workers Static Assets** | Cloudflare Workers 的一種部署模式：不寫自訂的 worker 程式（沒有 `main` 進入點），單純靠 `wrangler.jsonc` 裡的 `assets.directory` 指到一個資料夾，Cloudflare 就直接把裡面的檔案當靜態網站托管，效果類似 Cloudflare Pages |
| **`not_found_handling`** | `wrangler.jsonc` 底下 `assets` 的一個設定，決定 Static Assets 找不到對應資源時要怎麼回應。預設完全不處理，直接回一個空 body 的 404；設成 `"404-page"` 才會自動改用該目錄下的 `404.html` 當回應內容（狀態碼仍是 404） |
| **`wrangler.jsonc`** | Cloudflare Workers 的部署設定檔（`wrangler` 是 Cloudflare 官方 CLI 工具的名字），控制 worker 名稱、`compatibility_date`、Static Assets 目錄等部署行為，跟決定網站內容的 `quartz.config.yaml` 是兩份完全不同的檔案 |
| **`npx wrangler dev`** | 用 Cloudflare 官方 CLI 在本機啟動一個模擬伺服器，會真正照著 `wrangler.jsonc` 的設定（含 `not_found_handling`）模擬 Cloudflare 的路由行為。跟 `npx quartz build --serve` 不一樣：後者只是普通靜態檔案伺服器，不會反映任何 Cloudflare 專屬設定 |

## Giscus 留言相關

| 名詞 | 解釋 |
|---|---|
| **Giscus** | 第三方留言元件，把留言功能建立在 GitHub Discussions 上，不用自己架資料庫或伺服器。Quartz 透過 `@quartz-community/comments` 插件（`provider: giscus`）整合它 |
| **GitHub Discussions** | GitHub repo 內建的論壇式討論功能（跟 Issues 不同，Issues 是任務/bug 追蹤，Discussions 是開放式討論），要在 repo 的 Settings → Features 手動開啟，且只能用在 Public repo |
| **Discussion Category（討論分類）** | GitHub Discussions 底下把討論串分類的機制，內建 Announcements、General、Ideas、Polls、Q\&A、Show and tell 幾種，各自權限/機制不同，也能自己新增分類 |
| **giscus GitHub App** | 要另外安裝在自己 repo 上的 GitHub App（`https://github.com/apps/giscus`），授權 giscus 服務讀寫該 repo 的 Discussions，安裝好之後 giscus.app 的分類查詢/留言功能才能正常運作 |
| **Node ID（`R_`／`DIC_` 開頭的字串）** | GitHub 底層用 GraphQL API 管理各種物件（repo、Discussion、分類…）時，每個物件都有一組全域唯一的識別碼。`R_` 開頭代表 Repository 的 ID（對應 `repoId`），`DIC_` 開頭代表 Discussion Category 的 ID（對應 `categoryId`）。這兩個值不是密鑰，公開寫在網站設定檔裡是正常且安全的 |
| **`mapping` / `strict`（giscus 設定）** | `mapping` 決定「網站頁面」跟「GitHub Discussion 討論串」怎麼配對，設 `"url"` 代表用網址一對一配對（一篇文章一個獨立留言串）；`strict` 設 `true` 時比對更嚴格，避免不小心連到不相關的討論串 |
| **Lock conversation（鎖定討論串）** | GitHub Discussions 的功能，repo owner/管理員可以把某個討論串鎖起來，鎖定後任何人都不能再留言，但既有留言仍會保留、仍可瀏覽，是「關閉留言功能」在 giscus 上的實際做法（Announcements/General 分類本身沒有內建的開關狀態） |

## Timestamp Notes 影片跳轉相關

| 名詞 | 解釋 |
|---|---|
| **`postMessage` API** | 瀏覽器提供的跨視窗／跨 iframe 通訊機制。因為安全性考量，網頁的 JavaScript 沒辦法直接呼叫另一個來源（origin）的 iframe 內部的函式，`postMessage` 讓外層頁面可以「丟一則訊息」進 iframe，iframe 裡的程式自己監聽並決定怎麼處理，不需要共用程式碼或直接互相呼叫。YouTube 的嵌入影片就是靠這個機制，接收外部頁面丟進來的 `seekTo`／`playVideo` 等指令 |
| **`enablejsapi`（YouTube embed 參數）** | YouTube 嵌入網址（`youtube.com/embed/影片ID`）可以加的一個查詢參數，設成 `1` 才會讓該嵌入影片的播放器啟動監聽 `postMessage` 指令的功能，沒加這個參數，外部頁面送過去的控制指令會被忽略 |
| **Permissions Policy（權限政策）／iframe 的 `allow` 屬性** | 瀏覽器規定：一個 iframe 能不能使用某些敏感功能（例如自動播放影音、讀取鏡頭麥克風、全螢幕），除了 iframe 內部程式自己想用之外，**外層頁面也要在 `<iframe>` 標籤的 `allow` 屬性明確列出授權**，兩邊都同意才會生效。是一種雙重確認機制，避免被嵌入的第三方內容偷偷使用敏感功能 |
| **自動播放政策（Autoplay policy）** | 瀏覽器（尤其 Chrome）對「網頁自己用程式碼觸發影音播放」的限制：即使程式碼呼叫了播放指令，如果不符合政策要求（例如沒有使用者手動互動、iframe 沒有在 `allow` 屬性宣告 `autoplay`），瀏覽器會直接靜默擋下播放，不會跳出錯誤訊息，只是畫面上什麼都沒發生，很容易誤以為是自己程式邏輯寫錯 |
| **hast（HTML Abstract Syntax Tree）** | 跟前面「mdast」節點對應的另一種樹狀結構：mdast 是 Markdown 解析出來的樹，經過轉換後會變成 hast——代表**最終 HTML 結構**的樹（節點類型是 `<div>`、`<pre>`、`<iframe>` 這些 HTML 標籤，而不是 Markdown 語法概念）。Quartz 的處理流程大致是「Markdown 原始碼 → mdast → hast → 最終 HTML 字串」 |
| **rehype（插件類型）** | 一類專門操作 hast 樹的插件（對應操作 mdast 樹的 remark 插件）。Quartz 的 `htmlPlugins` 就是在跑一串 rehype 插件，時機是 Markdown 已經轉換成最終 HTML 結構之後，適合用來做「調整最終渲染出來的 HTML 標籤/屬性」這類工作 |
| **事件代理（Event delegation）** | 一種 JavaScript 事件綁定技巧：不對每一個個別按鈕/連結各自綁一次 click 監聽器，而是只在共同的外層祖先（例如整個 `document`）綁**一個**監聽器，事件發生時利用「事件冒泡」機制往上傳，再用 `element.closest(選擇器)` 判斷實際點到的是哪個目標。好處是就算之後動態新增/替換了很多個符合選擇器的元素（例如 SPA 換頁後整段內容被替換），這一個監聽器依然涵蓋得到，不用每次都重新綁定 |
| **Symlink（符號連結）** | 檔案系統裡的一種特殊項目，本身不存放實際內容，只是「指向」另一個檔案或資料夾路徑的捷徑，程式讀取時會自動跳轉到目標位置。在 Linux／Mac 上一般權限就能建立；在 Windows 上，建立 symlink 預設需要系統管理員權限，或另外開啟「開發人員模式（Developer Mode）」才行 |
| **Junction（NTFS 接合點）** | Windows NTFS 檔案系統特有的一種「資料夾捷徑」，效果跟 symlink 很接近（指向另一個資料夾），但**只能連資料夾、不能連單一檔案**，而且建立時不需要系統管理員權限或開發人員模式，是 Windows 上遇到 symlink 權限問題時常見的替代方案。Node.js 的 `fs.lstatSync().isSymbolicLink()` 對 Junction 一樣會回傳 `true`，程式邏輯通常不用特別區分兩者 |
| **`EPERM`** | Node.js／作業系統回報的一種標準錯誤代碼，意思是「操作被拒絕，權限不足」。在 Windows 上嘗試用程式建立 symlink、但目前使用者權限不夠時，就會丟出這個錯誤 |

## CSS / 前端互動細節

| 名詞 | 解釋 |
|---|---|
| **CSS `position` 的三種常見定位方式** | `absolute`：完全脫離版面排列，位置以「最近一個有設定 `position: relative/absolute/sticky` 的祖先元素」為基準。`fixed`：位置以整個瀏覽器視窗為基準，不管頁面怎麼捲動都固定在畫面上同一個位置。`sticky`：介於兩者之間，正常情況下跟 `relative` 一樣待在原本的版面位置，但捲動到某個門檻時會像 `fixed` 一樣黏住不動，直到它所在的父元素整個捲出可視範圍才會跟著離開 |
| **零高度容器（`height: 0` + `overflow: visible`）** | 一種常見排版技巧：讓一個容器不佔用任何直向版面空間，但仍允許裡面用 `position: absolute` 定位的子元素超出容器邊界正常顯示。常搭配 `position: sticky` 使用 |
| **`offsetWidth`/`offsetHeight` vs `getBoundingClientRect()`** | 兩種都能量到元素大小的 API，但基準不同：`offsetWidth`/`offsetHeight` 回傳元素**自己在本地座標系裡的版面大小**，不受祖先元素的 CSS `transform` 影響；`getBoundingClientRect()` 回傳的是**畫面上實際看到的最終大小**，已經把所有祖先的 transform 都疊算進去了 |
| **`color-mix()`** | CSS 原生函式，可以把兩個顏色依指定比例混合成一個新顏色，例如 `color-mix(in srgb, #fb464c 20%, white)` 是「20% 的紅色混 80% 的白色」，算出一個柔和的粉紅色 |
| **事件冒泡（Event bubbling）與 Pointer Capture** | 事件冒泡：瀏覽器裡點擊/滑鼠事件預設會從最內層的元素開始，一路往外層的祖先元素傳遞觸發。Pointer Capture（`setPointerCapture`）：讓某個元素「獨佔」接下來這根手指/滑鼠游標的所有後續事件，即使游標移到別的元素上方也還是會送給它；但如果不分青紅皂白對整個容器的每次按下都呼叫 capture，容器內任何子元素自己的 `click` 監聽器都可能收不到事件 |
| **`pointercancel` 事件與原生拖曳（`draggable`）** | `pointercancel`：當一個正在進行中的指標操作被瀏覽器中途「取消」時觸發，取代原本該送出的 `pointerup`。常見觸發時機是瀏覽器把這次操作接管去做別的事，例如 `<img>` 元素預設就有「原生拖曳圖片」的行為。只處理 `pointerup` 而沒處理 `pointercancel` 的程式碼，狀態就可能卡在「操作進行中」出不來 |
| **AST 往返序列化** | 見上方「Quartz Syncer / 發布流程」分類 |
| **`text-decoration` 的「穿透」行為（decoration propagation）** | CSS 規範允許祖先元素畫的底線／刪除線等裝飾線，「穿透」畫到所有子孫元素的文字上。子孫元素想要「擋掉」祖先畫過來的線，理論上可以自己設定 `text-decoration-line: none`，但**實際瀏覽器行為不一定完全照規範**——在 Chromium 上實測發現，即使子孫元素的 computed value 確實是 `none`，畫面上祖先的線依然會被畫穿過去，`!important` 或建立新的 BFC 都無法保證擋下來 |
| **BFC（Block Formatting Context，區塊格式化脈絡）** | CSS 排版裡的一種獨立「小世界」：一旦某個元素觸發建立 BFC（常見方式包括 `overflow` 不是 `visible`、`display: flow-root`、浮動、絕對定位等），它內部的排版就會跟外部隔離。常被拿來當作解決版面外溢／margin 合併問題的技巧，但不是所有「視覺上看起來像穿透」的問題都能靠 BFC 解決 |
| **`disabled` 屬性（表單元素）** | HTML 表單元素的原生屬性，設為 `disabled` 之後該元素會變成不可互動：滑鼠點擊、鍵盤聚焦都不會有反應，也不會觸發 `click`／`change` 等事件。是讓一個原本可互動的元素變成「純顯示、唯讀」最直接的做法 |

## 其他

| 名詞 | 解釋 |
|---|---|
| **Obsidian Git** | 另一款 Obsidian 社群外掛，功能是把整個 vault 自動同步備份到一個獨立的 git repo，跟負責發布網站內容的 Quartz Syncer 是兩個完全不同的外掛、不同的 repo |
| **佔位符（Placeholder token）** | 一種暫時替代真正內容的標記字串：先把原始文字裡某段內容換成一個獨一無二的記號，讓後續處理步驟不會誤判或破壞這段內容，等真正需要的資料到齊後，再把記號換回最終結果 |
| **Unicode 私用區（Private Use Area, PUA）** | Unicode 編碼裡特別保留、不指派給任何實際文字或符號的一段區域（例如 `U+E000`–`U+F8FF`），任何真實語言的文字都不會用到這個範圍。適合拿來當佔位符的分隔符號 |
