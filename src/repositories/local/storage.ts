import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyLocalDb, hydrateLocalDb, type LocalDb } from './types';

const KEY = 'workshop.local.db.v1';

let memory: LocalDb | null = null;
let loadPromise: Promise<LocalDb> | null = null;

async function read(): Promise<LocalDb> {
  if (memory) return memory;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        memory = hydrateLocalDb(raw ? (JSON.parse(raw) as Partial<LocalDb>) : null);
      } catch {
        memory = emptyLocalDb();
      }
      return memory;
    })();
  }
  return loadPromise;
}

async function write(db: LocalDb): Promise<void> {
  memory = db;
  await AsyncStorage.setItem(KEY, JSON.stringify(db));
}

export async function withLocalDb<T>(fn: (db: LocalDb) => T | Promise<T>): Promise<T> {
  const db = await read();
  const result = await fn(db);
  await write(db);
  return result;
}

export async function readLocalDb(): Promise<LocalDb> {
  return read();
}

export async function resetLocalDb(): Promise<void> {
  memory = emptyLocalDb();
  loadPromise = Promise.resolve(memory);
  await AsyncStorage.setItem(KEY, JSON.stringify(memory));
}

export function newId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function todayStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}
