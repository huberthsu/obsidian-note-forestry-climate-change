---
publish: true
aliases:
  - Quartz 建站－自訂 404 頁面
title: Quartz 建站－自訂 404 頁面
created: 2026-09-04T10:21:54.347Z
modified: 2026-09-04T10:21:54.366Z
published: 2026-09-04T10:21:54.366Z
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

# 自訂 404（找不到頁面）

搭配母筆記 [[How to create a Quartz website]] 一起看。

## 問題現象

`.base`／`.canvas` 或任何還沒發布的頁面，如果直接打開對應網址，理論上應該看到 Quartz 自己 build 出來的 404 頁面，但實際看到的卻是**瀏覽器內建的空白錯誤畫面**（哭臉圖示 + "找不到...網頁" + "重新載入"按鈕），不是網站自己的樣式。

## 根本原因

這個網站是用 Cloudflare Workers 的 **Static Assets** 功能部署（`wrangler.jsonc` 只設定 `assets.directory`，沒有自訂 `main` worker script）。Quartz build 時其實**有**正常產生 `public/404.html`（元件在 `quartz/components/pages/404.tsx`），但 Cloudflare 的規則是：只有明確設定 `assets.not_found_handling`，才會在找不到對應資源時自動回傳這份 `404.html`；預設值是什麼都不做，直接回一個**空 body 的 404**，瀏覽器只好顯示自己內建的錯誤畫面。

## 修法：`wrangler.jsonc` 加一個設定

```jsonc
{
  "name": "obsidian-note-forestry-climate-change",
  "compatibility_date": "2026-08-10",
  "assets": {
    "directory": "./public",
    "not_found_handling": "404-page"
  }
}
```

加上 `not_found_handling: "404-page"` 之後，Cloudflare 找不到對應資源時，就會自動用 `public/404.html` 取代它自己的錯誤畫面（HTTP 狀態碼仍然正確地維持 404）。

## 順便客製化 404 頁面本身的內容

在 `quartz/components/pages/404.tsx` 改了三處：

- 標題從預設的 `404` 改成 `Sorry`
- 原本的「Return to Homepage」連結改成「Go Back」，用 `href="javascript:history.back()"` 回瀏覽器上一頁，而不是強制連回首頁
- 版面置中：這個頁面用的是 `minimal` frame（見 `quartz/components/frames/MinimalFrame.tsx`），預設內容是靠左上角對齊的。在 `quartz/styles/base.scss` 加了一段只鎖定 `body[data-slug="404"]` 的 CSS，讓內容用 flex 置中，不會影響到其他也可能用到 `minimal` frame 的頁面

## 本機怎麼測試（一般 `quartz build --serve` 測不出來）

`not_found_handling` 是 **Cloudflare 部署層級**的設定，`npx quartz build --serve` 用的只是普通靜態檔案伺服器（`serve-handler`），不會模擬 Cloudflare 的 asset routing，所以測不出這個設定有沒有生效。要測，得用 `wrangler` 本身的本機模擬伺服器：

1. `node ./quartz/bootstrap-cli.mjs build`（先正常 build 一次，確保 `public/` 是最新的）
2. `npx wrangler dev --port 8787`（用 Cloudflare 官方工具在本機模擬真正的 asset routing，包含 `not_found_handling` 行為）
3. 瀏覽器打開 `http://127.0.0.1:8787/隨便一個不存在的路徑`，確認看到的是自訂的 404 頁面，不是瀏覽器內建畫面

> [!tip] 測試「回上一頁」按鈕
> `history.back()` 抓的是這個分頁本身的瀏覽紀錄，不限定要用滑鼠點連結才算——在同一分頁的網址列手動輸入網址切換頁面，也會算進歷史紀錄裡。所以就算沒有真的從網站首頁點連結進去，只要先打開過首頁、再手動改網址列到一個不存在的路徑，按「Go Back」一樣能正確測到回到首頁的效果。
