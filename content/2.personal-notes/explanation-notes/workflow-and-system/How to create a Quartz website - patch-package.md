---
publish: true
aliases:
  - Quartz 建站－用 patch-package 修改第三方套件
title: Quartz 建站－用 patch-package 修改第三方套件
created: 2026-09-04T10:21:54.418Z
modified: 2026-09-04T10:21:54.438Z
published: 2026-09-04T10:21:54.438Z
tags:
  - 數位花園
  - 網站
  - ai-agent
category:
  - "[[Explanation notes]]"
  - Workflow and system
parent:
  - "[[How to create a Quartz website]]"
sibling:
child:
---

# 修改第三方套件（`@quartz-community/*`）內部行為：`patch-package`

搭配母筆記 [[How to create a Quartz website]] 一起看。

## 什麼時候需要這招

`quartz.config.yaml` 只能「開關」插件既有的功能、調它開放出來的參數，改不了套件**本身寫死**的行為（例如 UI 排版、顏色邏輯、要不要顯示某個元素）。真的需要動到套件內部程式碼，又不想整個 fork 一份自己維護，可以用 `patch-package`：直接改 `node_modules` 裡「已經編譯好」的檔案，把改動存成一份 `.patch` 檔，之後 `npm install` 會自動重新套用。

## 已經用這招修過的例子

1. **`@quartz-community/graph` 的 CJK 網址 bug**，詳見 [[Quartz troubleshooting - naming and paths#✅ 2.1|2.1]]
2. **Graph View 加顏色圖例**（2026-08-14）：關聯圖裡的節點顏色（目前筆記／相關筆記／tag／尚未瀏覽）原本沒有任何說明。直接改 `node_modules/@quartz-community/graph/dist/components/index.js` 跟 `dist/index.js`（這個套件把同一份元件重複打包成兩份，兩邊都要改），在 `.graph-outer`（一般 local graph）跟 `.global-graph-container`（點展開圖示的全螢幕 global graph）裡各加一份左下角圖例。圖例的圓點顏色直接綁定跟節點渲染邏輯**同一組** CSS 變數（`--secondary`／`--tertiary`／`--gray`／`--light`），確保圖例顏色永遠跟實際節點一致，深色模式切換也會自動同步

## 操作步驟

1. 先在 `node_modules/<套件名稱>/dist/...` 裡直接改要動的檔案
2. 改完在 repo 根目錄執行：
   ```
   npx patch-package <套件名稱>
   ```
   它會拿一份乾淨版本的套件跟你改過的 `node_modules` 版本做 diff，把結果存成 `patches/<套件名稱>+<版本號>.patch`
3. `package.json` 要有 `"postinstall": "patch-package"`（這個 repo 已經設定好），這樣任何人（包含 Cloudflare 部署時）跑 `npm install` 之後，patch 都會自動重新套用一次
4. **重要**：如果同一個套件之前已經 patch 過（例如 graph 這次已經有 CJK bug 的 patch），直接在既有、已經套用過 patch 的 `node_modules` 上繼續改，再跑一次 `npx patch-package <套件名稱>`，會自動把新舊改動**合併**進同一份 patch 檔，不用手動處理

> [!warning] 這招的風險
> 改的是套件已經編譯過、通常是 minify 過的程式碼，可讀性差、容易改錯；而且套件作者之後更新版本，這份手動 patch 很可能對不上新版程式碼、需要重新對照修改。只在真的沒有設定選項可以達成需求、又不想整個 fork 套件的情況下才用這招。

## 這招用不上的情況：git 來源的外部插件

`@quartz-community/bases-page`、`@quartz-community/canvas-page` 不是走一般 npm 安裝，而是 `quartz.config.yaml` 設定成從 `github:quartz-community/...` 直接 clone 原始碼、自行編譯，快取放在 `.quartz/plugins/`，`patch-package` 抓不到對應的 `node_modules` 套件，用不上。這種情況改用「整包 vendor 進 repo」的做法，詳見 [[Quartz troubleshooting - properties and data display#✅ 7.6|7.6]]。
