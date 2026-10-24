import { useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/**
 * Single shared Supabase auth listener for the whole app. Components read the
 * session through useSessionUser(); the root route registers an
 * onSessionUserChange callback for router/cache invalidation on identity
 * changes. Never subscribe to supabase.auth.onAuthStateChange elsewhere.
 */
type Listener = () => void;

let user: User | null = null;
let started = false;
const stateListeners = new Set<Listener>();
const changeListeners = new Set<(u: User | null) => void>();

function emit() {
  stateListeners.forEach((l) => l());
  changeListeners.forEach((cb) => cb(user));
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;

  void supabase.auth.getUser().then(({ data }) => {
    if ((user?.id ?? null) !== (data.user?.id ?? null)) {
      user = data.user ?? null;
      emit();
    }
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "TOKEN_REFRESHED") return;
    const next = session?.user ?? null;
    if (event !== "USER_UPDATED" && (user?.id ?? null) === (next?.id ?? null)) return;
    user = next;
    emit();
  });
}

export function subscribeSession(listener: Listener): () => void {
  start();
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

export function getSessionUser(): User | null {
  return user;
}

export function useSessionUser(): User | null {
  return useSyncExternalStore(subscribeSession, getSessionUser, () => null);
}

export function onSessionUserChange(callback: (u: User | null) => void): () => void {
  start();
  changeListeners.add(callback);
  callback(user);
  return () => {
    changeListeners.delete(callback);
  };
}

/** Only allow same-origin paths as post-sign-in destinations. */
export function sanitizeRedirect(target: string | null | undefined): string {
  if (!target || typeof window === "undefined") return "/studio";
  try {
    const url = new URL(target, window.location.origin);
    if (url.origin !== window.location.origin) return "/studio";
    return `${url.pathname}${url.search}${url.hash}` || "/studio";
  } catch {
    return "/studio";
  }
}
