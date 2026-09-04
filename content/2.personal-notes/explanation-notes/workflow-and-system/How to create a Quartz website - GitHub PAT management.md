---
publish: true
aliases:
  - GitHub PAT 管理與維護
title: GitHub PAT 管理與維護
created: 2026-09-04T10:21:54.562Z
modified: 2026-09-04T10:21:54.584Z
published: 2026-09-04T10:21:54.584Z
tags:
  - 數位花園
  - 網站
  - GitHub
category:
  - "[[Explanation notes]]"
  - Workflow and system
in:
  - 2.personal-notes
parent:
  - "[[How to create a Quartz website]]"
sibling:
  - "[[How to create a Quartz website - giscus comments]]"
  - "[[How to create a Quartz website - custom 404]]"
  - "[[How to create a Quartz website - patch-package]]"
  - "[[How to create a Quartz website - timestamp links]]"
child:
---

# Personal Access Token（PAT）生命週期管理

這份筆記詳細記錄 GitHub PAT 的申請、使用、到期、更新等完整流程。Quartz Syncer 透過 PAT 向 GitHub 驗證身份，以你的帳號身份 push 筆記，所以 PAT 的有效狀態直接影響發布功能。

> [!info] 與主筆記的關係
> [[How to create a Quartz website|主筆記 Step 5、Step 6]] 涵蓋申請和初始設定流程；本筆記聚焦於**後續維護**和**常見問題排查**。

---

## 零、選擇正確的 PAT 類型

GitHub 提供兩種 PAT，安全性和控制力差很大。**強烈建議用 Fine-grained tokens**。

### Fine-grained tokens vs Classic tokens

| 特性 | **Fine-grained tokens**（推薦） | **Personal access tokens (classic)**（不推薦） |
|---|---|---|
| **推出時間** | 2022 年 GitHub 新推出 | 舊版本 |
| **權限範圍** | 精細控制（細粒度） | 全帳號級（粗粒度） |
| **Repo 限制** | ✅ 只給單一 repo | ❌ 給了就能存取帳號下「所有 repo」 |
| **權限細節** | ✅ 逐項開關（Contents、Workflows、Issues 等） | ❌ 只有寬泛選項（repo、gist、user） |
| **有效期限** | ✅ 必須設定（1~365 天） | ⚠️ 可永不過期（安全隱患） |
| **安全性** | ⭐⭐⭐⭐⭐ 很高 | ⭐⭐ 較低 |

### 具體差別

**Fine-grained 能做到**：

```
這組 token 只能：
✓ 存取 repo: <你的帳號>/obsidian-note-forestry-climate-change
✓ 做 Contents 讀寫（push/pull）
✗ 不能存取其他 repo
✗ 不能改 Settings
✗ 不能刪 Issues
```

**Classic 會給你全部權限**：

```
這組 token 只要有效，就能：
✓ 存取你帳號底下「所有 repo」（包括私人專案）
✓ 做幾乎任何事（修改 settings、刪東西等）
✓ 如果洩露，攻擊者掌控你整個 GitHub 帳號
```

### 建議

**用 Fine-grained tokens**。這是本筆記和主筆記都推薦的方式。

---

## 一、PAT 申請（初次設定）

