// js/modes/pinball.js

export let pinballDigits = [];
let isAnimating = false;

export function pullPlunger() {
  if (isAnimating || pinballDigits.length >= 9) return;
  const plunger = document.getElementById('pinballPlunger');
  if (plunger) {
    plunger.classList.add('pulled');
  }
}

export function releasePlunger() {
  const plunger = document.getElementById('pinballPlunger');
  if (!plunger || !plunger.classList.contains('pulled')) return;
  
  plunger.classList.remove('pulled');
  
  if (isAnimating || pinballDigits.length >= 9) return;
  isAnimating = true;

  shootBall();
}

function shootBall() {
  const board = document.getElementById('pinballBoard');
  const ball = document.createElement('div');
  ball.className = 'pinball-ball';
  board.appendChild(ball);

  // 決定彈珠落入的號碼 (0-9)
  const targetNumber = Math.floor(Math.random() * 10);
  
  // 擬真彈珠路徑動畫 (使用 CSS 變數計算終點 X 座標)
  // 假設面板寬度約 100%，10個洞各佔 10%
  const slotWidth = board.clientWidth / 10;
  const targetX = (targetNumber * slotWidth) + (slotWidth / 2) - 8; // 8是彈珠半徑

  // 階段 1: 擊出向上
  setTimeout(() => {
    ball.style.transform = `translateY(-280px)`;
  }, 50);

  // 階段 2: 頂部滾動與隨機掉落
  setTimeout(() => {
    ball.style.transition = 'transform 1.5s cubic-bezier(0.25, 1, 0.5, 1)'; // 模擬掉落碰撞
    ball.style.transform = `translate(calc(-100% + ${targetX}px), 0px)`;
  }, 400);

  // 階段 3: 落入洞口並結算
  setTimeout(() => {
    pinballDigits.push(targetNumber);
    updatePinballStatus();
    ball.remove();
    isAnimating = false;

    // 如果 9 顆都打完了，整理出 3 組號碼
    if (pinballDigits.length === 9) {
      setTimeout(finalizePinballNumbers, 300);
    }
  }, 1900);
}

function updatePinballStatus() {
  const remain = 9 - pinballDigits.length;
  document.getElementById('pinballRemain').innerText = remain;
  
  // 顯示目前收集到的數字，每 3 個一組
  let displayStr = "";
  for(let i = 0; i < pinballDigits.length; i++) {
    displayStr += pinballDigits[i];
    if ((i + 1) % 3 === 0 && i !== 8) displayStr += " , ";
  }
  document.getElementById('pinballCollected').innerText = displayStr || "尚未擊出彈珠";
}

function finalizePinballNumbers() {
  const n1 = parseInt(pinballDigits.slice(0, 3).join(''));
  const n2 = parseInt(pinballDigits.slice(3, 6).join(''));
  const n3 = parseInt(pinballDigits.slice(6, 9).join(''));

  document.getElementById('num1').value = n1;
  document.getElementById('num2').value = n2;
  document.getElementById('num3').value = n3;

  alert(`🔮 彈珠收集完畢！\n第一組：${n1}\n第二組：${n2}\n第三組：${n3}\n請點擊「開始解卦」。`);
}

export function resetPinballState() {
  pinballDigits = [];
  isAnimating = false;
  document.getElementById('pinballRemain').innerText = "9";
  document.getElementById('pinballCollected').innerText = "尚未擊出彈珠";
  const board = document.getElementById('pinballBoard');
  if(board) board.innerHTML = ""; // 清除所有彈珠
}
