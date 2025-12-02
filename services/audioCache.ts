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
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'normalizedText' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
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

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
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

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
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

