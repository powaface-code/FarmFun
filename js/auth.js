import { BUSINESSES, setActiveLevel } from './data.js';
import { state, normalizeBuyMode } from './state.js';
import { getBizState } from './formulas.js';
import { saveState, loadState, loadCloudState } from './save.js';
import { progressTimers, startProgress } from './timers.js';
import { render } from './render.js';
import { notify } from './notify.js';

export function openAuthModal() {
  document.getElementById('auth-error').textContent = '';
  document.getElementById('auth-overlay').classList.add('open');
}
export function closeAuthModal() {
  document.getElementById('auth-overlay').classList.remove('open');
}
export function handleAuthOverlayClick(e) {
  if (e.target === document.getElementById('auth-overlay')) closeAuthModal();
}
export function switchAuthTab(tab) {
  document.getElementById('auth-panel-google').style.display = tab==='google' ? 'block' : 'none';
  document.getElementById('auth-panel-email').style.display  = tab==='email'  ? 'flex'  : 'none';
  document.getElementById('tab-google').classList.toggle('active', tab==='google');
  document.getElementById('tab-email').classList.toggle('active', tab==='email');
}

let _isRegisterMode = false;
export function toggleRegister() {
  _isRegisterMode = !_isRegisterMode;
  document.getElementById('auth-submit-btn').textContent  = _isRegisterMode ? 'Registrovat se' : 'Přihlásit se';
  document.getElementById('auth-switch-text').textContent = _isRegisterMode ? 'Máš účet? ' : 'Nemáš účet? ';
  document.getElementById('auth-switch-link').textContent = _isRegisterMode ? 'Přihlásit se' : 'Registrovat se';
}
export function updateAuthUI(user) {
  const btn       = document.getElementById('auth-btn');
  const loggedIn  = document.getElementById('auth-logged-in');
  const loggedOut = document.getElementById('auth-logged-out');
  if (user) {
    btn.textContent = '☁✓'; btn.classList.add('logged-in');
    loggedIn.style.display  = 'block';
    loggedOut.style.display = 'none';
    document.getElementById('auth-display-name').textContent  = user.displayName || '';
    document.getElementById('auth-display-email').textContent = user.email || '';
  } else {
    btn.textContent = '☁'; btn.classList.remove('logged-in');
    loggedIn.style.display  = 'none';
    loggedOut.style.display = 'block';
  }
}
export async function doSignInGoogle() {
  document.getElementById('auth-error').textContent = '';
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    closeAuthModal();
  } catch(e) {
    document.getElementById('auth-error').textContent = 'Chyba přihlášení: ' + e.message;
  }
}
export async function doEmailAuth() {
  document.getElementById('auth-error').textContent = '';
  const email    = document.getElementById('auth-email-input').value.trim();
  const password = document.getElementById('auth-password-input').value;
  if (!email || !password) { document.getElementById('auth-error').textContent = 'Vyplň email a heslo.'; return; }
  try {
    if (_isRegisterMode) await auth.createUserWithEmailAndPassword(email, password);
    else await auth.signInWithEmailAndPassword(email, password);
    closeAuthModal();
  } catch(e) {
    const msgs = {
      'auth/user-not-found':'Účet neexistuje.','auth/wrong-password':'Špatné heslo.',
      'auth/invalid-credential':'Špatný email nebo heslo.','auth/email-already-in-use':'Email již existuje.',
      'auth/weak-password':'Heslo musí mít alespoň 6 znaků.','auth/invalid-email':'Neplatný email.',
    };
    document.getElementById('auth-error').textContent = msgs[e.code] || e.message;
  }
}
export async function doSignOut() {
  await auth.signOut();
  closeAuthModal();
  notify('Odhlášeno', 'gold');
}

function progressScore(s) {
  if (!s) return 0;
  return (s.totalSeeds || 0) * 1e12 + (s.totalEarned || 0);
}

function applyCloudState(cloudSave) {
  const normalized = {
    money:0, totalEarned:0, buyMode:'1',
    businesses: BUSINESSES.map(b=>({id:b.id,count:b.id===0?1:0,progress:0,running:false,managerHired:false,upgradeMult:1,timerMult:1})),
    managers:{}, upgrades:{}, globalUpgrades:{}, prestigeCount:0, totalSeeds:0,
    ...cloudSave,
    businesses: (cloudSave.businesses || []).map(b => ({timerMult:1, ...b, running:false, progress:0})),
  };
  if (!normalized.globalUpgrades) normalized.globalUpgrades = {};
  if (normalized.currentLevel === undefined) normalized.currentLevel = 0;
  if (!normalized.levelData) normalized.levelData = {};
  Object.keys(state).forEach(k => delete state[k]);
  Object.assign(state, normalized);
  state.buyMode = normalizeBuyMode(state.buyMode);
  setActiveLevel(state.currentLevel);
  localStorage.setItem('farmtycoon_v3', JSON.stringify(state));
  Object.keys(progressTimers).forEach(k => delete progressTimers[k]);
  render();
  for (const b of BUSINESSES) {
    const bs = getBizState(b.id);
    if (bs.managerHired && bs.count > 0) setTimeout(()=>startProgress(b.id), 100+b.id*60);
  }
}

export function initAuth() {
  auth.onAuthStateChanged(async (user) => {
    updateAuthUI(user);
    if (!user) return;
    const cloudSave = await loadCloudState(user.uid);
    const localSave = loadState();
    const cloudScore = progressScore(cloudSave);
    const localScore = progressScore(localSave);
    if (cloudScore === 0 && localScore === 0) return;
    if (cloudScore > localScore) {
      applyCloudState(cloudSave);
      notify('☁ Progres načten z cloudu!', 'cloud');
    } else {
      if (localScore > 0) {
        await saveState(state);
        if (cloudScore === 0) notify('☁ Progres uložen do cloudu!', 'cloud');
      }
    }
  });
}
