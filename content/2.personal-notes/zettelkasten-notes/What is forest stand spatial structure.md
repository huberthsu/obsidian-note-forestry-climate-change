---
publish: true
aliases:
  - 什麼是林分空間結構
  - 林分結構
  - 林分空間結構
  - 森林結構
  - 森林空間結構
title: 什麼是林分空間結構
created: 2026-08-25T08:23:18.218Z
modified: 2026-08-25T08:29:48.888Z
published: 2026-08-25T08:29:48.888Z
tags:
  - 森林結構
category:
  - "[[Zettelkasten notes]]"
摘要:
in:
  - 2.personal-notes
parent:
sibling:
child:
  - "[[What factors influence the spatial structure of forest stands|影響林分空間結構複雜度的因素有那些]]"
password:
---

# 內容

- 林分空間結構可分為水平空間和垂直空間
- 林分結構的指標多，且不同研究除了使用的指標可能不同，也可能為了降低共線性的影響，而將多個指標整合為單一指標
  - 水平
    - 總植被面積(total plant area index, PAI)
    - 總樹冠覆蓋面積 (total canopy cover, CC)
    - 葉面積指數(leaf area index, LAI)
    - 林分密度(stand density)
    - 胸高斷面積(basal area, BA)
    - 平均直徑
    - 直徑標準差
    - 直徑變異係數(coefficient of variation of all stem diameters, CVdBH)
    - 直徑級分布/直徑多樣性
    - 直徑分布偏態(skewness of the diameter distribution, SkewDBH)
    - 直徑分布吉尼係數(Gini coefficient of the diameter distribution, GiniDBH)
  - 垂直
    - 樹高分布/樹高多樣性
    - 樹高標準差
    - 最大樹高
    - 平均樹高
    - 最高樹木樹高平均(mean top-of-canopy height, TCH )
    - Lorey樹高( Lorey’s height, HLorey’s)
    - 最高樹木樹高平方(quadratic top-of-canopy height, QTCH)
    - 葉層高度多樣性(foliage height diversity, FHD)
    - 垂直葉面積分佈剖面(vertical foliage profile, VFP)
      - 其他延伸指標詳見[[溫帶森林結構對生物量和生產力的相關性-遙測的新視角]]
  - 整合
    - [[熱帶森林林分結構與初級生產力強相關性]]
      - 使用pca將樹高（RH100）、植被面積指數（PAI）、葉層高度多樣性（FHD）和冠層覆蓋（CC）整合為一個統一的林分結構指標（stand structural indicator, SSI）

# 與其他筆記的關聯與理由

- parent理由
- sibling理由
- child理由

# 來源

- [[熱帶森林林分結構與初級生產力強相關性]]
  - 提到林分結構指標可以用冠層覆蓋、葉面積指數、樹高、林分密度以及結構複雜度等結構指標來量化
  - 提到不同研究使用不同指標例如entropy-based canopy structural complexity index、structural density derived from averaging several structural metrics、 the structure measurements based on spaceborne, unmanned aerial vehicle/airborne and ground-based lidar laser scanners
- [[森林林分結構與功能-當前知識與未來挑戰]]
  - 提到多數研究的林分結構，可能是單獨使用直徑多樣性、單獨使用樹高多樣性，或將兩者結合；提到常用Shannon's diversity index、coefficient of variation 和 Gini coefficient 三種指標計算林分結構多樣性與複雜度
- [[溫帶森林結構對生物量和生產力的相關性-遙測的新視角]]
  - 提到大量的森林結構相關指標，並依據遙測、實地測量進行分類
  - 最終使用TCH代表水平結構，SDvfp代表垂直結構

# 我的其他思考

- 我感覺<font color="#2DC26B">葉層高度多樣性(FHD)</font>和<font color="#2DC26B">垂直葉面積分佈剖面(VFP)</font>從名字上來看概念好像很接近，因此請claudian幫我比較說明:
  - \*\*VFP
    - 定義：從canopy height model(CHM)通過光滅係數k=0.3重建的垂直葉面積分佈剖面，輸出每個1m高度層的定量葉面積值。
    - [[溫帶森林結構對生物量和生產力的相關性-遙測的新視角]]中的用途：計算SDvfp（標準差）直接量化垂直異質性，用於預測垂直森林結構對生物量與生產力的影響。
  - \*\*FHD
    - 定義：基於垂直葉面積分佈的多樣性指標（可能是香農指數），輸出無量綱的複雜度值。
    - [[熱帶森林林分結構與初級生產力強相關性]]中的用途：作為SSI綜合指標的四個維度之一。
  - 區別
    - VFP是定量分佈剖面（可看到每層的具體值）， FHD是派生的多樣性指標（聚合為單一度量）。
    - 可視為「先測VFP，再算FHD」的關係——同源但應用不同。

---

# 森林結構相關筆記bases

![[森林結構bases.base]]
