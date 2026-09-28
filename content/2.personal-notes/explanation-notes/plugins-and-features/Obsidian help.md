---
publish: true
aliases:
  - Obsidian help
title: Obsidian help
created: 2026-09-28T09:08:32.324Z
modified: 2026-09-28T09:17:05.782Z
published: 2026-09-28T09:17:05.782Z
tags:
  - obsidian
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

- 關於obsidian大大小小基本功能

# 各種highlight

> [!danger] 危險
> 紅色、閃電圖示

> [!Failure]
> 紅色、叉叉圖示

> [!warning] 警告
> 橘色、驚嘆號圖示

> [!question]
> 橘色、問號圖示

> [!success]
> 綠色、打勾圖示

> [!Abstract]
> 藍綠色、紙張圖示

> [!tip] 提示
> 藍綠色、燈泡圖示

> [!note]
> 藍色、鉛筆圖式

> [!info] 資訊
> 藍色、i 圖示

> [!Example]
> 紫色、清單圖示

# 表格內列點

- Markdown 表格的儲存格只能有一行，`-` 清單語法在儲存格內不會生效
- 做法：用 `<br>` 換行，再手動打 `•` 當項目符號（不需外掛）
  - `•` 可直接從這裡複製
  - 要編號就改用 `1.`、`2.`
- 範例

```markdown
| 項目 | 說明 |
| --- | --- |
| 永久性 | • 確保成果長期維持<br>• 常以反轉緩衝機制保障 |
```

| 項目 | 說明 |
| --- | --- |
| 永久性 | • 確保成果長期維持<br>• 常以反轉緩衝機制保障 |

- 注意事項
  - 表格內的 wikilink 若要顯示別名，`|` 前要加反斜線，例如 `[[Definition of permanence\|永久性]]`，否則會把表格切開

# 參考資料

https://obsidian.md/zh-TW/help/syntax
