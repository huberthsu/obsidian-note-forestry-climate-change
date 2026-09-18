---
publish: true
aliases:
  - copilot與claudian優缺點比較
title: copilot與claudian比較
created: 2026-09-18T05:50:06.650Z
modified: 2026-09-18T06:03:40.638Z
published: 2026-09-18T06:03:40.638Z
tags:
  - ai-agent
  - 工作流
category:
  - "[[Explanation notes]]"
  - Plugin and features
in:
  - 2.personal-notes
parent:
sibling:
  - "[[Introduction to AI-Agent and Related Notes]]"
child:
---

# 核心功能對比

| 面向 | Copilot | Claudian |
| --- | --- | --- |
| **核心定位** | 多模型 AI 助手＋vault 語意檢索（QA）＋可選的自動化代理模式 | 直接把 Claude Code、Codex 等外部 coding agent CLI 嵌入 vault，vault 變成它們的工作目錄 |
| **模型與供應商** | 外掛內建管理多家供應商 API key（OpenAI、Anthropic、Google、OpenRouter、xAI、Mistral、DeepSeek、Groq、HuggingFace、Cohere 等），可自由切換或組合模型（設定裡的 `providers`、`configuredModels`） | 外掛本身不管理 API key 或模型清單（目前 `data.json` 是空的 `{}`），而是直接呼叫本機已安裝的 Claude Code、Codex 等 CLI 工具，模型與帳號登入狀態交給那些 CLI 自己的設定管理 |
| **與 vault 互動的方式** | 主要透過「Vault QA」做語意/字面搜尋（`qaInclusions`、`qaExclusions`、`maxSourceChunks`、`lexicalSearchRamLimit`），回答可附引用來源（`enableInlineCitations`）；另有「Custom Prompts」「Projects」，可把特定筆記集合當作上下文 | 把整個 vault 當作 coding agent 的工作目錄，agent 可用檔案讀寫、搜尋、bash 指令執行多步驟工作流程——就像這個對話：讀外掛原始碼、grep 設定檔、直接編輯筆記檔案 |
| **自動化／代理能力** | 有「Autonomous Agent」模式（`enableAutonomousAgent`、`autonomousAgentEnabledToolIds`、`autoAcceptEdits`、`diffViewMode`），但工具集是外掛自己定義、範圍相對受限 | 本質上是把成熟的 coding agent 整個搬進 vault，工具能力就是那些 CLI 原生具備的完整能力（bash、任意檔案操作、可調用外部指令），沒有另外設一層受限工具清單 |
| **額外整合** | 內建網路搜尋/擷取類 API（Firecrawl、Perplexity、Exa、Supadata）、對話記憶（`enableSavedMemory`）、聊天記錄自動存檔（`autosaveChat`）、快速指令，另有訂閱制的 Copilot Plus 進階功能 | 沒有這些內建整合，功能邊界完全取決於背後接的 CLI agent 本身有什麼工具（例如 Claude Code 自己的網頁搜尋/擷取工具） |

---

## 各工作情境下的適用性

