// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The small pieces the Saved Versions screens share — what to
// call a version, what a version holds, and how to read an amount out of one.
//
// THE "HOLDS" SENTENCE IS BUILT FROM THE SERVER'S LIST OF KINDS rather than typed out.
// The server has widened what a version holds before, and a sentence in the panel
// saying "a version holds bookings, payments and payouts" would go on saying it after
// the server held more — a help line that is confidently wrong is worse than none.
// Built from the kinds it is right the day a kind is added.

import { clockTime, longDate, money } from '@/lib/format';
import type { SavedKind, SavedVersion } from '@/types';

// "the version saved 12 Oct 2026 at 14:05 — “before the launch run”".
export function versionLabel(version: SavedVersion): string {
  const when = `the version saved ${longDate(version.createdAt)} at ${clockTime(version.createdAt)}`;
  return version.note ? `${when} — “${version.note}”` : when;
}

// "the audit log, bookings, payments … and vehicles", from what the server says it
// holds. The server's own labels, lower-cased, so a kind added later reads naturally.
export function holdsSentence(kinds: SavedKind[]): string {
  const names = kinds.map((entry) => entry.label.toLowerCase());
  if (names.length === 0) return 'records';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// A saved amount is in CENTS, as the server stores it; everywhere else in this panel
// money is dollars. Converted once, here, and nowhere else — a figure that is a
// hundred times too big on one screen is how somebody decides the platform took $32,000
// when it took $320.
export function savedAmount(cents: number | null): string {
  return cents === null ? '' : money(cents / 100);
}

// How many records a version holds in all, across whatever kinds there are.
export function totalHeld(version: SavedVersion, kinds: SavedKind[]): number {
  return kinds.reduce((sum, entry) => sum + (version.counts[entry.kind] ?? 0), 0);
}

// And how many of them are gone from the platform now: what putting it back would
// actually restore.
export function totalMissing(version: SavedVersion, kinds: SavedKind[]): number {
  return kinds.reduce((sum, entry) => sum + (version.missing[entry.kind] ?? 0), 0);
}
