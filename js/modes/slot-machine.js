// js/modes/slot-machine.js

let slotTimeoutTimer = null;
export let slotRowState = [false, false, false]; 

export function initSlotReels() {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const strip = document.getElementById(`reel-${r}-${c}`);
      if (!strip) continue;
      let html = '';
      for (let i = 0; i < 20; i++) {
        html += `<div class="slot-num">${i % 10}</div>`;
      }
      strip.innerHTML = html;
      strip.style.transform = `translateY(-${(r + c + 1) * 46}px)`;
    }
  }
}

export function clearSlotTimer() {
  if (slotTimeoutTimer) {
    clearTimeout(slotTimeoutTimer);
    slotTimeoutTimer = null;
  }
}

export function startSlotTimeoutTimer(rowIndex) {
  clearSlotTimer();
  // 第一台不自動
  if (rowIndex === 0) return;
  
  slotTimeoutTimer = setTimeout(() => {
    autoPullLever(rowIndex);
  }, 10000);
}

export function pullLever(rowIndex) {
  const lever = document.getElementById(`lever-${rowIndex}`);
  if (!lever || lever.classList.contains('disabled')) return;
  lever.classList.remove('rebounding');
  lever.classList.add('pulled');
}

export function releaseLever(rowIndex) {
  const lever = document.getElementById(`lever-${rowIndex}`);
  if (!lever || lever.classList.contains('disabled') || !lever.classList.contains('pulled')) return;
  
  lever.classList.remove('pulled');
  lever.classList.add('rebounding');
  startSpinRow(rowIndex);
}

function autoPullLever(rowIndex) {
  pullLever(rowIndex);
  setTimeout(() => { releaseLever(rowIndex); }, 300);
}

function startSpinRow(rowIndex) {
  clearSlotTimer();
  const lever = document.getElementById(`lever-${rowIndex}`);
  if (lever) lever.classList.add('disabled');

  for (let c = 0; c < 3; c++) {
    document.getElementById(`reel-${rowIndex}-${c}`).classList.add('spinning');
  }

  const numVal = Math.floor(Math.random() * 900) + 100;
  const numStr = numVal.toString();
  document.getElementById(`num${rowIndex + 1}`).value = numVal;

  for (let c = 0; c < 3; c++) {
    const targetDigit = parseInt(numStr[c]);
    const stopDelay = 2500 + c * 250; 

    setTimeout(() => {
      const strip = document.getElementById(`reel-${rowIndex}-${c}`);
      strip.classList.remove('spinning');
      strip.style.transform = `translateY(-${targetDigit * 46}px)`;

      if (c === 2) {
        slotRowState[rowIndex] = true;
        if (rowIndex < 2) {
          const nextLever = document.getElementById(`lever-${rowIndex + 1}`);
          if (nextLever) {
            nextLever.classList.remove('disabled');
            startSlotTimeoutTimer(rowIndex + 1);
          }
        } else {
          setTimeout(() => {
            alert(`🎰 三台拉霸機已全部停穩！\n請點擊下方「開始解卦」查看結果！`);
          }, 300);
        }
      }
    }, stopDelay);
  }
}

export function resetSlotState() {
  clearSlotTimer();
  slotRowState = [false, false, false];
  document.getElementById('lever-0')?.classList.remove('disabled', 'pulled', 'rebounding');
  document.getElementById('lever-1')?.classList.add('disabled');
  document.getElementById('lever-1')?.classList.remove('pulled', 'rebounding');
  document.getElementById('lever-2')?.classList.add('disabled');
  document.getElementById('lever-2')?.classList.remove('pulled', 'rebounding');
}
