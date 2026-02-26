import { BUSINESSES } from './data.js';
import { state } from './state.js';
import { getBizState, getBizDef, getIncome, isUnlocked } from './formulas.js';
import { fmt } from './format.js';

export const progressTimers = {};

export function startProgress(bizId) {
  const bs = getBizState(bizId), def = getBizDef(bizId);
  if (bs.running || bs.count===0) return;
  bs.running=true; bs.progress=0;
  clearInterval(progressTimers[bizId]);
  const startTime = Date.now(), duration = def.timer*(bs.timerMult||1)*1000;
  progressTimers[bizId] = setInterval(()=>{
    bs.progress = Math.min((Date.now()-startTime)/duration, 1);
    updateProgressBar(bizId);
    if (bs.progress>=1) {
      clearInterval(progressTimers[bizId]);
      delete progressTimers[bizId];
      bs.running=false; bs.progress=0;
      const income = getIncome(bizId);
      state.money+=income; state.totalEarned+=income;
      showFloatMoney(bizId, income);
      if (bs.managerHired) startProgress(bizId);
      else { updateProgressBar(bizId); updateHarvestBtn(bizId); }
    }
  }, 50);
  updateHarvestBtn(bizId);
}

export function updateProgressBar(bizId) {
  const bar = document.getElementById(`pb-${bizId}`);
  const lbl = document.getElementById(`pl-${bizId}`);
  if (!bar) return;
  const bs = getBizState(bizId), def = getBizDef(bizId);
  bar.style.width = (bs.progress*100)+'%';
  if (lbl) {
    if (bs.running) lbl.textContent = ((1-bs.progress)*def.timer*(bs.timerMult||1)).toFixed(1)+'s';
    else lbl.textContent = bs.count>0 ? 'Připraveno!' : 'Kup první!';
  }
}

export function updateHarvestBtn(bizId) {
  const btn = document.getElementById(`hb-${bizId}`);
  if (!btn) return;
  const bs = getBizState(bizId);
  if (bs.managerHired) {
    btn.textContent='🤖'; btn.className='fc-harvest-btn auto'; btn.disabled=true;
  } else if (bs.running) {
    btn.textContent='⏳'; btn.className='fc-harvest-btn'; btn.disabled=true;
  } else {
    btn.textContent='▶'; btn.className='fc-harvest-btn ready'; btn.disabled=false;
  }
}

export function showFloatMoney(bizId, amount) {
  const card = document.getElementById(`fc-${bizId}`);
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const el = document.createElement('div');
  el.className='float-money';
  el.textContent='+'+fmt(amount);
  el.style.left=(rect.left+rect.width/2-30)+'px';
  el.style.top=(rect.top+16)+'px';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 1100);
  card.classList.add('harvest-flash');
  setTimeout(()=>card.classList.remove('harvest-flash'), 380);
}

export function syncTimers() {
  for (const def of BUSINESSES) {
    const bs = getBizState(def.id);
    if (!isUnlocked(def.id) && bs.count===0) continue;
    if (bs.managerHired && bs.count>0) {
      if (!progressTimers[def.id] && !bs.running) startProgress(def.id);
      if (bs.running && !progressTimers[def.id]) { bs.running=false; bs.progress=0; startProgress(def.id); }
    }
    updateHarvestBtn(def.id);
    updateProgressBar(def.id);
  }
}
