---
publish: true
aliases:
  - Quartz 問題排查－Canvas 文字方塊與 Portal
title: Quartz 問題排查－Canvas 文字方塊與 Portal
created: 2026-09-04T12:17:28.242Z
modified: 2026-09-04T12:17:28.242Z
published: 2026-09-04T12:17:28.242Z
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
---

# Canvas 文字方塊與 Portal

搭配母筆記 [[Quartz website troubleshooting report]] 一起看。這篇記錄 Canvas 畫布裡文字方塊的 wikilink／內嵌處理，以及畫布巢狀內嵌另一個畫布（portal）的問題，是同一個功能一路疊代出來的十個項目。跟屬性面板重複註冊問題的關聯見 [[Quartz troubleshooting - properties and data display#✅ 7.1|7.1]]。

## ✅ 9.1 Canvas 畫布裡文字方塊寫的 `[[筆記]]`／`![[筆記]]`，完全沒有正確顯示

**現象**：`4.canvas-and-mindmaps/canvas/` 底下的畫布（例如「vault架構與系統」「高普考準備工作流」），文字方塊（text node）裡如果寫了 `[[筆記名稱]]` 或 `![[筆記名稱]]`，網站上完全沒有變成連結或內嵌內容，只是把中括號本身當純文字整段印出來，看起來就是一串沒被解析的原始語法。

**根本原因**：跟畫布上「檔案節點」（把整篇筆記直接當一個方塊拖進畫布，例如 `工作區示意圖.canvas` 那種）是完全不同的程式碼路徑，檔案節點原本就運作正常。問題出在「文字方塊裡面手打的 `[[]]`／`![[]]`」——`@quartz-community/canvas-page` 套件負責把文字方塊內容轉成 HTML 的函式：

```ts
function renderMarkdown(text: string): string {
  return micromark(text, {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });
}
```

只接了標準 Markdown 解析器（`micromark` + GFM），`[[wikilink]]`／`![[embed]]` 是 Obsidian 自創的語法、不屬於標準 Markdown 的一部分，這個解析器完全不認得，所以原封不動當純文字輸出。

**排查過程**：

1. 直接在本機 build 後檢查輸出的 HTML，確認 `![[Projects notes]]` 這種內容真的原封不動變成 `<p>![[Projects notes]]</p>`，證實不是顯示層級的樣式問題，是解析階段就沒處理
2. 追進 `canvas-page` 套件原始碼確認 `renderMarkdown()` 的實作，找到上面這段完全沒有 wikilink 分支的邏輯
3. 進一步確認：套件內部其實已經有一套「把某篇筆記完整內嵌進畫布方塊」的機制（`resolveEmbeddedHtml()`，檔案節點用的就是這個），只是這套機制沒有被「文字方塊裡的 `![[]]`」呼叫到而已，等於現成的內嵌邏輯就在那裡，只是沒接上

**解決方法（分成連結／內嵌兩種情況）**：

1. **`[[筆記名稱]]`（一般連結）**：在文字方塊內容跑 Markdown 渲染之前，先用正規表達式把 `[[目標]]`／`[[目標|別名]]` 抓出來，換成一個不會被誤判、也不會跟真實筆記內容撞名的佔位符記號（用 Unicode 私用區字元當分隔符），實際的網址解析延後到畫布真正渲染的那一刻才做（因為只有那個時間點才拿得到全站所有筆記的清單）。解析邏輯完全比照網站全域設定 `markdownLinkResolution: shortest`（`quartz.config.yaml`）的規則：只打筆記名稱、不打完整路徑也能唯一匹配到，跟網站其他地方的連結行為一致。
2. **`![[筆記名稱]]`（內嵌）**：一樣先抓出來、換成佔位符，真正渲染時**直接重用**檔案節點已經在用、已驗證能動的 `resolveEmbeddedHtml()`，把目標筆記的完整內容（標題、段落等）嵌進畫布方塊，效果跟 Obsidian 裡看到的一致；如果目標是圖片檔則改顯示成 `<img>`。
3. **連結目標真的找不到怎麼辦**：不會顯示成一個連到錯誤網址的連結，而是換成跟網站其他地方「失效 wikilink」一樣的灰階樣式（`class="internal internal-link broken"`）。這種情況實測大量出現在畫布裡——因為很多畫布（尤其「vault架構與系統」這種記錄個人系統架構的圖）本來就會參照到 Claude skills、`5.模板`（真正 Obsidian 專用範本資料夾，本來就不公開，跟已改名發布用的 `5.templates-for-web` 是兩回事）這類**故意不公開**的內部筆記，顯示成「失效」才是正確反映實際狀況，不是 bug。

> [!warning] 內嵌需要的資料，畫布產生階段拿不到，只能延後到渲染階段做
> 追這個套件的 build 流程才發現：`canvas-page` 產生畫布虛擬頁面的階段（`generate()`）跑在**所有筆記都轉換成最終 HTML 之前**，這個階段完全拿不到「其他筆記的完整內容」；只有真正把畫布渲染成 HTML 的那一步（`CanvasBody.tsx` 的元件渲染函式）才拿得到全站筆記清單（含每篇的完整 HTML）。這也是為什麼原本的實作只能做到「跑 Markdown 語法」，做不到「內嵌別的筆記」——不是沒想到，是這一步的架構位置本來就沒有內嵌需要的資料，要修就得把 wikilink／embed 的實際解析挪到渲染階段，跟檔案節點共用同一套邏輯。

> [!tip] CSS 也要跟著搬家：內嵌樣式原本寫死只給「檔案節點」用
> 內嵌內容的排版樣式（標題間距、段落、清單、程式碼區塊）原本在 `canvas.scss` 裡寫在 `.canvas-node-file { .canvas-embed-content { ... } }` 這種巢狀選擇器底下，只對「檔案節點」內部的內嵌內容生效。文字方塊裡新增的內嵌內容雖然功能上正確，但因為選擇器巢狀在錯的節點類型下，樣式完全套不到、內容會擠成一坨沒格式的文字。把這段樣式改成不巢狀在 `.canvas-node-file` 底下的獨立規則，兩種節點類型的內嵌內容才會共用同一份排版樣式。

**排查過程中意外發現、且直接擋到這次修復生效的舊坑**：改完 CSS 後本地測試，內嵌內容還是沒有樣式格式。追出原因是 [[Quartz troubleshooting - properties and data display#✅ 7.1|7.1]] 記錄過、當時「還沒處理」的 `canvas-page`／`bases-page` 重複註冊問題——`quartz.config.yaml` 裡同一個套件被登記了兩次（一次 npm 來源、一次 git 來源），兩份各自的 CSS 都會被打包進網站，而 npm 那份是完全沒改過的舊版。雖然「哪個版本負責實際渲染邏輯」由後面登記的那份贏（git 來源那份，也就是我改過的），但**兩份的 CSS 都還是會被載入**，如果舊的那份剛好在頁面裡排在後面，靠 CSS 疊層規則就會蓋掉新版的樣式——等於功能修好了，但樣式被舊版蓋掉、視覺上看不出來。解法是直接把兩個套件的 npm 來源那筆登記關掉（`enabled: false`），只留下修過的 git 來源那份，功能不受影響，純粹是清掉重複註冊。

**已驗證結果**：本地清掉 `.quartz/plugins/canvas-page`（連同 `bases-page`）快取模擬全新環境重新 build，確認能正確從 `vendor/canvas-page` 抓到修改過的套件並成功編譯；四個畫布檔案逐一檢查輸出 HTML，確認一般連結／完整內嵌／失效連結三種情況都正確分流（例如「vault架構與系統」畫布裡 20 個正常連結、6 個完整內嵌、19 個正確判定為失效）；本機啟動預覽伺服器，使用者實際在瀏覽器確認效果正確；commit 並 push 到 `v5` 分支（`b68e9a3`）。

> [!tip] 本地測試踩到的插曲：忘記關掉上一輪的本地伺服器，連到舊版本卻不自知
> 修 bases-page 那次啟動的本地預覽伺服器背景程序忘記關掉，這次改完 canvas-page 重新啟動伺服器時，因為 port 已經被舊程序佔用、新伺服器啟動失敗，但**舊程序仍然存活、還在回應請求**，導致使用者用瀏覽器連上去看到的其實是舊版本（沒有這次的修復），一度誤以為修復沒生效。後來用 `netstat` 查出佔用 port 的舊程序 PID、手動關掉，重新啟動乾淨的新伺服器才確認成功。之後每次要開新的本地預覽伺服器，記得先確認上一輪的有沒有真的關乾淨。

---

## ✅ 9.2 進一步優化——`![[筆記]]` 完整內嵌的方塊，右上角加一個可以直接跳轉到原筆記的按鈕

**動機**：9.1 把 `![[筆記]]` 修成完整內嵌目標筆記內容後，內嵌方塊本身除非目標筆記內文剛好有連結可以點，不然沒有辦法直接跳轉到那篇筆記——想要的效果是跟 Obsidian 裡打開畫布看到的一樣：內嵌方塊角落有個小按鈕可以直接點過去。

**設計選擇**：討論過兩種做法——「整個內嵌方塊都可以點擊跳轉」vs「只在角落放一個小按鈕」。選了後者，因為內嵌進來的是**目標筆記的完整 HTML 內容**，裡面本來就可能含有標題錨點、內文 wikilink 等各自獨立的連結；如果讓整個方塊本身也包一層連結，會變成連結嵌連結（`<a>` 巢狀 `<a>`），瀏覽器對這種巢狀互動元素的處理不保證一致、容易出現點擊行為錯亂。角落按鈕不會跟內嵌內容本身的連結重疊，行為單純可預期。

**解決方法**：在 `renderTextLink()` 產生內嵌 HTML 的地方，把內嵌內容包一層外框，外框右上角疊一個小按鈕（沿用網站既有的「外部連結」箭頭圖示，保持視覺風格一致），點下去連到目標筆記：

```html
<div class="canvas-text-embed">
  <a href="..." class="canvas-text-embed-open" data-slug="..." aria-label="..." title="...">
    <svg>...箭頭圖示...</svg>
  </a>
  <div class="canvas-embed-content">...內嵌內容...</div>
</div>
```

配合 `canvas.scss` 新增 `.canvas-text-embed { position: relative; }` 讓按鈕能用 `position: absolute` 疊在右上角，預設半透明、hover 時變深，跟 Obsidian 原生的互動回饋方式類似。

> [!tip] 這顆按鈕故意沒加 `internal internal-link` 這兩個 class
> 網站上一般內部連結都會加 `internal internal-link`，但那是**純樣式** class（`base.scss` 用它加背景色、padding），套用在一個小圖示按鈕上會長得很奇怪（背景色框住整個圖示）。查過 Quartz 的 SPA 快速導覽機制（`spa.inline.ts`）後確認：判斷「要不要攔截這次點擊、走前端路由而不整頁重新載入」只看這個元素是不是 `<a>` 標籤、網址是不是同網域，**跟 class 完全無關**，所以拿掉這兩個 class 純粹只是不要套用到不想要的樣式，不會影響 SPA 導覽功能。

**已驗證結果**：本地重新編譯 `vendor/canvas-page`，確認輸出 HTML 裡每個內嵌方塊都正確帶有右上角按鈕（正確的 `href`／`data-slug`）；本機啟動預覽伺服器，使用者實際在瀏覽器確認按鈕外觀、hover 效果、點擊跳轉都正常；commit 並 push 到 `v5` 分支（`db6b24a`）。

> [!tip] 這次 vendor 資料夾少複製了開發用設定檔，重新編譯時才發現
> 9.1 第一次 vendor `canvas-page` 時，只複製了「執行網站實際需要」的檔案（`package.json`／`dist/`／`src/`），沒有複製 `tsconfig.json`、`tsup.config.ts`、`types/globals.d.ts` 這些**只有本機重新編譯原始碼時才需要**的開發用設定檔——這是刻意的，因為 Cloudflare 部署時只要 `dist/` 資料夾已經存在（且沒被 `.gitignore`），就會直接用現成的編譯結果，根本不會重新編譯，這些設定檔對正式網站毫無用處。但這次要追加這顆按鈕，需要在本機重新編譯 `vendor/canvas-page` 的原始碼，才發現少了這些檔案編譯不起來（`tsc` 一路找到本機專案外面去、`.scss`／`window.addCleanup` 型別宣告缺失）。用 `git clone` 重新抓一份原始上游套件，把這幾個開發用設定檔（連同 `types/globals.d.ts`）補進 `vendor/canvas-page/` 才能繼續編譯——這些補進去的檔案**故意沒有 commit**，只是暫時放在本機方便下次要改的時候用，判斷邏輯跟 `dist/` 是否需要進版控完全不同。

---

## ✅ 9.3 進一步優化——`![[筆記]]` 右上角的跳轉按鈕，捲動筆記內容時會不見

**現象**：9.2 加上去的右上角按鈕，如果內嵌的筆記內容很長、把它往下捲動閱讀，按鈕會跟著內容一起被捲出畫面，看不到了。

**根本原因**：按鈕用的是 `position: absolute`，定位基準是 `.canvas-text-embed`（整個內嵌方塊的外框），但這個外框本身是放在會捲動的區域 `.canvas-node-content` 裡面（`overflow-y: auto`）。捲動的其實是整個外框（含按鈕）一起被往上推走，按鈕並沒有「黏在畫布卡片的角落」，只是「黏在內嵌方塊自己身上」，方塊一移動它就跟著移動。

**解決方法**：改用 CSS `position: sticky`，讓瀏覽器把按鈕黏在「最近的可捲動祖先元素」（也就是 `.canvas-node-content`）可視範圍的頂端，只要內嵌方塊本身還沒完全捲出畫面，按鈕就會持續顯示在角落；等整個內嵌方塊都捲過去了，按鈕才會跟著消失。但 `position: sticky` 的元素預設還是會佔用版面空間、把後面的內容往下推，不能直接套用在按鈕本身。做法是在按鈕外面多包一層「高度為 0」的容器來吸收這個 sticky 定位，按鈕自己則用 `position: absolute` 疊在這層零高度容器裡：

```html
<div class="canvas-text-embed">
  <div class="canvas-text-embed-toolbar">
    <a class="canvas-text-embed-open">...跳轉按鈕...</a>
  </div>
  <div class="canvas-embed-content">...內嵌內容...</div>
</div>
```

```scss
.canvas-text-embed-toolbar {
  position: sticky;
  top: 4px;
  height: 0;       // 不佔版面空間，不會把下面的內容往下推
  overflow: visible;
}
.canvas-text-embed-open {
  position: absolute; // 相對這層零高度容器疊在右上角
  top: 0;
  right: 4px;
}
```

> [!tip] 為什麼不是把 `.canvas-embed-content` 改成自己有獨立捲軸
> 一開始也想過另一個做法：讓內嵌的筆記內容自己有固定高度、自己捲動（`overflow-y: auto`），這樣按鈕維持 `position: absolute` 疊在外層不動也能達到效果。但這樣會讓內嵌方塊看起來像個「有邊界的小視窗」，跟畫布裡其他元素（例如文字方塊本身）能隨內容自然撐開高度的視覺風格不一致，所以最後選擇動按鈕本身的定位方式（`sticky`），而不是動內嵌內容的捲動行為。

**已驗證結果**：本地 `tsc --noEmit` 通過，`tsup` 重新編譯 `vendor/canvas-page` 成功；本機啟動預覽伺服器，使用者實際在瀏覽器把一則長筆記內嵌進畫布、往下捲動內容，確認按鈕全程固定在右上角、捲過整個內嵌方塊後才消失；commit 並 push 到 `v5` 分支（`89d42f1`）。

---

## ✅ 9.4 畫布裡用「檔案節點」內嵌另一個 `.canvas`（portal）完全看不到，修好後又縮在角落、拖曳會互相干擾

**現象**：`實際工作系統.canvas` 裡用檔案節點（`portal: true`）內嵌了 3 個子畫布，網站上這 3 個方塊完全是空的，只看得到左上角的檔名連結。

**排查過程**：

1. 用 curl 抓正式網站的實際 HTML，確認子畫布的完整內容（`canvas-container`、`canvas-viewport`、節點、SVG 連線）其實都有被渲染進頁面，不是內容遺失，問題出在「渲染出來但顯示不出來」
2. 用瀏覽器 DevTools 直接量測，內層 `.canvas-container` 的 `offsetHeight` 是 **0**——高度整條鏈路塌陷了

**根本原因**：`.canvas-page`／`.canvas-container` 都用 `height: 100%`，需要祖先元素有明確高度百分比才解得開。開發者之前已經替兩種類似情境（`.transclude` 筆記內文嵌入、`.popover-inner` hover 預覽）修過這個塌陷問題，但「畫布方塊內嵌另一個畫布」是新情境，包住它的 `.canvas-embed-content` 只是個普通 div，沒有明確高度，整條鏈路解不開、塌成 0。

**解決方法**：新增一條只在「`.canvas-embed-content` 底下直接包 `.canvas-page`」時才生效的規則（用 `:has()` 選擇器精準鎖定，不影響原本嵌入筆記的 auto-height／可捲動行為），讓它繼承方塊本來就有的明確高度（flexbox 算出來的）：

```scss
.canvas-embed-content:has(> .canvas-page) {
  height: 100%;
}
```

> [!warning] 修完「看得到」以後，又冒出兩個新 bug
> 高度塌陷修好、子畫布終於有內容後，緊接著又發現兩個問題：子畫布縮在方塊左上角一小塊、還有拖曳時「沒按著滑鼠也會跟著移動」。這兩個都是子畫布本身能「即時互動（拖曳/縮放）」這個機制帶來的副作用，記錄在下面。

### 子畫布縮在角落——縮放比例被疊加計算了兩次

**根本原因**：負責「縮放至剛好塞滿方塊」的 `centerViewport()` 函式，用 `container.getBoundingClientRect()` 量測方塊大小。但這個 API 回傳的是**最終畫面上的像素大小**，對一個嵌在別的畫布裡面的子畫布來說，這個量測值**已經被外層畫布自己的縮放影響過一次**。拿這個已經縮小過的數字去算「子畫布該縮多小才能塞進這個框」，相當於把外層的縮放比例疊加計算了兩次：一次是計算縮放值時用了已縮小的量測值，一次是渲染時本來就會透過 CSS 繼承再套用外層縮放——兩個 0.1 疊在一起變成大約 0.01，子畫布因此被縮小到只剩左上角一小塊。

**解決方法**：改用 `offsetWidth`／`offsetHeight`（元素自己在本地座標系裡的版面大小，不受祖先 CSS transform 影響）取代 `getBoundingClientRect()`：

```js
// 修改前：對嵌套畫布會把外層縮放算兩次
const containerRect = container.getBoundingClientRect();
const scaleX = containerRect.width / vw;

// 修改後：不受外層縮放影響
const containerWidth = container.offsetWidth;
const scaleX = containerWidth / vw;
```

### 拖曳沒按著滑鼠也會動——巢狀畫布各自監聽滑鼠事件互相打架

**根本原因**：畫布 portal 內嵌的其實是目標頁面**完整、可獨立互動**的一份 `.canvas-container`（含它自己的拖曳／滾輪縮放事件監聽）。因為它是外層畫布容器的 DOM 子孫，滑鼠事件會同時傳給內層跟外層兩邊的監聽器，兩邊各自記錄自己的拖曳狀態、各自呼叫 `setPointerCapture()` 互相搶奪，狀態因此兜不起來，才會出現「沒按著也在動」這種詭異行為。

**解決方法**：判斷目前這個 `.canvas-container` 是不是巢狀在另一個 `.canvas-container` 裡面，是的話就完全不掛拖曳／滾輪縮放的事件監聽（但 `centerViewport()` 還是照跑，確保縮放定位正確）：

```js
const isNested = container.parentElement?.closest(".canvas-container") != null;
const enableInteraction = !isNested && container.dataset.enableInteraction !== "false";
```

子畫布從此不再有自己獨立的拖曳／縮放，要看子畫布內容，透過拖曳/縮放外層畫布整個一起動即可，行為上更接近「這是一塊內嵌的預覽」，而不是「畫布裡面又有一個獨立可操作的畫布」。

**已驗證結果**：本地重新編譯 `vendor/canvas-page`，`實際工作系統.canvas` 三個子畫布都正確填滿各自的方塊、跟獨立開啟該畫布頁面時的排版一致；直接用 JS 量測確認滑鼠移動/滾輪不會再讓子畫布自己的 transform 變動；commit 並 push 到 `v5` 分支（`2c5382b`）。

---

## ✅ 9.5 進一步優化——區塊/群組的自訂顏色只套用在邊框，底色沒反映使用者在 Obsidian 設定的顏色

**現象**：使用者在 Obsidian 裡幫每個區塊/群組都設定了不同顏色（截圖裡看得到柔和的紅、橘、黃、綠、藍、紫色塊），但發布到網站後所有區塊看起來都是同一種顏色，只有邊框有一點點顏色差異，區塊跟區塊之間分不出來。

**根本原因**：JSON Canvas 格式裡每個節點/群組都可以有 `color` 欄位（1-6 代表預設色盤，或直接寫 hex），套件原始碼裡也已經有 `resolveColor()` 把這個值轉成 CSS 顏色、存進 `--canvas-node-color` 這個 CSS 變數——但整份程式碼**只有邊框用到這個變數**（`border: ... solid var(--canvas-node-color, ...)`），節點/群組自己的底色（`background`）從頭到尾都寫死用固定的灰階顏色，完全沒讀這個自訂顏色。

**解決方法**：渲染節點時，除了原本的 `--canvas-node-color`，額外算出兩個「把自訂顏色跟卡片底色用 `color-mix()` 混在一起」的柔和色版本，一個給一般卡片用（混 20%），一個給群組背景用（混 10%，更淡）：

```js
if (color) {
  baseStyle["--canvas-node-color"] = color;
  baseStyle["--canvas-node-color-bg"] = `color-mix(in srgb, ${color} 20%, var(--light))`;
  baseStyle["--canvas-node-color-bg-subtle"] = `color-mix(in srgb, ${color} 10%, var(--light))`;
}
```

再讓卡片/群組的 `background` 改吃這個新變數（沒設定自訂顏色時，退回原本的預設灰階，不影響沒上色的畫布）：

```scss
.canvas-node { background: var(--canvas-node-color-bg, var(--light)); }
.canvas-node-group { background: var(--canvas-node-color-bg-subtle, transparent); }
```

**已驗證結果**：本地重新編譯，`vault架構與系統.canvas`（裡面本來就有大量上色節點/群組）在淺色、深色模式下都確認每個區塊顯示各自設定的柔和底色、彼此明顯有差異，效果對齊 Obsidian 原生畫布的柔色塊風格；commit 並 push 到 `v5` 分支（`2c5382b`）。

---

## ✅ 9.6 進一步優化——區塊邊框、背景點點、跟連接線的對比不夠、背景點點太大太搶眼

**現象**：修完子畫布跟自訂顏色後，使用者反應：（1）畫布空白背景跟有內容的區塊顏色太接近，看不出來哪裡是「有東西的區塊」、哪裡是「純背景」；（2）背景網格點點太明顯、太大；（3）背景深灰色跟連接線的黑色太接近。

**排查過程**：這幾輪來回調整過程中，先試過「只把背景整體調暗一點」，使用者回饋這樣看起來只是「同一個顏色被統一調暗」，不是「這裡有內容／那裡是純背景」的清楚分區，還提供 Obsidian 原生畫布的截圖當參考（也就是 9.5 那個色塊需求的由來）。

**解決方法（最終版）**：

- 節點邊框從 2px 加粗到 4px，預設顏色（沒自訂顏色時）從偏淡的 `--lightgray` 改成更深、更看得出輪廓的 `--darkgray`；群組的虛線邊框預設色也一併從 `--gray` 改成 `--darkgray`
- 畫布空白背景固定用 `--lightgray`；一般卡片維持明亮的 `--light`；子畫布 portal 的方塊內部也給 `--light`（跟一般卡片同一個「這是內容」語言），只是保留一圈更淡的網格點，讓它還讀得出來「這是一個畫布」而不是普通筆記卡片
- 背景網格點點半徑從 1px 縮到 0.6px，顏色額外用 `color-mix()` 混入 45% 透明，讓點點變小、變淡，維持格線質感但不搶視覺焦點

> [!tip] 順手修掉一個新配色下才會冒出來的小 regression
> 檔案節點左上角的路徑說明文字（`.canvas-file-subpath`）原本寫死用 `--gray`，這個顏色改成畫布背景色之後文字會直接被蓋掉看不到，一起改成 `--darkgray` 才維持可讀。

**已驗證結果**：本地重新編譯，淺色、深色模式都確認：一般卡片/子畫布方塊跟空白背景有清楚分區、彼此邊框看得出輪廓、背景點點變得低調不刺眼、連接線跟背景不再貼近；commit 並 push 到 `v5` 分支（`2c5382b`）。

---

## ✅ 9.7 Canvas 裡用 `interdimensionalEdges` 連到 portal 內部節點的連線，完全沒有顯示

**現象**：`實際工作系統.canvas` 裡「高普考準備工作流」portal 節點跟旁邊「考古題筆記複習日曆bases.base」節點之間，Obsidian 裡看是有一條標著「查看考古題複習月曆」的連線（從 portal 內部一個群組節點連出來），但網站上這條線完全不見，月曆節點孤零零飄在那，跟旁邊任何東西都沒有視覺關聯。

**根本原因**：這條線在 canvas JSON 裡不是放在一般的 `edges` 陣列，而是掛在 portal 節點自己的 `interdimensionalEdges` 屬性底下——這是 Obsidian Canvas 專門給「連到 portal _內&#x90E8;_&#x67D0;個節點」用的特殊格式（`fromNode` 寫成 `acportal||<portal節點id>||<內部節點id>` 這種複合格式）。搜過整個 `vendor/canvas-page` 原始碼，完全沒有任何地方處理過 `interdimensionalEdges` 這個屬性，套件只認得一般 `edges` 陣列，這條線在渲染階段直接被忽略，等於沒被讀到過。

**排查過程**：

1. 先用瀏覽器截圖＋DOM 量測確認月曆節點跟 portal 之間視覺上真的沒有任何連線，不是被其他元素擋住
2. 讀 canvas JSON 原始內容，發現這條線記在 portal 節點的 `interdimensionalEdges` 陣列裡，不在頂層 `edges`
3. 在 `vendor/canvas-page` 全部原始碼搜尋 `interdimensional` 關鍵字，完全沒有匹配

**解決方法**：這條線的語意其實是「從整個 portal 連到月曆節點」也說得通（只是失去了「特別指到 portal 內部某個群組」這一層精確度），改成頂層 `edges` 陣列裡一般連線即可，寫法跟同一份檔案裡其他 portal 連線完全一樣：

```json
{
  "id": "e562d681921a39f0",
  "fromNode": "dcb4cb7c84197fa2",
  "fromSide": "top",
  "toNode": "c2545f1649726d1b",
  "toSide": "bottom",
  "label": "查看考古題複習月曆"
}
```

**已驗證結果**：本機 `quartz build --serve`，瀏覽器實際截圖確認連線正確顯示、標籤文字正確；commit 並 push 到 `v5` 分支（`e77dc466`）。

---

## ✅ 9.8 文字方塊 `![[筆記]]` 完整內嵌時，`white-space: pre-wrap` 外洩到內嵌內容，條列文字跟表格之間多出一大塊空白

**現象**：`實際工作系統.canvas` 裡用文字方塊內嵌了 `![[Task Management]]` 整篇筆記，網站上「工作量分級」那行條列文字跟後面的表格之間，多出一塊完全空白的區域，看起來像表格憑空消失、要往下滾很久才看得到；獨立開啟 Task Management 筆記本身則完全正常，只有嵌在畫布裡才會這樣。

**根本原因**：`canvas.scss` 裡有一條規則，是為了讓「純文字方塊」保留使用者手動打的換行：

```scss
.canvas-node-text {
  .canvas-node-content {
    white-space: pre-wrap;
  }
}
```

但這條規則的選擇器範圍太寬，連文字方塊裡用 `![[筆記]]` 內嵌進來的**整篇筆記 HTML**（`resolveEmbeddedHtml()` 把目標筆記已經渲染好的內容再轉一次成 HTML 字串）也一併套用到。內嵌進來的 HTML 字串裡，本來就含有大量「不影響顯示的換行字元」（例如 `</ul>` 跟 `<table>` 之間就有將近 80 個 `\n`，是排版產生 HTML 時留下的縮排痕跡，正常瀏覽器渲染時這些換行會被當空白忽略）。一旦套用 `pre-wrap`，這些換行全部變成真正的換行，80 個換行乘上行高（約 22px）加起來就是量到的約 1800px 空白，精準對上實際觀察到的空白大小。

**排查過程**：

1. 用 `getBoundingClientRect()`／`offsetTop` 直接量測條列文字結尾跟表格開頭的實際座標差，確認真的有約 1800px 的版面間距，不是視覺錯覺
2. 逐一檢查兩者之間的 DOM 節點，確認**沒有任何多出來的元素**，中間是空的——代表問題不是「多了一個看不見的元素佔位置」，而是某個既有元素本身佔用了不正常的空間
3. 直接印出 `</ul>` 到 `<table>` 之間的原始 HTML 字串，看到一長串 `\n\n\n\n...`（約 82 個），才追到是內嵌 HTML 裡本來就有的空白換行
4. 確認 `.canvas-node-text .canvas-node-content { white-space: pre-wrap; }` 這條規則的存在跟作用範圍，比對後確認就是它把這些換行變成真正換行

**解決方法**：`white-space` 是會繼承的 CSS 屬性，只要在內嵌內容的容器上重設回 `normal`，底下所有一般元素就會恢復正常換行忽略行為；`pre`／`code` 這種本來就該保留換行的元素不受影響，因為瀏覽器內建的 `pre { white-space: pre }` 規則是「明確設定」，優先權本來就贏過「繼承來的值」：

```scss
.canvas-node-text {
  .canvas-node-content {
    white-space: pre-wrap;
  }
  .canvas-embed-content {
    white-space: normal;
  }
}
```

**已驗證結果**：本機重新編譯 `vendor/canvas-page`，DOM 量測條列文字跟表格間距從約 1816px 降到正常的 15px；瀏覽器截圖確認表格緊接在條列文字下面、整篇筆記在原本畫布節點高度（1840）內完整顯示不用捲動；commit 並 push 到 `v5` 分支（`e77dc466`）。

---

## ⏳ 9.9 筆記裡巢狀內嵌指定 view 的 bases（`#viewname`），該筆記又被嵌進 canvas 時整塊空白

**現象**：Task Management 筆記裡有一段 `![[monthly tasks calendar bases.base#本月統計]]`（內嵌 bases 檔案裡名叫「本月統計」的特定 view），獨立開啟這篇筆記時顯示完全正常；但這篇筆記被 `實際工作系統.canvas` 用文字方塊整篇內嵌之後，畫布裡這個位置變成完全空白，DOM 裡只剩一個沒有內容的佔位符 `<div data-qz-bases-codeblock="0" data-qz-bases-view="本月統計"></div>`。

**根本原因**：網站對 `![[bases.base#viewname]]` 這種嵌入，實際上分兩階段處理：筆記本身的 HTML 樹裡先放一個佔位符 div，真正查詢、渲染出表格內容的邏輯，要等到網站最後渲染每個頁面時，用一個會遍歷整棵 HTML AST（樹狀結構）的轉換程式（`createBasesCodeblockTransform`）把佔位符替換掉——這一步是遍歷「活的樹狀結構」才有辦法運作的。但 canvas 外掛內嵌整篇筆記時，是把目標筆記的內容直接呼叫 `toHtml()` 轉成**一整串 HTML 純文字**，再用 `dangerouslySetInnerHTML` 塞進 DOM。內容一旦變成純文字字串，那個負責替換佔位符的樹狀轉換程式就完全看不到裡面的東西了（它只認得樹，不會主動去解析字串裡的 HTML），佔位符因此永遠沒機會被替換掉。

**排查過程**：

1. 一開始誤判成 [[Quartz troubleshooting - properties and data display|屬性面板與資料展示]] 記錄過的「`findBasesView()` 拿 view 類型屬性去比對 view 名稱」那個舊 bug，深入追蹤後發現那是完全不同的程式碼路徑（給「直接在 canvas 節點文字裡寫 `.base#view`」用的），跟這次「筆記內嵌 bases、筆記又被嵌進 canvas」的巢狀情境無關
2. 用瀏覽器直接開啟 Task Management 筆記獨立頁面，確認 bases 表格本身渲染完全正常（`data-bases-ready="1"`，12 筆資料的完整表格），排除是資料或 bases 設定本身的問題
3. 追進 `vendor/bases-page/src/pageType.ts` 的 `createBasesCodeblockTransform`，確認註解明確寫著「這一步在 `renderPage()` 裡、`allFiles` 可以拿到之後才會跑」，是刻意延後執行的機制
4. 追進 `vendor/canvas-page` 的 `CanvasBody.tsx`，確認內嵌整篇筆記用的是 `dangerouslySetInnerHTML={{ __html: embedded }}`，`embedded` 是純字串——樹狀轉換程式碰不到純字串裡的內容，兩邊機制對不上

**目前狀態（尚未修）**：真正要修，需要讓 canvas 外掛在把內嵌內容轉成字串**之前**，先套用一次跟 `bases-page` 一樣的佔位符解析邏輯——這代表兩個原本互相獨立的 vendor 套件要互相依賴，影響範圍不只這一個節點（會碰到全站共用的 bases 渲染路徑），也要另外處理內嵌內容裡連結路徑校正的問題，風險比單純的 CSS／JSON 修改高不少。跟使用者討論後，決定先不修這個，改用「另外新建一個只有單一 view 的 `.base` 檔案，直接當成獨立的 canvas 節點內嵌（跟考古題複習月曆節點做法一樣，不透過巢狀筆記、不用 `#view` 指定）」這個更安全的替代方案繞過問題，等有需要時再動手。

---

## ✅ 9.10 巢狀 portal 畫布自己的放大/縮小按鈕，縮成一小撮飄在別的節點卡片裡，點下去卻是操作 portal

**現象**：`實際工作系統.canvas` 裡，任務管理卡片（`![[Task Management]]` 文字方塊內嵌）內部出現一個縮得極小、像個小圓點的放大鏡圖示，位置明明在任務管理卡片範圍內，點下去卻發現是「高普考準備工作流」那個 portal 節點在放大/縮小、有反應。

**根本原因**：`高普考準備工作流.canvas`（以及同樣情境的「英文學習工作流.canvas」）是用檔案節點＋`portal: true` 的方式，把自己完整的 `.canvas-container` 原封不動內嵌進外層畫布，包含它自己那一整組放大/縮小/重置檢視按鈕（`.canvas-controls`）。這組按鈕的 CSS 用的是 `position: fixed`，原始設計是給「獨立整頁的畫布」用的，固定在瀏覽器視窗右上角。但根據 CSS 規範，只要有任何祖先元素設了 `transform`，`position: fixed` 的元素就會改成以「最近那個有 `transform` 的祖先」為定位基準，而不是整個瀏覽器視窗——而外層畫布本身的拖曳/縮放，正是透過在 `.canvas-viewport` 套用 `transform: translate(...) scale(...)` 實作的。結果是這組按鈕的 `top: 12px; right: 12px` 被外層的縮放比例一起壓縮，實測縮成大約 3×6 像素的一小撮，位置也因此落在畫面上某個看似隨機的座標，這次剛好疊在任務管理卡片上面（用 `getBoundingClientRect()` 量測確認：控制項座標 (338, 443) 確實落在任務管理卡片 (207~488, 374~539) 範圍內）。

而且這組按鈕的點擊事件是無條件綁定的——跟拖曳/滾輪縮放不同（那兩個有專門判斷 `isNested` 來停用，避免巢狀畫布互搶滑鼠事件，見 9.4 的「拖曳沒按著滑鼠也會動」），按鈕點擊沒有這層保護，所以雖然位置跑掉了，點下去仍然真的會呼叫到它自己 `initCanvas()` 閉包裡記錄的那個巢狀 container，觸發**該 portal 自己**的 `zoomAtCenter()`，跟疊在它上面的任務管理卡片完全無關。

**排查過程**：

1. 在瀏覽器裡用 `document.querySelectorAll('.canvas-controls')` 直接列出畫面上所有控制項元素，發現有 3 組（外層畫布 1 組 + 兩個 portal 各 1 組），而不是預期的只有外層那 1 組
2. 對每一組量測 `getBoundingClientRect()` 跟 `el.closest('.canvas-node')` 的 `data-node-id`，確認兩個 portal 各自的控制項座標都落在 (338, 443) 附近、疊在一起，而不是各自 portal 節點自己的範圍內
3. 再量測任務管理卡片本身的 `getBoundingClientRect()`，確認 (338, 443) 確實落在它的範圍內，跟使用者描述的「圖示在任務管理卡片裡」完全對得上
4. 檢查 `canvas.inline.ts` 的按鈕點擊監聽器綁定邏輯，確認 `zoomInBtn`／`zoomOutBtn` 的 `addEventListener("click", ...)` 沒有被 `enableInteraction`／`isNested` 判斷包住，是無條件執行的，才確認「位置跑掉」跟「點擊仍然有效」這兩件事同時成立、且互不衝突

**解決方法**：在 `canvas.scss` 加一條規則，讓任何巢狀在畫布節點裡的控制項改用 `position: absolute`（相對自己所屬的節點卡片定位，而不是整個視窗）：

```scss
.canvas-node .canvas-controls {
  position: absolute;
}
```

`.canvas-node` 本身已經是 `position: absolute`（節點的 `left`/`top` 就是這樣定位的），剛好可以直接當這條規則的定位基準，不用額外加包裝層。這條規則只匹配「在 `.canvas-node` 底下」的控制項，外層畫布自己那組（不在任何 `.canvas-node` 裡面）不受影響，維持原本 `position: fixed` 固定在瀏覽器視窗右上角。

**已驗證結果**：本地重新編譯 `vendor/canvas-page`，`quartz build --serve` 起本機伺服器；瀏覽器截圖確認任務管理卡片內部乾淨、看不到任何殘留圖示；用 `getBoundingClientRect()` 量測「高普考準備工作流」portal 節點自己的控制項，確認 `position` 已變成 `absolute`，座標精準貼齊該節點自己的右上角（跟節點本身的 `right`/`top` 邊界只差幾像素，符合 CSS 裡設的 `top: 12px; right: 12px`）；「英文學習工作流」portal 同樣情況也一併修好；外層畫布本身的控制項功能不受影響（縮放、重置按鈕正常出現/消失）；使用者本機實際確認後，commit 並 push 到 `v5` 分支（`c7db6d72`）。
