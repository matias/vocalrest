/**
 * IndexedDB service for caching generated audio
 */

const DB_NAME = 'vocalrest_cache';
const DB_VERSION = 1;
const STORE_NAME = 'audio_cache';

interface CachedAudio {
  normalizedText: string;
  originalText: string;
  base64Audio: string;
  voice: string;
  timestamp: number;
}

/**
 * Normalizes text for comparison: lowercase, remove punctuation, normalize spaces
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim();
}

/**
 * Opens the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is available
    if (typeof indexedDB === 'undefined') {
      const error = new Error('IndexedDB is not available in this browser');
      console.error(error);
      reject(error);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      const db = request.result;
      // Verify the object store exists
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        console.error('Object store does not exist after open');
        reject(new Error('Object store not found'));
        return;
      }
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      try {
        // Delete existing store if it exists (for clean upgrade)
        if (db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
        }
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'normalizedText' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('IndexedDB upgraded, object store created');
      } catch (error) {
        console.error('Error creating object store:', error);
        reject(error);
      }
    };

    request.onblocked = () => {
      console.warn('IndexedDB upgrade blocked - please close other tabs');
      // Don't reject, just warn - the upgrade will proceed when tabs are closed
    };
  });
}

/**
 * Gets cached audio for a normalized text
 */
export async function getCachedAudio(normalizedText: string): Promise<CachedAudio | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(normalizedText);

      request.onerror = () => {
        console.error('Error getting cached audio from store:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          console.log('Cache hit for:', normalizedText);
        } else {
          console.log('Cache miss for:', normalizedText);
        }
        resolve(result || null);
      };

      transaction.onerror = () => {
        console.error('Transaction error:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Error getting cached audio:', error);
    return null;
  }
}

/**
 * Stores audio in cache
 */
export async function cacheAudio(
  normalizedText: string,
  originalText: string,
  base64Audio: string,
  voice: string
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const cachedAudio: CachedAudio = {
        normalizedText,
        originalText,
        base64Audio,
        voice,
        timestamp: Date.now(),
      };

      const request = store.put(cachedAudio);

      request.onerror = () => {
        console.error('Error storing cached audio:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        console.log('Cached audio for:', normalizedText);
        resolve();
      };

      transaction.onerror = () => {
        console.error('Transaction error while caching:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Error caching audio:', error);
    // Don't throw - caching failure shouldn't break the app
  }
}

/**
 * Gets all cached entries for history (sorted by timestamp, most recent first)
 */
export async function getAllCachedEntries(): Promise<CachedAudio[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // prev = descending order

      const entries: CachedAudio[] = [];
      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          entries.push(cursor.value);
          cursor.continue();
        } else {
          resolve(entries);
        }
      };
    });
  } catch (error) {
    console.error('Error getting cached entries:', error);
    return [];
  }
}

/**
 * Clears all cached audio
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    throw error;
  }
}

