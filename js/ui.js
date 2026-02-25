// ═══════════════════════════════════════════════
// UI — notifikace, sheety, prestiž, live update
// ═══════════════════════════════════════════════

// ── Toasty ──────────────────────────────────
function notify(msg, type='') {
  const el = document.createElement('div');
  el.className = 'toast'+(type?' '+type:'');
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(()=>el.remove(), 3100);
}

// ── Navigace a sheety ───────────────────────
function openSheet(id) {
  document.getElementById(id).classList.add('open');
  document.getElementById('overlay-'+id).classList.add('visible');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const navMap = {'managers-sheet':'nav-managers','upgrades-sheet':'nav-upgrades','stats-sheet':'nav-stats'};
  if (navMap[id]) document.getElementById(navMap[id]).classList.add('active');
}
function closeSheet(id) {
  document.getElementById(id).classList.remove('open');
  document.getElementById('overlay-'+id).classList.remove('visible');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('nav-farms').classList.add('active');
}
function showView(v) {
  ['managers-sheet','upgrades-sheet','stats-sheet'].forEach(s=>closeSheet(s));
}
function setBuyMode(mode, btn) {
  buyMode = mode; state.buyMode = mode;
  document.querySelectorAll('.bm-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

// ── Prestiž ─────────────────────────────────
function openPrestige() {
  prestigeSeeds = calcPrestigeSeeds();
  document.getElementById('modal-seeds').textContent = prestigeSeeds+' 🌿';
  document.getElementById('prestige-modal').classList.add('visible');
}
function closePrestige() {
  document.getElementById('prestige-modal').classList.remove('visible');
}
function doPrestige() {
  if (prestigeSeeds<1) { notify('Vydělejte 1 mil. Kč pro první prestiž!'); closePrestige(); return; }
  state.totalSeeds += prestigeSeeds;
  state.prestigeCount++;
  for (const id in progressTimers) clearInterval(progressTimers[id]);
  Object.keys(progressTimers).forEach(k=>delete progressTimers[k]);
  state.money=0; state.totalEarned=0; state.managers={}; state.upgrades={};
  state.businesses = BUSINESSES.map(b=>({id:b.id,count:b.id===0?1:0,progress:0,running:false,managerHired:false,upgradeMult:1,timerMult:1}));
  closePrestige();
  notify(`✨ Prestiž! +${prestigeSeeds} 🌿 Nový bonus: ×${(1+state.totalSeeds*0.1).toFixed(1)}`, 'purple');
  render(); saveState();
}

// ── Live update ──────────────────────────────
function updateMoneyDisplay() {
  document.getElementById('moneyDisplay').textContent = fmt(state.money);
  document.getElementById('perSecDisplay').textContent = fmt(getPerSec())+'/s';
}

function updateNotifications() {
  const setDot = (id, on) => document.getElementById(id)?.classList.toggle('visible', on);
  setDot('dot-prestige', calcPrestigeSeeds() >= 1);
  setDot('dot-managers', MANAGERS.some(m => !state.managers[m.id] && isUnlocked(m.bizId) && state.money >= m.price));
  setDot('dot-upgrades',
    UPGRADES.some(u => !state.upgrades[u.id] && isUnlocked(u.bizId) && state.money >= u.price) ||
    GLOBAL_UPGRADES.some(u => !state.globalUpgrades[u.id] && state.money >= u.price));
}

function updateAffordability() {
  for (const def of BUSINESSES) {
    const btn = document.getElementById(`bb-${def.id}`);
    if (!btn) continue;
    const locked = !isUnlocked(def.id);
    const amount = getBuyAmount(def.id);
    const cost = locked ? def.unlockCost : calcCost(def.id, amount);
    const canAfford = !locked && state.money>=cost;
    btn.disabled = !canAfford;
    if (locked) {
      btn.textContent = `🔒 ${fmt(def.unlockCost)}`;
    } else if (amount < 1) {
      btn.textContent = `Nedostatek peněz`;
    } else {
      btn.textContent = `Koupit ×${amount} · ${fmt(cost)}`;
    }
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
}

function updateStats() {
  document.getElementById('st-total').textContent   = fmt(state.totalEarned);
  document.getElementById('st-rate').textContent    = fmt(getPerSec());
  document.getElementById('st-farms').textContent   = BUSINESSES.filter((_,i)=>isUnlocked(i)).length;
  document.getElementById('st-mgr').textContent     = Object.keys(state.managers).length;
  document.getElementById('st-seeds').textContent   = state.totalSeeds+' 🌿';
  document.getElementById('st-prestige').textContent = state.prestigeCount;
  const seeds = calcPrestigeSeeds();
  document.getElementById('st-seeds-preview').textContent = `Získáš: ${seeds} 🌿`;
  document.getElementById('st-prestige-mult').textContent = '×'+(1+state.totalSeeds*0.1).toFixed(1);
}
