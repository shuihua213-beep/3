export interface Emotion {
  id: string;
  name: string;
  emoji: string;
  color: string;
  gradient: string;
  particle: string;
  questions: string[];
  greeting: string;
}

const DB_NAME = 'MoodDiaryDB';
const DB_VERSION = 1;
const EMOTIONS_STORE = 'emotions';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(EMOTIONS_STORE)) {
        db.createObjectStore(EMOTIONS_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const getEmotions = async (): Promise<Emotion[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(EMOTIONS_STORE, 'readonly');
    const store = transaction.objectStore(EMOTIONS_STORE);
    const request = store.getAll();

    request.onsuccess = async () => {
      const emotions = request.result;
      if (emotions && emotions.length > 0) {
        resolve(emotions);
      } else {
        // Fetch from public/emotions.json
        try {
          const response = await fetch('/emotions.json');
          const defaultEmotions: Emotion[] = await response.json();
          
          // Save to IndexedDB
          const writeTx = db.transaction(EMOTIONS_STORE, 'readwrite');
          const writeStore = writeTx.objectStore(EMOTIONS_STORE);
          defaultEmotions.forEach(emotion => {
            writeStore.put(emotion);
          });
          
          writeTx.oncomplete = () => {
            resolve(defaultEmotions);
          };
          writeTx.onerror = () => {
            reject(writeTx.error);
          };
        } catch (error) {
          reject(error);
        }
      }
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const saveEmotion = async (emotion: Emotion): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(EMOTIONS_STORE, 'readwrite');
    const store = transaction.objectStore(EMOTIONS_STORE);
    const request = store.put(emotion);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};
