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

// 發射軌道「導引彎道」參數：球從發射道垂直衝上來後，
// 進入這段高度以下就會開始被導引彎道拉走，在固定的 BEND_FRAMES 影格內
// 把速度方向從「垂直向上」平滑轉成「水平向左」，才能真正飛出發射道、落進釘子盤面。
// 用固定影格數（而不是用某個 y 座標當作「轉彎完成」的終點）是為了避免力道不同時
// 轉彎轉到一半、球已經沒有上升動能卻還沒轉完，導致卡住飛不出去。
const CURVE_BOTTOM = 170;  // 開始轉彎的 y 座標
const BEND_FRAMES = 35;    // 轉彎耗費的固定影格數

// 底部號碼格（口袋）參數：從 POCKET_TOP 到畫布底部這段，
// 每個數字格之間都有實體隔牆，球掉進哪一格就只會停在那一格，
// 而且隔牆夠高，同一格可以疊好幾顆球（見 restingCounts）。
const POCKET_TOP = 300;
const BALL_R = 6;
const BALL_D = BALL_R * 2;

// 每個數字格目前已經堆了幾顆球（用來把新球疊在舊球上面，而不是疊在一起穿模）
let restingCounts = new Array(COLS).fill(0);

// 初始化彈珠台 (由 main.js 切換 tab 時呼叫)
export function initPinball() {
  canvas = document.getElementById('pachinkoCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  // 建立釘子陣列 (交錯排列，僅分布在盤面區 x:0~300，右側留給發射道)
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

  if (!animationId) {
    updatePhysics();
  }
}

// 畫出底部號碼格之間的隔牆（純視覺，實體碰撞在物理迴圈裡另外處理）
function drawPocketWalls() {
  ctx.fillStyle = '#a9854f';
  for (let wx = 30; wx <= 300; wx += 30) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(wx - 2, POCKET_TOP, 4, canvas.height - POCKET_TOP, 2);
    } else {
      ctx.rect(wx - 2, POCKET_TOP, 4, canvas.height - POCKET_TOP);
    }
    ctx.fill();
  }
}

