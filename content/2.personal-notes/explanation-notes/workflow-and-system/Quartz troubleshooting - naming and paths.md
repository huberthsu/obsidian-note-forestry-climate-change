---
publish: true
aliases:
  - Quartz 問題排查－命名規範與路徑限制
title: Quartz 問題排查－命名規範與路徑限制
created: 2026-09-04T10:21:53.461Z
modified: 2026-09-04T10:21:53.482Z
published: 2026-09-04T10:21:53.482Z
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

# 命名規範與路徑限制

搭配母筆記 [[Quartz website troubleshooting report]] 一起看。這篇記錄筆記名稱、路徑長度與檔名限制造成的問題，包含路徑英文化需求和檔名超長導致的建置失敗。

## ✅ 2.1 筆記路徑必須改成英文，中文網址會導致 Graph 無法識別自己

**現象**：除了首頁，其他每篇筆記的側邊欄 local graph 都是空的；首頁雖然看得到幾個點，但點之間沒有連接線。

**根本原因**：這是 `@quartz-community/graph` 套件（目前最新版 `0.1.0`）的**已知上游 bug**（[graph issue #10](https://github.com/quartz-community/graph/issues/10)，目前狀態 open）。負責判斷「目前是哪一頁」的函式直接讀取瀏覽器網址（`window.location.pathname`），但**沒有做 `decodeURIComponent` 解碼**。中文網址會被瀏覽器 percent-encode（例如「工作流」變成 `%E5%B7%A5...`），跟 `contentIndex.json` 裡已經解碼過的中文 key 對不上，導致 local graph 找不到自己、也連不出線。首頁因為網址是純英文根目錄 `/`，自己的識別沒問題，但連到中文網址的鄰居一樣連不出線。

**排查過程**：

1. 先讀原始碼確認邏輯有問題（`isAlpha` 只認 ASCII、`getFullSlugFromUrl` 沒 decode）
2. 直接在本機用 `npx quartz build` 建了中文路徑的測試筆記重現問題
3. 用真實的 `contentIndex.json` 資料，實際跑一次那段有 bug 的程式碼，證明中文網址會對不上、英文網址完全對得上

**目前的解法（已驗證有效）**：**把筆記整條路徑（所有資料夾＋檔名）都改成英文**，frontmatter 用 `title` 保留中文顯示、`aliases` 也放中文名稱方便 Obsidian 內搜尋與連結。已經拿「工作流系統說明」這篇實測成功：

- 路徑改成 `2.personal-notes/explanation-notes/workflow-and-system/workflow-system-overview`
- 頁面標題仍正確顯示中文「工作流系統說明」
- 網站上的 local graph 已確認正常顯示連接線

> [!warning] 一定要「整條路徑」都改，改一半沒用
> 第一次測試只改了檔名附近兩層資料夾，但最外層 `2.個人note` 沒改，結果還是失敗——只要路徑裡有「任何一層」殘留非 ASCII 字元，網址就還是會被 percent-encode，bug 照樣發生。後來把最外層也改成 `2.personal-notes` 才真正修好。

> [!warning] 改資料夾名稱一定要在 Obsidian 裡操作，不要用檔案總管/指令直接改
> 因為共用資料夾裡通常還有其他筆記連過來，只有透過 Obsidian 自己的重新命名功能，才會自動幫忙更新所有指向這個路徑的 `[[wikilink]]`，避免連結大範圍斷掉。

**還沒做的事**：目前只改了「工作流系統說明」這一篇當驗證。其他想公開的筆記如果也在中文路徑下，一樣會有這個問題，要比照辦理（或乾脆規劃一個從頭到尾都英文命名的資料夾，專門放要公開的內容）。

> [!info] 跟 [[Quartz troubleshooting - character encoding and identifiers#✅ 3.3|3.3 逗號 percent-encode]] 的關係，容易搞混
> 3.3 修的是 `@quartz-community/graph` 套件自己的 `we()` 函式，**只修到「從 Graph 節點點擊跳轉」這一條路徑**；這裡（2.1）診斷出的根本原因是另一個函式 `getFullSlugFromUrl`，影響的是「一般載入頁面時判斷自己是誰」這個更基本的路徑，3.3 並沒有動到它。兩個是相關但**不同函式、不同 bug**，3.3 修好之後**不代表**這裡的中文路徑改名工作可以省略——除非之後實際驗證 `getFullSlugFromUrl` 也被修過或不再需要，否則本節的「改整條路徑成英文」仍然是目前唯一驗證有效的作法。

---

## ✅ 2.2 Cloudflare 建置直接失敗，整個網站卡住不再更新（檔名過長 `ENAMETOOLONG`）

**現象**：發布新內容後，網站遲遲沒有更新，`contentIndex.json` 落後好幾個 commit，不是單純的部署延遲。查 Cloudflare 的建置紀錄，看到這個錯誤：

```
ERROR
Failed to emit from plugin `AliasRedirects`: ENAMETOOLONG: name too long,
open 'public/請由地景生態學之斑塊（patch）－廊道（corridor）－基質（matrix）理論，
說明在進行國有林事業區經營規劃時，應如何透過林分空間結構調整與空間破碎度控制，
以最大化森林的長期碳儲量並兼顧生物多樣性？.html'
```

**根本原因**：這篇筆記的檔名已經改成短的英文了，問題出在 `aliases` 欄位還留著完整的中文題目（100 多字）：

```yaml
aliases:
  - 請由地景生態學之斑塊（Patch）－廊道（Corridor）－基質（Matrix）理論，說明在進行國有林事業區經營規劃時...
```

`AliasRedirects` 這個插件會**幫每一個 alias 各自建立一個轉址頁面**，檔名就是拿 alias 文字去轉出來的。107 個中文字，UTF-8 編碼下一個中文字佔 3 bytes，換算下來大約 **321 bytes**，超過 Linux 檔案系統（Cloudflare 建置環境用的）對**單一檔名 255 bytes** 的限制，寫檔案時直接報錯。

> [!warning] 這是致命錯誤，會讓「之後所有」發布都失敗，不是只有這篇筆記出問題
> `ENAMETOOLONG` 讓整個 build 在寫檔案這一步直接中止（不是跳過這個檔案繼續），只要這篇筆記的 `aliases` 沒改，之後不管發布什麼新內容，整個網站都會卡在「上一次成功的版本」，看起來像是別的地方壞掉，其實根源都在這一篇。

**跟先前討論過的「Windows 路徑長度限制」是兩個不同的限制，容易搞混**：

| | 發生位置 | 限制對象 | 大約限制 |
|---|---|---|---|
| Windows／OneDrive 路徑限制 | 自己電腦（Windows + OneDrive 同步） | 整條完整路徑（資料夾＋檔名全部加起來） | 260 字元（Windows 傳統）／約 400 字元（OneDrive 同步） |
| Linux 檔名限制（這次踩到的） | Cloudflare 建置伺服器（Linux） | **單一檔名**本身（不含資料夾路徑） | 255 **bytes**（不是字元數，中文一個字算 3 bytes） |

**解決方法**：

- `title` 放長文字完全沒問題，它不會被拿去當檔名，網站上一樣會完整顯示
- **`aliases` 跟檔名都要保持精簡**——`aliases` 不需要跟 `title` 重複整段長題目，拿掉或改成精簡的關鍵字（例如用已經有的 tag 當 alias）就好

**目前狀態**：已知這篇筆記的問題來源，尚待確認 vault 裡還有沒有其他筆記也有「alias 塞了整段長文字」的情況，避免同樣的致命錯誤再發生一次。
