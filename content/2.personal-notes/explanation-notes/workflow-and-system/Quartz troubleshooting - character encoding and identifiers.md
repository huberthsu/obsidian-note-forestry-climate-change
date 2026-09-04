---
publish: true
aliases:
  - Quartz 問題排查－字符編碼與識別問題
title: Quartz 問題排查－字符編碼與識別問題
created: 2026-09-04T10:21:53.547Z
modified: 2026-09-04T10:21:53.569Z
published: 2026-09-04T10:21:53.569Z
tags:
  - 數位花園
  - 網站
  - ai-agent
category:
  - "[[Explanation notes]]"
  - Workflow and system
parent:
  - "[[Quartz website troubleshooting report]]"
sibling:
child:
---

# 字符編碼與識別問題

搭配母筆記 [[Quartz website troubleshooting report]] 一起看。這篇記錄中文字符、特殊符號（逗號等）在編碼、識別時引發的問題，包含 Bases 篩選、Graph 認路等多個案例。

## ✅ 3.1 Bases 篩選不出任何結果——中文屬性名稱被當成「不合法識別字」

**現象**：「說明筆記bases」這篇 `.base` 檔案，兩個 view 都顯示空的，篩選條件明明看起來沒問題。

**根本原因**：跟 graph 是不同的 bug，但同樣跟中文有關。`@quartz-community/bases-page` 的**查詢語言解析器（lexer）判斷「合法識別字」的規則寫死只認 ASCII 字母**：

```js
function isAlpha(ch) {
  const code = ch.charCodeAt(0);
  return code >= 65 && code <= 90 || code >= 97 && code <= 122; // 只有 A-Z, a-z
}
```

我的 `.base` 檔案裡寫的過濾條件是 `類別.contains("工作流與系統")`——**`類別` 是中文的 frontmatter 屬性名稱，被當成裸露的識別字直接寫在運算式裡**，解析器讀不懂，整條運算式解析失敗，篩選結果永遠是空的。

**重要規律**：中文當「文字內容/字串值」完全沒事（例如 `file.inFolder("2.個人note/說明筆記")` 裡的中文路徑字串正常運作），**只有中文被當「欄位名稱」直接寫在運算式裡才會壞**。

> [!tip] 範圍比想像中小：只有寫在 `filters`/`formulas` 運算式裡才會壞
> 追了 `resolvePropertyValue()` 的實作才發現，`sort:`、`order:`、`groupBy:`，以及純粹「顯示這個欄位當表格欄」，走的是完全不同的路徑——單純把屬性名稱字串用 `.` 切開直接查物件，**不會**經過那個壞掉的識別字解析器。所以中文屬性名稱只有「拿來當篩選條件」才需要改英文，拿來排序/分組/顯示都完全沒事，不用整批全改。

**排查過程**：

1. 實際在本機重現，並做了對照組——同樣的中文檔名/資料夾/屬性值，只把屬性**名稱**從 `類別` 改成英文 `category`，篩選立刻正常，證實問題就是出在屬性名稱本身
2. 評估過「直接把 `類別` 整個改名成 `category`」的風險：`類別` 是整個 vault 的核心分類欄位，本機 Obsidian 原生 Bases 完全沒有這個 bug（只有網站用的 `@quartz-community/bases-page` 重新刻的 parser 才有），貿然全域改名影響範圍太大、容易漏改造成「靜默壞掉」
3. 改用風險較低的做法：**保留 `類別` 不動，額外新增一個 `category` 欄位跟它並存**，只在需要被網站 Bases 篩選的筆記上填英文值
4. 先挑一個小範圍（`workflow-and-system` 資料夾、12 篇筆記）測試：幫每篇加空白 `category` 欄位 → 手動填值 → 把 `.base` 篩選條件從 `類別.contains(...)` 改成 `category.contains(...)`
5. 過程中發現用批次工具（Multi Properties）加值時，不小心把同一組值套用到全部筆記，跟每篇實際分類對不起來，回頭手動修正過一次
6. 最終用套件真正的 `evaluateFilter()` 函式，拿實際的 frontmatter 資料直接測試，確認篩選邏輯回傳 `true`；本機乾淨重建（清掉 `public/` 資料夾重跑）後，確認表格正確顯示 `Showing 8 of 8 entries`；線上網站也確認同步显示成功

**已驗證結果**：`7.bases/工作流與系統說明筆記bases.base` 全部改用 `category.contains(...)` 篩選後，8 篇筆記完整正確顯示，`類別`/`category` 兩個欄位並存，互不干擾。

