---
publish: true
aliases:
  - 工作流系統說明
title: 工作流系統說明
created: 2026-09-03T16:35:02.212Z
modified: 2026-09-04T14:04:42.152Z
published: 2026-09-04T14:04:42.152Z
tags:
  - 工作流
category:
  - Workflow and system
  - "[[Explanation notes]]"
in:
  - 2.personal-notes
parent:
sibling:
  - "[[vault架構與系統.canvas]]"
  - "[[實際工作系統.canvas]]"
  - "[[Obsidian wiki linking, knowledge organization, and data management|Obsidian雙向連結、知識整理與資料管理]]"
child:
  - "[[高普考準備工作流.canvas]]"
  - "[[Temporary record of questions and thoughts]]"
  - "[[Literature-notes-workflow|文獻筆記工作流]]"
  - "[[Task-management-workflow|任務管理工作流]]"
  - "[[英文學習工作流.canvas]]"
  - "[[Workspace description|工作區說明]]"
---

# Obsidian 工作流系統說明畫布

- 想了解所有工作流系統，可參考[[實際工作系統.canvas]]
  - 針對高普考:[[高普考準備工作流.canvas]]
  - 針對英文學習:[[英文學習工作流.canvas]]

---

## 工作區分配建議

- 可參考[[Workspace description|工作區說明]]

## 任務管理系統

1. 建立與追蹤主要任務
   - 規劃、追蹤、紀錄: 考古題參考答案、英文學習筆記、英文測驗練習、考古題練習、卡片盒筆記回顧
   - 參考[[Task-management-workflow|任務管理工作流]]與[[Task Management|任務管理]]
2. 非主要任務
   - 今日
     - 記錄在[[Task Management|任務管理的kanban中]]
   - 非今日
     - 有日期: 開啟calendar，左鍵點選該日期後選create
     - 無日期: 記錄在[[其他雜事kanban]]
   - 建立特定日期其他任務
     - calendar中左鍵點選特定日期後選create
   - 查看特定日期任務
     - 開啟calendar後直接點選該日期
   -

- 其他外掛工具
  1. Calendar bases
     - bases的月曆檢視。能將工作任務用拖曳的方式移動到任一日期
     - 應用可參考[[Exam notes|考古題筆記]]中的考古題複習月曆
  2. Kanban bases view
     - bases的看板檢視。能發揮kanban效果、可用屬性維護、可加入swimlane分區域
  3. Kanban(看板)-規劃與查看**目前與接下來**要完成的任務
     - 可建立檔案，建立後檔案位於根目錄，可自行決定放在哪個資料夾
     - 可只輸入文字不建立檔案
     - 流程
       - to do放優先待辦事項、next放其他待辦事項
       - 做完的任務直接delete卡片
       - 若to do任務皆已完成，或next的任務要提前處裡->將next卡片直接拖到to do
     - 應用可參考[[其他雜事kanban]]

---

## 📚 筆記類型與系統

### 1. 文獻筆記

- **使用時機**：
  - 摘要與整理各領域文獻的知識、概念、理論框架
  - 內容來源為「一份文件」，架構依據原文章節
  - 著重「原文說了什麼」
- 參考[[Literature-notes-workflow|文獻筆記工作流]]
- 管理工具：[[Literature notes|文獻筆記]]

* 核心概念：
  - 以**康乃爾+[[Information filtering criteria|資訊篩選標準]]** 為架構撰寫卡片
  - 以**卡片盒筆記法**整理與串聯筆記
  - claudian參考claude/skills資料夾底下的skills，按找我的原則與規範協作
    - 建立文獻筆記相關skills
      - [[1-foundation]]
      - [[2-setup]]
      - [[3-metadata]]
      - [[4-summary]]
      - [[5-organize]]
      - [[6-content]]
      - [[7-verify]]
    - 建立[[claude/skills/zettelkasten/SKILL.md|卡片盒筆記法skills]]

- 使用模板: [[Literature notes template|文獻筆記模板]]

---

### 2. 卡片盒筆記

- 使用時機:
  - 當我讀文獻，或從網路來源與其他來源，對某一個知識點有自己的想法
  - 單位為「一個主張/論點」，架構依據我的想法，可以引用多篇文獻佐證
  - 著重「我認為什麼、為什麼」
- 管理工具: [[Zettelkasten notes|卡片盒筆記]]
- 內容:
  - 核心內容
  - 與其他筆記的關聯
  - 筆記之間關連性與理由
    - parent理由
    - sibling理由
    - child理由
  - 來源文獻
  - 我的其他思考
  - 相關筆記bases
- 使用模板: [[Zettelkasten notes templates|卡片盒筆記模板]]

---

### 3. 靈感與思考筆記

- 使用時機：日常想法、觀察、個人洞見、待思考問題
- 特殊用途-便利貼
  - 可以使用[[Quickadd plugins]]，將突然想到的問題記錄到[[Temporary record of questions and thoughts|暫時紀錄的問題與想法]]
- 管理工具：[[Ideas and thoughts notes|靈感與思考筆記]]
- 使用模板: [[Inspiration notes template|靈感紀錄模板]]

---

### 4. 考古題筆記

- 使用時機: 準備考試
- 管理工具: [[Exam notes|考古題筆記]]
- 複習系統
  - **工具**：calendar bases
  - **目的**：定期複習考古題與相關筆記
  - **流程**：
    1. 開啟[[Exam notes#考古題複習月曆🗓️|考古題複習月曆]]中的考古題複習日曆，開啟今天需要複習的題目筆記
    2. 自己搜尋+ai協助寫下考古題參考答案，並附上參考資料與關聯筆記
    3. 確認與題目相關的概念與標籤
    4. 填寫metadata中的`date`欄位（作答日期）後在作答內容下方試答
    5. 由自己或ai協助評分，並分析扣分原因
    6. 依照熟悉度評級決定下次複習時間，填寫於metadata中的`下次複習時間`欄位
    7. `下次複習時間`會反映在考古題複習日曆上，成為下次該複習的日期；**注意**：考古題筆記的`date`欄位語意是「作答日期」，跟其他筆記類型的`date`（何時完成/記錄）一致，但不再等同「下次該複習的日期」，所以不會出現在每日完成事項筆記的dataview清單裡，只能透過考古題複習日曆查看待複習項目
- 使用模板: [[Exam notes template|考古題筆記模板]]

---

### 5.英文學習筆記

- 使用時機:  學習英文單字、片語
- 管理工具: [[English learning notes|英文學習筆記]]
- 流程:
  - 學習單字/片語
    - Obsidian Web Clipper擷取網路英文文章或影片到3.外部資料/網路來源 資料夾中
    - 建立[[English study notes template|英文學習筆記模板]]紀錄想學的單字或片語
    - 使用[[Timestamp note plugins]]使影片於右側邊欄撥放
    - 建立timestamp配合紀錄影片重點
    - 使用[[english-vocab-link-compare]] skill-比較單字/片語之間的關聯，紀錄在[[1.English words and phrases associations|英文單字片語關聯整理]]
  - 練習
    - 使用[[english-vocab-quiz]] skill-練習英翻中、中翻英、應用、選擇題、句子翻譯，將練習結果紀錄在[[Vocab Quiz Record|英文測驗紀錄]]
- 使用模板: [[English study notes template|英文學習筆記模板]]

---

## 視覺化畫布

- 視覺化複雜概念
- 展示筆記間的關連與邏輯
- 綜觀全局

---
