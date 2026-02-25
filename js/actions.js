// ═══════════════════════════════════════════════
// ACTIONS — nákupy, klikání, herní logika
// ═══════════════════════════════════════════════
function buyBusiness(bizId) {
  if (!isUnlocked(bizId)) return;
  const amount = getBuyAmount(bizId);
  if (amount<1) { notify('Nemáš dost peněz!'); return; }
  const cost = calcCost(bizId, amount);
  if (state.money<cost) { notify('Nemáš dost peněz!'); return; }
  const bs = getBizState(bizId);
  const prev = bs.count;
  state.money -= cost;
  bs.count += amount;
  const def = getBizDef(bizId);
  for (const m of def.milestones) {
    if (prev<m.at && bs.count>=m.at) notify(`🎉 Milník! ${def.emoji} ${def.name} ${m.at} ks → bonus ${m.label}!`, 'gold');
  }
  render(); saveState();
}

function buyManager(managerId) {
  const mgr = MANAGERS[managerId];
  if (state.managers[managerId]) return;
  if (state.money<mgr.price) { notify('Nemáš dost peněz!'); return; }
  state.money -= mgr.price;
  state.managers[managerId] = true;
  state.businesses[mgr.bizId].managerHired = true;
  notify(`👔 ${mgr.name} nastoupil/a!`, 'gold');
  render(); saveState();
  const bs = getBizState(mgr.bizId);
  if (bs.count>0 && !bs.running) startProgress(mgr.bizId);
}

function buyUpgrade(upgradeId) {
  const upg = UPGRADES.find(u => u.id === upgradeId);
  if (state.upgrades[upgradeId]) return;
  if (state.money<upg.price) { notify('Nemáš dost peněz!'); return; }
  state.money -= upg.price;
  state.upgrades[upgradeId] = true;
  state.businesses[upg.bizId].upgradeMult *= upg.mult;
  if (upg.timerDiv) state.businesses[upg.bizId].timerMult /= upg.timerDiv;
  notify(`⚡ ${upg.name} zakoupeno!`, 'gold');
  render(); saveState();
}

function buyGlobalUpgrade(id) {
  const upg = GLOBAL_UPGRADES[id];
  if (!upg || state.globalUpgrades[id]) return;
  if (state.money < upg.price) { notify('Nemáš dost peněz!'); return; }
  state.money -= upg.price;
  state.globalUpgrades[id] = true;
  notify(`🌍 ${upg.name} – všechny příjmy ×2!`, 'gold');
  render(); saveState();
}
