// ═══════════════════════════════════════════════
// WEATHER — systém počasí, sezón a speciálních eventů
// ═══════════════════════════════════════════════
import { state } from './state.js';
import { BUSINESSES } from './data.js';
import { notify } from './notify.js';
import { saveState } from './save.js';
import { fmt } from './format.js';

// ─── Definice počasí ──────────────────────────
export const WEATHERS = {
  sunny:     { name:'Slunečno',  emoji:'☀️',  color:'#ffe566', mult:1.0 },
  rain:      { name:'Déšť',      emoji:'🌧️',  color:'#58a6ff', mult:0.7 },
  fog:       { name:'Mlha',      emoji:'🌫️',  color:'#8b949e', mult:1.0, timerSlowdown:1.2 },
  storm:     { name:'Bouřka',    emoji:'⛈️',  color:'#8957e5', mult:0.5 },
  frost:     { name:'Mráz',      emoji:'☃️',  color:'#cdd9e5', mult:0.8 },
  rainbow:   { name:'Duha',      emoji:'🌈',  color:'#39d353', mult:2.0 },
  poststorm: { name:'Po bouřce', emoji:'🌤️',  color:'#8957e5', mult:2.0 },
};

// ─── Definice sezón ───────────────────────────
export const SEASONS = [
  { id:'spring', name:'Jaro',   emoji:'🌸', bizIds:[0,1],     mult:1.5, bg1:'rgba(0,255,100,.12)', bg2:'rgba(200,255,150,.07)' },
  { id:'summer', name:'Léto',   emoji:'☀️', bizIds:[2,6],     mult:1.8, bg1:'rgba(255,200,0,.12)',  bg2:'rgba(255,120,0,.08)' },
  { id:'autumn', name:'Podzim', emoji:'🍂', bizIds:[3,5,8],   mult:1.6, bg1:'rgba(200,100,0,.12)',  bg2:'rgba(163,113,247,.10)' },
  { id:'winter', name:'Zima',   emoji:'❄️', bizIds:[4,7,9],   mult:1.4, bg1:'rgba(100,160,255,.10)',bg2:'rgba(180,210,255,.07)' },
];

const SEASON_DURATION = 10 * 60 * 1000; // 10 minut

let _renderFarms = null;

// ─── Inicializace ─────────────────────────────
export function initWeather(renderFarmsCallback) {
  _renderFarms = renderFarmsCallback;
  const now = Date.now();
  if (!state.weather)       state.weather = { current:'sunny', endsAt:0, preparedBy:false, nextWeatherAt:0, nextType:'sunny', warnShown:false };
  if (!state.season)        state.season = { current:'spring', startedAt:now };
  if (!state.frozenFarms)   state.frozenFarms = [];
  if (!state.pestFarms)     state.pestFarms = [];
  if (state.goldenFarmIds === undefined) state.goldenFarmIds = null;
  if (!state.nextEventAt)   state.nextEventAt = now + randBetween(8,15)*60000;
  if (!state._butterflyUntil) state._butterflyUntil = 0;

  // Obnovit vypršené počasí
  if (state.weather.current !== 'sunny' && state.weather.endsAt > 0 && state.weather.endsAt <= now) {
    state.weather.current = 'sunny';
    state.weather.endsAt = 0;
    state.frozenFarms = [];
  }
  // Naplánovat další počasí pokud chybí
  if (!state.weather.nextWeatherAt || state.weather.nextWeatherAt <= now) scheduleNextWeather();

  // Synchronizace sezóny
  const s = getCurrentSeason();
  state.season.current = s.id;
  applySeason(s);
  updateSeasonDisplay();
}

// ─── Pomocné funkce ───────────────────────────
function randBetween(min, max) { return min + Math.random() * (max - min); }

function pickWeather() {
  const r = Math.random() * 100;
  let acc = 0;
  for (const [type, prob] of [['sunny',35],['rain',20],['fog',15],['storm',12],['frost',10],['rainbow',8]]) {
    acc += prob;
    if (r < acc) return type;
  }
  return 'sunny';
}

function scheduleNextWeather() {
  state.weather.nextWeatherAt = Date.now() + randBetween(3,7)*60000;
  state.weather.nextType = pickWeather();
  state.weather.warnShown = false;
}

