---
publish: true
aliases:
  - Quartz 建站－Timestamp Notes 影片跳轉連結
title: Quartz 建站－Timestamp Notes 影片跳轉連結
created: 2026-09-04T10:21:54.491Z
modified: 2026-09-04T10:21:54.513Z
published: 2026-09-04T10:21:54.513Z
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

# 讓 Timestamp Notes 的時間戳記在網站上也能點擊跳轉

搭配母筆記 [[How to create a Quartz website]] 一起看。用法說明見 [[Timestamp note外掛說明]]。

## 背景：外掛本身在網站上完全沒作用

[[Timestamp note外掛說明|Timestamp Notes]] 是 desktop-only 的 Obsidian 外掛，筆記裡留下的 ` ```timestamp``` `／` ```timestamp-url``` ` code block，發布到網站後只會被當成普通程式碼區塊顯示成文字，沒有任何互動能力。網站上真正能播放的影片，是另外用 `![說明文字](YouTube網址)` 這種連結語法插入的，Quartz 本身就有把它轉成 `<iframe>` 的功能（`obsidian-flavored-markdown` 插件的 `enableYouTubeEmbed`），跟 Timestamp Notes 外掛完全是兩回事。

## 做法：新增一個 build-time 的 vendor plugin

新增 `vendor/timestamp-links/`（跟現有的 `vendor/canvas-page`、`vendor/bases-page` 同一種模式），在 build 時做兩件事：

1. 把 ` ```timestamp``` ` code block（例如內容是 `10:01`）轉成一個可點擊的按鈕（顯示「▶ 10:01」）
2. ` ```timestamp-url``` ` code block 直接移除——網址已經在可見的 `![]()` embed 裡了，這個 block 純粹是外掛在 Obsidian 端自己要用的，對網站沒有意義

點擊按鈕時，用瀏覽器端 JS 透過 YouTube 的 `postMessage` API，找到頁面上（`![]()` embed 產生的）YouTube iframe，直接下 `seekTo` + `playVideo` 指令跳到對應秒數並播放，不需要載入完整的 YouTube IFrame Player API script。

一篇筆記可能有多支影片、多個時間戳記，做法是在 build 時依照文件順序追蹤「目前是哪支影片」：每遇到一個 ` ```timestamp-url``` ` block 就更新目前影片的 YouTube video ID，並把這個 ID 記錄在每個時間戳記按鈕的 `data-video-id` 屬性上；點擊時優先用這個 ID 去比對 iframe 的 `src`，找不到才 fallback 抓當頁第一個 YouTube iframe。

## 關鍵的坑：iframe 沒有 `autoplay` 權限，postMessage 的 playVideo 會被靜默擋掉

Quartz 原本產生的 YouTube iframe，`allow` 屬性只有 `"fullscreen"`。實測發現：`seekTo` 指令有效（YouTube 回報的 `currentTime` 真的會變），但 `playVideo` 完全沒反應——原因是 Chrome 的 autoplay 政策擋掉了透過 postMessage 觸發的播放，因為這個 iframe 的權限清單裡沒有宣告 `autoplay`。

解法：在同一個 plugin 裡，順便把這顆 iframe 的屬性也修正：

- `src` 補上 `?enablejsapi=1`（讓 YouTube 的 player 監聽 postMessage 指令）
- `allow` 屬性補上 `autoplay`，變成 `allow="fullscreen; autoplay"`

補完這兩個屬性後，點擊按鈕才會真的讓影片跳轉並開始播放，不只是內部座標跳過去而已。

## `quartz.config.yaml` 設定

```yaml
  - source: ./vendor/timestamp-links
    enabled: true
    order: 35
```

`order: 35` 放在 `obsidian-flavored-markdown`（30，負責把 `![]()` 轉成 YouTube iframe）之後、`github-flavored-markdown`（40）之前，確保處理時序合理。

## 本機測試時遇到的環境問題：Windows 建 symlink 需要權限

`vendor/` 底下的 plugin 是靠 Quartz 的 plugin loader 把 `vendor/timestamp-links` symlink 進 `.quartz/plugins/timestamp-links` 才會被載入。在沒有開啟 Developer Mode、也沒有用系統管理員權限執行的 Windows 環境下，Node 的 `fs.symlinkSync` 會丟出 `EPERM: operation not permitted`，build 會直接跳過這個 plugin（只印一行警告，不會讓整個 build 失敗，但功能不會生效）。

解法：手動在 PowerShell 用 NTFS **Junction**（不是 symlink）先把資料夾連好，Junction 不需要系統管理員權限：

```powershell
New-Item -ItemType Junction -Path ".quartz\plugins\timestamp-links" -Target "vendor\timestamp-links"
```

建好之後，loader 偵測到 `.quartz/plugins/timestamp-links` 已經是一個有效的連結（`isSymbolicLink()` 對 Junction 也會回傳 true），就不會再嘗試重新建立，之後正常 build 即可。`.quartz/` 整個資料夾本來就在 `.gitignore` 裡，這個 Junction 不會被 commit 進去，純粹是本機測試用的暫時解法。

> [!tip] Cloudflare 上不會有這個問題
> Cloudflare Workers Builds 的建置環境是 Linux，一般帳號就有權限建立 symlink，不會遇到這個 EPERM 錯誤，`npx quartz plugin install` 會正常把 symlink 建好。這個坑只在 Windows 本機測試時才會出現。

## vendor plugin 的 dist 要記得 commit

跟其他 `vendor/` 底下的 plugin 一樣，Cloudflare 的 build command 只有 `quartz build`，不會重新編譯 `vendor/` 下的原始碼（見母筆記關於 vendor dist 的說明）。每次改完 `vendor/timestamp-links/src/index.ts`，要記得先在本機跑：

```
node vendor/timestamp-links/build.mjs
```

把編譯好的 `vendor/timestamp-links/dist/index.js` 一起 commit，Cloudflare 才吃得到最新版的行為。

## 已測試過沒問題的情境

- 同一篇筆記裡有多個時間戳記，各自能跳到正確秒數
- 不同筆記各自對應到不同影片，video ID 比對正確
- 站內 SPA 導覽（點連結換頁、不是整頁重新載入）之後，按鈕依然可以正常運作——用事件代理（在 `document` 上監聽 click，而不是綁在個別按鈕上）解決，不需要額外處理 SPA 換頁後重新綁定的問題
- 開啟 hover 預覽卡片（popover）時，卡片裡的按鈕跟卡片裡自己那份影片是各自獨立運作，不會跟主頁面的影片互相干擾（用 `button.closest("article")` 限定搜尋範圍解決）
