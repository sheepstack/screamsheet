// lib/user.ts
import * as SecureStore from "expo-secure-store";

const KEY = "screamsheet_user_id";

function uuid4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns a stable per-device user id.
 * Uses SecureStore on native; falls back to localStorage on web.
 */
export async function getUserId(): Promise<string> {
  try {
    // Native (iOS/Android via Expo Go)
    let id = await SecureStore.getItemAsync(KEY);
    if (!id) {
      id = uuid4();
      await SecureStore.setItemAsync(KEY, id);
    }
    return id;
  } catch {
    // Web fallback
    if (typeof window !== "undefined") {
      const existing = window.localStorage.getItem(KEY);
      if (existing) return existing;
      const id = uuid4();
      window.localStorage.setItem(KEY, id);
      return id;
    }
    return uuid4();
  }
}
