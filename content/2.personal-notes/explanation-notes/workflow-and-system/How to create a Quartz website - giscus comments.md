---
publish: true
aliases:
  - Quartz 建站－開啟留言功能（Giscus）
title: Quartz 建站－開啟留言功能（Giscus）
created: 2026-09-04T10:21:54.275Z
modified: 2026-09-04T10:21:54.295Z
published: 2026-09-04T10:21:54.295Z
tags:
  - 數位花園
  - 網站
  - ai-agent
category:
  - "[[Explanation notes]]"
  - Workflow and system
parent:
  - "[[How to create a Quartz website]]"
sibling:
child:
---

# 開啟留言功能（Giscus，基於 GitHub Discussions）

搭配母筆記 [[How to create a Quartz website]] 一起看。Quartz 內建 `@quartz-community/comments` 插件，用 **Giscus** 這個第三方服務把留言功能建立在 GitHub Discussions 上，不用自己架資料庫或留言用的伺服器。

## Step 1：repo 要是 Public，並開啟 Discussions

Giscus 只能用在公開 repo。到網站 repo 的 **Settings → General → Features**，勾選 **Discussions**。

## Step 2：安裝 giscus GitHub App

到 `https://github.com/apps/giscus`，點 **Install**，選擇要安裝在自己的網站 repo（例如 `<你的帳號>/obsidian-note-forestry-climate-change`）。這一步是讓 giscus 服務有權限讀寫這個 repo 的 Discussions，之後才能自動幫每篇文章建立/找到對應的討論串。

## Step 3：到 giscus.app 選分類、拿到設定值

到 `https://giscus.app`，輸入自己的 repo 名稱，確認出現綠色勾勾（代表 Discussions 已開、App 已裝好）。接著要選一個 Discussion Category 當留言存放的分類，GitHub Discussions 內建幾種分類，特性不同：

| 分類 | 特性 | 適不適合當留言區 |
|---|---|---|
| Announcements | 只有 repo 管理員能開新討論串，訪客只能留言回覆 | ✅ 最推薦，訪客不能亂開無關討論串，最乾淨 |
| General | 任何人都能自由開新討論串 | 可以用，但理論上訪客也能在 repo 自己開跟文章無關的討論串（我目前用這個） |
| Ideas | 討論串可標記「已採納」 | ❌ 適合收集建議，不適合留言區 |
| Polls | 討論串內建投票功能 | ❌ 適合問卷，不適合留言區 |
| Q\&A | 回覆可標記「最佳解答」，討論串可標記「已解決」 | ❌ 適合問答/技術支援，不適合留言區 |
| Show and tell | 分享成果類 | ❌ 適合展示作品，不適合留言區 |

選好分類後，頁面下方會產生一段 `<script>`，裡面四個值就是要填進網站設定的東西：`data-repo`、`data-repo-id`、`data-category`、`data-category-id`。

> [!tip] 不想手動點 giscus.app 網頁，也可以直接查 API
> giscus 提供公開 API，能一次列出某個 repo 底下所有分類的 ID：`https://giscus.app/api/discussions/categories?repo=<帳號>/<repo名稱>`。回傳的 JSON 裡每個分類都有自己的 `id`（`DIC_` 開頭）。這個 API 也能用來確認 App 有沒有安裝成功——如果沒裝好，會回傳錯誤而不是分類清單。

## Step 4：填入 `quartz.config.yaml`

把 `comments` 插件改成 `enabled: true`，並填入上一步拿到的值：

```yaml
  - source: "@quartz-community/comments"
    enabled: true
    options:
      provider: giscus
      options:
        repo: "<你的帳號>/obsidian-note-forestry-climate-change"
        repoId: "R_kgDOT0BWug"
        category: "General"
        categoryId: "DIC_kwDOT0BWus4DDNla"
        lightTheme: "light"
        darkTheme: "dark"
        mapping: "url"
        strict: true
        reactionsEnabled: true
        inputPosition: "bottom"
        lang: "zh-TW"
    layout:
      position: afterBody
      priority: 10
```

- `mapping: "url"`：用網址對應每篇文章各自的討論串，一篇文章一個獨立留言串
- `strict: true`：比對討論串時用嚴格比對，避免誤連到不相關的討論串
- commit + push 之後 Cloudflare 會自動重新部署，之後每篇文章底部就會出現留言區

## 管理留言（repo owner 的權限）

留言串本質上就是網站 repo 底下的 GitHub Discussion，身為 repo owner 有完整管理權限：

- 到該篇文章對應的 Discussion，右側選單可以 **Lock conversation**（鎖住討論串，訪客不能再留言，舊留言還在）
- 可以刪除單則留言，或整串刪掉
- Announcements/General 這類分類沒有「開/關」狀態機制（那是 Q\&A 分類才有的「已解決」概念），要「不再開放留言」用 Lock 達成

## 相關問題排查

深色模式下留言區文字看不清楚的 CORS 問題，見 [[Quartz troubleshooting - comments and dark mode]]。
