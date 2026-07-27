// js/firebase-logger.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC_li0YrVcip8kUH4RUGAc02ZUg7TOHe0k",
  authDomain: "yijing-liff-db.firebaseapp.com",
  projectId: "yijing-liff-db",
  storageBucket: "yijing-liff-db.firebasestorage.app",
  messagingSenderId: "74327452397",
  appId: "1:74327452397:web:1653ef64e542712f1ebae4",
  measurementId: "G-SJQMJZJ03T"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function saveLogToFirebase(logData, lineUserProfile) {
  try {
    let userIp = "未知";
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      userIp = ipData.ip;
    } catch (ipErr) {
      console.warn("無法取得 IP 位址:", ipErr);
    }

    let lineUserId = "未知";
    if (window.liff && window.liff.isLoggedIn() && lineUserProfile) {
      lineUserId = lineUserProfile.userId;
    }

    const docRef = await addDoc(collection(db, "divination_logs"), {
      timestamp: serverTimestamp(),
      question: logData.question || "未填寫",
      numbers: logData.numbers,
      origHex: logData.origHex,
      movingYao: logData.movingYao,
      zhiHex: logData.zhiHex,
      lineUserId: lineUserId,
      lineDisplayName: lineUserProfile ? lineUserProfile.displayName : "網頁版匿名用戶",
      requestPayload: {
        ip: userIp,
        userAgent: navigator.userAgent,
        language: navigator.language
      }
    });
    console.log("✅ Log 已成功寫入 Firestore，文件 ID:", docRef.id);
  } catch (e) {
    console.error("❌ 寫入 Log 失敗:", e);
  }
}
