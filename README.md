# yijing-liff
yijing-liff
📖 專案架構與開發者指南 (Developer Guide)
📌 1. 專案概述 (Project Overview)
本專案為一個基於「傅佩榮教授數字卦」邏輯的易經占卜 Web App。
為了提供最佳的手機端體驗，專案與 LINE LIFF 深度整合，讓使用者可以直接在 LINE 聊天室中開啟、自動帶入 LINE 暱稱、算卦，並一鍵將結果發送回 LINE 聊天室中。使用者的占卜紀錄會同步備份至 Firebase Firestore 資料庫中。

🛠 2. 技術堆疊 (Tech Stack)
本專案採用最輕量化的純前端架構（Vanilla JS），不依賴 React/Vue 等框架，確保載入速度極快。

前端介面：HTML5, CSS3 (CSS Variables, Flexbox), Vanilla JavaScript (ES6)

網頁代管：GitHub Pages ([https://bztsao.github.io/yijing-liff/](https://bztsao.github.io/yijing-liff/))

後端資料庫：Firebase Firestore (Web SDK v12 模組化載入)

第三方整合：LINE LIFF SDK (Edge v2)

📂 3. 檔案與程式碼結構 (Code Structure)
目前所有邏輯皆集中於單一檔案 index.html，主要分為三個區塊：

<style> (CSS 樣式區)

採用 CSS Variables (:root) 管理主題色彩（如：--ink, --paper, --seal）。

響應式設計：透過 @media (max-width: 400px) 針對小螢幕手機微調佈局。

UI 互動特效：包含印章蓋下的動畫（@keyframes stampdown）、展開式折疊面板（details/summary）、以及針對手機觸控優化的名詞解釋提示框（.term-hover）。

<body> (HTML 結構區)

.app：主要容器。

#inputCard：輸入區塊（包含問題與三組數字）。

#resultArea：結果渲染區（預設為空，由 JS 動態生成 HTML 寫入）。

<script type="module"> (JavaScript 邏輯區)

使用 ES6 type="module" 以支援 Firebase v12 的 import 語法。

包含四大模組：LIFF 初始化、Firebase 寫入、易經核心資料/演算法、UI 渲染與事件綁定。

⚙️ 4. 核心功能與資料流 (Core Workflows)
A. LINE LIFF 初始化 (initializeLiff)
載入 SDK 後呼叫 liff.init()。

若在 LINE 環境中執行，透過 liff.getProfile() 取得使用者的 displayName（暱稱），並動態更改頁面標題為「[暱稱]，問卦」。

B. 易經演算法 (Divination Logic)
起卦邏輯：使用者輸入三組數字 (n1, n2, n3)。

下卦 (內卦) = n1 % 8

上卦 (外卦) = n2 % 8

動爻 = n3 % 6

轉譯卦象：

透過 BAGUA_NUM 將餘數轉換為二進位字串（如 111 代表乾卦）。

結合上下卦的二進位字串，透過 KINGWEN_TABLE 查表得出「本卦」的卦號（1~64）。

將動爻位置的二進位反轉（陽變陰、陰變陽），再次查表得出「之卦（變卦）」的卦號。

資料庫 (HEXAGRAMS)：內建完整的 64 卦卦辭、384 爻爻辭與對應的白話文翻譯。

C. Firebase 雲端紀錄 (saveLogToFirebase)
每次按下「開始解卦」時，非同步呼叫 addDoc 寫入至 divination_logs 集合。

安全機制：Firebase API Key 已在 Google Cloud Console 中設定 HTTP Referrer 限制，僅允許 [https://bztsao.github.io/yijing-liff/](https://bztsao.github.io/yijing-liff/)* 存取。

D. 分享至 LINE 聊天室 (shareLiffBtn)
確認 liff.isInClient() 為 true 時，呼叫 liff.sendMessages()。

將運算出的「所問之事」、「本卦動爻」與「白話文釋義」組合成純文字訊息，發送至使用者當前所在的聊天室。

🗄 5. 資料庫綱要 (Database Schema)
Firebase Firestore 集合名稱：divination_logs

timestamp: (Timestamp) 伺服器時間

lineDisplayName: (String) LINE 暱稱（若非 LINE 環境則為"網頁版匿名用戶"）

question: (String) 所問之事（可留空）

numbers: (Array) 輸入的三組數字 [n1, n2, n3]

origHex: (String) 本卦名稱（例："乾卦"）

movingYao: (String) 動爻位置（例："第初爻"）

zhiHex: (String) 之卦名稱（例："姤卦"）

🔧 6. 開發者維護注意事項 (Troubleshooting)
環境限制：

「分享至聊天室」與「關閉視窗」功能只能在 LINE APP 內建瀏覽器中運作。若在一般電腦瀏覽器（如 Chrome）點擊會跳出 alert 提示。

API 金鑰與 ID：

LIFF ID: 寫死在 JS 的 liff.init() 中。若未來更換 LINE Channel，需同步更新此 ID。

Firebase API Key: 公開於前端程式碼中（這是 Firebase Web 架構的正常現象）。安全防護依賴 Google Cloud 的網域限制。如果未來專案更換網址（例如自訂網域），務必前往 Google Cloud Console 更新白名單，否則資料將無法寫入。

UI 互動除錯：

為了手機版體驗，名詞解釋的提示框（.term-hover .term-tip）捨棄了單純的 CSS :hover，改用 JS 監聽 click 事件來切換 .active class，並監聽 document 的點擊來實現「點擊空白處關閉」的功能。未來若要新增類似的提示框，請遵循此邏輯。
