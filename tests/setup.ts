// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Runs once before every test file and puts the fake
// browser into a usable state.
//
// A REAL BROWSER HAS THINGS jsdom DOES NOT. jsdom is a good imitation but an
// incomplete one: it has no idea how to measure a window, it cannot scroll, and
// it has no clipboard. A component that uses any of those would crash the test
// with "not a function" — which tells you nothing about whether the component
// works. Filling the gaps here means a failing test is always a real failure.
//
// Everything below is a stand-in, deliberately simple. None of it tries to
// imitate browser behaviour properly; it just has to exist and not throw.

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Tests share one page. Without this, the second test in a file finds the first
// test's buttons still sitting there and "found two matching elements" failures
// appear that have nothing to do with the code being tested.
afterEach(() => {
  cleanup();
});

// Used by anything that reacts to the window changing size — the sidebar
// deciding between a rail and a drawer, for one.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// Anything that watches an element's size. jsdom gives every element a size of
// zero, so a real implementation would report nothing useful anyway.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Anything that waits for an element to scroll into view.
if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class {
    root = null;
    rootMargin = '';
    thresholds: number[] = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}

// Modals call this when they open, to put the page back where it was on close.
if (!window.scrollTo) {
  window.scrollTo = (() => {}) as typeof window.scrollTo;
}
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

// The share button's copy option. Recording the calls means a test can check
// that the right address was copied, not merely that nothing crashed.
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
}

// Every test starts with an empty browser store, so a saved theme or a signed-in
// session left behind by one test cannot change the outcome of the next.
afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

// ---- NOTHING IN A TEST TALKS TO THE REAL SERVER ----
// The panel asks the server who is signed in as soon as it starts, so without
// this every test would make a real request over the internet — slow, different
// every run, and failing entirely when SXM Rentals is asleep.
//
// The stand-in answers the way the server answers a visitor with no session: a
// polite "nobody is signed in". That is a real answer rather than a fault, so
// the panel settles immediately on the sign-in screen instead of retrying and
// leaving timers running after the test has finished.
//
// A test that cares about a particular reply replaces this for itself.
//
// A FRESH REPLY EVERY TIME, NOT ONE REPLY SHARED. A reply's contents can only be
// read once — the second attempt fails with "Body has already been read". An
// earlier version handed the same reply to every request, so the second request
// in any test failed, the panel treated that as a dropped connection and tried
// again on its real five- and fifteen-second timers, and those timers went off
// in the middle of whichever test ran next. Tests failed that had nothing wrong
// with them. Building the reply inside the function gives every request its own.
beforeEach(() => {
  global.fetch = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          error: { code: 'unauthorized', message: 'Please sign in to the admin panel.' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ),
  ) as unknown as typeof fetch;
});