> [!warning] 驗證方法的坑：不要只用關鍵字數量判斷頁面是不是空的
> 一開始用 `grep "bases-empty"` 數關鍵字出現次數判斷篩選有沒有成功，結果誤判——`bases-empty` 這個 class 名稱也會出現在頁面的 CSS 樣式定義裡，不代表表格真的是空的。後來改成直接檢查渲染出來的 `bases-view-meta`（"Showing X of Y entries"）文字，才是準確的判斷方式。
> 另外也踩到一次 Cloudflare **部署延遲**：push 完立刻檢查線上網站顯示還是空的，等一下子重新整理才確認成功，不代表修法本身沒生效。

**目前狀態**：`workflow-and-system` 這個小範圍已經驗證成功（後續在 3.2 進一步優化，`類別` 已經可以整個刪掉了，不用再並存）。其他還在用 `類別` 做篩選條件的 `.base` 檔案，之後要用網站 Bases 呈現的話，比照這個模式逐步處理即可。

---

## ✅ 3.2 wikilink 也能當篩選條件，`類別` 可以整個刪掉、不用並存

**動機**：`類別` 欄位裡有一項是**真正的 wikilink**（`[[Explanation notes]]`），會讓 Obsidian 在對應的分類索引筆記（`1.categories/Explanation notes.md`）產生**反向連結**。原本以為只能「保留 `類別`、新增 `category` 並存」才能兩全其美，但這樣要同時維護兩個欄位，之後改分類要兩邊都改，不夠乾淨。

**查證結果**：`link()` 這個函式**確實可以拿來當篩選條件**，之前誤以為它不適用，其實是因為當時 `category` 存的是純文字，格式對不上。實際測試了 4 種組合（欄位存的格式 × 篩選寫法），確認規則是：**「資料存的格式」要跟「篩選時的寫法」互相搭配**——純文字存、純文字篩；wikilink 存，篩選就要包一層 `link()`（`category.contains(link("目標筆記名"))`）。格式對不起來才會抓不到，不是 wikilink 天生不能當篩選條件。

> [!warning] wikilink 帶別名（`[[目標|別名]]`）時，`link()` 篩選不到
> 實測 `category` 存 `[[Explanation notes|說明]]`（帶別名）時，`category.contains(link("Explanation notes"))` 一樣抓不到——`link()` 產生的是不帶別名的標準格式字串，兩者做的是**完全字串比對**（沒對上才會退而求其次比對 slug，但 slug 也對不上帶別名的格式）。要用 `link()` 篩選，欄位裡存的 wikilink 就不能帶別名，只能寫 `[[Explanation notes]]`，不能寫 `[[Explanation notes|說明]]`。

**最終做法**：把 `category` 欄位同時存純文字跟 wikilink 兩種格式（依項目性質決定）：

```yaml
category:
  - Workflow and system        # 純文字，沒有對應的索引筆記可以連
  - "[[Explanation notes]]"    # wikilink（不帶別名），有對應的索引筆記
```

`.base` 篩選條件對應寫成：

```yaml
filters:
  and:
    - category.contains(link("Explanation notes"))
views:
  - type: table
    name: 工作流與系統說明筆記
    filters:
      and:
        - '!file.inFolder("5.templates")'
        - category.contains("Workflow and system")
```

**已驗證結果**：`workflow-and-system` 資料夾 8 篇筆記全部把 `類別` 刪除、只留 `category`（混合純文字＋wikilink 格式），`.base` 檔案同步改用 `link()` 篩選後：

- Obsidian 本機反向連結功能完整保留（`category` 裡的 wikilink 一樣有效）
- 本機乾淨重建 + 線上網站都確認 `Showing 8 of 8 entries`，這次 Cloudflare 也沒有部署延遲

**結論**：**單一 `category` 欄位可以同時滿足「本機反向連結」和「網站 Bases 篩選」兩個需求，不需要 `類別`/`category` 兩個欄位並存**。之後要處理其他分類時，可以直接跳過「並存」這個中間步驟，一次到位：純文字項目維持純文字，會連到索引筆記的項目改存不帶別名的 wikilink，`.base` 篩選對應搭配 `link()` 寫法即可。

---

## ✅ 3.3 從別的筆記的關聯圖點進特定筆記，該筆記的關聯圖只顯示自己一個點——逗號在網址中被 percent-encode

**現象**：從任何一篇筆記的 Graph 點某個節點，跳到「Obsidian雙向連結、知識整理與資料管理」這篇後，它自己的 local graph 只有一個孤立的點（自己），完全沒有其他連線；但如果改用反向連結（backlinks）或側邊欄檔案總管（Explorer）點進同一篇筆記，graph 就正常顯示。目前只發現這一篇有這個現象。

