import { BUSINESSES, MANAGERS, UPGRADES, GLOBAL_UPGRADES } from './data.js';
import { state } from './state.js';
import { getBizState, getBizDef, isUnlocked, isMaxed, getIncome, getBuyAmount, calcCost, getNextMilestone, getMilestoneMult, getGlobalMult } from './formulas.js';
import { fmt } from './format.js';
import { startProgress, updateProgressBar, updateHarvestBtn, syncTimers } from './timers.js';
import { buyBusiness, buyManager, buyUpgrade, buyGlobalUpgrade } from './actions.js';
import { clearPest } from './weather.js';
import { renderLevels } from './levels.js';

export function render() {
  renderFarms();
  renderManagers();
  renderUpgrades();
  renderLevels();
  syncTimers();
}

const FARM_IMAGES = [
  'strawberry.png','carrot.png','tomato.png','blueberry.png','brocolli.png',
  'grape.png','water_melon.png','avocado.png','pineapple.png','chilli.png',
];

export function renderFarms() {
  const scrollEl = document.scrollingElement || document.documentElement;
  const savedScroll = scrollEl.scrollTop;

  const list = document.getElementById('farmList');
  list.innerHTML = '';
  const imgArr = state.currentLevel === 0 ? FARM_IMAGES : null;

  for (const def of BUSINESSES) {
    const bs = getBizState(def.id);
    const unlocked = isUnlocked(def.id);
    const locked = !unlocked;
    const amount = getBuyAmount(def.id);
    const cost = locked ? def.unlockCost : calcCost(def.id, amount);
    const maxed = !locked && isMaxed(def.id);
    const canAfford = !locked && !maxed && state.money>=cost;
    const income = getIncome(def.id);

    const msBadges = def.milestones.map(m=>{
      const done = bs.count>=m.at;
      return `<span class="ms-badge${done?' done':''}">${m.label}</span>`;
    }).join('');

    let msProgressHTML = '';
    const nextMs = getNextMilestone(def.id);
    if (nextMs && bs.count>0) {
      const prevMs = def.milestones.slice().reverse().find(m=>bs.count>=m.at);
      const from = prevMs ? prevMs.at : 0;
      const pct = Math.min(100, ((bs.count-from)/(nextMs.at-from)*100)).toFixed(1);
      msProgressHTML = `<div class="fc-ms-progress"><div class="fc-ms-bar" style="width:${pct}%;background:${def.color}"></div><span class="fc-ms-label">${bs.count} / ${nextMs.at} → ${nextMs.label}</span></div>`;
    } else if (!nextMs && bs.count>0) {
      msProgressHTML = `<div class="fc-ms-progress" style="background:rgba(63,185,80,0.1)"><span class="fc-ms-label" style="color:var(--green)">✅ Všechny milníky</span></div>`;
    }

    let buyLabel = locked ? `🔒 ${fmt(def.unlockCost)}` : maxed ? '✅ Maximum' : `Koupit ×${amount} · ${fmt(cost)}`;

    const imgSrc = imgArr ? imgArr[def.id] : null;
    const imgHTML = imgSrc
      ? `<img src="${imgSrc}" class="fc-img" alt="${def.name}" loading="lazy">`
      : `<span class="fc-img-emoji">${def.emoji}</span>`;

    const card = document.createElement('div');
    card.id = `fc-${def.id}`;
    card.className = `farm-card${locked?' locked':''}${canAfford&&!locked?' affordable':''}${maxed?' maxed':''}`;
    card.style.setProperty('--card-color', def.color);
    card.innerHTML = `
      <div class="fc-img-wrap">
        ${imgHTML}
        ${bs.count>0?`<span class="fc-count-badge">${bs.count}</span>`:''}
        ${!locked && bs.count>0?`<button class="fc-harvest-btn" id="hb-${def.id}">▶</button>`:''}
      </div>
      <div class="fc-body">
        <div class="fc-name">${def.name}</div>
        <div class="fc-milestones">${msBadges}</div>
        <div class="fc-stats">
          <span class="hi">💰 ${fmt(income)}</span>
          <span class="dot">·</span><span>⏱ ${(def.timer*(bs.timerMult||1)).toFixed(1).replace('.0','')}s</span>
          <span class="dot">·</span><span class="hi2">×${getMilestoneMult(def.id)}</span>
        </div>
        ${msProgressHTML}
        ${locked
          ? `<div class="fc-lock-info">Potřeba celkem: ${fmt(def.unlockCost)}</div>`
          : `<div class="fc-progress" id="fp-${def.id}">
               <div class="fc-progress-bar" id="pb-${def.id}" style="background:${def.color};transform:scaleX(${bs.progress||0})"></div>
               <div class="fc-progress-label" id="pl-${def.id}">${bs.count>0?'Připraveno!':'Kup první!'}</div>
             </div>`
        }
        <button class="fc-buy-btn${locked?' locked-btn':''}${maxed?' maxed-btn':''}" id="bb-${def.id}"${!canAfford||maxed?' disabled':''}>${buyLabel}</button>
      </div>
    `;
    list.appendChild(card);

    document.getElementById(`bb-${def.id}`).addEventListener('click', ()=>buyBusiness(def.id));
    if (!locked) {
      document.getElementById(`fp-${def.id}`)?.addEventListener('click', ()=>{
        const b = getBizState(def.id);
        if (b.count>0 && !b.running && !b.managerHired) startProgress(def.id);
      });
    }
    if (!locked && bs.count>0) {
      document.getElementById(`hb-${def.id}`)?.addEventListener('click', ()=>startProgress(def.id));
      updateHarvestBtn(def.id);
      updateProgressBar(def.id);
    }
    // Škůdci overlay
    if (!locked && (state.pestFarms||[]).includes(def.id)) {
      const pestEl = document.createElement('div');
      pestEl.className = 'pest-overlay';
      pestEl.innerHTML = `<button class="pest-btn">🐛 Zahnat (zdarma)</button>`;
      pestEl.querySelector('.pest-btn').addEventListener('click', () => clearPest(def.id));
      card.appendChild(pestEl);
    }
  }
  requestAnimationFrame(() => { scrollEl.scrollTop = savedScroll; });
}

