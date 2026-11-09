"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";
import { isUserId, type UserId } from "@/lib/users";
import { WhoAmI } from "./WhoAmI";

const STORAGE_KEY = "lcw.user";
const listeners = new Set<() => void>();

export function readStoredUser(storage: Pick<Storage, "getItem">): UserId | null {
  try {
    const value = storage.getItem(STORAGE_KEY);
    return isUserId(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user: UserId | null) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, user);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked: the choice lasts until reload
  }
  memoryUser = user;
  listeners.forEach((l) => l());
}

let memoryUser: UserId | null | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): UserId | null {
  if (memoryUser === undefined) memoryUser = readStoredUser(localStorage);
  return memoryUser;
}

// undefined on the server so nothing user-specific renders before hydration
const getServerSnapshot = (): UserId | null | undefined => undefined;

const UserContext = createContext<{ user: UserId | null; switchUser: () => void } | null>(null);

/** Always renders the page; the picker overlays it until a user is chosen. */
export function UserProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore<UserId | null | undefined>(subscribe, getSnapshot, getServerSnapshot);
  const switchUser = useCallback(() => writeStoredUser(null), []);

  return (
    <UserContext.Provider value={{ user: user ?? null, switchUser }}>
      {children}
      {user === null && <WhoAmI onPick={writeStoredUser} />}
    </UserContext.Provider>
  );
}

/** The current user, or null before hydration / while the picker is open. */
export function useUserState() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUserState must be used inside <UserProvider>");
  return ctx;
}

/** For components that only render once a user is known. */
export function useUser() {
  const { user, switchUser } = useUserState();
  if (!user) throw new Error("useUser called before a user was picked");
  return { user, switchUser };
}
