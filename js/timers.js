import { BUSINESSES } from './data.js';
import { state } from './state.js';
import { getBizState, getBizDef, getIncome, isUnlocked } from './formulas.js';
import { fmt } from './format.js';
import { isFrozen, getFogTimerMult, applyGoldenHarvest } from './weather.js';

// Flagy běžících farem (místo per-farm setInterval)
export const progressTimers = {};

// ─── CSS transition helper: spustí plynulou GPU animaci baru ───
function setCssTransition(bizId, remainingMs) {
  const bar = document.getElementById(`pb-${bizId}`);
  if (!bar) return;
  const bs = getBizState(bizId);
  const totalMs = bs._totalMs || 1;
  const currentProgress = 1 - remainingMs / totalMs;

  // 1. Nastav start pozici BEZ animace
  bar.style.transition = 'none';
  bar.style.transform = `scaleX(${Math.max(0, currentProgress)})`;

  // 2. Force reflow — prohlížeč musí aplikovat startovní pozici
  bar.offsetWidth;

  // 3. Nastav cíl S plynulou CSS transition → GPU animuje na 60fps
  bar.style.transition = `transform ${Math.max(0, remainingMs)}ms linear`;
  bar.style.transform = 'scaleX(1)';
}

export function startProgress(bizId) {
  const bs = getBizState(bizId), def = getBizDef(bizId);
  if (bs.running || bs.count===0) return;
  if (isFrozen(bizId)) return;
  bs.running = true; bs.progress = 0;
  const effectiveDur = def.timer * (bs.timerMult || 1) * getFogTimerMult();
  bs.effectiveDuration = effectiveDur;
  const totalMs = effectiveDur * 1000;
  const resumeMs = bs.remainingMs || totalMs;
  delete bs.remainingMs;
  bs._startTime = Date.now() - (totalMs - resumeMs);
  bs._totalMs = totalMs;
  progressTimers[bizId] = true;
  updateHarvestBtn(bizId);

  // Spustit CSS transition animaci
  setCssTransition(bizId, resumeMs);
}

// ─── Jeden tick pro VŠECHNY farmy (voláno z masterTick) ──
let _lastLabel = 0;

export function tickAllProgress() {
  const now = Date.now();
  const doLabel = now - _lastLabel >= 250;
  if (doLabel) _lastLabel = now;

  for (const def of BUSINESSES) {
    const bizId = def.id;
    if (!progressTimers[bizId]) continue;
    const bs = getBizState(bizId);
    if (!bs.running) { delete progressTimers[bizId]; continue; }

    // Progress kalkulace pro detekci dokončení + label (bar animuje CSS)
    bs.progress = Math.min((now - bs._startTime) / bs._totalMs, 1);

    // Label update throttled na ~250ms
    if (doLabel) {
      const lbl = document.getElementById(`pl-${bizId}`);
      if (lbl) {
        const dur = bs.effectiveDuration || def.timer*(bs.timerMult||1);
        lbl.textContent = ((1-bs.progress)*dur).toFixed(1)+'s';
      }
    }

    // Sklizeň hotová
    if (bs.progress >= 1) {
      delete progressTimers[bizId];
      bs.running = false; bs.progress = 0;
      const income = applyGoldenHarvest(bizId, getIncome(bizId));
      state.money += income; state.totalEarned += income;
      showFloatMoney(bizId, income);
      if (bs.managerHired) {
        startProgress(bizId); // setCssTransition se zavolá uvnitř
      } else {
        const bar = document.getElementById(`pb-${bizId}`);
        if (bar) { bar.style.transition = 'none'; bar.style.transform = 'scaleX(0)'; }
        const lbl = document.getElementById(`pl-${bizId}`);
        if (lbl) lbl.textContent = 'Připraveno!';
        updateHarvestBtn(bizId);
      }
    }
  }
}

// ─── Pomocné funkce pro external calls ─────────
export function updateProgressBar(bizId) {
  const bar = document.getElementById(`pb-${bizId}`);
  if (!bar) return;
  const bs = getBizState(bizId);

  if (bs.running && bs._startTime && bs._totalMs) {
    // Obnovit CSS transition po re-renderu (nový DOM element)
    const now = Date.now();
    const remaining = Math.max(0, bs._totalMs - (now - bs._startTime));
    setCssTransition(bizId, remaining);
  } else {
    bar.style.transition = 'none';
    bar.style.transform = `scaleX(${bs.progress || 0})`;
  }

  const lbl = document.getElementById(`pl-${bizId}`);
  if (lbl) {
    if (bs.running) {
      const def = getBizDef(bizId);
      const dur = bs.effectiveDuration || def.timer*(bs.timerMult||1);
      lbl.textContent = ((1-bs.progress)*dur).toFixed(1)+'s';
    } else lbl.textContent = bs.count>0 ? 'Připraveno!' : 'Kup první!';
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
}

export function stopAllTimers() {
  for (const k of Object.keys(progressTimers)) {
    const bs = getBizState(Number(k));
    if (bs) { bs.running = false; bs.progress = 0; }
    delete progressTimers[k];
  }
}

export function restartProgressIfRunning(bizId) {
  const bs = getBizState(bizId);
  if (!bs.running) return;
  const def = getBizDef(bizId);
  const newEffective = def.timer * (bs.timerMult || 1) * getFogTimerMult();
  bs.remainingMs = (1 - bs.progress) * newEffective * 1000;
  delete progressTimers[bizId];
  bs.running = false;
  bs.progress = 0;
  startProgress(bizId);
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
