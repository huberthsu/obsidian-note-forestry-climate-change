---
publish: true
aliases:
  - Quartz 問題排查－Frontmatter 發布配置
title: Quartz 問題排查－Frontmatter 發布配置
created: 2026-09-04T10:21:53.689Z
modified: 2026-09-04T10:21:53.709Z
published: 2026-09-04T10:21:53.709Z
tags:
  - 數位花園
  - 網站
  - ai-agent
category:
  - "[[Explanation notes]]"
  - Workflow and system
parent:
  - "[[Quartz website troubleshooting report]]"
sibling:
child:
"---\n# Frontmatter 發布配置\n\n搭配母筆記 [[Quartz website troubleshooting report]] 一起看。這篇記錄自訂 frontmatter 屬性在發布時的亂碼問題、以及發布設定的配置方式。\n\n## ✅ 5.1 筆記內文出現一堆亂碼 frontmatter，以及最終解法——把 breadcrumbs 欄位搬進 frontmatter\n\n**現象（第一個問題）**：發布之後，repo 裡的筆記 frontmatter 多出一堆用 `\\t`、`\\n`、`*` 混雜組成的怪異 key，跟真正的屬性混在一起。\n\n**根本原因**：Quartz Syncer 的 **Dataview 整合功能**（`useDataview` 開關）在編譯時，會用正則表達式**貪婪、跨行**地掃描整篇筆記內文找 `key": value` 格式（Dataview inline field 語法），比對到的內容不管是不是真的要當屬性用，一律硬塞進 frontmatter。我的筆記裡「卡片盒筆記」段落用文字**示範** `parent::`/`sibling::`/`child::` 這種格式長怎樣（不是真的要設定），加上筆記結尾真正要給 breadcrumbs 外掛用的 `sibling::`/`child::`，全部被貪婪比對混在一起、跨行吃進奇怪的 key 裡。
"\n**第二版解決方法（治本方案）**：與其單純關掉 `useDataview`，查證 Breadcrumbs 官方文件確認**兩種寫法效果完全一樣**：內文 inline field（`sibling": "[[A]], [[B]]`）跟 frontmatter 屬性（YAML 列表格式）都讀得懂，不需要額外切換設定去指定來源。於是把 `sibling::`/`child::`（及 `parent::`）從內文 inline field，改寫成 frontmatter 的 YAML 列表屬性："
---

# Frontmatter 發布配置

搭配母筆記 [[Quartz website troubleshooting report]] 一起看。這篇記錄自訂 frontmatter 屬性在發布時的亂碼問題、以及發布設定的配置方式。

## ✅ 5.1 筆記內文出現一堆亂碼 frontmatter，以及最終解法——把 breadcrumbs 欄位搬進 frontmatter

**現象（第一個問題）**：發布之後，repo 裡的筆記 frontmatter 多出一堆用 `\t`、`\n`、`*` 混雜組成的怪異 key，跟真正的屬性混在一起。

**根本原因**：Quartz Syncer 的 **Dataview 整合功能**（`useDataview` 開關）在編譯時，會用正則表達式**貪婪、跨行**地掃描整篇筆記內文找 `key:: value` 格式（Dataview inline field 語法），比對到的內容不管是不是真的要當屬性用，一律硬塞進 frontmatter。我的筆記裡「卡片盒筆記」段落用文字**示範** `parent::`/`sibling::`/`child::` 這種格式長怎樣（不是真的要設定），加上筆記結尾真正要給 breadcrumbs 外掛用的 `sibling::`/`child::`，全部被貪婪比對混在一起、跨行吃進奇怪的 key 裡。

原始碼 `src/utils/regexes.ts` 裡掃描規則是寫死的：

```js
export const DATAVIEW_FIELD_REGEX = /^([^:]+)::\s(.*?)$/gm;
```

`[^:]+`（非冒號字元）這個字元類別**連換行符號都算在內**，所以才會一路吃過好幾行文字。這是套件本身的行為，沒有白名單/範圍限制可以調，`useDataview` 只有整體開/關兩種選擇。

**排查過程**：先確認問題不是出在 Obsidian 原始檔案本身（原始檔案 frontmatter 是乾淨的），才追到是 Quartz Syncer 發布時動態產生的。

**第一版解決方法（權宜作法）**：把 Quartz Syncer 的 `useDataview` 關閉，重新發布後亂碼就消失了。筆記內文原本給 breadcrumbs 用的 `sibling::`/`child::` 完全不用改，繼續留著正常運作，只是不會再被誤判塞進 frontmatter。缺點是等於**整個放棄** Dataview 整合功能，不是真正解決衝突，只是繞開。

**第二版解決方法（治本方案）**：與其單純關掉 `useDataview`，查證 Breadcrumbs 官方文件確認**兩種寫法效果完全一樣**：內文 inline field（`sibling:: [[A]], [[B]]`）跟 frontmatter 屬性（YAML 列表格式）都讀得懂，不需要額外切換設定去指定來源。於是把 `sibling::`/`child::`（及 `parent::`）從內文 inline field，改寫成 frontmatter 的 YAML 列表屬性：

```yaml
---
parent:
sibling:
  - "[[vault架構與系統.canvas]]"
  - "[[工作流系統應用.canvas]]"
