import { BUSINESSES, MANAGERS, UPGRADES, GLOBAL_UPGRADES } from './data.js';
import { state, normalizeBuyMode } from './state.js';
import { getBizState, isUnlocked, isMaxed, calcCost, getBuyAmount, calcPrestigeSeeds, getPerSec, getMilestoneMult } from './formulas.js';
import { fmt, fmtInt } from './format.js';
import { render } from './render.js';
import { saveState } from './save.js';
import { progressTimers, startProgress } from './timers.js';
import { notify } from './notify.js';

let prestigeSeeds = 0;

export function openSheet(id) {
  document.getElementById(id).classList.add('open');
  document.getElementById('overlay-'+id).classList.add('visible');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const navMap = {'managers-sheet':'nav-managers','upgrades-sheet':'nav-upgrades','stats-sheet':'nav-stats','levels-sheet':'nav-levels'};
  if (navMap[id]) document.getElementById(navMap[id]).classList.add('active');
}
export function closeSheet(id) {
  document.getElementById(id).classList.remove('open');
  document.getElementById('overlay-'+id).classList.remove('visible');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('nav-farms').classList.add('active');
}
export function showView() {
  ['managers-sheet','upgrades-sheet','stats-sheet','levels-sheet'].forEach(s=>closeSheet(s));
}
export function setBuyMode(mode, btn) {
  state.buyMode = mode;
  document.querySelectorAll('.bm-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

export function openPrestige() {
  prestigeSeeds = calcPrestigeSeeds();
  document.getElementById('modal-seeds').textContent = fmtInt(prestigeSeeds)+' 🌿';
  document.getElementById('prestige-modal').classList.add('visible');
}
export function closePrestige() {
  document.getElementById('prestige-modal').classList.remove('visible');
}
export function doPrestige() {
  if (prestigeSeeds<1) { notify('Vydělejte 1 mil. Kč pro první prestiž!'); closePrestige(); return; }
  state.totalSeeds += prestigeSeeds;
  state.prestigeCount++;
  Object.keys(progressTimers).forEach(k=>delete progressTimers[k]);
  state.money=0; state.totalEarned=0; state.managers={}; state.upgrades={};
  state.businesses = BUSINESSES.map(b=>({id:b.id,count:b.id===0?1:0,progress:0,running:false,managerHired:false,upgradeMult:1,timerMult:1}));
  state.frozenFarms=[]; state.pestFarms=[]; state.goldenFarmIds=null; state._butterflyUntil=0;
  closePrestige();
  notify(`✨ Prestiž! +${fmtInt(prestigeSeeds)} 🌿 Nový bonus: ×${(1+state.totalSeeds*0.1).toFixed(1)}`, 'purple');
  render(); saveState(state);
}

export function updateMoneyDisplay() {
  document.getElementById('moneyDisplay').textContent = fmt(state.money);
  document.getElementById('perSecDisplay').textContent = fmt(getPerSec())+'/s';
}

export function updateNotifications() {
  const setDot = (id, on) => document.getElementById(id)?.classList.toggle('visible', on);
  setDot('dot-prestige', calcPrestigeSeeds() >= 1);
  setDot('dot-managers', MANAGERS.some(m => !state.managers[m.id] && isUnlocked(m.bizId) && state.money >= m.price));
  setDot('dot-upgrades',
    UPGRADES.some(u => !state.upgrades[u.id] && isUnlocked(u.bizId) && state.money >= u.price) ||
    GLOBAL_UPGRADES.some(u => !state.globalUpgrades[u.id] && state.money >= u.price));
}

export function updateAffordability() {
  for (const def of BUSINESSES) {
    const btn = document.getElementById(`bb-${def.id}`);
    if (!btn) continue;
    const locked = !isUnlocked(def.id);
    const maxed = !locked && isMaxed(def.id);
    if (maxed) { btn.disabled = true; btn.textContent = '✅ Maximum'; const card = document.getElementById(`fc-${def.id}`); if (card) card.classList.remove('affordable'); continue; }
    const amount = getBuyAmount(def.id);
    const cost = locked ? def.unlockCost : calcCost(def.id, amount);
    const canAfford = !locked && state.money>=cost;
    btn.disabled = !canAfford;
    if (locked) btn.textContent = `🔒 ${fmt(def.unlockCost)}`;
    else if (amount < 1) btn.textContent = `Nedostatek peněz`;
    else btn.textContent = `Koupit ×${amount} · ${fmt(cost)}`;
    const card = document.getElementById(`fc-${def.id}`);
    if (card) card.classList.toggle('affordable', canAfford && !locked);
  }
  for (const mgr of MANAGERS) {
    const card = document.getElementById(`manager-card-${mgr.id}`);
    if (!card || state.managers[mgr.id]) continue;
    if (!isUnlocked(mgr.bizId)) continue;
    card.classList.toggle('cant-afford', state.money<mgr.price);
  }
  for (const upg of UPGRADES) {
    const card = document.getElementById(`upgrade-card-${upg.id}`);
    if (!card || state.upgrades[upg.id]) continue;
    card.classList.toggle('cant-afford', state.money<upg.price);
  }
  for (const upg of GLOBAL_UPGRADES) {
    const card = document.getElementById(`global-upg-card-${upg.id}`);
    if (!card || state.globalUpgrades[upg.id]) continue;
    card.classList.toggle('cant-afford', state.money<upg.price);
  }
}

export function updateStats() {
  document.getElementById('st-total').textContent   = fmt(state.totalEarned);
  document.getElementById('st-rate').textContent    = fmt(getPerSec());
  document.getElementById('st-farms').textContent   = BUSINESSES.filter((_,i)=>isUnlocked(i)).length;
  document.getElementById('st-mgr').textContent     = Object.keys(state.managers).length;
  document.getElementById('st-seeds').textContent   = fmtInt(state.totalSeeds)+' 🌿';
  document.getElementById('st-prestige').textContent = state.prestigeCount;
  const seeds = calcPrestigeSeeds();
  document.getElementById('st-seeds-preview').textContent = `Získáš: ${fmtInt(seeds)} 🌿`;
  document.getElementById('st-prestige-mult').textContent = '×'+(1+state.totalSeeds*0.1).toFixed(1);
}
