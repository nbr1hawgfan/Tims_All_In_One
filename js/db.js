/* ============================================================
   Personal Toolkit — IndexedDB wrapper
   All data lives only on this device. Nothing is sent anywhere.
   ============================================================ */

const TOOLKIT_DB_NAME = 'personal-toolkit-db';
const TOOLKIT_DB_VERSION = 4;

const TOOLKIT_STORES = [
  'pantry',      // { id, name, brand, barcode, qty, category, lowStock, addedAt, imageDataUrl }
  'shopping',    // { id, name, qty, note, checked, addedAt }
  'notes',       // { id, title, body, photoDataUrl, createdAt, updatedAt }
  'health',      // { id, date, weightLb, heightIn, bodyFatPct, note }
  'vault_meta',  // { id: 'meta', salt, verifier, iv }  (single row, for secure vault unlock)
  'vault_items', // { id, kind: 'login'|'card', cipherText, iv, createdAt, updatedAt }
  'steps',       // { id: 'steps-YYYY-MM-DD', dateKey, steps }
  'water',       // { id, ts, dateKey, amountOz }
  'protein',     // { id, ts, dateKey, grams }
  'settings',    // { id, value }  (generic key/value: goals, spinner custom list, etc.)
  'spinner_history', // { id, ts, winner }
  'home_inventory', // { id, name, room, estimatedValue, purchaseDate, serialNumber, notes, photoDataUrl, addedAt }
  'sleep',       // { id: 'sleep-YYYY-MM-DD', dateKey, hours, quality, note }
  'blood_pressure', // { id, ts, dateKey, systolic, diastolic, pulse, note }
];

function toolkitOpenDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(TOOLKIT_DB_NAME, TOOLKIT_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      TOOLKIT_STORES.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function toolkitId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

async function dbPut(storeName, record) {
  const db = await toolkitOpenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(record);
    tx.oncomplete = () => resolve(record);
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGet(storeName, id) {
  const db = await toolkitOpenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(storeName) {
  const db = await toolkitOpenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(storeName, id) {
  const db = await toolkitOpenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function dbClearStore(storeName) {
  const db = await toolkitOpenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
