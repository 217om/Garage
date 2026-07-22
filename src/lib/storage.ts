import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Database, User } from '@/types';

const DB_KEY = 'garaje:db:v1';
const SESSION_KEY = 'garaje:session:v1';

export async function loadDatabase(): Promise<Database | null> {
  try {
    const raw = await AsyncStorage.getItem(DB_KEY);
    return raw ? (JSON.parse(raw) as Database) : null;
  } catch {
    return null;
  }
}

export async function saveDatabase(db: Database): Promise<void> {
  try {
    await AsyncStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // best-effort persistence; ignore storage failures
  }
}

export async function loadSession(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export async function saveSession(user: User | null): Promise<void> {
  try {
    if (user) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // ignore
  }
}

export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([DB_KEY, SESSION_KEY]);
  } catch {
    // ignore
  }
}
