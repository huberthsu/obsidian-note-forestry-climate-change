---
publish: true
aliases:
  - vault backup外掛說明
  - vault backup
title: vault backup外掛說明
created: 2026-09-18T04:52:59.084Z
modified: 2026-09-18T07:15:09.503Z
published: 2026-09-18T07:15:09.503Z
tags:
  - 檔案備份
  - 工作流
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

只支援桌面版（`isDesktopOnly: true`），行動裝置上無法使用。

## 所有可設定選項

### 備份設定

- **Backup folder path (Windows)**：Windows 上備份 ZIP 要存到哪個本機資料夾
- **Backup folder path (Unix)**：macOS/Linux 上備份 ZIP 要存到哪個本機資料夾
- **Filename template**：檔名樣板，可用變數 `{{vault}}`、`{{date}}`、`{{time}}`、`{{datetime}}`，也可加格式化字串如 `{{datetime:FORMAT}}`
- **Compression level**：壓縮等級滑桿，範圍 0～9（0 = 不壓縮，9 = 最大壓縮；等級越高檔案越小，但打包耗時越久）

### 自動備份（Automatic backup）

- **Run on startup**：開關，Obsidian 啟動時自動建立一次備份
- **Startup delay (ms)**：開機備份要延遲多久（毫秒）才執行，避免啟動當下搶資源
- **Run on shutdown**：開關，Obsidian 關閉時嘗試建立備份（外掛註明是 best-effort，不保證一定成功）

### 保留政策（Retention policy）

- **Retention mode**：四選一的保留規則
  - `keepLastN`（Keep last n backups only）：只套用「保留最近 N 份」規則
  - `keepDays`（Keep backups within days only）：只套用「保留最近 N 天內」規則
  - `and`（Keep if both conditions met）：兩個條件都符合才保留（交集，門檻較嚴格）
  - `or`（Keep if either condition met）：符合任一條件就保留（聯集，門檻較寬鬆）
- **Keep last n backups**：保留最近幾份備份，0 = 不限制份數
- **Keep for days**（對應 `retentionKeepDays`）：保留最近幾天內的備份，0 = 不限制天數

## 目前實際選擇

- 備份資料夾：`backupFolderPathWindows` 指向 vault **外部**的獨立資料夾（`...\hubert vault backup`），`backupFolderPathUnix` 留空（未在非 Windows 裝置使用過）
- 檔名樣板維持預設值 `{{vault}}_{{datetime:YYYY-MM-DD_HHmmss}}`，例如會產生 `hubert_2026-09-18_124151.zip`
- 壓縮等級設為 `6`（0~9 之間偏高），換取較小檔案、犧牲一些打包時間
- **自動備份兩個開關都是關閉**（`runOnStartup: false`、`runOnShutdown: false`），代表目前備份完全**手動觸發**；`startupDelayMs: 5000` 因為開機備份沒開啟，目前不會生效
- 保留模式選的是 `retentionMode: keepLastN`，只看「保留最近 N 份」這條規則，`retentionKeepDays: 0` 這個天數欄位在此模式下**不會被套用**
- `retentionKeepLastN: 3` → 只保留最近 3 份備份，第 4 份以後的舊備份會被自動刪除，屬於短期滾動備份

## 與 [[Git plugins|Git 外掛]] 的比較

| 比較面向 | Git 外掛 | Vault Backup 外掛 |
| --- | --- | --- |
| 備份單位 | 逐檔案、逐行的版本控制，每次 commit 記錄「哪些檔案改了哪幾行」 | 整個 vault 的完整快照（ZIP），不記錄檔案內部差異 |
| 保存範圍 | commit 歷史持續累積，理論上可回溯到任何一個版本 | 只保留最近 N 份（目前 3 份），舊的自動刪除，屬於短期滾動備份 |
| 還原方式 | 可用 `git checkout` 精準還原「單一筆記」到某個版本 | 只能整包還原，沒有單檔還原功能 |
| 觸發方式 | 每 10 分鐘自動 commit，但**不**自動 push | 目前**完全手動**觸發（`runOnStartup`、`runOnShutdown` 皆關閉） |
| 儲存位置 | 版本資料庫（`.git`）在 vault 內部，需手動 push 才能同步到遠端 GitHub | ZIP 存在 vault 外部的獨立資料夾（目前路徑本身也在 OneDrive 同步範圍內） |
| 相依性 | 運作依賴 `.git` 資料夾本身完好 | 完全獨立於 Git 機制之外 |

## 兩者如何互補

- Git 保護的是「內容的演變歷史」，適合找回某篇筆記過去某個版本的內容；Vault Backup 保護的是「某個時間點的整體狀態」，適合在 `.git` 倉庫本身損毀、外掛或設定壞掉、或誤刪大量檔案時直接整包復原
- Git 的運作依賴 `.git` 資料夾本身完好，一旦這個資料夾損毀或設定跑掉，版本歷史可能一併遺失；Vault Backup 的 ZIP 完全獨立於 Git 機制之外，形成另一層互不依賴的備援
- Git 只有自動 commit、沒有自動 push，真正同步到遠端裝置需要手動操作；Vault Backup 的快照則存放在 OneDrive 同步資料夾內，等於在 Git 的遠端備援之外，再疊加一層雲端備份

# 使用說明

- 我覺得能夠額外創立一個不會被覆蓋的backup(改名或拉出backup資料夾)，裡面包含所有資料夾，但是各資料夾內只有少量筆記當作範例。目的是如果他人想要使用我的架構時，能直接使用
- 我覺得可以在想要實驗某個改動較大的功能或外掛時，建立一個backup解壓縮後實際實驗後得到成果
