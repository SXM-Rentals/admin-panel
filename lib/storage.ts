// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: A tiny place to remember small settings in the visitor's
// own browser — things like "this person prefers dark mode" or "they chose
// French". Nothing here is sent to a server, and nothing personal is kept here.
//
// TWO THINGS TO KNOW:
//
// 1. Web pages are built on the server first, where there is no browser and so
//    no storage at all. Every read below checks for that, otherwise the site
//    would crash before it ever reached anyone.
//
// 2. Private browsing modes and "block site data" settings can refuse to store
//    anything, and some browsers throw an error rather than politely declining.
//    So every call is wrapped — if storing is not allowed we simply carry on
//    without remembering, which is a far better outcome than a broken page.

// Whether we are running in a real browser rather than on the server.
const hasWindow = (): boolean => typeof window !== 'undefined';

// ---- THE IMMEDIATE VERSION ----
// Used where the answer is needed right now, before anything is drawn — mainly
// picking the light or dark theme, which has to be settled before the first
// paint or the page visibly flickers from one to the other.

export function getItemSync(key: string): string | null {
  if (!hasWindow()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItemSync(key: string, value: string): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — carry on without remembering.
  }
}

export function removeItemSync(key: string): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to do.
  }
}

// ---- THE PROMISE VERSION ----
// The mobile app's storage is asynchronous, because a phone's secure storage
// genuinely takes a moment. Keeping the same shape here means code ported from
// the mobile app works unchanged rather than needing to be rewritten.

const storage = {
  async getItem(key: string): Promise<string | null> {
    return getItemSync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    setItemSync(key, value);
  },

  async removeItem(key: string): Promise<void> {
    removeItemSync(key);
  },
};

export default storage;
