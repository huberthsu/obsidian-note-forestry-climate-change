---
publish: true
aliases:
  - Obsidian雙向連結、知識整理與資料管理
title: Obsidian雙向連結、知識整理與資料管理
created: 2026-08-11T06:58:31.404Z
modified: 2026-08-24T14:02:10.060Z
published: 2026-08-24T14:02:10.060Z
tags:
  - 工作流
  - obsidian
category:
  - Workflow and system
  - "[[Explanation notes]]"
in:
  - 2.personal-notes
parent:
sibling:
  - "[[Workflow-system-overview|工作流系統說明]]"
child:
  - "[[How to find links between notes|如何發現筆記之間的連結]]"
  - "[[Organizing tags helps with deeper understanding, searching and extraction, and discovering connections between notes.|整理標籤有助於深入理解、被搜尋與提取、發現筆記之間的連結]]"
  - "[[The aliases function can be used with files that are not linked to but mention this note.|aliases功能搭配未連結但提及本筆記的檔案]]"
---

# 資料管理方法與架構

- 可參考[[vault架構與系統.canvas]]
- 管理流程-**以metadata屬性區域作為主要管理工具**
  1. 以1.類別/中，直接創建**資料夾類型筆記**作為檔案搜尋入口
  2. 在2.個人note/中，依照筆記類型，放到相應的子資料夾(文獻筆記、卡片盒筆記、考古題、專案、說明、靈感與思考)。
  3. 1.類別/該筆記內，放置一個bases，篩選出所有位於2.個人note/子資料夾中的筆記
  4. 創立筆記時，於Metadata的類別欄位選擇[[Literature notes|文獻筆記]]、[[Exam notes|考古題筆記]]、[[Ideas and thoughts notes|靈感與思考筆記]]、[[Projects notes|專案筆記]]、[[Explanation notes|說明]]
  5. 創立筆記後，於tags欄位選擇或創立與該筆記相關的標籤，之後由bases的過濾功能選擇所有與該tags相關的筆記
- 參考資料
  - [Obsidian CEO vault介紹影片](https://www.youtube.com/watch?v=3U149EP46Vs\&t=151s)

# 知識管理心得與想法

適合以metadata屬性區域管理資料的對象包括但不限於:
1.想找某個特定的文獻或文獻筆記，但是常常忘記放在哪個資料夾。
2.一篇文獻筆記的核心概念橫跨多個領域，猶豫要放在哪個資料夾。

## 核心概念-**使用tags或雙向連結管理筆記**

- 兩者皆可記錄在屬性區域欄位或內容區域。
- tags-搜尋
  - 記錄該筆記的領域、知識概念、狀態、屬性等等。
  - ==允許筆記同時具有多種屬性，且以每種tags搜尋，都能搜尋到該筆記。適合用來搜尋特定類型的筆記==
  - 相關外掛: [[Tag wrangler plugins|Tag wrangler外掛說明]]
- 雙向連結-連結
  - a筆記能透過\[\[]]建立與b筆記的單向連結，而b筆記也同樣反向連結(backlinks)跳轉回a筆記。
  - ==建立筆記之間的緊密連結，並搭配graph view將連結視覺化==
  - 相關外掛: [[Breadcrumbs plugins|Breadcrumbs外掛說明]]、[[Inline local graph plugins|Inline local graph 外掛說明]]、[[Neighbourhood Graph plugins|Neighbourhood Graph外掛說明]]

## 優點

- 讓筆記散落於各處，再透過metadata來組織管理，因此所需建立的資料夾數量非常少，且筆記之間可建立緊密連結。
- 能放心將所有筆記丟到同個資料夾中，因為obsidian可以一鍵創立一個包含了所有筆記的資料庫。所以只要建立一個筆記來專門放置這個資料庫([[Bases overview|Bases 總覽]])。接著利用資料庫中的篩選功能，從任一欄位中選擇任意關鍵字，這時就會出現包含了這個或這些關鍵字的所有筆記。
- ==具體應用參考1.categories的6則筆記==

## 協助思考筆記間關聯的外掛工具

- 簡介參考[[How to find links between notes|如何發現筆記之間的連結]]

---
