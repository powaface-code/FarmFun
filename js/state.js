import { BUSINESSES, LEVELS, setActiveLevel } from './data.js';
import { loadState } from './save.js';

export function normalizeBuyMode(m) {
  if (m==='max' || m===0) return 'max';
  if (m==='milestone') return 'milestone';
  return '1';
}

function freshLevelState(levelId) {
  const lvl = LEVELS[levelId];
  if (!lvl) return null;
  return {
    money:0, totalEarned:0,
    businesses: lvl.businesses.map(b=>({id:b.id,count:b.id===0?1:0,progress:0,running:false,managerHired:false,upgradeMult:1,timerMult:1})),
    managers:{}, upgrades:{}, globalUpgrades:{},
    prestigeCount:0, totalSeeds:0,
  };
}

const saved = loadState();
export let state = saved || {
  currentLevel:0, levelData:{},
  money:0, totalEarned:0, buyMode:'1',
  businesses: BUSINESSES.map(b=>({id:b.id,count:b.id===0?1:0,progress:0,running:false,managerHired:false,upgradeMult:1,timerMult:1})),
  managers:{}, upgrades:{}, globalUpgrades:{}, prestigeCount:0, totalSeeds:0,
  weather:{ current:'sunny', endsAt:0, preparedBy:false, nextWeatherAt:0, nextType:'sunny', warnShown:false },
  season:{ current:'spring', startedAt:Date.now() },
  frozenFarms:[], pestFarms:[], goldenFarmIds:null, nextEventAt:0, _butterflyUntil:0,
};

// ─── Migration: old saves without level system ───
if (state.currentLevel === undefined) state.currentLevel = 0;
if (!state.levelData) state.levelData = {};

// Sync active level data exports
setActiveLevel(state.currentLevel);

// ─── Ensure fresh state exists for each level ───
export { freshLevelState };

// ─── Normalization ───
if (state.businesses) state.businesses.forEach(b => { b.running=false; b.progress=0; if(!b.timerMult) b.timerMult=1; delete b.remainingMs; });
if (!state.globalUpgrades) state.globalUpgrades = {};
state.buyMode = normalizeBuyMode(state.buyMode);
if (!state.weather) state.weather = { current:'sunny', endsAt:0, preparedBy:false, nextWeatherAt:0, nextType:'sunny', warnShown:false };
if (!state.season) state.season = { current:'spring', startedAt:Date.now() };
if (!state.frozenFarms) state.frozenFarms = [];
if (!state.pestFarms)   state.pestFarms = [];
if (state.goldenFarmIds === undefined) state.goldenFarmIds = null;
if (!state.nextEventAt) state.nextEventAt = 0;
if (!state._butterflyUntil) state._butterflyUntil = 0;
