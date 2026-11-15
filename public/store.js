// Device storage. IndexedDB holds the app state; localStorage is a fallback for
// browsers that block IndexedDB. The original localStorage plans are read once
// on first launch and left in place as a backup.
import {LEGACY_KEY, defaultState, fromLegacy, validateState} from './state.js?v=32';

const DB = 'quasar', STORE = 'state', KEY = 'app', FALLBACK = 'quasar-state-v2';
let db = null;

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(Error('IndexedDB unavailable'));
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function tx(mode, run) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode), store = t.objectStore(STORE), request = run(store);
    t.oncomplete = () => resolve(request?.result);
    t.onerror = t.onabort = () => reject(t.error);
  });
}

function readLegacy() {
  try { return fromLegacy(JSON.parse(localStorage.getItem(LEGACY_KEY))); } catch { return null; }
}

// Returns {state, warning}. A warning means saving may not survive.
export async function load() {
  try {
    db = await openDb();
    const saved = await tx('readonly', s => s.get(KEY));
    if (saved) return {state: validateState(saved)};
    const state = readLegacy() || defaultState();
    await tx('readwrite', s => s.put(state, KEY));
    return {state};
  } catch {
    db = null;
    try {
      const saved = JSON.parse(localStorage.getItem(FALLBACK));
      if (saved) return {state: validateState(saved), warning: 'limited'};
    } catch {}
    return {state: readLegacy() || defaultState(), warning: 'limited'};
  }
}

let pending = null, timer = 0, erased = false;
// Coalesce bursts (slider drags) into one write.
export function save(state) {
  if (erased) return;
  pending = state;
  clearTimeout(timer);
  timer = setTimeout(flush, 120);
}
export async function flush() {
  clearTimeout(timer);
  if (!pending || erased) return true;
  const snapshot = structuredClone(pending);
  pending = null;
  try {
    if (db) await tx('readwrite', s => s.put(snapshot, KEY));
    else localStorage.setItem(FALLBACK, JSON.stringify(snapshot));
    return true;
  } catch { return false; }
}
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

// Asks the browser not to evict data under storage pressure.
export async function persist() {
  try { return await navigator.storage?.persist?.(); } catch { return false; }
}

export function backupBlob(state) {
  return new Blob([JSON.stringify({...state, exportedAt: new Date().toISOString()}, null, 1)], {type: 'application/json'});
}
export async function readBackup(file) {
  if (file.size > 5e6) throw Error('That file is too large to be a Quasar backup.');
  let raw;
  try { raw = JSON.parse(await file.text()); } catch { throw Error('That file is not a Quasar backup.'); }
  return validateState(raw);
}

// Removes everything Quasar stored on this device, including the original
// localStorage plans (otherwise they would be migrated back in on next launch).
// Pending writes are dropped so nothing is saved again before the page reloads.
export async function eraseAll() {
  erased = true;
  pending = null;
  clearTimeout(timer);
  db?.close();
  db = null;
  await new Promise(resolve => {
    try {
      const request = indexedDB.deleteDatabase(DB);
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    } catch { resolve(); }
  });
  try { localStorage.removeItem(FALLBACK); localStorage.removeItem(LEGACY_KEY); } catch {}
}