| 工作情境                                                                  | Copilot                                                                                                                                                            | Claudian                                                                                                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **依 `CLAUDE.md` 規則做筆記整理**（文獻筆記 7-skill、zettelkasten 整理、英文筆記建立等規則導向工作） | ⚠️ 代理能力受限於外掛自訂工具清單，較難穩定照多步驟 skill 流程走                                                                                                                              | ✅ 直接搬入完整 CLI coding agent，能精準讀寫檔案、按固定規則多步驟執行                                                                                                             |
| **英文單字／片語測驗**（互動出題，並把錯題精準寫回 `Vocab Quiz Record.md` 指定欄位、不能動到不該改的欄位）   | ⚠️ 可以聊天出題，但寫回筆記的精準度、遵守欄位規則的穩定度不如原生 agent                                                                                                                           | ✅ 出題流程走 skill 定義的規則，寫回檔案時能精準只改必要欄位                                                                                                                       |
| **任務管理協助**（`6.task-management` 資料夾的任務清單維護、每日完成事項更新、複習系統）              | ⚠️ 可以聊聊建議或討論方向，但實際更新清單/勾選完成項目等檔案操作能力有限                                                                                                                             | ✅ 既能像夥伴一樣先討論再動手，也能直接編輯任務清單檔案                                                                                                                             |
| **大量／精準跨檔案編輯**（例如批次改筆記格式、比對多個外掛設定檔）                                   | ⚠️ 可用，但工具集是外掛自訂的，深度改檔不如原生 agent                                                                                                                                    | ✅ 檔案讀寫是原生能力，適合這類精細編輯                                                                                                                                     |
| **執行 bash／系統層操作**（查外掛原始碼、跑 git 指令、grep 交叉比對）                          | ❌ 沒有這類系統層工具                                                                                                                                                        | ✅ CLI agent 原生支援 bash                                                                                                                                    |
| **跨大量筆記做語意／模糊主題檢索**（不確定關鍵字、找主題相關的舊筆記，包含卡片盒筆記連結發想這類需要判斷「相關且值得參考」的情境）   | ⚠️ 語意搜尋召回率（recall）較高，比較能抓到「用詞不同但概念相關」的筆記，不容易漏掉你想不到關鍵字的舊筆記；它是靠「切片＋向量相似度」找內容，準確度（precision）不穩定——相似度高不代表真的值得參考，也不懂 zettelkasten 連結慣例、看不到你手動維護的分類/標籤結構，篩出來的候選仍要你自己判斷品質 | ⚠️ 靠關鍵字 grep，召回率較低，用詞不同的相關筆記容易漏掉、常要多輪嘗試不同關鍵字；但一旦找到候選，是讀「完整筆記」而非切片，還能看懂 frontmatter 的 `category`、`tags`、既有 wikilink 結構，判斷「這個相關不相關、值不值得參考」的準確度與給出的理由通常比較扎實 |
| **手機上查詢／問筆記內容**                                                       | ✅ 支援行動裝置                                                                                                                                                           | ❌ 僅限桌面（`isDesktopOnly: true`）                                                                                                                            |
| **不特別要求遵守 vault 規則的一般性問答**（例如單純問英文單字語意，不需要照筆記）                        | ✅ 輕量對話介面即可                                                                                                                                                         | ⚠️ 可以做，但等於用整套 coding agent 處理簡單問答，較大材小用                                                                                                                  |
| **想用非 Claude 模型**（省錢用便宜模型、或本機/離線模型）                                   | ✅ 內建管理多家供應商 API key，可自由切換                                                                                                                                          | ❌ 模型完全綁定背後接的 CLI 工具（目前是 Claude Code 等）                                                                                                                   |
| **需要即時網路搜尋並整合進回答**（外掛內建 Firecrawl、Perplexity、Exa 等）                   | ✅ 有現成整合                                                                                                                                                            | ⚠️ 要看背後 CLI agent 本身有沒有網頁搜尋工具                                                                                                                            |

---

## 總結

- **兩者最大差異**：
  - Claudian 是把成熟的 CLI coding agent 整個搬進 vault，強項在「規則遵守＋檔案級精準操作」（讀寫檔案、bash、多步驟工作流），但沒有內建語意搜尋、僅限桌面、模型完全綁定背後接的 CLI 工具
  - Copilot 是通用型 AI 助手，強項在「多模型彈性＋跨筆記語意檢索」，能在手機上用、能換模型、內建 Vault QA，但代理能力受限於外掛自訂的工具清單，深度改檔的穩定度不如原生 agent
- **對你而言，Claudian 最適合**：所有需要照 `CLAUDE.md` 與各個 skill 規則走的深度協作
  - 例如文獻筆記 7-skill 流程、zettelkasten 整理與寫入、英文單字測驗的出題與精準寫回錯題記錄、任務清單維護，以及外掛設定/原始碼比對這類需要 bash、grep 交叉查證的技術性工作
- **對你而言，Copilot 最適合**：語意檢索的「召回」、以及不需要照 vault 規則的輕量情境
  - 語意搜尋召回率較高，適合撈出「用詞不同但概念相關」的既有筆記（包含卡片盒連結發想的第一步：先找候選），但找到的候選還是要你自己判斷品質
  - 不需要照 vault 規則的輕量情境，像是手機上隨手查筆記、單純問一般性問題、或想換一個非 Claude 的模型省成本
- 卡片盒筆記分工
  - Copilot 負責「撈出候選」（召回），Claudian 負責「判斷值不值得連結、寫入 wikilink」（精準度與執行）
