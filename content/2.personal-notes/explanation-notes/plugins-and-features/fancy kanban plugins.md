---
publish: true
aliases:
  - fancy kanban
title: fancy kanban外掛
created: 2026-09-04T05:45:16.933Z
modified: 2026-09-04T05:47:30.042Z
published: 2026-09-04T05:47:30.042Z
tags:
  - 工作流
category:
  - "[[Explanation notes]]"
  - Plugin and features
in:
  - 2.personal-notes
parent:
sibling:
child:
---

# 核心功能與用途

- 將kanban插入在筆記內

## 語法備忘

`fancy-kanban` code block 的設定曾經因為語法寫錯而報錯（`Columns field "status" is not defined in fields`），排查後在外掛本機的 `main.js` 原始碼裡確認：

- 看板分欄依據的欄位名稱**預設是 `status`**，除非用 `columns: <欄位名>` 明確指定成別的名稱。
- 目前存檔格式版本是 `version: 3`（不是網路文件範例常見的 `version: 2`）。
- `lanes:` 是另外的「второй軸（swimlane）」設定，不需要跟 `columns` 用同一個欄位。
  若之後看板又跳出類似錯誤，可以直接查看 `.obsidian/plugins/fancy-kanban/main.js` 裡的 `parseConfig` 函式確認正確語法，比查網路文件準確。

# 使用說明

# 參考資料
