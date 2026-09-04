---
publish: true
aliases:
  - Quartz 問題排查－Graph 視覺與互動
title: Quartz 問題排查－Graph 視覺與互動
created: 2026-09-04T10:21:53.758Z
modified: 2026-09-04T10:21:53.779Z
published: 2026-09-04T10:21:53.779Z
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

# Graph 視覺與互動

搭配母筆記 [[Quartz website troubleshooting report]] 一起看。這篇記錄 Graph 頁面的視覺效果和互動行為的問題，包含連接線顏色、hover 反應等。網址解碼相關的 Graph bug 記錄在 [[Quartz troubleshooting - naming and paths#✅ 2.1|2.1]] 跟 [[Quartz troubleshooting - character encoding and identifiers#✅ 3.3|3.3]]。

## ✅ 6.1 Graph 的節點之間平常看不到連接線，要滑鼠移過去才會顯示

**現象**：網站上的 local/global graph，節點（點點）都正常顯示，但點跟點之間平常完全看不到連接線，只有滑鼠移到某個節點上時，跟它相關的線才會冒出來。

**根本原因**：連接線其實本來就有畫出來，不是沒畫，只是預設用的顏色是 `--lightgray`，跟頁面背景色太接近，肉眼幾乎分辨不出來：

| | 背景色 `--light` | 連接線預設色 `--lightgray` |
|---|---|---|
| Light mode | `#faf8f8` | `#e5e5e5` |
| Dark mode | `#161618` | `#393639` |

滑鼠移到節點上時，跟它相關的線會改用對比高很多的 `--gray`（light mode `#b8b8b8`、dark mode `#646464`），才終於看得出來。所以不是「hover 才畫線」，而是「沒 hover 時的線顏色淡到跟背景幾乎融在一起」。

**排查過程中踩的兩個坑**：

1. **改錯檔案**：`@quartz-community/graph` 這個套件用 `tsup` 針對不同 entry point（`dist/index.js` 主入口、`dist/components/index.js` 給 `import "@quartz-community/graph/components"` 用）**各自獨立打包**，兩份檔案都各自內嵌了一份幾乎一樣的 client 端程式碼字串，彼此不是互相 `import`/re-export 的關係。Quartz 的元件載入器（`componentLoader.ts`）實際 import 的是 `dist/components/index.js`，但一開始只改了 `dist/index.js`，本地重建了老半天畫面完全沒差異，後來直接用 `node --input-type=module` 寫小腳本手動 `import` 同一個 specifier 出來檢查字串內容，才發現改錯檔案。
2. **`npx quartz build` 用的不是這個 repo 自己的套件**：用 `npx quartz build --serve` 本地預覽時，`npx` 會去解析**全域快取**（`%LOCALAPPDATA%\npm-cache\_npx\...`）裡另一套完全獨立安裝的 Quartz，跟這個 repo 資料夾裡自己的 `node_modules` 完全無關，所以改了本地 `node_modules` 卻怎麼測都沒效果。要用這個專案自己的指令 `node ./quartz/bootstrap-cli.mjs build --serve`（或 `npm run quartz -- build --serve`），才會真正吃到本地改過的套件。

**解決方法**：直接修改 `@quartz-community/graph` 套件編譯後的 client script（兩份檔案都要改），把連接線的顏色/透明度邏輯從「沒 hover 全部用淡色 `--lightgray`、hover 相關的線變 `--gray`」，改成：

- 沒 hover 時：固定用對比較夠的 `--gray`，但透明度降到 `0.25`，呈現「淡但看得見」的效果
- hover 時：跟目前節點相關的線維持全不透明（`1`）；不相關的線透明度從原本的 `0.2` 再壓到 `0.05`（幾乎看不到），讓目前選中的關聯更突出

**持久化到正式網站**：因為改的是 `node_modules` 裡套件編譯後的檔案，Cloudflare 每次部署都會重新 `npm install`，本來會把修改蓋掉。用 `patch-package` 把這次的修改做成一份 patch 檔（`patches/@quartz-community+graph+0.1.0.patch`），並在 `package.json` 的 `scripts` 加上 `"postinstall": "patch-package"`，之後每次 `npm install` 完都會自動重新套用這份 patch。已經實測：刪掉 `node_modules/@quartz-community/graph`、重跑 `npm install`，patch 有自動套用成功，修改依然生效。

**已驗證結果**：本地建置（clean rebuild）跟正式網站都確認連接線效果正確；commit 並 push 到 `v5` 分支（`7641293`、`9cec43c`）。

---

## ✅ 6.2 Graph 節點的 hover 高亮效果時靈時不靈——同一顆節點這次沒反應、重新整理後又正常

**現象**：滑鼠移到某個節點上時，有時候不會觸發「跟它相關的線變亮、其他節點變淡」這種 hover 效果，但其他節點又正常；重新整理頁面之後，原本沒反應的節點可能變正常，原本正常的節點反而可能失靈，感應狀況每次重新整理都不一樣。

**根本原因**：節點的位置是用 **d3-force 物理模擬**（互斥力、聚合力、碰撞防重疊力）算出來的，每次重新整理頁面，起始位置是隨機的，模擬跑出來的最終排列也會有些微不同。畫面上負責偵測滑鼠的機制，原本是**每個節點各自獨立**用 PIXI.js 的 `pointerover`/`pointerleave` 事件監聽（`eventMode="static"`），而 PIXI 的互動判定規則是：如果兩個節點的判定範圍**重疊**，只有**畫在最上層（後畫）的那顆**會收到滑鼠事件，底下被蓋住的節點在那塊重疊區域完全「感應不到」。雖然套件本身有加防重疊的碰撞力，但這個力**不保證零重疊**，尤其側邊欄的 Graph 容器只有 250px 高，節點一多還是容易貼在一起、部分重疊。因為每次重新整理起始位置隨機，這次是誰疊住誰、誰贏得判定，每次都不一樣，才會出現「這次沒反應的節點，下次重新整理後又有反應了」這種看似隨機的現象。

**排查過程**：

1. 讀原始碼確認節點位置更新（`ce()` render loop）跟碰撞防重疊力（`forceCollide`）的實作，先假設是「重疊機率不夠低」的問題，嘗試把碰撞判定半徑放大到視覺圓圈的 1.6 倍、疊代次數從 3 次提高到 6 次，讓節點被推得更開
2. 本地建置後請使用者實際到頁面上多次測試比較（同一篇筆記重新整理多輪，數「感應不到」的節點數量），結果只從約 6 顆降到 4、5 顆，改善有限，視覺上也幾乎看不出節點間距變化——證實問題核心不是「間距不夠」，而是「只要有重疊，後畫的永遠贏」這個判定規則本身，光靠加大間距沒辦法根治，只能降低機率
3. 因此把方向從「减少重疊機率」改成「重疊時也能正確判斷」：不要再依賴 PIXI 每個節點各自的命中測試，改成整張圖用**同一個滑鼠移動監聽器**，每次移動都直接計算滑鼠位置跟「所有節點中心」的距離，挑**距離最近**的那顆節點當作目前 hover 的對象——這樣即使重疊，也是離中心真正比較近的那顆贏，不會再有「後畫的固定蓋掉先畫的」這種死區
4. 本地建置後再次請使用者實際測試同一篇筆記，這次確認明顯改善（使用者回報「這次可以」）

**解決方法**：修改 `@quartz-community/graph` 套件編譯後的 client script（`dist/index.js`、`dist/components/index.js` 兩份都要改，原因跟 6.1 提到的「entry point 各自獨立打包」一樣）：

- 拿掉每個節點各自的 `pointerover`/`pointerleave` 監聽
- 在整張圖的 canvas 上加一個全域 `pointermove` 監聽，每次移動時算出滑鼠在圖上的實際座標（要扣掉縮放平移 `P.x`/`P.y`/`P.k`），跟每個節點目前的模擬座標算距離，挑最近且在合理範圍內的節點觸發 hover 效果，滑鼠離開 canvas 時清除 hover 狀態
- 碰撞力的間距調整（步驟 1 那個嘗試）因為效果不明顯，改回原本的預設值，只保留真正有效的這個修正

**持久化到正式網站**：跟 6.1 同樣用 `patch-package` 存成 patch 檔（同一份 `patches/@quartz-community+graph+0.1.0.patch`，這次的改動疊加上去），`postinstall` 機制會自動在每次 `npm install` 後重新套用，不需要額外設定。

**已驗證結果**：本地測試確認 hover 死區問題消失；commit 並 push 到 `v5` 分支（`ae0c746`）。

> [!tip] 本地測試「連不上」的插曲：背景指令的沙盒隔離
> 中途用背景指令啟動本地伺服器（`node ./quartz/bootstrap-cli.mjs build --serve`）給使用者測試，工具自己用 `curl` 檢查回應正常（200），但使用者實際用瀏覽器打開 `localhost:8080` 卻連不上。後來確認是背景指令預設在一個跟真正 Windows 桌面**隔離的沙盒環境**裡執行，伺服器只在沙盒內部監聽，沙盒內的 `curl` 測得到、但桌面上的瀏覽器連不到同一個 port。改用明確關閉沙盒的方式重新啟動伺服器後才正常連上，之後每次要啟動要跟使用者實際瀏覽器互動的本地伺服器，都要記得用這個不隔離的方式。

---

## ✅ 6.3 右側欄（Graph View／Table of Contents／Backlinks）上方空白太多，Backlinks 被切到看不完整一行字

**現象**：使用者傳了一張螢幕截圖，右側欄從「Graph View」標題之前留了一大段空白，往下 Graph View、Table of Contents、Backlinks 三塊依序排下來之後，最底下的 Backlinks 因為側欄本身高度固定（`height: 100vh`），內容被截斷，連一行完整的筆記標題都看不到。

**根本原因**：`quartz/styles/base.scss` 裡側欄的樣式是：

```scss
& .sidebar {
  padding: $topSpacing 2rem 2rem 2rem;
  height: 100vh;
  position: sticky;
  ...
}
```

`$topSpacing`（`variables.scss` 定義為 `6rem`）同時也是主內容區文章標題 `.page-header` 的頂部間距，兩者共用同一個變數是為了讓左右欄視覺上對齊。但側欄（尤其右側欄）本身高度被 `height: 100vh` 卡死，`6rem`（96px）的頂部留白直接吃掉螢幕高度，把 Graph View／TOC／Backlinks 一起往下推，視窗較矮或瀏覽器沒有全螢幕時，Backlinks 最後面的內容就會被裁掉。

**解決方法**：在 `quartz/styles/custom.scss` 新增一條只針對右側欄的覆蓋：

```scss
.sidebar.right {
  padding-top: 2rem;
}
```

只把右側欄的頂部留白從 `6rem` 降到 `2rem`，左側欄（Explorer／Search／Dark mode 等）跟主文章標題的 `6rem` 留白都不動。能這樣單獨覆蓋、不用管選擇器優先權（specificity）算贏不贏過 `base.scss` 裡 `.page > #quartz-body .sidebar.right` 那條規則，是因為 `componentResources.ts` 組出最終樣式表時，把 `base.scss` 的內容包在 `@layer quartz-base { ... }` 裡面，而 `custom.scss` 沒有包在任何 `@layer` 裡——CSS cascade layers 的規則是「沒放進 layer 的規則，不管 specificity 多低，一律贏過任何放進 layer 裡的規則」，所以 `custom.scss` 寫的東西天生就會蓋掉 `base.scss`，不用刻意堆疊更深的選擇器。

**已驗證結果**：本機用瀏覽器實際打開「邊緣效應對不同區域碳貯存量的影響」這篇筆記，跟使用者提供的原始截圖做同角度比對截圖：修復前 Backlinks 只露出半行字就被切掉，修復後 Backlinks 完整顯示「邊緣效應對不同區域碳貯存量的影響」這行（含捲動列，還能再往下看更多筆記）；commit 並 push 到 `v5` 分支（`029e1ab`）。

---

## ✅ 6.4 把 Table of Contents 改成預設收合後，收合狀態的標題文字幾乎整個被裁到看不見

**現象**：延續 6.3，想進一步把 Table of Contents 改成一進頁面就是收合狀態（幫 Backlinks 再多擠一點空間），改完之後 Graph View 跟 Backlinks 之間該顯示「Table of Contents」標題（含收合箭頭）的地方，只剩一條很淡的橫線跟幾個看不出形狀的小點，完全看不出是文字。

**根本原因**：`@quartz-community/table-of-contents` 這個套件收合時，把外層 `.toc` 容器用 CSS 卡死高度：

```css
.toc:has(button.toc-header.collapsed) {
  flex: 0 1 1.4rem; /* 容器高度被壓到 22.4px，overflow-y: hidden */
}
```

套件本身也有針對收合按鈕裡的 `<h3>` 標題清掉 margin：`button.toc-header h3 { margin: 0; }`，理論上這樣按鈕高度應該只有一行字那麼高，跟 22.4px 的容器差不多。但實際量測發現 `<h3>` 的 `margin-top`/`margin-bottom` 各自是 16px，不是套件想要的 0——因為這個網站 `base.scss` 有一條全域規則 `h3 { margin-top: 1.62rem; margin-bottom: 1rem; }`，跟套件那條規則屬於**同一個** `@layer quartz-base`（`componentResources.ts` 把所有元件的 CSS 跟 `base.scss` 打包在同一個 layer 裡），layer 內部照樣要比 specificity／來源順序分勝負，這次是這條全域 `h3` 規則贏了。結果按鈕實際高度變成 `27.4px（文字行高）+ 16px（上margin）+ 16px（下margin）＝ 59.4px`，硬塞進只有 22.4px、`overflow-y: hidden` 的容器裡，等於「Table of Contents」這幾個字裡只有最上面約 6px 的一小條沒被切掉，看起來就是一堆雜點，文字本身完全認不出來。**這個 bug 之前完全沒被發現，是因為套件預設是展開狀態，容器高度沒有被卡死過，直到這次改成預設收合才第一次讓這段裁切邏輯真的跑到。**

**排查過程**：

1. 先用 `mcp__claude-in-chrome__find` 確認 DOM 裡真的有一個文字內容是「Table of Contents」的 `<button>`，排除「內容整個不見」的可能，鎖定是「有渲染但視覺上看不到」
2. 用 `javascript_exec` 讀 `getBoundingClientRect()` 跟 `getComputedStyle()`，量出按鈕實際高度 59.4px、外層 `.toc` 容器只有 22.4px、`overflow-y: hidden`——確認是裁切問題
3. 再量 `<h3>` 本身的 `margin`，讀到 `16px 0px`（不是套件原始碼寫的 `0`），比對 `base.scss` 找到全域 `h3` 規則正好是造成 margin 沒歸零的來源

**解決方法**：在 `quartz/styles/custom.scss` 針對收合按鈕裡的標題單獨覆蓋（不用堆疊 specificity，原理跟 6.3 一樣：`custom.scss` 沒放進 `@layer`，天生贏過放進 `@layer quartz-base` 的任何規則）：

```scss
.toc button.toc-header h3 {
  margin: 0;
  line-height: 1.4rem;
}
```

只清掉 margin 還不夠精準對齊（清完 margin 後按鈕高度變成 24px，跟容器 22.4px 還差 1.6px），額外把 `line-height` 直接設成跟容器同樣的 `1.4rem`，讓文字行高精確貼合容器高度，不留裁切空間。

**已驗證結果**：本機用瀏覽器實際收合 Table of Contents，截圖確認標題「Table of Contents」跟收合箭頭完整清楚顯示，不再有裁切；commit 並 push 到 `v5` 分支（`e346c4aa`）。這次同時把「TOC 預設收合」這個設定本身（`quartz.config.yaml` 的 `collapseByDefault: true`）改回去了——使用者確認排版 bug 修好之後，決定 TOC 還是維持預設展開比較習慣，只留這個標題裁切的修復（因為使用者手動點掉 TOC 收合時一樣會用到同一段容易被裁切的程式碼路徑，不修的話手動收合照樣會踩到）。

> [!tip] 同一個 bug，觸發條件可能要等後續改動才會第一次真的跑到
> 這是這個專案第二次遇到「程式碼一直都在，但某個條件從沒被滿足過，所以 bug 從沒被踩到」的情況（上一次是 [[Quartz troubleshooting - properties and data display#✅ 7.9|7.9]] 的 `render` 事件從沒被 dispatch 過）。這次是「TOC 容器的高度裁切邏輯，只有在真的被壓縮到 1.4rem 高度時才會生效」——套件預設展開，這段邏輯形同虛設；只要以後有人（不管是改預設值、還是使用者自己手動收合）第一次讓容器真的被壓縮，潛在的 margin 沒歸零問題就會浮現。看到「改一個看似無關的設定，卻冒出一個從沒見過的排版問題」時，值得先假設「這個路徑本來就有問題，只是沒人走過」，而不是先假設「新設定本身有問題」。

---

## ✅ 6.5 標題很多的頁面，TOC 捲不到最後兩個標題；修到一半又冒出 TOC 蓋住 Backlinks——最後改回預設收合收尾

**現象**：使用者重新把 TOC 改回預設展開（見 6.4 最後一段）之後，在首頁（`content/index.md`，TOC 有 17 條標題）截圖回報：滑鼠滾輪可以捲動 TOC 清單，但捲不到最底部，「文獻筆記工作流」「外掛介紹與應用」這兩個最後的標題永遠看不到。

**根本原因（分兩層，一開始只抓到其中一層）**：

1. **Chromium 的 sticky 定位 + 巢狀捲動區塊會讓捲動位置的重繪跟實際狀態脫勾**：右側欄 `.sidebar.right` 用 `position: sticky` 釘在畫面上，裡面 TOC 自己的清單 `ul.toc-content` 是另一個獨立的 `overflow-y: auto` 捲動區。用 `elementFromPoint`／`getBoundingClientRect` 量測發現：滑鼠滾輪捲動後，`ul.scrollTop` 這個數值確實有正確更新到底，但瀏覽器的畫面重繪／點擊判定卻還停在捲動前的位置——捲動「內部真的生效了」，但「畫面沒跟著動」，看起來就像完全捲不動。
2. **就算 1 修好了，清單本身的框（`.toc`）也不夠高，多出來的內容直接被瀏覽器視窗邊界切掉，沒有任何一層有捲軸能構到**：直接量測發現 `.sidebar.right` 的內容（Graph View + `.toc`）實際高度 733px，遠超過側欄自己 `height: 100vh` 給的 639px 框；`.toc` 雖然設了 `flex-shrink: 0.5`，實際卻完全沒被壓縮（Graph View 的 `flex-shrink: 1` 也一樣沒被壓縮），兩者都停在自己內容的原始高度不動。因為 `.sidebar.right` 自己從沒設過 `overflow`（預設值是 `visible`），這 94px 的超出部分就直接被瀏覽器視窗邊緣切掉，TOC 清單自己的內部捲動只能移動「框裡面」的內容，框本身超出視窗的那一截完全碰不到。

**排查過程**：

1. 先用 `getComputedStyle`／`getBoundingClientRect`／`elementFromPoint` 反覆量測，確認 `ul.toc-content` 的 `scrollTop` 確實能捲到理論上的最大值，但 `elementFromPoint` 讀到的最上面可見項目卻不會跟著變，鎖定是「捲動狀態跟畫面重繪脫勾」——先假設並修了 `.sidebar.right { will-change: transform }`（強制升成獨立合成層，繞開這類 sticky 重繪錯誤），這一步驗證後（用真的滑鼠滾輪，不是用程式硬改 `scrollTop`）確認清單「內部」的捲動行為恢復正常
2. 但用真的滑鼠滾輪捲到底之後，用同樣方式量測 `.sidebar.right` 自己的 `scrollHeight`（733）vs `clientHeight`（639），發現側欄整體內容本身就比視窗高，且 `overflow` 是 `visible`——這才是「捲不到最後兩個標題」的真正主因，第 1 步的修法只解決了「TOC 清單自己內部的捲動」，沒解決「TOC 這個框本身探出視窗外」的問題
3. 改成讓整個右側欄可以捲動（`.sidebar.right { overflow-y: auto }`），但發現滑鼠停在 TOC 清單正上方捲動時，還是只會捲到 TOC 自己內部的捲動區（套件自己的 `overscroll-behavior: contain` 明確擋掉了往外層鏈式捲動），一定要把滑鼠移到 Graph View 或空白處才會捲到整個側欄——於是進一步把 TOC 自己內部那層獨立捲動關掉，讓 `.toc`／`ul.toc-content` 直接照自然內容高度撐開，只留最外層側欄這一個捲動區，滑鼠停在 TOC 文字上捲動也能正常捲到底
4. 第一次關掉內部捲動時用的是 `overflow-y: visible`，結果在另一篇標題數中等的筆記（「工作流系統說明」）上出現新問題：TOC 沒有裁切了，但因為 `.toc` 這個 flex 項目本身的框沒有跟著撐高（`overflow: visible` 只是不裁切內容，不會讓自己的盒子長高），清單就直接畫到下面的 Backlinks 上面，兩者文字重疊看不清楚——改用 `flex-shrink: 0`（讓 `.toc` 展開時不被壓縮、真的撐到內容高度）才讓 Backlinks 正常被推到下面，不再重疊
5. 修完重疊後，使用者又回報：展開狀態下 TOC 現在確實撐好高度、也不重疊了，但因此在視窗還沒捲動時，Backlinks 常常整個被推出視窗外、只露出「Backlinks」標題被切一半——問到底要不要犧牲 Graph View 大小換空間，使用者最後選擇改回 TOC 預設收合（收合狀態只佔 22.4px，不會把 Backlinks 推遠），比較符合平常使用習慣

**解決方法**（`quartz/styles/custom.scss` 新增四條規則，外加 `quartz.config.yaml` 一個選項）：

```scss
.sidebar.right {
  will-change: transform; // 修 6.5 步驟1：sticky 內巢狀捲動的重繪脫勾
  overflow-y: auto;       // 修 6.5 步驟2：整個側欄變成唯一的捲動區
}

// 只在「沒有被手動收合」時生效，收合功能（見 6.4）不受影響
.toc:not(:has(.toc-header.collapsed)) {
  flex-shrink: 0; // 修 6.5 步驟4：讓 TOC 展開時撐好高度，不再蓋住 Backlinks
}
```

```yaml
# quartz.config.yaml
- source: "@quartz-community/table-of-contents"
  options:
    collapseByDefault: true # 修 6.5 步驟5：預設收合，避免 Backlinks 被推出視窗
```

**已驗證結果**：三個情境都用真的滑鼠滾輪／點擊在同一份 build 上重新測過：① 首頁 17 條標題的 TOC 展開後可以捲到最後的「外掛介紹與應用」；② 「工作流系統說明」頁 TOC 展開時不再跟 Backlinks 重疊；③ 手動收合／展開 TOC 仍正常運作（6.4 的裁切修復沒有被動到）；④ 改回預設收合後，多數頁面不用捲動就能看到 Backlinks 好幾行內容。commit 並 push 到 `v5` 分支（`7cdd797`）。

> [!tip] `overflow: visible` 只是不裁切，不會讓 flex 項目自己的盒子長高
> 步驟4是這次踩到的一個值得記住的教訓：想讓一個被 `flex-shrink` 壓縮過的 flex 項目「顯示出完整內容、不要裁切」，直覺會想到 `overflow: visible`，但 `overflow` 只控制「超出盒子的內容要不要被裁切」，完全不影響盒子自己在 flex 版面裡算出來的尺寸——盒子還是原本被壓縮過的小尺寸，內容只是「畫到盒子外面去」，會直接蓋到後面的兄弟元素。如果目的是「這個項目該多高就多高、不要被壓縮」，要調的是 `flex-shrink`（或 `flex-basis`／`min-height`），不是 `overflow`。

> [!tip] 後續更新
> 這裡加的 `.sidebar.right { will-change: transform }` 後來在 [[#✅ 6.6|6.6]] 發現會把 Global Graph 彈窗推到畫面外，已經改成 `will-change: scroll-position`（效果一樣、不會有這個副作用），目前正式網站上跑的是改過的版本。

---

## ✅ 6.6 Global Graph 彈窗打開後幾乎整個跑到畫面外，只看得到局部圖（local graph）

**現象**：點右上角展開圖示想看 Global Graph，彈窗有跳出來、DOM 裡也確認有 `.global-graph-outer.active`，但畫面上完全看不到、也點不到，使用者只能一直看到 local graph。

**根本原因**：跟 6.5 解 sticky 重繪 bug 時加的 `.sidebar.right { will-change: transform }` 互相打架。CSS 規則：`will-change: transform`（跟真的 `transform` 一樣）會替該元素建立一個新的 **containing block**，讓它底下所有 `position: fixed` 的子元素改成相對於這個元素定位，而不是相對於整個瀏覽器視窗。Global Graph 彈窗（`.global-graph-outer`，`position: fixed`，設計上要蓋滿整個視窗）剛好巢狀在 `.sidebar.right` 底下（因為 Graph View 元件本身就放在右側欄），於是被整個推到相對於側欄框框的位置，側欄本身又偏在畫面右側，彈窗就這樣幾乎全部跑到螢幕外面。

**排查過程**：

1. 用 `javascript_exec` 直接查 `.global-graph-outer`/`.global-graph-container` 的 `getBoundingClientRect()`，確認彈窗 DOM 確實存在、`z-index`／`opacity`／`display` 都正常，但 `left` 卻是一個遠超過視窗寬度的數字（約 1198px，螢幕只有 1536px 寬）——排除「沒渲染」，鎖定是「位置算錯」
2. 沿著 `.global-graph-outer` 往上找祖先元素，篩出 `transform`／`filter`／`will-change`／`perspective` 不是預設值的元素（這幾個屬性都會建立 containing block），只找到一個：`.sidebar.right` 的 `will-change: transform`——正是 6.5 加的那條

**解決方法**：把 `.sidebar.right` 的 `will-change: transform` 改成 `will-change: scroll-position`。這個值一樣能讓瀏覽器把該元素提升成獨立合成層（維持 6.5 要修的 Chromium sticky 重繪 bug），但 `scroll-position` 不是 transform 相關屬性，不會建立 containing block，兩個 bug 因此都解掉，互不影響。

**已驗證結果**：本地測試確認 Global Graph 彈窗恢復置中滿版顯示；同時重測 6.5 的三個情境（TOC 捲到底、不跟 Backlinks 重疊、手動收合展開）確認都沒有回歸。commit 並 push 到 `v5` 分支（`8f05e66`）。

> [!tip] 會建立 containing block 的不是只有 `transform`
> `position: fixed` 原本的設計是「永遠相對於視窗」，但只要祖先元素有 `transform`（不是 `none`）、`filter`（不是 `none`）、`perspective`、`contain: layout`/`paint`/`content`/`strict`，或是 `will-change` 的值包含以上任何一個屬性，都會讓該祖先變成新的 containing block，把底下所有 `position: fixed`（連同 `absolute`）的子孫元素綁定在它身上，而不是視窗。任何 GPU 合成層優化的 hack（`transform: translateZ(0)`、`will-change: transform` 等）都有這個副作用，如果底下巢狀了設計上要蓋滿視窗的 fixed 元素，要優先考慮 `will-change: scroll-position`／`opacity`（不在觸發清單裡）之類更精準的屬性，而不是無腦上 `transform`。

---

## ✅ 6.7 Global Graph 就算設定 `showTags: false`，還是照樣畫出一堆 tag 節點

**現象**：想讓 Global Graph 不要顯示 tag 節點（只留下筆記本身），在 `quartz.config.yaml` 設定 `options.globalGraph.showTags: false`，重新建置後，Global Graph 還是照樣畫出約 30 個 tag 節點（空心圓圈那種），跟設定完全不符。

**根本原因**：`showTags` 這個選項在套件的 client script 裡，**只控制要不要額外合成「筆記 → tag」的連線**（`if(Re) for(...tags...)` 那段迴圈），不會影響 tag 頁面本身要不要出現在圖上。而 Global Graph 預設 `depth: -1`（顯示全部），這個模式的邏輯是「把 `contentIndex.json` 裡的每一項都當節點畫出來」，這個列舉完全沒有檢查 `showTags`。這個網站另外開了 `tag-page` 這個 plugin，每個 tag 都會產生一個真實頁面（例如 `/tags/類別`），這些頁面本身就是 `contentIndex.json` 裡的正常條目——所以就算 `showTags: false`，`depth: -1` 模式還是會把這些 tag 頁面當一般筆記全部列出來，`showTags` 對這個模式形同虛設。

**排查過程**：用 `javascript_exec` monkey-patch `PIXI.Text` 建構子，攔截每個節點建立時傳入的文字，統計文字開頭是 `#`（套件對 tag 節點文字的固定格式）的數量——設定 `showTags:false` 重新建置後，Global Graph 還是量到 31 個，證實不是設定沒套用（`data-cfg` 屬性有確認正確帶著 `showTags:false`），而是這個選項對 `depth:-1` 模式根本沒作用。

**解決方法**：修改 `@quartz-community/graph` 套件編譯後的 client script（`dist/index.js`、`dist/components/index.js` 兩份都要改，原因跟 6.1 一樣），在 `depth<0` 分支列舉全部節點時，額外擋掉 id 開頭是 `tags/` 的項目（除非 `showTags` 為真）：

```js
// depth<0（顯示全部）分支，原本無條件把 contentIndex 每一項都加進去
else{
  Xu.forEach(function(i){
    (Re||!i.startsWith("tags/")) && ru.add(i)
  });
  ...
}
```

**持久化到正式網站**：跟 6.1／6.2 一樣用 `patch-package` 疊加進同一份 `patches/@quartz-community+graph+0.1.0.patch`。

**已驗證結果**：本地測試確認 `showTags:false` 後 Global Graph 節點數從 134 降到 103（少掉的 31 個正好等於 tag 數），Local Graph（`depth:1`，走的是完全不同的 BFS 分支，這段改動沒碰）維持原本行為不變；commit 並 push 到 `v5` 分支（`8f05e66`）。這個修法後來被 6.9 的「資料夾/標籤篩選面板」取代——面板改成用一個可即時勾選的「顯示標籤」開關控制，`quartz.config.yaml` 裡的 `showTags:false` 設定也拿掉了，但底層「`depth<0` 模式原本不看 `showTags`」這個套件限制的成因記錄在這裡。

---

## ✅ 6.8 Graph 節點 hover 顯示名稱後，滑鼠移開名稱卡住不會消失

**現象**：延續 6.2 修好的 hover 死區問題，滑鼠移到節點上會正確顯示該筆記名稱，但移開之後名稱不會消失，卡在畫面上；如果連續滑過好幾個節點，會變成好幾個名稱同時卡著顯示，越滑越亂，local/global 兩邊都有一樣的狀況。

**根本原因**：負責決定每個節點名稱透明度的函式 `qe()`，邏輯只處理了「目前正在 hover 的節點」該顯示（`alpha=1`），完全沒處理「不是目前 hover 對象」的節點該怎麼辦——只要一個節點的名稱曾經因為被 hover 過而 `alpha` 被設成 `1`，之後就永遠停在 `1`，沒有任何程式碼路徑會把它調回去。畫面上唯一會重新計算「非 hover 節點」透明度的地方，是縮放（zoom）事件的處理函式，滑鼠移開（`pointerleave`）完全不會觸發到那段邏輯，這就是為什麼移開滑鼠沒有用、只有縮放/平移畫面才會意外把卡住的名稱清掉。

**解決方法**：修改 `qe()`，讓「不是目前 hover 對象」的節點名稱透明度，改成套用跟縮放函式（`ut()`）同一套「依目前縮放程度換算出的環境透明度」公式（`Math.max((P.k*opacityScale-1)/3.75,0)`），而不是維持不變：

```js
function qe(){
  for(var i=1/qu, l=i*1.1, ambient=Math.max((P.k*Me-1)/3.75,0), F=0; F<L.length; F++){
    var A=L[F];
    _u===A.simulationData.id
      ? (A.label.alpha=1, A.label.scale.set(l))
      : (A.label.alpha=ambient, A.label.scale.set(i))  // 原本這裡完全沒動 alpha
  }
}
```

沒放大時 `ambient` 算出來是 `0`（跟節點名稱建立時的初始值一致），滑鼠移開就會正確淡出；放大到一定程度後名稱會維持常駐顯示，這個「縮放到一定程度自動常駐顯示」的原始設計行為沒有被改動。

**持久化到正式網站**：跟 6.7 一樣用 `patch-package` 疊加進同一份 patch。

**已驗證結果**：用 `javascript_exec` 直接讀節點名稱物件的 `alpha` 數值（不是只看畫面），dispatch 真的 `pointermove`／`pointerleave` 事件驗證：hover 中 `alpha=1`，`pointerleave` 後 `alpha=0`，local／global 兩邊都測過；commit 並 push 到 `v5` 分支（`8f05e66`）。

---

## ✅ 6.9 Global Graph 新增可手動勾選顯示/隱藏的「資料夾」與「標籤」篩選面板

**現象／需求**：Global Graph 預設把全站所有資料夾的筆記都畫在一起，某些資料夾（例如畫布、範本、Bases）平常根本不想看到，希望能自己手動選要顯示哪些資料夾；一開始先用 6.7 的 `showTags:false` 整組關掉 tag，後來想法改成「跟資料夾一樣做成可勾選的清單」，最後又簡化成「tag 不用每個都列，一個總開關就好」。

**做法**：在 Global Graph 彈窗的容器內（`isGlobalContainer` 判斷成立時才會加，local graph 完全不受影響），動態插入一個小面板（`.graph-folder-filter`，定位在彈窗左上角），內容分兩區：

- **資料夾**：從 `contentIndex.json` 掃出所有頂層資料夾名稱，每個資料夾一個 checkbox，預設全部勾選
- **標籤**：單一一個「顯示標籤」checkbox，控制全部 tag 節點的顯示/隱藏（不逐個列出，避免清單太長）

兩組選擇分別存在瀏覽器 `localStorage`（`graph-hidden-folders`、`graph-show-tags`），換頁、重新整理都會記住；勾選狀態改變時，直接呼叫套件內部既有的 `D()`（render 函式）搭配 `b()`（清除舊的 render 循環，避免每次勾選都疊加一個新的模擬迴圈造成效能洩漏）重新畫一次圖，不用整頁重新整理。

篩選邏輯加在跟 6.7 同一段 `depth<0`（全部顯示）分支：非 tag 的筆記，比對 id 的第一層資料夾名稱是否在 `hiddenFolders` 裡；tag 頁面（id 開頭 `tags/`）則直接看「顯示標籤」這個總開關。因為 local graph 用 `depth:1` 的 BFS 分支，這段完全沒碰到，跟使用者明確要求「不能影響 local graph」的原則一致。

**持久化到正式網站**：跟 6.7／6.8 疊加進同一份 `patches/@quartz-community+graph+0.1.0.patch`；`quartz.config.yaml` 原本 6.7 加的 `globalGraph.showTags:false` 也拿掉了，改成完全由面板的「顯示標籤」開關（預設勾選＝顯示）即時控制。

**已驗證結果**：本機瀏覽器實測——取消勾選「4.canvas-and-mindmaps」「5.templates-for-web」「7.bases」後對應資料夾的節點跟連線立刻消失；取消「顯示標籤」後 tag 節點從 31 個變成 0 個，重新勾選變回 31 個；重新整理頁面後勾選狀態正確保留；Local Graph 全程沒有面板、tag 顯示數量前後一致（都是 1 個）。commit 並 push 到 `v5` 分支（`8345c96`）。

---

## ✅ 6.10 資料夾篩選面板改成支援巢狀子資料夾，且開啟子資料夾要能自動打開上層、不能牽動其他手足

**現象／需求**：延續 6.9 的資料夾篩選面板，一開始只列出頂層資料夾；想進一步讓面板能展開到子資料夾層級（例如 `2.personal-notes` 底下的 `explanation-notes`，再底下的 `workflow-and-system`），一樣可以個別勾選顯示/隱藏。功能定案前來回調整了三輪，每輪都是使用者實測後才發現的問題：

1. 子資料夾的節點雖然畫面上正確跟著上層一起隱藏，但子資料夾自己的核取方塊沒有跟著變成未勾選，要重新打開子資料夾得先手動找到並打開上層
2. 改成「上層關閉時子資料夾核取方塊自動變灰、取消勾選、鎖住不能點」後，使用者提出不想被鎖住，希望直接點子資料夾就能連上層一起打開，不用先手動開上層
3. 改完直接點開子資料夾會自動打開整條上層之後，測試發現新問題：上層打開的同時，其他沒被點到的手足資料夾也全部一起被打開，沒有維持原本各自的開關狀態

**做法**：

- 資料夾清單改用完整路徑：`folderOf` 從只取第一層（`indexOf("/")`）改成 `lastIndexOf("/")`，取得完整所在資料夾路徑；每篇筆記把自己所在路徑的每一層前綴都加進 `folderSet`，再用 `childrenMap`（parent 路徑 → 子路徑陣列）組出樹狀結構，面板用遞迴 `renderFolderNode(path, depth)` 依縮排畫出巢狀清單
- 隱藏判斷改成 `folderHidden(fo)`：往上檢查 `fo` 自己以及每一層祖先路徑是否在 `hiddenFolders` 裡，任一層命中就視為隱藏（cascading）——同時用來決定圖上節點要不要畫、以及核取方塊要不要顯示成勾選

**排查／迭代過程**：

- 第 1 輪把 filter 邏輯跟 checkbox 的 `checked` 都改用 `folderHidden` 計算，圖確實會跟著隱藏，但子資料夾自己從沒被寫進 `hiddenFolders`，checkbox 呈現「未勾選」卻沒有同步鎖住，體驗不一致
- 第 2 輪加了 `ancestorOnly = effHidden && !hiddenFolders.has(path)` 判斷，為真時把 checkbox 設 `disabled` 並降低透明度，畫面呈現正確，但使用者馬上回饋「不想被鎖住，想直接點開」
- 第 3 輪拿掉 `disabled`，改成點擊時「刪掉自己與所有祖先路徑」讓整條路徑變可見——這版有個沒想到的副作用：如果整層資料夾原本只是靠**單一一筆上層的 `hiddenFolders` 紀錄**在 cascading 隱藏（手足資料夾自己從沒被個別記錄過關閉），清掉那筆上層紀錄時，所有手足資料夾會一起失去隱藏依據，全部跟著打開
- 最後一輪修法：點擊「打開」某個子資料夾時，先用**尚未修改前的 `hiddenFolders` 快照**，沿著要清除的每一層祖先，把「除了通往目標路徑那個分支以外」的其他手足資料夾目前的隱藏狀態，明確寫成它們自己的獨立紀錄（materialize），再清掉整條祖先鏈本身的紀錄——手足資料夾的隱藏狀態不再依附在即將被清除的上層紀錄上，開啟目標子資料夾就不會連帶影響到它們

**解決方法**（`renderFolderNode` 內 checkbox 的 `change` handler，`@quartz-community/graph` 套件編譯後的 client script，`dist/index.js`、`dist/components/index.js` 兩份都要改，原因同 6.1）：

```js
cb.addEventListener("change", function () {
  var cur = new Set(JSON.parse(localStorage.getItem("graph-hidden-folders") || "[]")),
      parts = path.split("/");
  if (cb.checked) {
    // 先把其他手足資料夾目前的隱藏狀態明確寫下來，避免它們依附在即將被清除的祖先紀錄上
    for (var pi = 0; pi < parts.length - 1; pi++) {
      var ancestorPath = parts.slice(0, pi + 1).join("/"),
          nextNode = parts.slice(0, pi + 2).join("/"),
          siblings = childrenMap.get(ancestorPath) || [];
      for (var si = 0; si < siblings.length; si++) {
        var sib = siblings[si];
        if (sib !== nextNode && folderHidden(sib)) cur.add(sib);
      }
    }
    // 再清掉自己與整條祖先鏈的隱藏紀錄
    cur.delete(path);
    for (var pi2 = 0; pi2 < parts.length - 1; pi2++)
      cur.delete(parts.slice(0, pi2 + 1).join("/"));
  } else {
    cur.add(path);
  }
  localStorage.setItem("graph-hidden-folders", JSON.stringify(Array.from(cur)));
  b();
  D(d, w, void 0).then((fn) => r.push(fn)).catch((err) => console.error("[Graph] Global render error:", err));
});
```

Checkbox 本身一律可點擊（不再 `disabled`），只用 `opacity` 降低來提示「這是被上層帶著隱藏，不是自己另外關的」。

**持久化到正式網站**：同 6.1／6.7～6.9，疊加進同一份 `patches/@quartz-community+graph+0.1.0.patch`（`npx patch-package @quartz-community/graph` 重新產生），`postinstall` 會在每次 `npm install` 後自動套用。

**已驗證結果**：本機 `node ./quartz/bootstrap-cli.mjs build --serve` 起服務，用瀏覽器搭配 `localStorage` 直接布置測試情境反覆驗證：① 只關掉單一上層資料夾（例如 `2.personal-notes`），子資料夾核取方塊正確變成未勾選＋灰階；② 點開被灰階的子資料夾，自己與整條祖先鏈都正確打開；③ 上層與多個手足資料夾都個別關閉後，只點開其中一個子資料夾，確認其餘手足維持原本關閉狀態不受影響，`localStorage` 裡也確實留著它們各自獨立的紀錄。commit 並 push 到 `v5` 分支（`dfecb61`）。

> [!tip] Quartz 自己的 build 會把套件程式碼再重新 minify 一次，變數名稱跟原始 patch 對不上
> 除錯這次改動時，一度直接 grep 建置產物 `public/postscript.js` 找 `folderHidden`、`ancestorOnly` 這些變數名稱，完全找不到，一度誤以為新程式碼沒有真的被建置進去。後來才發現：`postscript.js` 是 Quartz 自己的建置流程把所有元件的 `afterDOMLoaded` script 收集起來，**再用它自己的 esbuild 做一次 minify**，把 `@quartz-community/graph` 套件裡（已經被 tsup minify 過一次的）程式碼識別字，又重新縮寫成 `U`、`bn`、`Ce` 這類單字母變數——同一段邏輯在原始套件的 `dist/*.js` 跟最終產出的 `postscript.js` 裡，變數名稱是兩套完全不同的縮寫結果。之後要在建置產物裡確認某段邏輯有沒有生效，要搜尋**字串常值**（例如 `"graph-folder-filter"`、CSS class 名稱）這類不會被重新命名的東西，而不是搜尋自己取的變數名稱。

> [!tip] 推送前遠端有新 commit，合併時因 Windows 長路徑限制失敗
> 推送這次改動時，`git push` 被拒絕（遠端 `v5` 這段時間有 Quartz Syncer 自動發布的新 commit），`git merge origin/v5` 又因為某篇筆記檔名太長，超過 Windows 路徑長度限制而失敗（`Filename too long`）——這跟這次程式碼改動完全無關，是這個本機 clone 一直沒開 `core.longpaths` 造成的。Windows 系統本身的長路徑支援（登錄檔 `LongPathsEnabled`）其實早就是開的，只差 git 這個 repo 自己的設定沒打開；確認過使用者同意後，局部（不是 `--global`）對這個 repo 執行 `git config core.longpaths true`，之後合併就正常了。之後這個 clone 再遇到遠端新增很長檔名的筆記，應該不會再卡住。
