// ═══════════════════════════════════════════════
// MAIN — game loop, init, spuštění hry
// ═══════════════════════════════════════════════
let lastSaveTime = Date.now();

function gameLoop() {
  updateMoneyDisplay();
  updateAffordability();
  updateNotifications();
  updateStats();
  if (Date.now() - lastSaveTime > 10000) { saveState(); lastSaveTime = Date.now(); }
  requestAnimationFrame(gameLoop);
}

function init() {
  // Offline earnings
  if (state.lastSaved) {
    const offlineSec = Math.min((Date.now()-state.lastSaved)/1000, 8*3600);
    if (offlineSec>5) {
      let earned=0;
      for (const b of BUSINESSES) {
        const bs=getBizState(b.id);
        if (bs.managerHired && bs.count>0) earned += Math.floor(offlineSec/(b.timer*(bs.timerMult||1)))*getIncome(b.id);
      }
      if (earned>0) {
        state.money+=earned; state.totalEarned+=earned;
        const mins=Math.floor(offlineSec/60), hrs=Math.floor(mins/60);
        const t=hrs>0?`${hrs} hod ${mins%60} min`:`${mins} min`;
        window._offlineMsg = `💤 Offline výdělek za ${t}: +${fmt(earned)}`;
      }
    }
  }

  // Restore buy mode button
  const bmBtn = document.getElementById('buymode-'+buyMode) || document.getElementById('buymode-1');
  document.querySelectorAll('.bm-btn').forEach(b=>b.classList.remove('active'));
  if (bmBtn) bmBtn.classList.add('active');

  render();
  gameLoop();

  // Start auto managers
  for (const b of BUSINESSES) {
    const bs=getBizState(b.id);
    if (bs.managerHired && bs.count>0) setTimeout(()=>startProgress(b.id), 100+b.id*60);
  }

  if (window._offlineMsg) {
    setTimeout(()=>{ notify(window._offlineMsg,'gold'); delete window._offlineMsg; }, 600);
  } else {
    setTimeout(()=>notify('🌱 Vítej na farmě!'), 400);
  }
}

init();

// Detekce PWA módu
if (window.navigator.standalone === true) {
  document.documentElement.classList.add('pwa-mode');
}
