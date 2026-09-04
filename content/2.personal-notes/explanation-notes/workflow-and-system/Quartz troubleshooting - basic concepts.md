---
publish: true
aliases:
  - Quartz 問題排查－基本概念釐清
title: Quartz 問題排查－基本概念釐清
created: 2026-09-04T10:21:53.300Z
modified: 2026-09-04T10:21:53.322Z
published: 2026-09-04T10:21:53.322Z
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

# 基本概念釐清（純知識，不算 bug）

搭配母筆記 [[Quartz website troubleshooting report]] 一起看。

## 🔵 1.1 Canvas / Bases 的分享功能到底在哪裡設定

**一開始搞混的點**：以為 `docs/plugins/CanvasPage.md`、`docs/plugins/BasesPage.md` 是設定檔，其實那只是 Quartz 官方的**說明文件**，不是真的設定。

**釐清後的正確位置**：

- 網站端（要不要「渲染」canvas/bases 頁面）：`quartz.config.yaml` 裡 `canvas-page`、`bases-page` 插件的 `enabled` 開關
- Obsidian 端（要不要把 `.canvas`/`.base` 檔「發布」出去）：Quartz Syncer 自己的 Integrations 設定裡的 `useCanvas`/`useBases` 開關
- 這兩組開關**互相獨立**，兩邊都要開才會真的看到成果

---

## 🔵 1.2 需不需要在 Obsidian 裡手動建立 `content/` 資料夾

**結論**：不需要。`content/` 只存在於 Quartz 網站那個 git repo 裡，是**發布後的目的地**，Quartz Syncer 按下發布會自動把檔案寫進去。Obsidian vault 裡的筆記留在原本的位置就好，不用另外搬進一個叫 `content` 的資料夾。

---

## 🔵 1.3 `ignorePatterns: [private, ...]` 是什麼

`quartz.config.yaml` 裡的欄位，build 時完全跳過符合的路徑，不會出現在最終網站。

> [!warning] 語法細節
> 用的是 fast-glob 語法，不是 bash glob。寫 `private`（沒有 `**/` 前綴）只會擋**最外層**同名資料夾，不是任何深度都擋。要「不管放在哪一層都擋」要寫成 `**/private`。
> 另外這只擋「最終網站看不看得到」，**不會**讓檔案從 git repo 原始碼裡消失，repo 若是 public，內容還是能被翻到，真的要保密要另外處理 `.gitignore`。
