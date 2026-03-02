// Per-level fields that get synced to/from levelData
const LEVEL_FIELDS = ['money','totalEarned','businesses','managers','upgrades','globalUpgrades','totalSeeds','prestigeCount'];

export function syncLevelToData(state) {
  if (!state.levelData) state.levelData = {};
  const d = {};
  for (const k of LEVEL_FIELDS) d[k] = state[k];
  state.levelData[state.currentLevel] = JSON.parse(JSON.stringify(d));
}

export async function saveState(state) {
  syncLevelToData(state);
  state.lastSaved = Date.now();
  localStorage.setItem('farmtycoon_v3', JSON.stringify(state));
  const user = auth.currentUser;
  if (user) {
    try {
      await db.collection('saves').doc(user.uid).set(JSON.parse(JSON.stringify(state)));
    } catch(e) {}
  }
}

export function loadState() {
  try { const s=localStorage.getItem('farmtycoon_v3'); return s?JSON.parse(s):null; }
  catch { return null; }
}

export async function loadCloudState(uid) {
  try {
    const doc = await db.collection('saves').doc(uid).get();
    return doc.exists ? doc.data() : null;
  } catch(e) { return null; }
}