詳見 [[How to create a Quartz website#Step 5：申請 GitHub Personal Access Token（PAT）|主筆記 Step 5]]。

重點摘要：

- 到 GitHub Settings → Developer settings → Personal access tokens → **Fine-grained tokens**
- Repository access：「Only select repositories」，只勾自己的網站 repo
- Permissions：至少 `Contents` 的 **Read and write**
- **Expiration（有效期限）**：建議設 **90 天**（見下方「有效期限該設多長」）
- 申請後 **立刻複製**，關掉頁面就看不到了

---

## 二、PAT 到期後會發生什麼

### 症狀

- Quartz Syncer 在 Obsidian 內按「PUBLISH SELECTED CHANGES」時失敗
- 錯誤訊息通常是 `401 Unauthorized` 或「authentication failed」
- 筆記無法 push 到 GitHub

### 原因

GitHub 不再接受已過期的 token，因為它已經無效。

---

## 三、更新 PAT（最常用的維護工作）

### 情境 A：PAT 還未過期，想改設定（如延長時間）

**GitHub PAT 一旦產生，過期時間是固定的，無法直接編輯。** 需要撤銷舊的、申請新的。

#### 步驟

> [!warning] 順序很重要：先申請新的，再刪舊的
> **一定要這個順序**：申請新的（複製） → 貼進 Quartz Syncer → 測試成功 → 才刪舊的。
>
> **千萬不要先刪舊 token**，否則中間會有時間差，Obsidian 沒有有效 token 可用。

1. **申請新 token**
   - 登入 GitHub → Settings → Developer settings → Personal access tokens
   - 按 **Generate new token**
   - **Repository access**：「Only select repositories」 → 勾自己的網站 repo
   - **Permissions**：`Contents` 的 Read and write（保持一樣）
   - **Expiration**：設定新的有效期限（例如改成 **90 天**）
   - 按 **Generate token**

2. **複製新 token**
   - 頁面上只會顯示這一次，**立刻複製** 並暫時貼在文字編輯器（或密碼管理工具）
   - 關掉 GitHub 設定頁（先不刪舊 token）

3. **更新 Quartz Syncer 設定**
   - 打開 Obsidian
   - 到 Quartz Syncer 外掛設定頁
   - 找到 **Personal access token** 或 **Token** 欄位
   - 把舊 token **全選刪掉**，貼入新 token
   - 存好設定

4. **用測試筆記確認新 token 有效**
   - 發布一篇測試筆記（例如臨時新建一個測試內容）
   - 用 Publication Center 試著 publish，確認成功
   - 如果失敗，代表新 token 有問題，不要繼續

5. **測試成功後，才刪舊 token**
   - 回到 GitHub Settings → Personal access tokens
   - 找到舊 token，按 **Delete** 刪除它
   - 確認刪除（GitHub 會再問一次）
   - 完成

### 情境 B：PAT 已經過期，需要立刻補救

1. **申請新 token**（舊 token 已過期或已刪除，直接申請新的）
   - 到 GitHub Settings → Developer settings → Personal access tokens → **Generate new token**
   - 填入相同的 Repository access、Permissions、Expiration 設定
   - 複製新 token

2. **更新 Quartz Syncer 並測試**
   - 打開 Obsidian → Quartz Syncer 設定頁
   - 貼入新 token，存好
   - 用一篇筆記試著 publish 確認成功

> [!tip] 過期不會有永久損害
> Token 過期後，GitHub 就停止接受它。但你的帳號、repo、筆記都還在，只要重新申請新 token 並更新設定，就能恢復正常發布。

---

## 四、有效期限該設多長

常見選項及權衡：

| 有效期限 | 優點 | 缺點 |
|---|---|---|
| **30 天** | 更安全；舊 token 洩露也用不久 | 需要頻繁更新（平均每月一次） |
| **90 天** | 安全性和便利性平衡；GitHub 預設建議 | 需要每季更新一次 |
| **1 年** | 最方便；很少需要管理 | 安全性較低；token 洩露會被濫用較久 |
| **永不過期** | 完全不用管理 | 不推薦；一旦洩露完全無法控制 |

---

## 五、維護檢查清單

### 每季檢查一次（或設提醒）

- [ ] 打開 Obsidian，試著 publish 一篇小筆記，確認連接正常
- [ ] 檢查 GitHub token 設定頁，查看 token 的「Last used」是否最近使用過
- [ ] 查看 token 距離過期還有多少天

### 過期前 2 週

- [ ] 根據前面「情境 A」的步驟，申請新 token
- [ ] 更新 Quartz Syncer，並用測試筆記驗證成功

---

## 六、常見問題

### Q：忘記複製 token 了，現在看不到了，怎麼辦？

**A**：GitHub 基於安全考量，過期後不再顯示舊 token 的內容。只能刪除舊的、申請新的。

### Q：Quartz Syncer 設定裡的 token 欄位，到底應該填什麼？

**A**：填 GitHub 申請的 **Personal Access Token 本身**（一串亂碼，例如 `ghp_1a2b3c4d5e...`），不是帳號、也不是密碼。

### Q：token 失效了，但我不知道是過期還是被撤銷了，怎麼判斷？

**A**：都一樣處理——都得申請新 token。如果想確認舊 token 的狀態，可以到 GitHub Settings 看舊 token 還在不在。不在的話代表已刪除；如果還在但 Quartz Syncer 報錯，代表可能已被撤銷或舊的設定有問題。最簡單的做法就是申請新的。

### Q：能不能在 token 過期前自動提醒？

**A**：GitHub 本身不提供到期前提醒功能。可以靠外部手段：

- 在日曆軟體（Google Calendar、Outlook）設定提醒，時間設為「token 申請日期 + 有效期限 - 2 週」
- 或用 IFTTT、Zapier 等自動化工具（進階用法，這裡不詳述）

---

## 七、安全提醒

- **Token 不要分享給任何人**，它等同於「能 push 你程式碼」的密碼
- **Token 不要貼到公開的地方**（GitHub commit message、貼文、截圖等）
- **如果意外洩露，立刻到 GitHub 刪除該 token**，然後重新申請新的
- Obsidian 本機存的 Quartz Syncer 設定檔案，包含 token，確保 vault 資料夾的存取權限是**只有自己**能讀取

---

## 相關連結

- [[How to create a Quartz website#Step 5：申請 GitHub Personal Access Token（PAT）|主筆記 Step 5 — PAT 申請流程]]
- [[How to create a Quartz website#Step 6：在 Obsidian 裡設定 Quartz Syncer|主筆記 Step 6 — Quartz Syncer 初始設定]]
- [GitHub 官方文件：Creating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
