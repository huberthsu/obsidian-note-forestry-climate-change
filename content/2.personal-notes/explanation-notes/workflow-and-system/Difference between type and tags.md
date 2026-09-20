---
publish: true
aliases:
  - type 欄位與其他筆記 tags 欄位的差異
title: type 欄位與其他筆記 tags 欄位的差異
created: 2026-09-19T15:03:38.170Z
modified: 2026-09-19T15:07:32.008Z
published: 2026-09-19T15:07:32.008Z
tags:
  - 工作流
  - obsidian
  - 標籤
  - bases
category:
  - "[[Explanation notes]]"
  - Workflow and system
in:
  - 2.personal-notes
parent:
sibling:
  - "[[Organizing tags helps with deeper understanding, searching and extraction, and discovering connections between notes.|整理標籤有助於深入理解、被搜尋與提取、發現筆記之間的連結]]"
  - "[[Obsidian Bases groupBy 限制]]"
child:
---

# 說明

- `category`：這則筆記**是哪一種筆記**
- `type`：這則筆記**是什麼類型**
- `tags`：這則筆記**關於什麼概念**

## 差異比較

| 面向           | `category`                                                                             | `type`                             | `tags`                                                  |
| ------------ | -------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------- |
| 回答的問題        | 它屬於哪一種筆記                                                                               | 它屬於哪一種類型                           | 它跟哪些概念有關                                                |
| 記錄的內容        | **筆記種類**（例：`[[Books]]`、`[[Literature notes]]`、`[[Zettelkasten notes]]`），有時再加細分（例：`單字`） | **體裁／種類**（例：冒險小說）                  | 筆記涉及的**主題、概念、關鍵字**（例：邊緣效應、碳抵換、工作流）                      |
| 值的形式         | 多為 wikilink，指向 `1.categories` 的分類頁                                                     | 純文字                                | 純文字關鍵字                                                  |
| 每篇筆記的數量      | 1 個主分類，可再附加細分值                                                                         | 一個值，代表「屬於哪一類」                      | 可以有很多個，隨理解加深而細化、合併                                      |
| 用途           | Bases 的**篩選條件**，決定哪些筆記進這個視圖（例：`category.contains(link("Books"))`）                      | 可給 `bases` 用 `groupBy: type` 依類型分組 | 跨筆記產生與發現關聯：shared tags、關聯圖、`file.tags.contains(...)` 篩選 |
| Obsidian 的角色 | 自訂屬性                                                                                   | 自訂屬性，Obsidian 不會當成標籤處理             | 內建屬性，會進標籤面板、可被 `#tag` 搜尋、Bases 中可用 `file.tags`          |
| 涵蓋範圍         | 多數筆記模板都有                                                                               | 目前只有《Robinson Crusoe》使用            | 全 vault 通用（各筆記模板皆預留）                                    |
| 值的性質         | 固定的分類清單，變動少                                                                            | 是「分類」，同類的書要**完全相同的字串**才會被分在一組      | 是「關鍵字」，允許相近概念並存（但相近時建議合併）                               |

## 三者的層次關係

- `category`：先決定「這是哪一種筆記」，Bases 用它決定哪些筆記進這個視圖
- `type`：在 `category` 已經確定的前提下，細分**筆記種類**
- `tags`：不管哪一種 `category`，都用來標示主題關鍵字
