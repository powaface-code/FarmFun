import { BUSINESSES } from './data.js';
import { state } from './state.js';
import { getBizState, getIncome } from './formulas.js';
import { fmt } from './format.js';
import { saveState } from './save.js';
import { progressTimers, startProgress } from './timers.js';
import { render, renderFarms } from './render.js';
import { notify } from './notify.js';
import {
  updateMoneyDisplay, updateAffordability, updateNotifications, updateStats,
  openSheet, closeSheet, showView, setBuyMode,
  openPrestige, closePrestige, doPrestige,
} from './ui.js';
import {
  openAuthModal, closeAuthModal, handleAuthOverlayClick,
  switchAuthTab, toggleRegister, doSignInGoogle, doEmailAuth, doSignOut,
  initAuth,
} from './auth.js';
import { tickWeather, renderWeatherBanner, initWeather, prepareWeather, openSeasonModal, closeSeasonModal } from './weather.js';

// Exponovat UI funkce na window (volané z inline HTML onclick atributů)
window.openSheet = openSheet;
window.closeSheet = closeSheet;
window.showView = showView;
window.setBuyMode = setBuyMode;
window.openPrestige = openPrestige;
window.closePrestige = closePrestige;
window.doPrestige = doPrestige;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.handleAuthOverlayClick = handleAuthOverlayClick;
window.switchAuthTab = switchAuthTab;
window.toggleRegister = toggleRegister;
window.doSignInGoogle = doSignInGoogle;
window.doEmailAuth = doEmailAuth;
window.doSignOut = doSignOut;
window.prepareWeather = prepareWeather;
window.openSeasonModal = openSeasonModal;
window.closeSeasonModal = closeSeasonModal;

let lastSaveTime    = Date.now();
let lastAffordCheck = 0;
let lastNotifCheck  = 0;
let lastWeatherTick = 0;

// ─── Master tick: 100ms místo 60fps rAF ──────
function masterTick() {
  const now = Date.now();
  updateMoneyDisplay();
  if (now - lastAffordCheck > 500)  { updateAffordability(); updateNotifications(); lastAffordCheck = now; }
  if (now - lastNotifCheck  > 2000) { updateStats(); lastNotifCheck = now; }
  if (now - lastWeatherTick > 1000) { tickWeather(); lastWeatherTick = now; }
  if (now - lastSaveTime    > 10000){ saveState(state); lastSaveTime = now; }
}

function init() {
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

  const bmBtn = document.getElementById('buymode-'+state.buyMode) || document.getElementById('buymode-1');
  document.querySelectorAll('.bm-btn').forEach(b=>b.classList.remove('active'));
  if (bmBtn) bmBtn.classList.add('active');

  render();
  setInterval(masterTick, 100);
  initAuth();
  initWeather(renderFarms);

  // ─── Pauza při skrytí tabu ─────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      Object.keys(progressTimers).forEach(id => {
        const bs = getBizState(Number(id));
        bs.remainingMs = Math.max(0, (bs.effectiveDuration||0)*1000*(1-bs.progress));
        clearInterval(progressTimers[id]);
        delete progressTimers[id];
        bs.running = false; bs.progress = 0;
      });
      saveState(state);
    } else {
      for (const b of BUSINESSES) {
        const bs = getBizState(b.id);
        if (bs.remainingMs || (bs.managerHired && bs.count > 0)) startProgress(b.id);
      }
    }
  });

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

if (window.navigator.standalone === true) {
  document.documentElement.classList.add('pwa-mode');
}
