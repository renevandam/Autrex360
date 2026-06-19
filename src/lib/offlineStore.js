// ── Offline storage layer using IndexedDB ──────────────────
// One database per app, with object stores for:
// - auditSnapshots: the full template/sections/items/options needed to render an audit offline
// - pendingResponses: answers given while offline, queued for sync
// - pendingStockChecks: stock take rows given while offline, queued for sync

const DB_NAME = "autrex360-offline";
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("auditSnapshots")) {
        db.createObjectStore("auditSnapshots", { keyPath: "auditId" });
      }
      if (!db.objectStoreNames.contains("pendingResponses")) {
        // key: `${auditId}:${itemId}` so re-saving the same answer overwrites the queued one
        db.createObjectStore("pendingResponses", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("pendingStockChecks")) {
        // key: `${auditId}:${itemId}:${rowOrder}`
        db.createObjectStore("pendingStockChecks", { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, storeName, mode = "readonly") {
  return db.transaction(storeName, mode).objectStore(storeName);
}

// ── Snapshot: everything needed to render+answer an audit without network ──
export async function saveAuditSnapshot(auditId, snapshot) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = tx(db, "auditSnapshots", "readwrite");
    const req = store.put({ auditId, ...snapshot, savedAt: new Date().toISOString() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAuditSnapshot(auditId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = tx(db, "auditSnapshots");
    const req = store.get(auditId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAuditSnapshot(auditId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = tx(db, "auditSnapshots", "readwrite");
    const req = store.delete(auditId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Pending responses queue ──
export async function queueResponse(auditId, itemId, response) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = tx(db, "pendingResponses", "readwrite");
    const req = store.put({ key: `${auditId}:${itemId}`, auditId, itemId, response, queuedAt: new Date().toISOString() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingResponses(auditId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = tx(db, "pendingResponses");
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result || []).filter((r) => r.auditId === auditId));
    req.onerror = () => reject(req.error);
  });
}

export async function clearPendingResponse(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = tx(db, "pendingResponses", "readwrite");
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Pending stock check rows queue ──
export async function queueStockRow(auditId, itemId, rowOrder, values) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = tx(db, "pendingStockChecks", "readwrite");
    const key = `${auditId}:${itemId}:${rowOrder}`;
    const req = store.put({ key, auditId, itemId, rowOrder, ...values, queuedAt: new Date().toISOString() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingStockRows(auditId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = tx(db, "pendingStockChecks");
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result || []).filter((r) => r.auditId === auditId));
    req.onerror = () => reject(req.error);
  });
}

export async function clearPendingStockRow(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = tx(db, "pendingStockChecks", "readwrite");
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Helpers ──
export async function countPending(auditId) {
  const [responses, stockRows] = await Promise.all([getPendingResponses(auditId), getPendingStockRows(auditId)]);
  return responses.length + stockRows.length;
}
