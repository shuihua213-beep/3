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

export interface AddEmotionParams {
  id: string;
  name: string;
  emoji: string;
  color: string;
  gradient: string;
  particle: string;
  questions?: string[];
  baseOn?: string;
  greeting: string;
}

const DB_NAME = 'MoodDiaryDB';
const DB_VERSION = 1;
const EMOTIONS_STORE = 'emotions';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(EMOTIONS_STORE)) {
        db.createObjectStore(EMOTIONS_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllEmotions(): Promise<Emotion[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EMOTIONS_STORE, 'readonly');
    const store = tx.objectStore(EMOTIONS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getEmotionById(id: string): Promise<Emotion | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EMOTIONS_STORE, 'readonly');
    const store = tx.objectStore(EMOTIONS_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putEmotion(emotion: Emotion): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EMOTIONS_STORE, 'readwrite');
    const store = tx.objectStore(EMOTIONS_STORE);
    const request = store.put(emotion);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function putEmotions(emotions: Emotion[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EMOTIONS_STORE, 'readwrite');
    const store = tx.objectStore(EMOTIONS_STORE);
    for (const emotion of emotions) {
      store.put(emotion);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function addEmotion(params: AddEmotionParams): Promise<Emotion> {
  const existing = await getAllEmotions();

  if (existing.find(e => e.id === params.id)) {
    throw new Error(`Emotion with id "${params.id}" already exists`);
  }

  let questions = params.questions;

  if (!questions || questions.length === 0) {
    if (params.baseOn) {
      const baseEmotion = existing.find(e => e.id === params.baseOn);
      if (baseEmotion) {
        questions = [...baseEmotion.questions];
      } else {
        throw new Error(`Base emotion "${params.baseOn}" not found. Available: ${existing.map(e => e.id).join(', ')}`);
      }
    } else {
      throw new Error('Must provide either "questions" (array of 5 strings) or "baseOn" (id of existing emotion)');
    }
  }

  if (questions.length !== 5) {
    throw new Error(`Questions must have exactly 5 items, got ${questions.length}`);
  }

  const emotion: Emotion = {
    id: params.id,
    name: params.name,
    emoji: params.emoji,
    color: params.color,
    gradient: params.gradient,
    particle: params.particle,
    questions,
    greeting: params.greeting,
  };

  await putEmotion(emotion);
  return emotion;
}

export async function initEmotionsFromJSON(): Promise<Emotion[]> {
  const existing = await getAllEmotions();
  if (existing.length > 0) {
    return existing;
  }

  const response = await fetch('/emotions.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch emotions.json: ${response.status}`);
  }
  const emotions: Emotion[] = await response.json();
  await putEmotions(emotions);
  return emotions;
}
