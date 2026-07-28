// js/main.js
import { BAGUA_NUM, KINGWEN_TABLE, HEXAGRAMS } from './data.js';
import { saveLogToFirebase } from './firebase-logger.js';
import { 
  initSlotReels, clearSlotTimer, startSlotTimeoutTimer, 
  pullLever, releaseLever, resetSlotState, slotRowState 
} from './modes/slot-machine.js';
// 匯入彈珠台模組
import { 
  pullPlunger, releasePlunger, resetPinballState, initPinball 
} from './modes/pinball.js';

let lineUserProfile = null;

// 將所有外部模組與自定義函數掛載到 window，讓 HTML 的 onClick 找得到
window.pullLever = pullLever;
window.releaseLever = releaseLever;
window.pullPlunger = pullPlunger;     // 綁定彈珠台拉桿事件
window.releasePlunger = releasePlunger; // 綁定彈珠台放開事件

async function initializeLiff() {
  try {
    await liff.init({ liffId: "2010856396-j6rzTCKE" }); 
    if (!liff.isLoggedIn()) {
      liff.login();
    } else {
      lineUserProfile = await liff.getProfile();
      document.getElementById('greetingTitle').textContent = `${lineUserProfile.displayName}道友，問卦`;
    }
  } catch (err) {
    console.error("LIFF 初始化失敗", err);
  }
}

// UI 模式切換
window.switchMode = function(mode) {
  clearSlotTimer();
  
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => btn.classList.remove('active'));
  
  document.getElementById('modeInput').style.display = 'none';
  document.getElementById('modeRandom').style.display = 'none';
  document.getElementById('modeSlot').style.display = 'none';
  const modePinball = document.getElementById('modePinball');
  if (modePinball) modePinball.style.display = 'none';
  
  // 清空輸入
  document.getElementById('num1').value = "";
  document.getElementById('num2').value = "";
  document.getElementById('num3').value = "";
  document.getElementById('randomDisplay').innerHTML = ""; 
  
  if (mode === 'input') {
    tabBtns[0].classList.add('active');
    document.getElementById('modeInput').style.display = 'block';
  } else if (mode === 'random') {
    tabBtns[1].classList.add('active');
    document.getElementById('modeRandom').style.display = 'block';
  } else if (mode === 'slot') {
    tabBtns[2].classList.add('active');
    document.getElementById('modeSlot').style.display = 'block';
    if (!slotRowState[0]) startSlotTimeoutTimer(0);
  } else if (mode === 'pinball') {
    if (tabBtns[3]) tabBtns[3].classList.add('active');
    if (modePinball) modePinball.style.display = 'block';
    // 在這裡初始化彈珠台畫布
    setTimeout(initPinball, 50); 
  }
};

const POS_NAME = ["初","二","三","四","五","上"];

function buildHexVis(bits, movingIdx) {
  let html = '<div class="hexvis">';
  for(let i=0;i<6;i++){
    const isYang = bits[i]==="1";
    const isMoving = (i === movingIdx);
    html += `<div class="seg ${isYang?'':'yin'} ${isMoving?'moving':''}">`;
    html += isYang ? `<span></span>` : `<span></span><span></span>`;
    html += `</div>`;
  }
  html += '</div>';
  return html;
}

function yaoBlock(hex, idx, highlight){
  const y = hex.yao[idx];
  return `<div class="yaoitem ${highlight?'this-line':''}">
    <div class="block-label">${POS_NAME[idx]}爻</div>
    <div class="orig">${y.o}</div>
    <div class="trans">${y.t}</div>
  </div>`;
}

