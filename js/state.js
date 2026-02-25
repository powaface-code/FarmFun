// ═══════════════════════════════════════════════
// STATE — herní stav, inicializace, migrace
// ═══════════════════════════════════════════════
function normalizeBuyMode(m) {
  if (m==='max' || m===0) return 'max';
  if (m==='milestone') return 'milestone';
  return '1';
}

let state = loadState() || {
  money:0, totalEarned:0, buyMode:'1',
  businesses: BUSINESSES.map(b=>({id:b.id,count:b.id===0?1:0,progress:0,running:false,managerHired:false,upgradeMult:1,timerMult:1})),
  managers:{}, upgrades:{}, globalUpgrades:{}, prestigeCount:0, totalSeeds:0,
};

// Timery nelze obnovit po restartu – reset running/progress
if (state.businesses) state.businesses.forEach(b => { b.running = false; b.progress = 0; if (!b.timerMult) b.timerMult = 1; });
// Migrace starých save souborů
if (!state.globalUpgrades) state.globalUpgrades = {};

let buyMode = normalizeBuyMode(state.buyMode);
state.buyMode = buyMode;
let prestigeSeeds = 0;
const progressTimers = {};
