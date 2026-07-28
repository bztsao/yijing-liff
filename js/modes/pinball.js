// js/modes/pinball.js

export let pinballDigits = [];
let canvas, ctx;
let isAnimating = false;
let animationId;

// 物理與遊戲參數
const COLS = 10;
const PEGS_ROWS = 8;
let pegs = [];
let activeBall = null;
let power = 0;
let powerTimer = null;
let isPulling = false;

// 初始化彈珠台 (由 main.js 切換 tab 時呼叫)
export function initPinball() {
  canvas = document.getElementById('pachinkoCanvas');
  if(!canvas) return;
  ctx = canvas.getContext('2d');
  
  // 建立釘子陣列 (交錯排列)
  pegs = [];
  const startY = 60;
  const spacingX = 30;
  const spacingY = 32;
  
  for (let r = 0; r < PEGS_ROWS; r++) {
    let colsInRow = (r % 2 === 0) ? 9 : 10;
    let offsetX = (r % 2 === 0) ? 15 : 0;
    for (let c = 0; c < colsInRow; c++) {
      pegs.push({
        x: offsetX + c * spacingX + 15,
        y: startY + r * spacingY,
        r: 3 // 釘子半徑
      });
    }
  }
  
  if(!animationId) {
    updatePhysics();
  }
}

// 物理運算與畫面渲染迴圈
function updatePhysics() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 繪製釘子
  ctx.fillStyle = '#a9854f';
  pegs.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // 繪製分隔線 (0-9 洞口)
  ctx.strokeStyle = 'rgba(169, 133, 79, 0.3)';
  ctx.lineWidth = 2;
  for(let i = 1; i < COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 30, canvas.height - 30);
    ctx.lineTo(i * 30, canvas.height);
    ctx.stroke();
  }

  // 右側發射軌道牆壁
  ctx.beginPath();
  ctx.moveTo(300, 50);
  ctx.lineTo(300, canvas.height);
  ctx.stroke();

  // 處理彈珠物理
  if (activeBall) {
    let b = activeBall;
    
    // 重力
    b.vy += 0.25; 
    
    // 摩擦力與空氣阻力
    b.vx *= 0.99;
    b.vy *= 0.99;
    
    b.x += b.vx;
    b.y += b.vy;
    
    // 牆壁碰撞 (左、右、上)
    if (b.x - b.r < 0) { b.x = b.r; b.vx *= -0.6; }
    if (b.x + b.r > canvas.width) { b.x = canvas.width - b.r; b.vx *= -0.6; }
    if (b.y - b.r < 0) { b.y = b.r; b.vy *= -0.6; }
    
    // 中間隔牆碰撞 (區隔釘子區與發射區)
    if (b.x + b.r > 300 && b.x - b.r < 300 && b.y > 50) {
      if (b.vx > 0) { b.x = 300 - b.r; b.vx *= -0.5; }
      else { b.x = 300 + b.r; b.vx *= -0.5; }
    }

    // 釘子碰撞
    pegs.forEach(p => {
      let dx = b.x - p.x;
      let dy = b.y - p.y;
      let dist = Math.hypot(dx, dy);
      if (dist < b.r + p.r) {
        // 解除重疊
        let overlap = b.r + p.r - dist;
        let nx = dx / dist;
        let ny = dy / dist;
        b.x += nx * overlap;
        b.y += ny * overlap;
        
        // 速度反彈計算
        let dot = b.vx * nx + b.vy * ny;
        b.vx = (b.vx - 2 * dot * nx) * 0.6; 
        b.vy = (b.vy - 2 * dot * ny) * 0.6;
        
        // 加入隨機微擾，模擬真實不規則彈跳，避免卡死
        b.vx += (Math.random() - 0.5) * 1.5;
      }
    });

    // 繪製彈珠
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = '#b23a2b';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 判斷是否落到底部洞口
    if (b.y > canvas.height + b.r) {
      if (b.x > 300) {
        // 如果力道不夠掉回發射軌道，不扣球，重置狀態
        activeBall = null;
        isAnimating = false;
      } else {
        // 落入 0-9 洞口
        let slotIndex = Math.floor(b.x / 30);
        if (slotIndex < 0) slotIndex = 0;
        if (slotIndex > 9) slotIndex = 9;
        
        pinballDigits.push(slotIndex);
        updatePinballStatus();
        activeBall = null;
        isAnimating = false;
        
        if (pinballDigits.length === 9) {
          setTimeout(finalizePinballNumbers, 300);
        }
      }
    }
  }

  animationId = requestAnimationFrame(updatePhysics);
}

export function pullPlunger() {
  if (isAnimating || pinballDigits.length >= 9) return;
  isPulling = true;
  document.getElementById('pinballPlunger').classList.add('pulled');
  
  // 蓄力效果 (0 到 100)
  power = 0;
  clearInterval(powerTimer);
  powerTimer = setInterval(() => {
    power += 3;
    if(power > 100) power = 100;
    document.getElementById('powerFill').style.height = `${power}%`;
  }, 20);
}

export function releasePlunger() {
  if (!isPulling || isAnimating || pinballDigits.length >= 9) return;
  isPulling = false;
  clearInterval(powerTimer);
  document.getElementById('pinballPlunger').classList.remove('pulled');
  
  // 根據蓄力給予初始向上速度
  let initialVy = -(12 + (power / 100) * 12); 
  document.getElementById('powerFill').style.height = `0%`;
  
  isAnimating = true;
  // 彈珠初始位置在發射軌道底部
  activeBall = {
    x: 315,
    y: canvas.height - 10,
    r: 6,
    vx: 0,
    vy: initialVy
  };
}

function updatePinballStatus() {
  const remain = 9 - pinballDigits.length;
  document.getElementById('pinballRemain').innerText = remain;
  
  let displayStr = "";
  for(let i = 0; i < pinballDigits.length; i++) {
    displayStr += pinballDigits[i];
    if ((i + 1) % 3 === 0 && i !== 8) displayStr += " , ";
  }
  document.getElementById('pinballCollected').innerText = displayStr || "尚未擊出";
}

function finalizePinballNumbers() {
  const n1 = parseInt(pinballDigits.slice(0, 3).join(''));
  const n2 = parseInt(pinballDigits.slice(3, 6).join(''));
  const n3 = parseInt(pinballDigits.slice(6, 9).join(''));

  document.getElementById('num1').value = n1;
  document.getElementById('num2').value = n2;
  document.getElementById('num3').value = n3;

  alert(`🔮 彈珠收集完畢！\n第一組：${n1}\n第二組：${n2}\n第三組：${n3}\n請點擊下方「開始解卦」。`);
}

export function resetPinballState() {
  pinballDigits = [];
  isAnimating = false;
  activeBall = null;
  document.getElementById('pinballRemain').innerText = "9";
  document.getElementById('pinballCollected').innerText = "尚未擊出";
  document.getElementById('powerFill').style.height = `0%`;
  initPinball();
}
