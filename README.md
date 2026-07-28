# 易經問卦 (Yijing-LIFF) - 專案架構與開發指南

> **🤖 致未來 AI 協作者的提示 (AI Context Prompt)**
> 讀取此文件代表您已掌握本專案的完整架構與業務邏輯。當使用者提出修改需求時，請參考本文件的目錄結構，精準判斷需要修改哪個模組，並視情況請使用者提供該特定檔案的程式碼，切勿要求使用者貼上整個專案的原始碼。

---

## 專案概述 (Project Overview)
本專案為一個基於「傅佩榮教授數字卦」邏輯的易經占卜 Web App。
採用最輕量化的純前端架構（Vanilla JS + ES6 Modules），不依賴 React/Vue 等重型框架。專案深度整合 LINE LIFF SDK，並將使用者的占卜紀錄同步備份至 Firebase Firestore 資料庫。

**核心特色：**
1. **多重選號模式**：包含「自由輸入」、「交予天意（隨機）」與「乾坤拉霸（擬真老虎機）」三種互動模式。
2. **模組化架構**：以 ES6 `import/export` 進行職責分離，易於維護與擴充新玩法。
3. **沉浸式 UI/UX**：自製 CSS 拉霸桿 (Lever) 物理動畫、蓋章特效、東方玄學風格的色彩計畫 (CSS Variables)。

---

## 📂 目錄結構與檔案職責 (File Architecture)

```text
yijing-liff/
│
├── index.html               # 應用的 UI 骨架 (DOM 架構)
├── css/
│   └── style.css            # 全域樣式、CSS 變數、拉霸機與拉桿動畫
└── js/
    ├── main.js              # 主程式入口 (Controller)
    ├── data.js              # 易經 64 卦資料庫 (Model)
    ├── firebase-logger.js   # Firebase 資料庫連線模組 (Service)
    └── modes/
        └── slot-machine.js  # 拉霸機互動與動畫邏輯模組 (View/Controller)
