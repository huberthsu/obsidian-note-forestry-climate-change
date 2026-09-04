---
publish: true
aliases:
  - Quartz 問題排查－Canvas Bases 發布與控制
title: Quartz 問題排查－Canvas Bases 發布與控制
created: 2026-09-04T10:21:53.621Z
modified: 2026-09-04T10:21:53.641Z
published: 2026-09-04T10:21:53.641Z
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

# Canvas/Bases 發布與控制

搭配母筆記 [[Quartz website troubleshooting report]] 一起看。這篇記錄 Canvas 和 Bases 兩種特殊檔案格式在發布時的設定、支援狀態，以及個別控制公開範圍的限制。

## 🔵 4.1 Canvas / Bases 的分享功能到底在哪裡設定

**一開始搞混的點**：以為 `docs/plugins/CanvasPage.md`、`docs/plugins/BasesPage.md` 是設定檔，其實那只是 Quartz 官方的**說明文件**，不是真的設定。

**釐清後的正確位置**：

- 網站端（要不要「渲染」canvas/bases 頁面）：`quartz.config.yaml` 裡 `canvas-page`、`bases-page` 插件的 `enabled` 開關
- Obsidian 端（要不要把 `.canvas`/`.base` 檔「發布」出去）：Quartz Syncer 自己的 Integrations 設定裡的 `useCanvas`/`useBases` 開關
- 這兩組開關**互相獨立**，兩邊都要開才會真的看到成果

---

## ✅ 4.2 `.base`/`.canvas` 要不要公開，能不能像筆記一樣用 frontmatter 個別標記

**排查結果**：不行。原始碼裡 `shouldPublish()` 對 `.canvas`/`.base` 檔只看 Quartz Syncer 全域的 `useCanvas`/`useBases` 開關（開了就全部視為候選），不像 markdown 筆記有 `publish: true` 這種逐篇標記的機制。

**目前的變通做法**：Quartz Syncer 的 **Publication Center** 每次發布前會列出候選清單（帶 checkbox），可以在那個當下手動勾選要不要公開特定的 `.canvas`/`.base`。缺點是**沒有持久化**，新增的檔案每次都要記得手動勾/不勾，沒有「預設隱藏」這種一勞永逸的設定。多一層保險可以靠 `quartz.config.yaml` 的 `ignorePatterns` 把不想公開的整個資料夾擋掉。
