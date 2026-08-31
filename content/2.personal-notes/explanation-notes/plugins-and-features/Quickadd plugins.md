---
publish: true
aliases:
  - Quickadd外掛說明
title: Quickadd外掛說明
created: 2026-08-30T17:29:36.971Z
modified: 2026-08-30T17:29:36.971Z
published: 2026-08-30T17:29:36.971Z
tags:
  - obsidian
category:
  - "[[Explanation notes]]"
  - Plugin and features
  - "[[Ideas and thoughts notes]]"
in:
  - 2.personal-notes
parent:
sibling:
child:
---

# 核心功能與用途

- capture
  - 我命名為靈感暫時紀錄
  - 在不離開現在筆記的情況下，快速新增一段內容到其他筆記中
    - 筆記可以是已經存在的筆記，也可以是新增一個筆記
  - 若寫筆記過程中有想到待解決或待思考的其他問題，可以用此功能寫到[[Temporary record of questions and thoughts|暫時紀錄的問題與想法]]
- capture: 待辦事項(to do) / 待辦事項(next)
  - 不用開啟看板，直接把待辦事項加到[[To do]]的to do或next清單，執行前先決定要放哪一區（對應兩個不同的quickadd指令）
- capture: 英文學習單字
  - 讀文章看到生字時，不用切換視窗找資料夾，直接建立（或選擇已存在的）英文學習筆記，把中文意思寫進metadata的Chinese translation欄位，並在目前筆記游標處插入該單字的連結

# 使用說明

## 靈感暫時紀錄

- 步驟
  - ctrl+p
  - 選擇quickadd:靈感暫時紀錄
  - 選擇讓你有靈感的筆記，或是創立一個新的筆記與名稱
  - 輸入想要記錄在上述所選筆記中的內容
  - 新增內容將會出現在該筆記的最下方
    - 輸入的內容可以包含雙引號連結、標號等

## 待辦事項

- 步驟
  - ctrl+p
  - 選擇quickadd:待辦事項(to do) 或 quickadd:待辦事項(next)，依想放的區域決定
  - 輸入待辦事項內容
  - 內容將會以任務（checkbox）格式加到[[To do]]對應清單（to do或next）最下方

## 英文學習單字

- 步驟
  - ctrl+p
  - 選擇quickadd:英文學習單字(中文翻譯)
  - 選擇該單字/片語已存在的筆記，或輸入新單字/片語建立新筆記（套用英文學習筆記模板）
    - 若是新建筆記，會先跳出選單問是「單字」還是「片語」，選完寫入metadata的category欄位
  - 跳出的輸入框子標題會顯示「Capture: 英文學習單字(中文翻譯) → ...」，輸入該單字/片語的中文翻譯
  - 內容會寫入該筆記metadata的Chinese translation欄位
