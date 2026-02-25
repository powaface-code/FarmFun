// ═══════════════════════════════════════════════
// SAVE / LOAD — localStorage + Firestore
// ═══════════════════════════════════════════════
async function saveState() {
  state.lastSaved = Date.now();
  localStorage.setItem('farmtycoon_v3', JSON.stringify(state));
  const user = auth.currentUser;
  if (user) {
    try {
      await db.collection('saves').doc(user.uid).set(JSON.parse(JSON.stringify(state)));
    } catch(e) { /* tiché selhání – localStorage zůstává jako záloha */ }
  }
}

function loadState() {
  try { const s=localStorage.getItem('farmtycoon_v3'); return s?JSON.parse(s):null; }
  catch { return null; }
}

async function loadCloudState(uid) {
  try {
    const doc = await db.collection('saves').doc(uid).get();
    return doc.exists ? doc.data() : null;
  } catch(e) { return null; }
}
