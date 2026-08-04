// IndexedDB helper for caching uploaded audio files locally on the device

const DB_NAME = 'utel_audios_cache_db';
const STORE_NAME = 'audios';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Saves an audio Blob in IndexedDB under the specified call ID
 */
export async function saveAudioToDB(id: string, file: Blob): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(file, id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to save audio'));
  });
}

/**
 * Retrieves an audio Blob from IndexedDB for the specified call ID
 */
export async function getAudioFromDB(id: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        reject(request.error || new Error('Failed to retrieve audio'));
      };
    });
  } catch (err) {
    console.error('IndexedDB not supported or failed to open:', err);
    return null;
  }
}

/**
 * Deletes cached audio Blob from IndexedDB
 */
export async function deleteAudioFromDB(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Failed to delete audio'));
    });
  } catch (err) {
    console.error('Failed to delete from IndexedDB:', err);
  }
}

/**
 * Clears all cached audio Blobs from IndexedDB
 */
export async function clearAllAudiosFromDB(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Failed to clear IndexedDB'));
    });
  } catch (err) {
    console.error('Failed to clear IndexedDB:', err);
  }
}