export function renderManagers() {
  const list = document.getElementById('managers-list');
  list.innerHTML='';
  for (const mgr of MANAGERS) {
    const hired = !!state.managers[mgr.id];
    const canAfford = state.money>=mgr.price;
    const bizUnlocked = isUnlocked(mgr.bizId);
    const el = document.createElement('div');
    el.id = `manager-card-${mgr.id}`;
    el.className = `mgr-card${hired?' hired':''}${!hired&&!canAfford?' cant-afford':''}${!bizUnlocked&&!hired?' biz-locked':''}`;
    el.innerHTML = `
      <div class="mgr-emoji" style="${!bizUnlocked?'filter:grayscale(1);opacity:0.5':''}">${mgr.emoji}</div>
      <div class="mgr-info">
        <div class="mgr-name">${mgr.name}</div>
        <div class="mgr-desc">${bizUnlocked ? mgr.desc : '🔒 Odemkni farmu'}</div>
      </div>
      <div class="mgr-right">
        ${hired
          ? '<span class="mgr-hired-badge">✓ Najatý</span>'
          : `<div class="mgr-price" style="${!bizUnlocked?'color:var(--text3)':''}">${fmt(mgr.price)}</div>`}
      </div>`;
    if (!hired && bizUnlocked) el.addEventListener('click', ()=>buyManager(mgr.id));
    list.appendChild(el);
  }
}

export function renderUpgrades() {
  const list = document.getElementById('upgrades-list');
  list.innerHTML='';

  const globalHeader = document.createElement('div');
  globalHeader.className = 'upg-section-header';
  globalHeader.textContent = '🌍 Globální boostery · aktuálně ×' + getGlobalMult();
  list.appendChild(globalHeader);

  for (const upg of [...GLOBAL_UPGRADES].sort((a,b) => {
    const ab = !!state.globalUpgrades[a.id], bb = !!state.globalUpgrades[b.id];
    return ab !== bb ? (ab ? 1 : -1) : a.price - b.price;
  })) {
    const bought = !!state.globalUpgrades[upg.id];
    const canAfford = state.money >= upg.price;
    const el = document.createElement('div');
    el.id = `global-upg-card-${upg.id}`;
    el.className = `upg-card global-upg${bought?' bought':''}${!bought&&!canAfford?' cant-afford':''}`;
    el.innerHTML = `
      <div class="upg-emoji">${upg.emoji}</div>
      <div class="upg-info">
        <div class="upg-name">${upg.name}</div>
        <div class="upg-desc">${upg.desc}</div>
      </div>
      ${bought ? '<span class="upg-done">✓</span>' : `<span class="upg-price">${fmt(upg.price)}</span>`}`;
    if (!bought) el.addEventListener('click', () => buyGlobalUpgrade(upg.id));
    list.appendChild(el);
  }

  const farmHeader = document.createElement('div');
  farmHeader.className = 'upg-section-header';
  farmHeader.textContent = '⚡ Upgrady farem';
  list.appendChild(farmHeader);

  for (const upg of [...UPGRADES].sort((a,b) => {
    const ab = !!state.upgrades[a.id], bb = !!state.upgrades[b.id];
    return ab !== bb ? (ab ? 1 : -1) : a.price - b.price;
  })) {
    const bought = !!state.upgrades[upg.id];
    const canAfford = state.money>=upg.price;
    const bizUnlocked = isUnlocked(upg.bizId);
    const el = document.createElement('div');
    el.id = `upgrade-card-${upg.id}`;
    el.className = `upg-card${bought?' bought':''}${!bought&&!canAfford?' cant-afford':''}${!bizUnlocked&&!bought?' biz-locked':''}`;
    el.innerHTML = `
      <div class="upg-emoji" style="${!bizUnlocked&&!bought?'filter:grayscale(1);opacity:0.4':''}">${upg.emoji}</div>
      <div class="upg-info">
        <div class="upg-name">${upg.name}</div>
        <div class="upg-desc">${bizUnlocked ? upg.desc : '🔒 Odemkni farmu'}</div>
      </div>
      ${bought ? '<span class="upg-done">✓</span>' : `<span class="upg-price" style="${!bizUnlocked?'color:var(--text3)':''}">${fmt(upg.price)}</span>`}`;
    if (!bought && bizUnlocked) el.addEventListener('click', ()=>buyUpgrade(upg.id));
    list.appendChild(el);
  }
}
