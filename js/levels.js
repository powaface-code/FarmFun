// ═══════════════════════════════════════════════
// LEVELS — přepínání levelů, renderování level sheetu
// ═══════════════════════════════════════════════
import { LEVELS, BUSINESSES, setActiveLevel } from './data.js';
import { state, freshLevelState } from './state.js';
import { syncLevelToData } from './save.js';
import { isLevelComplete, isMaxed } from './formulas.js';
import { stopAllTimers, startProgress, progressTimers } from './timers.js';
import { fmt } from './format.js';
import { notify } from './notify.js';
import { saveState } from './save.js';

const LEVEL_FIELDS = ['money','totalEarned','businesses','managers','upgrades','globalUpgrades','totalSeeds','prestigeCount'];

function loadLevelFromData(levelId) {
  const d = state.levelData[levelId];
  if (d) {
    for (const k of LEVEL_FIELDS) if (d[k] !== undefined) state[k] = JSON.parse(JSON.stringify(d[k]));
  } else {
    const fresh = freshLevelState(levelId);
    if (fresh) for (const k of LEVEL_FIELDS) state[k] = fresh[k];
  }
  // Normalize loaded businesses
  if (state.businesses) state.businesses.forEach(b => {
    b.running = false; b.progress = 0;
    if (!b.timerMult) b.timerMult = 1;
    delete b.remainingMs;
  });
  if (!state.globalUpgrades) state.globalUpgrades = {};
}

export function isLevelUnlocked(levelId) {
  if (levelId === 0) return true;
  // Level N is unlocked if level N-1 is complete (check from levelData)
  const prevData = state.levelData[levelId - 1];
  if (!prevData) return false;
  const prevLvl = LEVELS[levelId - 1];
  if (!prevLvl) return false;
  // Check if all businesses in previous level are maxed
  for (const bDef of prevLvl.businesses) {
    const bs = prevData.businesses[bDef.id];
    if (!bs || bs.count <= 0) return false;
    const lastMs = bDef.milestones[bDef.milestones.length - 1];
    if (lastMs && bs.count < lastMs.at) return false;
  }
  return true;
}

let _renderCallback = null;
export function initLevels(renderCallback) {
  _renderCallback = renderCallback;
}

export function switchLevel(levelId) {
  if (levelId === state.currentLevel) return;
  if (!isLevelUnlocked(levelId)) { notify('🔒 Tento level ještě není odemčený!'); return; }

  // 1. Save current level state
  syncLevelToData(state);

  // 2. Stop all timers
  stopAllTimers();

  // 3. Clear per-farm weather effects
  state.frozenFarms = [];
  state.pestFarms = [];
  state.goldenFarmIds = null;
  state._butterflyUntil = 0;

  // 4. Switch level
  state.currentLevel = levelId;

  // 5. Swap data exports
  setActiveLevel(levelId);

  // 6. Load new level state
  loadLevelFromData(levelId);

  // 7. Start timers for managed businesses
  for (const b of BUSINESSES) {
    const bs = state.businesses[b.id];
    if (bs && bs.managerHired && bs.count > 0) startProgress(b.id);
  }

  // 8. Re-render
  if (_renderCallback) _renderCallback();
  saveState(state);

  const lvl = LEVELS[levelId];
  notify(`${lvl.emoji} Level: ${lvl.name}`, 'gold');
}

export function renderLevels() {
  const list = document.getElementById('levels-list');
  if (!list) return;

  // Make sure current level data is synced for accurate completion check
  syncLevelToData(state);

  list.innerHTML = '';
  for (const lvl of LEVELS) {
    const isCurrent = lvl.id === state.currentLevel;
    const unlocked = isLevelUnlocked(lvl.id);

    // Calculate completion
    let maxedCount = 0;
    const totalBiz = lvl.businesses.length;
    if (unlocked || isCurrent) {
      const ld = state.levelData[lvl.id];
      if (ld && ld.businesses) {
        for (const bDef of lvl.businesses) {
          const bs = ld.businesses[bDef.id];
          if (!bs || bs.count <= 0) continue;
          const lastMs = bDef.milestones[bDef.milestones.length - 1];
          if (lastMs && bs.count >= lastMs.at) maxedCount++;
        }
      }
    }
    const complete = maxedCount === totalBiz && unlocked;

    const card = document.createElement('div');
    card.className = `level-card${isCurrent ? ' current' : ''}${!unlocked ? ' locked' : ''}${complete ? ' complete' : ''}`;
    card.style.setProperty('--level-color', lvl.color);

    let statusHTML;
    if (!unlocked) {
      statusHTML = '<span class="level-status locked">🔒 Zamčeno</span>';
    } else if (complete) {
      statusHTML = '<span class="level-status done">✅ Dokončeno</span>';
    } else {
      statusHTML = `<span class="level-status active">${maxedCount}/${totalBiz} komodit</span>`;
    }

    card.innerHTML = `
      <div class="level-icon" style="background:${lvl.color}22">${lvl.emoji}</div>
      <div class="level-info">
        <div class="level-name">Level ${lvl.id + 1}: ${lvl.name}</div>
        <div class="level-desc">${lvl.desc}</div>
        <div class="level-status-row">${statusHTML}</div>
      </div>
      ${unlocked
        ? `<button class="level-play-btn${isCurrent ? ' current' : ''}" ${isCurrent ? 'disabled' : ''}>${isCurrent ? '▶ Aktivní' : 'Hrát'}</button>`
        : '<div class="level-lock">🔒</div>'
      }
    `;

    if (unlocked && !isCurrent) {
      card.querySelector('.level-play-btn').addEventListener('click', () => switchLevel(lvl.id));
    }

    list.appendChild(card);
  }
}
