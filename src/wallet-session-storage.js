const databaseName = 'arkade-signet-detector-wallet-v1';
const storeName = 'session';
const recordKey = 'active';
const additionalData = new TextEncoder().encode('arkade-signet-detector:wallet:v1');

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB || !globalThis.crypto?.subtle) return reject(new Error('Private browser storage is unavailable.'));
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = request.onblocked = () => reject(new Error('Private browser storage is unavailable.'));
  });
}

async function transaction(mode, run) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    let result;
    const tx = database.transaction(storeName, mode);
    tx.oncomplete = () => { database.close(); resolve(result); };
    tx.onerror = tx.onabort = () => { database.close(); reject(new Error('Private browser storage operation failed.')); };
    try { run(tx.objectStore(storeName), (value) => { result = value; }); } catch { tx.abort(); }
  });
}

export async function saveWalletPhrase(phrase) {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, key, new TextEncoder().encode(phrase));
  await transaction('readwrite', (store, done) => {
    store.put({ version: 1, key, iv, encrypted }, recordKey);
    done(undefined);
  });
}

export async function loadWalletPhrase() {
  const record = await transaction('readonly', (store, done) => {
    const request = store.get(recordKey);
    request.onsuccess = () => done(request.result);
  });
  if (!record) return null;
  if (record.version !== 1 || !record.key || record.key.extractable || !record.iv || !record.encrypted) throw new Error('Saved wallet session cannot be read.');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: record.iv, additionalData }, record.key, record.encrypted);
  return new TextDecoder().decode(plain);
}

export async function clearWalletPhrase() {
  await transaction('readwrite', (store, done) => {
    store.delete(recordKey);
    done(undefined);
  });
}