function createHoverTerm(term, tipContent) {
  return `
    <span class="term-hover">
      ${term}
      <span class="term-tip">${tipContent}</span>
    </span>
  `;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

window.resetApp = function() {
  resetSlotState();
  resetPinballState(); // 重置彈珠台狀態
  document.getElementById('resultArea').innerHTML = "";
  document.getElementById('question').value = "";
  document.getElementById('num1').value = "";
  document.getElementById('num2').value = "";
  document.getElementById('num3').value = "";
  document.getElementById('randomDisplay').innerHTML = "";
  document.getElementById('inputCard').style.display = "";
  window.scrollTo({top:0, behavior:'smooth'});
}

window.showResult = function(n1, n2, n3) {
  clearSlotTimer();
  let lowerIdx = n1 % 8 || 8;
  let upperIdx = n2 % 8 || 8;
  let yaoIdx = n3 % 6 || 6;
  
  let movingIdx = yaoIdx - 1;
  let bitsOrig = BAGUA_NUM[lowerIdx] + BAGUA_NUM[upperIdx];
  
  let arr = bitsOrig.split('');
  arr[movingIdx] = arr[movingIdx] === '1' ? '0' : '1';
  let bitsZhi = arr.join('');

  const numOrig = KINGWEN_TABLE[BAGUA_NUM[lowerIdx]][BAGUA_NUM[upperIdx]];
  const numZhi = KINGWEN_TABLE[bitsZhi.substring(0,3)][bitsZhi.substring(3,6)];
  
  const hexOrig = HEXAGRAMS[numOrig];
  const hexZhi = HEXAGRAMS[numZhi];
  const q = document.getElementById('question').value.trim();

  saveLogToFirebase({
    question: q, numbers: [n1, n2, n3],
    origHex: `${hexOrig.name}卦`, movingYao: `第${POS_NAME[movingIdx]}爻`, zhiHex: `${hexZhi.name}卦`
  }, lineUserProfile);

  let html = `<div class="card" style="position:relative;">`;
  html += `<div class="seal-stamp stamped">${hexOrig.name}</div>`;
  if(q) html += `<div class="question-echo">所問之事：${escapeHtml(q)}</div>`;
  
  html += `<div class="result-header">${buildHexVis(bitsOrig, movingIdx)}`;
  html += `<div><div class="hexname">${hexOrig.name}卦</div><div class="hexmeta">${hexOrig.upper}上 ${hexOrig.lower}下 · 第${hexOrig.num}卦</div></div></div>`;
  html += `<div class="divider"></div>`;
  
  html += `<div class="block-label">${createHoverTerm("本卦卦辭", "代表你當下處境的總結")}</div><div class="orig">${hexOrig.gua.o}</div><div class="trans">${hexOrig.gua.t}</div>`;
  html += `<div class="yao-focus"><div class="block-label">${createHoverTerm(`解卦重點：${hexOrig.name}卦 第${POS_NAME[movingIdx]}爻`, "核心指引")}</div>`;
  html += `<div class="orig">${hexOrig.yao[movingIdx].o}</div><div class="trans">${hexOrig.yao[movingIdx].t}</div></div>`;

  html += `<details class="yao-details"><summary class="yao-summary">${createHoverTerm("展開本卦六爻", "事情發展階段")}</summary>`;
  for(let i=0;i<6;i++) html += yaoBlock(hexOrig, i, i===movingIdx);
  html += `</details></div>`; 

  // 變卦
  html += `<div class="card"><div class="block-label">${createHoverTerm("變卦 (之卦)", "未來客觀趨勢")}</div>`;
  html += `<div class="changed-hex">${buildHexVis(bitsZhi, null)}<div><div class="hexname">${hexZhi.name}卦</div><div class="hexmeta">${hexZhi.upper}上 ${hexZhi.lower}下 · 第${hexZhi.num}卦</div></div></div>`;
  html += `<div class="divider"></div>`;
  html += `<div class="block-label">${createHoverTerm("之卦卦辭", "未來吉凶參考")}</div><div class="orig">${hexZhi.gua.o}</div><div class="trans">${hexZhi.gua.t}</div>`;
  html += `<details class="yao-details"><summary class="yao-summary">展開之卦六爻</summary>`;
  for(let i=0;i<6;i++) html += yaoBlock(hexZhi, i, false);
  html += `</details></div>`;

  html += `<div class="actions-row"><div class="buttons-group">
      <button class="ghost" onclick="resetApp()" style="flex:1;">重新問卦</button>
      <button class="ghost" id="closeLiffBtn" style="flex:1;">結束並離開</button>
    </div><button class="line-btn" id="shareLiffBtn">將卦象發送至聊天室</button></div>`;

  document.getElementById('inputCard').style.display = "none";
  document.getElementById('resultArea').innerHTML = html;

  document.getElementById('closeLiffBtn').addEventListener('click', () => {
    liff.isInClient() ? liff.closeWindow() : alert("此功能僅在 LINE 內部開啟時有效。");
  });

  document.getElementById('shareLiffBtn').addEventListener('click', async () => {
    if (!liff.isLoggedIn() || !liff.isInClient()) return alert("請在 LINE 聊天室內開啟此網頁喔！");
    let msgText = `【我的數字卦結果】\n`;
    if(q) msgText += `所問之事：${q}\n`;
    msgText += `本卦：${hexOrig.name}卦 第${POS_NAME[movingIdx]}爻\n之卦：${hexZhi.name}卦\n\n「${hexOrig.yao[movingIdx].o}」\n${hexOrig.yao[movingIdx].t}`;
    try { await liff.sendMessages([{ type: "text", text: msgText }]); alert("✅ 已成功發送！"); } 
    catch (err) { alert("發送失敗"); }
  });

  const termHovers = document.querySelectorAll('.term-hover');
  termHovers.forEach(term => {
    term.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = term.classList.contains('active');
      termHovers.forEach(t => t.classList.remove('active'));
      if (!isActive) term.classList.add('active');
    });
  });
}

document.addEventListener('click', () => {
  document.querySelectorAll('.term-hover').forEach(t => t.classList.remove('active'));
});

// 初始化
window.addEventListener('DOMContentLoaded', () => {
  initializeLiff();
  initSlotReels();

  document.getElementById('randomNumBtn').addEventListener('click', () => {
    const v1 = Math.floor(Math.random() * 900) + 100;
    const v2 = Math.floor(Math.random() * 900) + 100;
    const v3 = Math.floor(Math.random() * 900) + 100;
    document.getElementById('num1').value = v1;
    document.getElementById('num2').value = v2;
    document.getElementById('num3').value = v3;
    document.getElementById('randomDisplay').innerHTML = `${v1} , ${v2} , ${v3}`;
  });

  document.getElementById('startBtn').addEventListener('click', () => {
    // 檢查拉霸機模式防呆
    if(document.getElementById('modeSlot').style.display === 'block'){
       if(!slotRowState[0] || !slotRowState[1] || !slotRowState[2]){
           return alert("請先拉動完三台乾坤拉霸機喔！");
       }
    }
    
    // 取得三組數字 (如果是彈珠台模式，也會在 finalizePinballNumbers 中自動寫入這三個 input)
    const n1 = parseInt(document.getElementById('num1').value);
    const n2 = parseInt(document.getElementById('num2').value);
    const n3 = parseInt(document.getElementById('num3').value);
    if(!n1 || !n2 || !n3) return alert("請完整輸入或抽出三組數字！");
    
    showResult(n1, n2, n3);
  });
});
