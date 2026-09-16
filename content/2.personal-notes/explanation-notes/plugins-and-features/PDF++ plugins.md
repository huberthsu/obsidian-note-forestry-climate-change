---
publish: true
aliases:
  - PDF++外掛說明
  - PDF++
title: PDF++外掛說明
created: 2026-09-16T17:34:32.504Z
modified: 2026-09-16T17:34:50.750Z
published: 2026-09-16T17:34:50.750Z
tags:
  - obsidian
  - 文獻筆記
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

取代 Obsidian 內建的 PDF 檢視器，讓 PDF 內容可以被精確定位、複製、反向連結——包括頁面連結、選取範圍連結、矩形框選嵌入圖片/表格、註解、大綱等功能。

目前在文獻筆記工作流中已經在用的部分（見 `literature-note-content` skill）：

- 每段引用結尾的頁碼連結：`[[檔案.pdf#page=N|頁碼：M]]`
- 用矩形框選工具框選原文的表格/圖片範圍，產生嵌入連結取代「表格待嵌入」佔位標記

---

# 目前的設定狀態

複製格式選單（`copy-format-menu`）已配置 5 種格式：

| 格式名稱 | 模板 |
|---|---|
| Quote | `> ({{linkWithDisplay}})`<br>`> {{text}}` |
| Link | `{{linkWithDisplay}}` |
| Embed | `!{{link}}` |
| Callout | `> [!{{calloutType}}\|{{color}}] {{linkWithDisplay}}`<br>`> {{text}}` |
| Quote in callout | 同 Callout，但引文再往內縮一層 |

顯示文字格式選單（`display-text-format-menu`）已配置 5 種：

| 格式名稱 | 顯示內容 |
|---|---|
| Title & page | 檔名, p.頁碼 |
| Page | 只有 p.頁碼 |
| Text | 選取的原文 |
| Emoji | 📖 |
| None | 無文字 |

自動化模式（auto-copy / auto-paste / auto-focus）**目前都是關閉狀態**，尚未使用。

---

# 功能說明（按用途分類）

## 一、選取文字 → 複製成引用格式

**指令**：`PDF++: Copy link to selection or annotation`、`PDF++: Show copy format menu`、`PDF++: Show display text format menu`、`PDF++: Show context menu at selection`

**用法**：在 PDF 裡用滑鼠選取一段文字，會跳出工具列（或用 ctrl+p 執行上述指令），可以選擇要用哪一種格式複製（見上方「複製格式選單」表格）：

- 想要一段引文＋來源連結，選 **Quote**
- 只要連結、不要引文，選 **Link**
- 想要直接把該段內容嵌入顯示（不是只留連結），選 **Embed**
- 想要彩色框起來的引用（對應你已經寫好的 callout 模板），選 **Callout** 或 **Quote in callout**

連結要顯示什麼文字（檔名+頁碼／只有頁碼／原文／emoji／無）另外用「顯示文字格式選單」選。

## 二、矩形框選 → 嵌入圖片/表格

**指令**：`PDF++: Start rectangular selection`

這是目前 skill 流程裡唯一寫進去的功能：用矩形工具框選圖表範圍，貼上產生的嵌入連結取代「表格待嵌入」佔位標記。

這個功能預設不會產生獨立圖片檔。框選後貼上的連結長這樣：

```
![[檔名.pdf#page=8&rect=40,72,298,434|顯示文字]]
```

`#page=N&rect=...` 是指向 PDF 該頁某個座標範圍的連結，Obsidian 每次開筆記時**即時從 PDF 裁切渲染**出那個區域顯示，並不會另外存成 png/webp 檔案。所以：

- 在檔案總管/vault 目錄裡找不到這張「圖片」是正常的，它本來就沒有實體檔案
- 只要來源 PDF 檔案還在原路徑，嵌入畫面就會正常顯示；PDF 若被搬移或改名，這種嵌入會失效
- 跟一般「貼上剪貼簿圖片」（例如 `![[Pasted image 20260826234024.png]]`）不同，那種才是真的存成獨立圖片檔，存檔位置依 Obsidian「設定 → 檔案與連結 → 新附件的預設位置」決定（用 `obsidian eval code="app.vault.getConfig('attachmentFolderPath')"` 可即時查詢目前生效值，不一定跟 git 裡的 `app.json` 快照一致）

## 三、註解與批次擷取

**指令**：`PDF++: Enable/Disable PDF edit`（需先開啟編輯模式才能加註解/高亮）、`PDF++: Extract & copy annotations in this PDF`

**用法**：開啟編輯模式後，選取文字可以直接在 PDF 上畫高亮／加註解（不只是複製出去，而是真的畫在 PDF 上，之後回去看還找得到）。讀完整份 PDF、標記完所有想要的段落後，執行「Extract & copy annotations」可以**一次把整份 PDF 所有註解/高亮，依設定格式批次轉成連結**，不用一段一段選取複製。

**對工作流的意義**：如果習慣先通篇讀過 PDF 標記重點（呼應 skill 裡「開始寫內容區之前，先通篇讀過原文」的步驟），這個功能可以把「標記」跟「事後整理引用」拆成兩階段——讀的時候只管畫記號，最後一次批次擷取。

## 四、大綱（目錄結構）

**指令**：`PDF++: Show outline`、`PDF++: Copy PDF outline as markdown list`、`PDF++: Copy PDF outline as markdown headings`、`PDF++: Add to outline (bookmark)`

**用法**：如果 PDF 本身內建書籤/目錄，可以直接複製成 markdown 標題或清單；沒有目錄的 PDF 也可以手動加書籤。

**對工作流的意義**：或許可以用來加速 skill 裡「段落清單先行」的步驟——先用大綱抓出章節骨架，再往下逐段細分。

## 五、自動化模式（目前未啟用）

**指令**：`PDF++: Toggle auto-focus`、`PDF++: Toggle auto-paste`、`PDF++: Toggle auto-copy`

- **auto-copy**：開啟後，只要在 PDF 裡選取文字/畫高亮，就自動複製到剪貼簿（依目前選定的複製格式），不用手動觸發複製指令
- **auto-paste**：複製的內容自動貼到指定的目標筆記，省去手動切換視窗貼上的動作
- **auto-focus**：從筆記點連結跳到 PDF 時，自動捲動並聚焦到該位置

三個目前都是關閉的，如果想嘗試「邊讀邊記」的節奏，可以先試開 auto-copy。

## 六、其他導覽/檔案管理功能（較不涉及筆記流程）

- 導覽：縮圖側欄、跳頁、縮放、依主題調整顏色（`Show thumbnail`、`Go to page`、`Fit width/height`、`Zoom in/out`、`Adapt to theme`）
- PDF 檔案本身的編輯：新增/刪除頁面、抽取單頁另存新檔、分割 PDF、編輯頁碼標籤、匯入外部 PDF（`Add page`、`Delete this page`、`Extract this page`、`Divide`、`Edit page labels`、`Import`…）——只有需要重組或裁切 PDF 檔案本身（不是筆記內容）才會用到

---

# 參考資源

- 本機外掛設定檔：`.obsidian/plugins/pdf-plus/data.json`
- 查看完整指令清單（透過 obsidian-cli）：
  ```
  obsidian eval code="Object.keys(app.commands.commands).filter(k=>k.startsWith('pdf-plus')).join('\n')"
  ```