**根本原因**：這篇筆記的檔名裡有**逗號**（`Obsidian wiki linking, knowledge organization, and data management.md`），對應的 slug 也保留逗號。從 Graph 節點點擊跳轉，是元件自己用 `window.location.href = ...` 直接改網址（不是透過真正的 `<a>` 連結），瀏覽器在這個過程中會把網址裡的逗號自動 percent-encode 成 `%2C`；但用一般連結（backlinks、Explorer）點擊，走的是 Quartz 的 SPA 內部路由（攔截 `<a>` 點擊、用 `history.pushState` 處理），網址裡的逗號從頭到尾維持原樣，不會被編碼。

Graph 元件裡負責「判斷目前是哪一頁」的函式 `we()`，讀取 `window.location.pathname` 時**完全沒有呼叫 `decodeURIComponent`**，所以透過 Graph 跳轉過來時，拿到的是還帶著 `%2C` 的字串，跟 `contentIndex.json` 裡已經解碼過的正確 slug（`...wiki-linking,-knowledge-organization,...`，真的逗號）對不起來，判斷「我是誰」失敗，找不到自己在資料裡的連結清單，只能顯示自己這一個孤立的點。

> [!info] 跟 [[Quartz troubleshooting - naming and paths#✅ 2.1|2.1 CJK 路徑]] 的關係，容易搞混
> 這跟 2.1 記錄過的「Graph 中文網址看不到連線」是**同一類** bug（同樣是「讀網址沒解碼」），只是這次觸發的字元是逗號，不是中文字。但**不是同一個函式**：這裡修的是 `@quartz-community/graph` 套件自己的 `we()` 函式，只在「從 Graph 節點點擊跳轉」這條路徑上生效；2.1 診斷出的根本原因在另一個函式 `getFullSlugFromUrl`，管的是「一般載入頁面時判斷自己是誰」這個更基本的路徑，這裡的修法**沒有**動到它。所以這次修好之後，Graph 點擊跳轉不管路徑裡有逗號、中文都不會再出事，但**不代表** 2.1 的英文路徑改名工作可以省略——那是兩個獨立的坑，只是症狀很像。

**排查過程**：

1. 使用者回報現象後，先確認這篇筆記的檔案路徑其實已經是英文（`2.personal-notes/explanation-notes/workflow-and-system/Obsidian wiki linking, knowledge organization, and data management.md`），排除掉「路徑還沒改成英文」這個先前用過的解釋
2. 直接抓正式網站的 `contentIndex.json`，確認這篇筆記自己的資料完全正常——slug 正確、`links` 陣列裡有 14 筆有效連結——證實問題不在資料本身，而在「當下判斷自己是誰」這一步
3. 請使用者實際重現一次，並回報瀏覽器網址列的實際內容：`.../obsidian-wiki-linking%2C-knowledge-organization%2C-and-data-management`，跟預期的正確網址（真逗號）一比對，直接坐實是 percent-encoding 沒被解碼的問題
4. 讀 `@quartz-community/graph` 套件原始碼裡的 `we()` 函式，確認它直接讀 `window.location.pathname`，沒有呼叫 `decodeURIComponent`

**解決方法**：修改 `@quartz-community/graph` 套件編譯後的 client script（`dist/index.js`、`dist/components/index.js` 兩份都要改），在 `we()` 讀取網址的地方加上 `decodeURIComponent`：

```js
// 修改前
function we(){let u=window.location.pathname; ...}
// 修改後
function we(){let u=decodeURIComponent(window.location.pathname); ...}
```

這是**直接修根本原因**，而不是像 2.1 CJK 那次一樣靠「幫筆記改名避開問題字元」繞過去——之後任何筆記路徑裡不管是逗號、中文、還是其他會被 percent-encode 的字元，透過 Graph 點擊跳轉都不會再有這個問題，不用逐篇改名。

**持久化到正式網站**：跟 [[Quartz troubleshooting - graph visuals and interaction#✅ 6.1|6.1]] 同樣用 `patch-package` 存成 patch 檔（同一份 `patches/@quartz-community+graph+0.1.0.patch`，這次的改動疊加上去），`postinstall` 機制自動套用。

**已驗證結果**：本地重建後，使用者實際從關聯圖點進這篇筆記，網址列確認不再出現 `%2C`、graph 正常顯示所有連線；commit 並 push 到 `v5` 分支（`8706baf`）。