// 畫出每一格底部已經堆疊、靜止的球
function drawRestingBalls() {
  for (let slot = 0; slot < COLS; slot++) {
    const count = restingCounts[slot];
    for (let k = 0; k < count; k++) {
      const cx = slot * 30 + 15;
      const cy = canvas.height - BALL_R - k * BALL_D;
      ctx.beginPath();
      ctx.arc(cx, cy, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = '#b23a2b';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
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

  // 繪製底部號碼格隔牆與已堆疊的球
  drawPocketWalls();
  drawRestingBalls();

  // 繪製發射道的導引彎道（純視覺，讓玩家看得出球會從這裡繞進盤面）
  ctx.save();
  ctx.strokeStyle = 'rgba(169, 133, 79, 0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(315, canvas.height);
  ctx.lineTo(315, CURVE_BOTTOM);
  ctx.quadraticCurveTo(315, CURVE_BOTTOM - 90, 255, CURVE_BOTTOM - 100);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 處理彈珠物理
  if (activeBall) {
    let b = activeBall;

    // 重力
    b.vy += 0.25;

    // 摩擦力與空氣阻力
    b.vx *= 0.99;
    b.vy *= 0.99;

    // 導引彎道：球還沒轉完彎、且已經進入彎道高度範圍時，
    // 用「已經在彎道裡待了幾格」(bendFrames) 算出轉彎進度 t (0→1)，
    // 把目前速度大小重新分配到 vx / vy 上，讓球自然地「轉」進盤面。
    // 用固定影格數而非固定 y 座標判斷「轉完了沒」，
    // 才不會因為力道不同、爬升速度不同，導致轉一半就沒動能卡在半空中。
    if (!b.bendDone && b.y <= CURVE_BOTTOM) {
      if (b.bendFrames < 0) b.bendFrames = 0;
      let t = Math.min(1, b.bendFrames / BEND_FRAMES);
      let speed = Math.hypot(b.vx, b.vy);
      b.vx = -speed * Math.sin(t * Math.PI / 2);
      b.vy = -speed * Math.cos(t * Math.PI / 2);
      b.bendFrames++;
      if (t >= 1) {
        b.bendDone = true; // 轉彎完成，正式進入盤面，之後跟一般彈珠一樣受重力與釘子影響
      }
    }

    b.x += b.vx;
    b.y += b.vy;

    // 牆壁碰撞 (左、右、上)
    if (b.x - b.r < 0) { b.x = b.r; b.vx *= -0.6; }
    if (b.x + b.r > canvas.width) { b.x = canvas.width - b.r; b.vx *= -0.6; }
    if (b.y - b.r < 0) { b.y = b.r; b.vy *= -0.6; }

    // 底部號碼格隔牆碰撞：球一旦進入口袋區高度，就不能再跨過隔牆到隔壁格
    if (b.y + b.r > POCKET_TOP) {
      for (let wx = 30; wx <= 300; wx += 30) {
        if (Math.abs(b.x - wx) < b.r) {
          if (b.x < wx) { b.x = wx - b.r; b.vx *= -0.4; }
          else { b.x = wx + b.r; b.vx *= -0.4; }
        }
      }
    }

    // 釘子碰撞
    pegs.forEach(p => {
      let dx = b.x - p.x;
      let dy = b.y - p.y;
      let dist = Math.hypot(dx, dy);
      if (dist < b.r + p.r && dist > 0) {
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

    // 判斷是否已經落到底、疊在該格目前的球堆最上面
    let slotIndex = Math.floor(b.x / 30);
    if (slotIndex < 0) slotIndex = 0;
    if (slotIndex > 9) slotIndex = 9;
    const stackTop = canvas.height - restingCounts[slotIndex] * BALL_D - BALL_R;

    if (b.bendDone && b.y >= stackTop) {
      // 已經成功轉進盤面、且落到目前球堆頂端：算數，疊上去
      b.x = slotIndex * 30 + 15;
      b.y = stackTop;
      restingCounts[slotIndex]++;

      pinballDigits.push(slotIndex);
      updatePinballStatus();
      activeBall = null;
      isAnimating = false;

      if (pinballDigits.length === 9) {
        setTimeout(finalizePinballNumbers, 300);
      }
    } else if (!b.bendDone && b.y > canvas.height + b.r) {
      // 力道不夠、還沒轉出發射道就掉回去了：不扣球，讓玩家重打一次
      activeBall = null;
      isAnimating = false;
    } else {
      // 還在飛行中，畫出目前位置
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = '#b23a2b';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  animationId = requestAnimationFrame(updatePhysics);
}

export function pullPlunger() {
  if (isAnimating || pinballDigits.length >= 9) return;
  isPulling = true;
  const plunger = document.getElementById('pinballPlunger');
  plunger.classList.remove('rebounding');
  plunger.classList.add('pulled');

  // 蓄力效果 (0 到 100)
  power = 0;
  clearInterval(powerTimer);
  powerTimer = setInterval(() => {
    power += 3;
    if (power > 100) power = 100;
    document.getElementById('powerFill').style.height = `${power}%`;
  }, 20);
}

export function releasePlunger() {
  if (!isPulling || isAnimating || pinballDigits.length >= 9) return;
  isPulling = false;
  clearInterval(powerTimer);
  const plunger = document.getElementById('pinballPlunger');
  plunger.classList.remove('pulled');
  plunger.classList.add('rebounding'); // 放開後拉桿彈回原位的動態

  // 根據蓄力給予初始向上速度
  let initialVy = -(12 + (power / 100) * 12);
  document.getElementById('powerFill').style.height = `0%`;

  isAnimating = true;
  // 彈珠初始位置在發射軌道底部，此時尚未轉彎進場 (bendDone = false)
  activeBall = {
    x: 315,
    y: canvas.height - 10,
    r: BALL_R,
    vx: 0,
    vy: initialVy,
    bendDone: false,
    bendFrames: -1
  };
}

function updatePinballStatus() {
  const remain = 9 - pinballDigits.length;
  document.getElementById('pinballRemain').innerText = remain;

  let displayStr = "";
  for (let i = 0; i < pinballDigits.length; i++) {
    displayStr += pinballDigits[i];
    if ((i + 1) % 3 === 0 && i !== 8) displayStr += " , ";
  }
  document.getElementById('pinballCollected').innerText = displayStr || "尚未擊出";
}

function finalizePinballNumbers() {
  // 依照小鋼珠打出的先後順序組成三組三位數
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
  restingCounts = new Array(COLS).fill(0);
  document.getElementById('pinballRemain').innerText = "9";
  document.getElementById('pinballCollected').innerText = "尚未擊出";
  document.getElementById('powerFill').style.height = `0%`;
  document.getElementById('pinballPlunger')?.classList.remove('pulled', 'rebounding');
  initPinball();
}
