// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Asks the server once whether clearing test records is still
// possible, and hands the same answer to every control that needs it.
//
// WHY IT IS CACHED AND NOTHING ELSE IN THIS PANEL IS. There are eight of these
// controls across six screens, and three of them can be on one screen at once.
// Without this, opening the Activity screen asks the same question three times and
// gets three identical answers. Nothing else in the panel has that shape: every
// other screen asks for its own records once.
//
// THE ANSWER GOES STALE ON PURPOSE AFTER A CLEAR. Clearing records can change
// whether the next clear is possible — the server refuses one that would take more
// with it — so anything that clears forgets this afterwards and the controls ask
// again. It is also forgotten when a clear is refused, because the reason may be
// that the window has shut since the screen was opened.

import { apiClient } from '@/lib/api-client';
import type { TestDataStatus } from '@/types';

let asked: Promise<TestDataStatus> | undefined;

export function testDataStatus(): Promise<TestDataStatus> {
  if (!asked) asked = apiClient.getTestDataStatus();
  return asked;
}

export function forgetTestDataStatus(): void {
  asked = undefined;
}
