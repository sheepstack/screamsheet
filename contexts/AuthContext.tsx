// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { login, logout as apiLogout } from "../lib/api";

type User = {
  id: string;
  email: string;
  username?: string | null;
};

type AuthContextType = {
  user: User | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  /* -------------------------------------------------------------
     Load any saved token + user profile from storage on startup
  ------------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const [token, userStr] = await Promise.all([
          AsyncStorage.getItem("ss_token"),
          AsyncStorage.getItem("ss_user"),
        ]);

        if (token && userStr) {
          try {
            const parsed: User = JSON.parse(userStr);
            // Very light sanity-check
            if (parsed && parsed.id && parsed.email) {
              setUser(parsed);
            } else {
              await AsyncStorage.multiRemove(["ss_token", "ss_user"]);
            }
          } catch {
            await AsyncStorage.multiRemove(["ss_token", "ss_user"]);
          }
        } else {
          await AsyncStorage.multiRemove(["ss_token", "ss_user"]);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  /* -------------------------------------------------------------
     Sign in -> store token + user from login response
  ------------------------------------------------------------- */
  async function signIn(email: string, password: string) {
    // login should return: { access_token, token_type, user?: { id, email, username? } }
    const res = await login(email, password);

    const token = res.access_token;
    if (!token) {
      throw new Error("No token returned from login");
    }

    // Prefer user object from backend if present
    let profile: User | null = null;
    if (res.user && res.user.id && res.user.email) {
      profile = {
        id: String(res.user.id),
        email: res.user.email,
        username: res.user.username ?? null,
      };
    } else {
      // Fallback: synthesize a minimal user from the email
      profile = {
        id: email.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        username: null,
      };
    }

    // Persist
    await AsyncStorage.setItem("ss_token", token);
    await AsyncStorage.setItem("ss_user", JSON.stringify(profile));

    // Update state
    setUser(profile);
  }

  /* -------------------------------------------------------------
     Sign out -> clear local state and AsyncStorage
  ------------------------------------------------------------- */
  async function signOut() {
    try {
      await apiLogout(); // if your backend has a logout route; otherwise this is a no-op
    } catch {
      // ignore backend logout errors
    }
    await AsyncStorage.multiRemove(["ss_token", "ss_user"]);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, ready, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/* -------------------------------------------------------------
   Hook for using authentication context
------------------------------------------------------------- */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
