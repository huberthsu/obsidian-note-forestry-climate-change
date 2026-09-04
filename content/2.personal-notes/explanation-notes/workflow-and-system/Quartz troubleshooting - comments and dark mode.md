---
publish: true
aliases:
  - Quartz 問題排查－留言區與深色模式
title: Quartz 問題排查－留言區與深色模式
created: 2026-09-04T10:21:53.903Z
modified: 2026-09-04T10:21:53.924Z
published: 2026-09-04T10:21:53.924Z
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

# 留言區與深色模式

搭配母筆記 [[Quartz website troubleshooting report]] 一起看。這篇記錄留言系統（Giscus）在不同主題模式下的相容性問題。

## ✅ 8.1 留言區（Giscus）切到深色模式後，框線跟文字還是黑色，看不清楚

**現象**：網站切到深色模式後，Giscus 留言區大部分元件（輸入框、按鈕）有正確變色，但「幾個反應」「N 則留言－由 giscus 技術支援」這兩行文字維持接近黑色，跟深色背景幾乎融在一起。

**排查過程**：

1. 一開始以為是自訂的 `quartz/static/giscus/dark.css`／`light.css` 內容有誤，比對過後發現本機檔案跟線上實際部署的版本逐位元組相同，內容本身沒問題
2. 請使用者實際截圖＋打開瀏覽器 DevTools 的 Console，直接看到關鍵錯誤訊息：
   ```
   Access to CSS stylesheet at '.../static/giscus/dark.css' from origin 'https://giscus.app'
   has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
   Failed to load resource: net::ERR_FAILED
   ```
   `light.css` 也是一樣的錯誤

**根本原因**：Giscus 留言元件實際上是跑在 `giscus.app` 這個第三方網域裡的 iframe，它要**跨網域**去抓網站自己代管的 `dark.css`／`light.css`。瀏覽器的 CORS（跨來源資源共用）安全機制規定，跨網域抓資源時，被抓的那一方要在回應標頭裡明確帶上 `Access-Control-Allow-Origin`，允許發起請求的來源才行。這個網站用的是 Cloudflare Workers（`assets.directory` 靜態資源），預設不會自動幫任何檔案加這個標頭，所以 `giscus.app` 要抓這兩份自訂主題 CSS 時直接被瀏覽器擋下，**自訂的深色／淺色主題從頭到尾都沒有真正被套用過**。畫面上看起來部分元件是淺色的，其實是 Giscus 官方內建的預設樣式，跟這個網站自己寫的 CSS 完全無關。

**解決方法**：Cloudflare Workers 的靜態資源支援跟 Cloudflare Pages 一樣的 `_headers` 設定檔語法，在 Quartz 網站的 `content/_headers` 新增：

```
/static/giscus/*
  Access-Control-Allow-Origin: https://giscus.app
```

Quartz 的 build 流程本來就會把 `content/` 底下非 markdown 的檔案原封不動複製到輸出根目錄，不需要額外設定就能讓這個檔案生效。

**已驗證結果**：本地用 `npx quartz build` 實測，確認 `public/_headers` 正確產生且內容無誤；commit 並 push 到 `v5` 分支後，Cloudflare 自動重新部署，使用者實際切換深色模式重新整理頁面，確認「幾個反應」「N 則留言」文字變成正常淺色、看得清楚。
