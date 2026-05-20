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

const DB_NAME = 'mood-diary-db';
const DB_VERSION = 1;
const STORE_NAME = 'emotions';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readAll(db: IDBDatabase): Promise<Emotion[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as Emotion[]);
    request.onerror = () => reject(request.error);
  });
}

function putAll(db: IDBDatabase, emotions: Emotion[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const emotion of emotions) {
      store.put(emotion);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function putOne(db: IDBDatabase, emotion: Emotion): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(emotion);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let cachedEmotions: Emotion[] | null = null;
let loadPromise: Promise<Emotion[]> | null = null;

export function loadEmotions(): Promise<Emotion[]> {
  if (cachedEmotions) return Promise.resolve(cachedEmotions);
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const db = await openDB();
    const stored = await readAll(db);

    if (stored.length === 0) {
      const response = await fetch('/emotions.json');
      const defaults: Emotion[] = await response.json();
      await putAll(db, defaults);
      cachedEmotions = defaults;
      return defaults;
    }

    cachedEmotions = stored;
    return stored;
  })();

  return loadPromise;
}

export async function addEmotion(
  newEmotion: Emotion,
  baseOn?: string
): Promise<Emotion[]> {
  const db = await openDB();
  const all = cachedEmotions || (await readAll(db));

  if (all.some(e => e.id === newEmotion.id)) {
    console.warn(`Emotion with id "${newEmotion.id}" already exists, skipping.`);
    return all;
  }

  if (baseOn) {
    const base = all.find(e => e.id === baseOn);
    if (!base) {
      console.warn(`Base emotion "${baseOn}" not found, using default questions.`);
    } else {
      if (!newEmotion.questions || newEmotion.questions.length === 0) {
        newEmotion.questions = [...base.questions];
      }
      if (!newEmotion.greeting) {
        newEmotion.greeting = base.greeting;
      }
    }
  }

  if (!newEmotion.questions || newEmotion.questions.length === 0) {
    newEmotion.questions = [
      `今天是什么让你感到${newEmotion.name}？`,
      `这种${newEmotion.name}的感觉有多强烈？`,
      `你觉得${newEmotion.name}的原因是什么？`,
      `你希望如何表达这种${newEmotion.name}？`,
      `这份${newEmotion.name}让你对未来有什么想法？`
    ];
  }

  if (!newEmotion.greeting) {
    newEmotion.greeting = `让我们一起感受这份${newEmotion.name}。${newEmotion.emoji}`;
  }

  const updated = [...all, newEmotion];
  await putOne(db, newEmotion);
  cachedEmotions = updated;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('emotions-changed', { detail: updated }));
  }
  return updated;
}

export function getCachedEmotions(): Emotion[] | null {
  return cachedEmotions;
}

if (typeof window !== 'undefined') {
  (window as any).addEmotion = async (emotion: Emotion, baseOn?: string) => {
    const result = await addEmotion(emotion, baseOn);
    console.log('Emotions updated. Total:', result.length);
    console.log('Reload the page or re-trigger state to see changes.');
    return result;
  };
}