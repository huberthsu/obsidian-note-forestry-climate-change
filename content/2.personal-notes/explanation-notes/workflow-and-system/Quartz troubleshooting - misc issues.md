---
publish: true
aliases:
  - Quartz 問題排查－其他單獨問題
title: Quartz 問題排查－其他單獨問題
created: 2026-09-04T10:21:54.128Z
modified: 2026-09-04T10:21:54.151Z
published: 2026-09-04T10:21:54.151Z
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

# 其他單獨問題

搭配母筆記 [[Quartz website troubleshooting report]] 一起看。這篇收錄跟前面各主題分類都不太搭、只出現過一次的單獨問題。

## 🔵 11.1 Obsidian Git 跳出 merge conflict（`.obsidian/workspace.json`）

跟 Quartz 網站無關，是另一個外掛「Obsidian Git」（把整個 vault 備份到另一個獨立 repo）跳出來的。衝突的檔案只是 Obsidian 介面的版面配置狀態，不是筆記內容，直接保留其中一個版本、commit、push 就解決了，沒有資料損失風險。
