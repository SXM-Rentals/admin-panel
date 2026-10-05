// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Lets the Action Queue screen tell the frame around it how
// many things are actually waiting, so the red number on the sidebar is right.
//
// WHY THIS EXISTS AT ALL. The frame fetched that count once, when somebody signed
// in, and never again. So dealing with the last thing in the queue left a red 1 on
// the sidebar sitting next to a screen that said "Nothing Is Waiting" — the panel
// contradicting itself on one screenshot. The frame now asks again on every move
// between screens, and the queue screen says its own count the moment it has the
// list, which covers the case the frame cannot: standing still on the queue while
// the work is dealt with.
//
// IT IS DELIBERATELY NOT A STORE. No state is kept here, nothing is cached, and
// nobody reads a value out of it. It is one message — "this many are waiting" —
// passed from the screen that just counted them to the frame that draws the
// number. A cache would be a second answer to a question that already has one.

type Listener = (count: number) => void;

const listeners = new Set<Listener>();

// The frame listens while it is mounted. Returns the way to stop.
export function onQueueCount(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The queue screen says what it counted.
export function publishQueueCount(count: number): void {
  for (const listener of listeners) listener(count);
}
