// ═══════════════════════════════════════════════
// FORMULAS — výpočty cen, příjmů, multiplikátorů
// ═══════════════════════════════════════════════
const getBizState = id => state.businesses[id];
const getBizDef   = id => BUSINESSES[id];

function calcCost(bizId, amount) {
  const def = getBizDef(bizId), owned = getBizState(bizId).count;
  if (amount===1) return def.baseCost * Math.pow(COST_GROWTH, owned);
  return def.baseCost * Math.pow(COST_GROWTH, owned) * (Math.pow(COST_GROWTH,amount)-1) / (COST_GROWTH-1);
}

function calcMaxBuy(bizId) {
  const def = getBizDef(bizId), owned = getBizState(bizId).count;
  let lo=1, hi=2000, best=0;
  while (lo<=hi) {
    const mid = Math.floor((lo+hi)/2);
    const cost = def.baseCost * Math.pow(COST_GROWTH,owned) * (Math.pow(COST_GROWTH,mid)-1) / (COST_GROWTH-1);
    if (cost<=state.money) { best=mid; lo=mid+1; } else hi=mid-1;
  }
  return best;
}

function getNextMilestone(bizId) {
  const count = getBizState(bizId).count;
  return getBizDef(bizId).milestones.find(m=>count<m.at) || null;
}

function calcMilestoneBuy(bizId) {
  const next = getNextMilestone(bizId);
  if (!next) return Math.max(1, calcMaxBuy(bizId));
  const needed = next.at - getBizState(bizId).count;
  return needed > 0 ? needed : 1;
}

function getBuyAmount(bizId) {
  if (buyMode==='max')       return Math.max(1, calcMaxBuy(bizId));
  if (buyMode==='milestone') return calcMilestoneBuy(bizId);
  return 1;
}

function getMilestoneMult(bizId) {
  const count = getBizState(bizId).count;
  let mult = 1;
  for (const m of getBizDef(bizId).milestones) if (count>=m.at) mult*=m.mult;
  return mult;
}

function getGlobalMult() {
  let m = 1;
  for (const gu of GLOBAL_UPGRADES) { if (state.globalUpgrades[gu.id]) m *= 2; }
  return m;
}

function getIncome(bizId) {
  const def = getBizDef(bizId), bs = getBizState(bizId);
  return def.baseIncome * bs.count * getMilestoneMult(bizId) * bs.upgradeMult * (1 + state.totalSeeds*0.1) * getGlobalMult();
}

function getPerSec() {
  let total = 0;
  for (const b of BUSINESSES) {
    const bs = getBizState(b.id);
    if (bs.count>0 && bs.managerHired) total += getIncome(b.id)/(b.timer*(getBizState(b.id).timerMult||1));
  }
  return total;
}

function isUnlocked(bizId) { return bizId===0 || state.totalEarned>=getBizDef(bizId).unlockCost; }

function calcPrestigeSeeds() {
  return Math.max(0, Math.floor(Math.sqrt(state.totalEarned/1000000)));
}
