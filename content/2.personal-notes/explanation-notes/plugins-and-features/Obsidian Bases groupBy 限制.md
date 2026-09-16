---
publish: true
aliases:
  - Obsidian Bases groupBy 限制
title: Obsidian Bases groupBy 限制
created: 2026-09-16T07:00:50.889Z
modified: 2026-09-16T07:00:50.890Z
published: 2026-09-16T07:00:50.890Z
tags:
  - obsidian
  - bases
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

- Bases 的 `groupBy` 可以依某個屬性的值，把符合篩選條件的筆記分組顯示（例如依 `字根` 分組，把共用同一字根的單字筆記歸在一起）

# 使用說明

- `groupBy` 是**依屬性值完全相等**分組，不是子字串或語意比對
  - 字串型屬性：兩篇筆記的欄位文字要逐字相同，才會被分到同一組
  - list（清單）型屬性：目前 Bases 會把**整個清單當成一個組合鍵**來比對，不會把清單拆成個別項目、讓一則筆記同時掛在多個群組下
    - 例如 `字根標籤: [med-, ocr-]` 只會自成一組，不會讓這篇筆記同時出現在「med-」群組和「ocr-」群組
- 官方文件（help.obsidian.md/bases/views）目前也沒有明確說明 list 屬性的分組行為，只提到「目前只能依單一屬性分組」
- Obsidian 論壇已有對應的 feature request，訴求就是「多值屬性的筆記可以像 Notion 一樣同時落入多個群組」，截至目前尚未實作
- 實務影響：像單字筆記若有多個字根（例如 mediocre 同時有 med- 和 -ocr-），無法單靠 `字根` 欄位 + groupBy 讓它跟其他只用到其中一個字根的筆記自動歸類在同一群組
  - 曾測試過的替代方案：改用 filter（例如 `字根標籤.contains("med-")`）針對單一字根建立專屬 view，可以正確找出所有共用該字根的筆記，但需要手動維護每個想查的字根對應一個 view，不是自動分組
  - 目前決定：維持現狀，`字根` 欄位保留純文字說明，不特別為了分組拆成 list 欄位；等 Obsidian 之後補上多值分組功能再考慮

# 參考資料

- https://help.obsidian.md/bases/views
- https://forum.obsidian.md/t/bases-group-by-sorting-improvement-make-a-note-fall-into-multiple-groups/107097
- https://forum.obsidian.md/t/bases-grouping-by-property-of-list-type/106461
- https://forum.obsidian.md/t/bases-multi-level-grouping/108504
