---
publish: true
aliases:
  - quartz建站問題排查紀錄
title: quartz建站問題排查紀錄
created: 2026-09-04T14:53:01.447Z
modified: 2026-09-04T14:53:01.447Z
published: 2026-09-04T14:53:01.447Z
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
  - "[[How to create a Quartz website|如何建立quartz網站]]"
child:
  - "[[Quartz troubleshooting - basic concepts]]"
  - "[[Quartz troubleshooting - naming and paths]]"
  - "[[Quartz troubleshooting - character encoding and identifiers]]"
  - "[[Quartz troubleshooting - canvas and bases publishing]]"
  - "[[Quartz troubleshooting - frontmatter publishing]]"
  - "[[Quartz troubleshooting - graph visuals and interaction]]"
  - "[[Quartz troubleshooting - properties and data display]]"
  - "[[Quartz troubleshooting - comments and dark mode]]"
  - "[[Quartz troubleshooting - canvas text and portals]]"
  - "[[Quartz troubleshooting - image lightbox]]"
  - "[[Quartz troubleshooting - misc issues]]"
  - "[[Quartz glossary]]"
---

# 遵守規則

1. 動手改程式碼之前，先跟我說清楚要做什麼、為什麼要這樣做
2. 改完先在本地測試（跑 build、啟動本地伺服器讓你在瀏覽器確認等）
3. 等我看過測試結果、確認沒問題後，才會 commit + push
4. push完後主動詢問我是否要將此次改動補進對應分類的子筆記（下面「問題分類導覽」列的其中一篇；如果是全新分類，才在這篇母筆記新增一篇子筆記並加進 `child` frontmatter）
5. 若我回答要補進來，需要紀錄並詳細說明的內容有:問題、原因、排查過程、踩到的坑、目前解法等
6. 「本機測試確認沒問題」不能只靠程式讀 DOM 資料當證據——我看得到你操作瀏覽器的實際畫面（同一台機器），驗證視覺相關的東西（畫面顯示、反白、排版）要用真的滑鼠點擊＋螢幕截圖，不要只用 `javascript_exec` 查資料就說「確認過了」
7. commit 之前先 `git fetch`，我這邊的 Quartz Syncer 常常會在你工作到一半時自動推新的「Published N files」commit 上去，要先合併再 push，不要假設一定能直接 fast-forward

# 核心功能與用途

這篇是 Quartz 網站問題排查的**母筆記／索引**，按問題主題分成 11 篇子筆記，每篇子筆記記錄該主題下所有問題的根本原因、排查過程、目前的處理狀態，方便之後回頭查、或遇到類似狀況時對照。搭配 [[How to create a Quartz website]] 一起看。子筆記之間如果有關聯（例如同一個函式的不同 bug、同一種修法用在不同地方），彼此會用雙向連結互相標注，不用整篇重複貼一次內容。

## 狀態圖示說明

- ✅ 已解決並驗證過
- ⏳ 已排查出原因，但還沒動手修
- 🔵 純觀念釐清，不算 bug

# 問題分類導覽

| 分類  | 子筆記                                                                          | 內容                                                                                           |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 一   | [[Quartz troubleshooting - basic concepts\|基本概念釐清]]                          | Canvas/Bases 分享設定在哪裡、`content/` 資料夾、`ignorePatterns` 語法（純知識，不算 bug）                          |
| 二   | [[Quartz troubleshooting - naming and paths\|命名規範與路徑限制]]                     | 中文路徑導致 Graph 無法識別自己、`aliases` 過長導致 Cloudflare 建置失敗                                           |
| 三   | [[Quartz troubleshooting - character encoding and identifiers\|字符編碼與識別問題]]   | Bases 中文屬性名稱篩選失敗、wikilink 當篩選條件、逗號在網址被 percent-encode                                        |
| 四   | [[Quartz troubleshooting - canvas and bases publishing\|Canvas/Bases 發布與控制]] | 分享功能設定位置、`.base`/`.canvas` 無法逐篇標記發布                                                          |
| 五   | [[Quartz troubleshooting - frontmatter publishing\|Frontmatter 發布配置]]        | 亂碼 frontmatter、breadcrumbs 欄位搬家、自訂屬性沒發布                                                      |
| 六   | [[Quartz troubleshooting - graph visuals and interaction\|Graph 視覺與互動]]      | 連接線顏色太淡看不到、hover 高亮死區、右側欄頂部留白過多導致 Backlinks 被截斷、TOC 收合狀態標題文字被裁到看不見、TOC 捲不到底／展開後蓋住 Backlinks、Global Graph 彈窗跑到畫面外、`showTags:false` 對 Global Graph 沒作用、hover 節點名稱卡住不消失、新增資料夾/標籤顯示篩選面板                |
| 七   | [[Quartz troubleshooting - properties and data display\|屬性面板與資料展示]]          | 屬性面板欄位顯示、Dataview 表格連結/tags、`password` 欄位外洩、checkbox 對齊與語法、Bases 表格欄位（tags 連結、`publish` 未隱藏）、Bases 新增 calendar 月曆檢視、外掛互動腳本從沒真的執行過、vendor 建置工具鏈與 yaml 打包問題、月曆換月與 hover 預覽修復、內嵌 `<script>` 不會在 SPA 導覽時執行（改動 Quartz 核心）、借用共用 `render` 事件把 dark mode 搞壞、表格排序的舊謎團真相、graph view 連到不相關的 bases（虛擬頁面 links 漏套用 view 篩選條件） |
| 八   | [[Quartz troubleshooting - comments and dark mode\|留言區與深色模式]]                | Giscus 深色模式 CORS 問題                                                                          |
| 九   | [[Quartz troubleshooting - canvas text and portals\|Canvas 文字方塊與 Portal]]    | 文字方塊 wikilink/內嵌、跳轉按鈕、巢狀畫布 portal、自訂顏色與對比、interdimensionalEdges 連線不顯示、內嵌內容 white-space 外洩造成大片空白、巢狀內嵌 bases 指定 view 顯示空白（未修）、巢狀 portal 放大鏡按鈕位置跑掉飄到別的節點裡、`#view名稱` 內嵌 bases 特定檢視比對錯屬性、interdimensionalEdges 改從程式碼層支援（取代會被 Syncer 還原的內容層手改）             |
| 十   | [[Quartz troubleshooting - image lightbox\|圖片全螢幕檢視功能]]                       | 全站圖片 lightbox：放大、拖曳、邊界限制                                                                     |
| 十一  | [[Quartz troubleshooting - misc issues\|其他單獨問題]]                             | Obsidian Git merge conflict                                                                  |

---

# 參考資料

- [[How to create a Quartz website]]
- [Quartz graph 套件 CJK bug（issue 10）](https://github.com/quartz-community/graph/issues/10)
- [Quartz Syncer GitHub](https://github.com/saberzero1/quartz-syncer)
- [patch-package GitHub](https://github.com/ds300/patch-package)
- [Giscus 官方網站](https://giscus.app)
- [Cloudflare Pages/Workers `_headers` 文件](https://developers.cloudflare.com/pages/configuration/headers/)
- [@quartz-community/bases-page GitHub](https://github.com/quartz-community/bases-page)
- [@quartz-community/canvas-page GitHub](https://github.com/quartz-community/canvas-page)
- [mdast-util-gfm-task-list-item GitHub（checkbox 序列化參考實作）](https://github.com/syntax-tree/mdast-util-gfm-task-list-item)

# 名詞解釋

完整名詞解釋見共用詞彙表 [[Quartz glossary]]。
