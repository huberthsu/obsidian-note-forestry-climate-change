---
publish: true
aliases:
  - Breadcrumbs外掛說明
title: Breadcrumbs外掛說明
created: 2026-08-01T16:48:06.861Z
modified: 2026-08-11T14:10:20.897Z
published: 2026-08-11T14:10:20.897Z
tags:
  - 關聯圖
  - obsidian
category:
  - "[[Explanation notes]]"
  - Plugin and features
in:
  - 個人note
parent:
  - "[[How to find links between notes]]"
sibling:
  - "[[Neighbourhood Graph plugins]]"
  - "[[Inline local graph plugins|inline local graph 外掛說明]]"
child:
---

# 核心功能與用途

## 建立層級結構

- parent: 上層筆記
- sibling: 同層筆記
- child: 下層筆記

## 層級關係視覺化

- breadcrumbs導航：
  - 在筆記頂部顯示當前筆記的路徑
  - 如：2.personal-notes> explanation-notes > plugins-and-features-breadcrumbs plugins
- 關係圖視圖：以樹狀或圖表方式呈現筆記間的層級關係

## 優點

- 協助思考關聯、發現連結缺口
  - 快速概覽上、下、同層級筆記，以及共用同個上層級筆記的筆記

* 強化筆記連結關聯: 知道該筆記與有關聯筆記之間的層級關係

# 可用code block叫出的特殊的圖

`breadcrumbs` code block 支援三種 type：`tree`、`mermaid`、`markmap`（心智圖）

## mermaid（關係圖）

```breadcrumbs
type: mermaid
fields: [parent, child, sibling]
depth: [0, 3]
mermaid-direction: TB
mermaid-arrow: true
show-attributes: [field]
```

- 能用來呈現筆記之間的網狀層級結構
- `show-attributes` 要填**陣列**，不是布林值！寫 `show-attributes: true` 會導致 Codeblock Error。正確寫法如 `show-attributes: [field]`，在連線上直接標示欄位名稱（如 parent/child/sibling），一眼看出關係類型，不用只靠線條猜方向
- `mermaid-direction` 控制圖表畫的方向：

| 值 | 全名 | 說明 |
|---|---|---|
| `TB`（或 `TD`） | Top to Bottom / Top Down | 由上往下畫（父在上，子在下） |
| `BT` | Bottom to Top | 由下往上畫 |
| `LR` | Left to Right | 由左往右畫（父在左，子在右） |
| `RL` | Right to Left | 由右往左畫 |

---

## markmap（心智圖）

```breadcrumbs
type: markmap
fields: [parent, child, sibling]
depth: [0, 3]
```

---

## tree（樹狀圖）

不指定 type 時預設就是樹狀圖以巢狀 markdown 清單呈現層級結構，類似內建的 Tree View。

這個code block的效果跟ctrl+p-open tree view效果差不多

```breadcrumbs
type: tree
fields: [child]
depth: [0, 3]
sort: basename asc
```

---

# 使用說明

- 定義層級關係
  - 在筆記 frontmatter/metadata 中分別使用 parent、sibling、child 欄位，來定義上、同、下級筆記

---

# 參考資料

- [官方說明](https://publish.obsidian.md/breadcrumbs-docs/Home)
- [朱騏中文簡介](https://medium.com/pm%E7%9A%84%E7%94%9F%E7%94%A2%E5%8A%9B%E5%B7%A5%E5%85%B7%E7%AE%B1/obsidian-%E4%BD%BF%E7%94%A8%E6%95%99%E5%AD%B8-%E6%8F%92%E4%BB%B6%E7%AF%87-03-%E5%A6%82%E4%BD%95%E8%AE%93-obsidian-%E8%87%AA%E5%8B%95%E6%8E%A8%E8%96%A6%E9%97%9C%E8%81%AF%E7%AD%86%E8%A8%98-4d9acb52d059)
