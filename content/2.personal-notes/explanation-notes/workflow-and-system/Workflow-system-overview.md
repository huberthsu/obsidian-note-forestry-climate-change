---
publish: true
aliases:
  - 工作流系統說明
title: 工作流系統說明
created: 2026-08-11T02:57:52.278Z
modified: 2026-08-11T07:41:24.482Z
published: 2026-08-11T07:41:24.482Z
tags:
  - 工作流
category:
  - Workflow and system
  - "[[Explanation notes]]"
in:
  - 個人note
parent:
sibling:
  - "[[vault架構與系統.canvas]]"
  - "[[工作流系統應用.canvas]]"
child:
  - "[[高普考準備工作流.canvas]]"
  - "[[本月目標與預計執行事項]]"
  - "[[To do]]"
  - "[[工作區說明]]"
  - "[[暫時紀錄的問題與想法]]"
  - "[[literature-notes-workflow|文獻筆記工作流]]"
  - "[[目標與任務管理系統.canvas]]"
  - "[[英文學習工作流.canvas]]"
---

# Obsidian 工作流系統說明畫布

- 想了解所有工作流系統，可參考[[工作流系統應用.canvas]]
  - 針對目標與任務管理系統: [[目標與任務管理系統.canvas]]
  - 針對高普考:[[高普考準備工作流.canvas]]
  - 針對英文學習:[[英文學習工作流.canvas]]

---

## 工作區分配建議

- 可參考[[工作區說明]]

## 任務管理系統

1. 平行互見表-設定各專案每月目標，並追蹤每周進度
   - 與[[本月目標與預計執行事項]]規劃，並於[[本月實際完成事項]]中填寫進度
2. Calendar-規劃與查看**特定日期**的任務
   - 可建立檔案，會貯存在6.任務管理-每日任務與複習系統中
   - 流程
     - 已存在的筆記
       - metadata中新增==date欄位==(非日期欄位)後填選日期
     - 建立新的筆記
       - calendar中左鍵點選特定日期後選create
     - 查看今日任務
       - 左邊工具欄選開啟今天的每日筆記
       - 裡面的dataview會顯示所有metadata中的date是今日的筆記
3. Calendar bases
   - 可參考[[Exam notes|考古題筆記]]中的考古題複習日曆，能將工作任務用拖移的方式移動到任一日期
4. Kanban(看板)-規劃與查看**目前與接下來**要完成的任務
   - 參考[[To do]]
   - 可建立檔案，建立後檔案位於根目錄，可自行決定放在哪個資料夾
   - 可只輸入文字不建立檔案
   - 流程
     - to do放優先待辦事項、next放其他待辦事項
     - 做完的任務直接delete卡片
     - 若to do任務皆已完成，或next的任務要提前處裡->將next卡片直接拖到to do

---

## 📚 筆記類型與系統

### 1. 文獻筆記1

- **使用時機**：
  - 摘要與整理各領域文獻的知識、概念、理論框架
  - 內容來源為「一份文件」，架構依據原文章節
  - 著重「原文說了什麼」
- \*\*參考[[literature-notes-workflow|文獻筆記工作流]]
- **管理工具**：[[Literature notes|文獻筆記]]

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
  - 可以使用[[quickadd外掛說明]]，將突然想到的問題記錄到[[暫時紀錄的問題與想法]]
- **管理工具**：[[Ideas and thoughts notes|靈感與思考筆記]]
- 使用模板: [[Inspiration notes template|靈感紀錄模板]]

---

### 4. 考古題筆記

- 使用時機: 準備考試
- 管理工具: [[Exam notes|考古題筆記]]
- 複習系統
  - **工具**：calendar bases
  - **目的**：定期複習考古題與相關筆記
  - **流程**：
    1. 開啟任務管理/每日任務與複習系統資料夾、calendar提供的日曆、[[Exam notes|考古題筆記]]中的考古題複習日曆，開啟今天需要複習的題目筆記
    2. 自己搜尋+ai協助寫下考古題參考答案，並附上參考資料與關聯筆記
    3. 確認與題目相關的概念與標籤
    4. 填寫試答日期後在作答內容下方試答
    5. 由自己或ai協助評分，並分析扣分原因
    6. 依照熟悉度評級決定下次複習時間
    7. 將下次複習匙間填寫於metadata中的date欄位，點擊左鍵後，即可於任務管理/每日任務與複習系統 資料夾中，創建該日期的筆記，並看到該考古題位於該日任務中
- 使用模板: [[Exam notes template|考古題筆記模板]]

---

### 5.英文學習筆記

- 使用時機:  學習英文單字、片語
- 管理工具: [[English learning notes|英文學習筆記]]
- 流程:
  - Obsidian Web Clipper擷取網路英文文章或影片到3.外部資料/網路來源 資料夾中
  - 建立[[English study notes template|英文學習筆記模板]]紀錄想學的單字或片語
  - 使用[[Timestamp note外掛說明]]使影片於右側邊欄撥放
  - 建立timestamp配合紀錄影片重點
  - 使用mouse tooltup translator即時翻譯
- 使用模板: [[English study notes template|英文學習筆記模板]]

---

### 建立筆記之間關聯

- 參考[[How to find links between notes|如何發現筆記之間的連結]]
- **工具**：
  - [[breadcrumbs外掛說明]]
  - [[inline local graph 外掛說明]]
  - [[Neighbourhood Graph外掛說明]]

---

## 視覺化畫布

- 視覺化複雜概念
- 展示筆記間的關連與邏輯
- 綜觀全局

---
