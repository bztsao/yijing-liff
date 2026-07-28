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

# 專案檔案詳細說明 (File Architecture)

本文件詳細說明 `yijing-liff` 專案中各個檔案的具體用途與核心機制。

---

## 1. `index.html` (UI 骨架)
*   **用途**：定義網頁的 HTML 結構，包含 LINE LIFF SDK 與 `js/main.js` (type="module") 的載入。
*   **關鍵區塊**：
    *   `.mode-tabs`：模式切換頁籤。
    *   `#modeInput`, `#modeRandom`, `#modeSlot`：三種選號玩法的 UI 容器。
    *   `.slot-machine-container`：拉霸機的捲軸 (`.slot-reel`) 與實體拉桿 (`.lever-container`) DOM 結構。
    *   `#resultArea`：預留給 JS 動態注入解卦結果的空白容器。

---

## 2. `css/style.css` (視覺與動畫)
*   **用途**：專案的所有 CSS 樣式。
*   **關鍵機制**：
    *   **CSS Variables**：定義於 `:root`，如 `--ink`, `--seal`, `--brass` 等主題色。
    *   **動畫 (Animations)**：
        *   `@keyframes reelSpin`：拉霸機滾軸無限滾動動畫。
        *   `@keyframes leverRebound`：拉霸桿被拉下後放開的回彈物理動畫。
        *   `@keyframes stampdown`：結果頁面的印章蓋下特效。

---

## 3. `js/main.js` (主程式與核心邏輯)
*   **用途**：串接所有模組，處理全域事件與解卦演算法。
*   **關鍵機制**：
    *   **初始化**：執行 `liff.init()` 取得 LINE 使用者資料。
    *   **全域綁定**：將 `switchMode`, `pullLever`, `releaseLever`, `resetApp` 綁定至 `window`，供 HTML 的 `onclick` 等屬性呼叫。
    *   **UI 流程控制 (`switchMode`)**：控制頁籤切換與重置輸入狀態。
    *   **易經演算法 (`showResult`)**：
        *   讀取三組數字 (n1, n2, n3)。
        *   計算下卦 (n1 % 8)、上卦 (n2 % 8) 與動爻 (n3 % 6)。
        *   二進位轉換與查表，產生「本卦」與「之卦（變卦）」。
    *   **結果渲染**：將 `data.js` 的爻辭與白話文動態組裝成 HTML 字串，注入 `#resultArea`。

---

## 4. `js/data.js` (易經資料庫)
*   **用途**：純資料存放，大幅減少主程式的體積。
*   **關鍵資料**：
    *   `BAGUA_NUM`：先天八卦對應的三位二進位字串。
    *   `KINGWEN_TABLE`：六十四卦二進位對應表。
    *   `HEXAGRAMS`：64 卦的詳細資料物件（包含卦辭、六爻爻辭及白話文解釋）。

---

## 5. `js/firebase-logger.js` (雲端日誌)
*   **用途**：負責與 Firebase Firestore 溝通。
*   **關鍵機制**：
    *   使用 Firebase Web SDK (v10+)。
    *   `saveLogToFirebase`：非同步函數，寫入使用者的問卦紀錄、LINE 暱稱、IP 位址與裝置資訊。

---

## 6. `js/modes/slot-machine.js` (拉霸機模組)
*   **用途**：獨立封裝「乾坤拉霸」玩法的複雜邏輯與計時器。
*   **關鍵機制**：
    *   **狀態管理**：`slotRowState` 陣列紀錄三台機器是否已停穩。
    *   **互動邏輯**：`pullLever` (拉下) 與 `releaseLever` (回彈放開) 控制 CSS 類別。
    *   **定時自動機制**：`startSlotTimeoutTimer`。第一台必須手動觸發；第二、三台若 10 秒內未拉動，將自動呼叫 `autoPullLever` 幫使用者拉下。
    *   **滾軸停止邏輯 (`startSpinRow`)**：產生隨機三位數，利用 `setTimeout` 讓單台機器的三個數字以 0.25 秒的間隔，在 3 秒內由左至右依序停穩（修改 `transform: translateY`）。