child:
  - "[[高普考準備工作流.canvas]]"
  - "[[本月目標與預計執行事項]]"
  - ...
---
```

因為 Quartz Syncer 那個貪婪比對只會去掃**內文純文字**，完全不會動到 YAML frontmatter 區塊；而這些欄位變成真正的 frontmatter 之後，本來就會靠已經開啟的 `includeAllFrontmatter` 正常發布出去，不需要 `useDataview` 幫忙轉換。

**已驗證結果**：在「工作流系統說明」這篇實際改完、`useDataview` 重新打開、重新發布後：

- frontmatter 完全乾淨，`parent`/`sibling`/`child` 都是正常的 YAML 列表，沒有任何亂碼 key
- 內文搜尋 `::` 完全沒有殘留（連「卡片盒筆記」段落原本示範用的 `parent::` 文字說明也一併順手清掉了）
- 實際建置測試，屬性面板正確顯示全部 7 個欄位（`aliases`/`tags`/`類別`/`in`/`parent`/`sibling`/`child`），沒有雜訊

**結論**：**`useDataview` 現在可以放心保持開啟**，只要 breadcrumbs 用的欄位都改用 frontmatter 寫，就不會再跟 Quartz Syncer 的內文掃描邏輯衝突，這比「關掉 useDataview」更徹底，是治本而不是治標。

---

## ✅ 5.2 自訂 frontmatter 屬性（`類別`、`in`）沒有被發布出去

**現象**：改完上面的亂碼問題後，發現連正常的 `類別`、`in` 屬性也一起消失了。

**根本原因**：跟上一個問題是**不同的獨立設定**，只是剛好同時受影響。Quartz Syncer 預設只會把它認得的固定欄位（`tags`、`permalink`、時間戳記等）帶去發布，自訂欄位除非開啟 `includeAllFrontmatter` 這個設定，不然一律被濾掉——不管是不是真的要的欄位，都會被丟掉。

**解決方法**：把 Quartz Syncer 的 `includeAllFrontmatter` 打開。需要**同時**滿足「`useDataview` 關、`includeAllFrontmatter` 開」這個組合才是我們要的乾淨結果（表格對照）：

| useDataview | includeAllFrontmatter | 結果 |
|---|---|---|
| 開 | 開 | 自訂屬性有，但亂碼也有 |
| 開 | 關 | 兩者都不會發布 |
| **關** | **開** | **✅ 自訂屬性有，亂碼沒有（正確答案）** |
| 關 | 關 | 兩者都不會發布 |

> [!tip] 跟 5.1 的治本方案合併之後
> 5.1 把 breadcrumbs 欄位搬進 frontmatter 之後，`useDataview` 也可以重新打開了，所以最終設定其實是「`useDataview` 開、`includeAllFrontmatter` 開」——上面表格列的是**釐清兩個開關各自作用**時的對照結果，不是最終採用的組合，實際採用的組合請見 [[Quartz troubleshooting - frontmatter publishing#✅ 5.1|5.1]] 結論。