function startWeather(type) {
  const now = Date.now();
  let durSec;
  if (type === 'sunny')                           durSec = 0;
  else if (type === 'rainbow')                    durSec = 60;
  else if (type === 'storm' || type === 'frost')  durSec = randBetween(120, 180);
  else                                            durSec = randBetween(120, 300);
  state.weather.current    = type;
  state.weather.endsAt     = type === 'sunny' ? 0 : now + durSec * 1000;
  state.weather.preparedBy = false;
  state.weather.warnShown  = false;
  if (type === 'frost') applyFrost();
  if (type !== 'sunny') {
    const def = WEATHERS[type];
    notify(`${def.emoji} ${def.name} začala!`, type === 'rainbow' ? 'gold' : '');
  }
  scheduleNextWeather();
}

function applyFrost() {
  const eligible = state.businesses.filter(bs => bs.count > 0).map(bs => bs.id);
  for (let i = eligible.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  state.frozenFarms = eligible.slice(0, 5);
}

// ─── Dotazy pro ostatní moduly ─────────────────
export function getCurrentSeason() {
  const elapsed = Date.now() - (state.season?.startedAt || Date.now());
  const idx = Math.max(0, Math.floor(elapsed / SEASON_DURATION)) % 4;
  return SEASONS[idx];
}

export function getSeasonMult(bizId) {
  const s = getCurrentSeason();
  return s.bizIds.includes(bizId) ? s.mult : 1.0;
}

export function getWeatherMult(bizId) {
  const w = state.weather;
  if (!w || w.current === 'sunny') return 1;
  if (w.current === 'poststorm') return WEATHERS.poststorm.mult;
  const def = WEATHERS[w.current];
  if (!def) return 1;
  if (w.current === 'fog') return 1; // fog pouze zpomalí timery
  if (w.preparedBy) return 1.1;      // příprava → bonus místo negativního efektu
  if (w.current === 'frost') {
    if ((state.frozenFarms||[]).includes(bizId)) return 1; // zmrazená farma nemůže sklízet
    return def.mult; // ostatní farmy: ×0.8
  }
  return def.mult;
}

export function getFogTimerMult() {
  const w = state.weather;
  if (!w || w.current !== 'fog' || w.preparedBy) return 1;
  return WEATHERS.fog.timerSlowdown; // 1.2
}

export function isFrozen(bizId) {
  return !!(state.frozenFarms && state.frozenFarms.includes(bizId));
}

export function getButterflyMult(bizId) {
  if (bizId === 0 && state._butterflyUntil && Date.now() < state._butterflyUntil) return 5;
  return 1;
}

export function applyGoldenHarvest(bizId, income) {
  if (!state.goldenFarmIds || !state.goldenFarmIds.includes(bizId)) return income;
  state.goldenFarmIds = state.goldenFarmIds.filter(id => id !== bizId);
  if (state.goldenFarmIds.length === 0) state.goldenFarmIds = null;
  return income * 10;
}


// ─── Tlačítko "Připravit se" ──────────────────
export function prepareWeather() {
  const w = state.weather;
  if (!w || w.current === 'sunny' || w.current === 'poststorm' || w.preparedBy) return;
  const cost = Math.max(1, Math.floor(state.money * 0.15));
  if (state.money < cost) { notify('Nemáš dost peněz!'); return; }
  state.money -= cost;
  w.preparedBy = true;
  const remSec = Math.ceil(Math.max(0, (w.endsAt - Date.now()) / 1000));
  if (w.current === 'rainbow') {
    w.endsAt += 30000;
    const newRemSec = Math.ceil((w.endsAt - Date.now()) / 1000);
    notify(`🌈 Duha prodloužena! Bonus ×2.0 trvá ještě ${newRemSec}s`, 'gold');
  } else if (w.current === 'frost') {
    state.frozenFarms = [];
    notify(`❄️→☀️ Farmy odmrazeny! Příjem +10% po zbývající ${remSec}s`, 'gold');
    if (_renderFarms) _renderFarms();
  } else if (w.current === 'fog') {
    notify(`🌫️→✨ Mlha zaplašena! Timery normální + příjem +10% po ${remSec}s`, 'gold');
  } else if (w.current === 'rain') {
    notify(`☔→✨ Déšť obrácen! Příjem +10% místo −30% po zbývající ${remSec}s`, 'gold');
  } else if (w.current === 'storm') {
    notify(`⛈️→✨ Bouřka zažehnána! Příjem +10% místo −50% po ${remSec}s`, 'gold');
  } else {
    const def = WEATHERS[w.current];
    notify(`${def.emoji} Připraveno! Příjem +10% po zbývající ${remSec}s`, 'gold');
  }
  renderWeatherBanner();
  saveState(state);
}

// ─── Modál: info o sezónách a počasí ─────────
const WEATHER_EFFECTS = {
  sunny:     'Žádný efekt, normální příjmy.',
  rain:      'Příjem ×0.7. Příprava → obrátí na +10% po zbývající dobu.',
  fog:       'Timery ×1.2 pomalejší. Příprava → normální timery + příjem +10%.',
  storm:     'Příjem ×0.5. Bez přípravy → po skončení bonus ×2.0 na 30s!',
  frost:     'Až 5 farem zmrazeno (nemohou sklízet). Příprava → odmrazení + +10%.',
  rainbow:   'Příjem ×2.0 na 60s. Příprava → prodloužení o 30s.',
  poststorm: 'Bonus ×2.0 na 30s — odměna za nezažehnanou bouřku.',
};

export function openSeasonModal() {
  const modal = document.getElementById('season-info-modal');
  if (!modal) return;
  const body = document.getElementById('season-info-body');
  const curSeason = getCurrentSeason();
  const curWeather = state.weather ? state.weather.current : 'sunny';
  body.innerHTML =
    '<div class="si-title">Roční období <span style="color:var(--t3);font-size:.72rem">(každé 10 min)</span></div>' +
    SEASONS.map(s => {
      const active = s.id === curSeason.id;
      const farmEmojis = s.bizIds.map(id => BUSINESSES[id] ? BUSINESSES[id].emoji : '').join(' ');
      return `<div class="si-row${active ? ' si-active' : ''}">
        <span>${s.emoji} <strong>${s.name}</strong> <span style="color:var(--t3);font-size:.72rem">×${s.mult}</span></span>
        <span class="si-tag">${farmEmojis}</span>
      </div>`;
    }).join('') +
    '<div class="si-title" style="margin-top:12px">Počasí</div>' +
    Object.entries(WEATHERS).map(([key, def]) => {
      const active = key === curWeather;
      return `<div class="si-row${active ? ' si-active' : ''}">
        <span>${def.emoji} <strong>${def.name}</strong></span>
        <span class="si-effect">${WEATHER_EFFECTS[key] || ''}</span>
      </div>`;
    }).join('');
  modal.classList.add('visible');
}

export function closeSeasonModal() {
  document.getElementById('season-info-modal')?.classList.remove('visible');
}

// ─── Zahnat škůdce ────────────────────────────
export function clearPest(bizId) {
  if (!state.pestFarms) return;
  const idx = state.pestFarms.indexOf(bizId);
  if (idx === -1) return;
  state.pestFarms.splice(idx, 1);
  notify('🌿 Škůdci zahnáni!', 'gold');
  if (_renderFarms) _renderFarms();
}


// ─── Hlavní tick (volán každou sekundu) ───────
export function tickWeather() {
  const now = Date.now();
  checkSeasonChange(now);
  checkWeatherExpiry(now);
  checkNextWeather(now);
  checkSpecialEvent(now);
  renderWeatherBanner();
}

function checkSeasonChange(now) {
  const newSeason = getCurrentSeason();
  if (newSeason.id !== state.season.current) {
    state.season.current = newSeason.id;
    applySeason(newSeason);
    updateSeasonDisplay();
    notify(`${newSeason.emoji} Nastalo ${newSeason.name}!`, 'gold');
  }
}

function checkWeatherExpiry(now) {
  const w = state.weather;
  if (!w || w.current === 'sunny' || !w.endsAt || w.endsAt > now) return;
  const wasStorm = w.current === 'storm';
  const wasFrost = w.current === 'frost';
  if (wasStorm && !w.preparedBy) {
    w.current = 'poststorm';
    w.endsAt  = now + 30000;
    notify('🌤️ Bouřka skončila! Bonus ×2.0 na 30s!', 'gold');
  } else {
    w.current = 'sunny';
    w.endsAt  = 0;
    if (wasFrost) {
      state.frozenFarms = [];
      notify('☀️ Mráz odezněl, farmy odmrazeny!');
      if (_renderFarms) _renderFarms();
    }
  }
}

function checkNextWeather(now) {
  const w = state.weather;
  if (!w.nextWeatherAt) { scheduleNextWeather(); return; }
  // Varování 30s před změnou
  if (!w.warnShown && w.nextType && w.nextType !== 'sunny' && (w.nextWeatherAt - now) <= 30000) {
    const def = WEATHERS[w.nextType];
    if (def) notify(`⚠️ Blíží se ${def.name}!`);
    w.warnShown = true;
  }
  if (now >= w.nextWeatherAt) startWeather(w.nextType || 'sunny');
}

const SPECIAL_EVENTS = ['butterfly','pest','golden','wind'];

function checkSpecialEvent(now) {
  if (!state.nextEventAt) { state.nextEventAt = now + randBetween(8,15)*60000; return; }
  if (now < state.nextEventAt) return;
  state.nextEventAt = now + randBetween(8,15)*60000;
  if (Math.random() > 0.25) return;
  fireEvent(SPECIAL_EVENTS[Math.floor(Math.random()*SPECIAL_EVENTS.length)]);
}


function fireEvent(type) {
  if (type === 'butterfly') {
    state._butterflyUntil = Date.now() + 20000;
    notify('🦋 Motýlí roj! Jahody vydělávají 5× na 20s!', 'gold');
  } else if (type === 'pest') {
    const eligible = state.businesses.filter(bs => bs.count > 0 && !(state.pestFarms||[]).includes(bs.id));
    if (!eligible.length) return;
    const victim = eligible[Math.floor(Math.random()*eligible.length)];
    if (!state.pestFarms) state.pestFarms = [];
    state.pestFarms.push(victim.id);
    const def = BUSINESSES.find(b => b.id === victim.id);
    notify(`🐛 Škůdci napadli ${def?.emoji||''} ${def?.name||'farmu'}!`);
    if (_renderFarms) _renderFarms();
  } else if (type === 'golden') {
    state.goldenFarmIds = state.businesses.filter(bs => bs.count > 0).map(bs => bs.id);
    notify('🌟 Zlatá sklizeň! Příští sklizeň každé farmy dá ×10!', 'gold');
  } else if (type === 'wind') {
    notify('💨 Větrný vír! Farmy se míchají...', '');
    const list = document.getElementById('farmList');
    if (!list) return;
    const cards = [...list.children];
    for (let i = cards.length-1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      list.insertBefore(cards[j], cards[i]);
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    setTimeout(() => { if (_renderFarms) _renderFarms(); }, 10000);
  }
}

// ─── Sezónní gradient ─────────────────────────
function applySeason(season) {
  document.documentElement.style.setProperty('--season-bg-1', season.bg1);
  document.documentElement.style.setProperty('--season-bg-2', season.bg2);
}

function updateSeasonDisplay() {
  const el = document.getElementById('season-display');
  if (!el) return;
  const s = getCurrentSeason();
  el.textContent = `${s.emoji} ${s.name}`;
}


// ─── Weather banner ────────────────────────────
let _lastWeatherRender = 0;
let _lastRenderedWeather = '';

export function renderWeatherBanner() {
  const now = Date.now();
  const w = state.weather;
  const isSunny = !w || w.current === 'sunny';
  // Dirty check: překreslit jen při změně počasí nebo každé 2s pro countdown
  if (!isSunny && w.current === _lastRenderedWeather && now - _lastWeatherRender < 2000) return;
  _lastWeatherRender = now;
  _lastRenderedWeather = isSunny ? '' : w.current;

  const banner = document.getElementById('weather-banner');
  if (!banner) return;
  banner.style.display = isSunny ? 'none' : '';
  if (isSunny) return;

  const def = WEATHERS[w.current] || WEATHERS.sunny;
  const remaining = Math.max(0, (w.endsAt - now) / 1000);
  const totalMap = { rainbow:60, poststorm:30, storm:150, frost:150 };
  const total = totalMap[w.current] || 240;
  const pct = Math.min(100, (remaining / total) * 100);
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  const timeStr = mins > 0 ? `${mins}:${secs.toString().padStart(2,'0')}` : `${Math.ceil(remaining)}s`;

  banner.style.setProperty('--wb-color', def.color);
  const iconEl = document.getElementById('wb-icon');
  const nameEl = document.getElementById('wb-name');
  const barEl  = document.getElementById('wb-bar');
  const timeEl = document.getElementById('wb-time');
  const prepEl = document.getElementById('wb-prepare-btn');
  if (iconEl) iconEl.textContent = def.emoji;
  if (nameEl) nameEl.textContent = def.name;
  if (barEl)  barEl.style.width  = pct + '%';
  if (timeEl) timeEl.textContent = timeStr;
  if (prepEl) {
    const canPrepare = !w.preparedBy && w.current !== 'poststorm';
    prepEl.style.display = canPrepare ? '' : 'none';
    if (canPrepare) {
      const cost = Math.max(1, Math.floor(state.money * 0.15));
      prepEl.textContent = `Připravit se (${fmt(cost)})`;
    }
  }
}

