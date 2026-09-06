// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Thirty made-up customers, as staff see them — who they
// are, whether their identity check passed, whether they are a resident or a
// visitor, and how many reward points they hold.
//
// THIRTY IS NOT AN ARBITRARY NUMBER. The users list shows ten at a time, so
// thirty means three pages: enough to prove the paging controls work, to see
// what "1-10 of 30" looks like, and to notice if the last page is broken —
// which is the page that breaks.
//
// THE SPREAD OF STATES IS THE POINT. Most are approved, because most really will
// be, but the list also carries someone rejected with a reason, someone told to
// resubmit, four still pending, and one closed account. Every status pill in the
// design gets drawn at least once without anybody having to go looking for it.

import type { AdminUser, RewardTier, VerificationStatus } from '@/types';
import { FIRST_NAMES, LAST_NAMES, between, daysAgo, pick, seeded } from './seed';

const rng = seeded(9317);

// Which tier a points total lands in. The thresholds live in lib/mock/rewards.ts
// as editable configuration; this is the same ladder applied to seed data.
function tierFor(points: number): RewardTier {
  if (points >= 10_000) return 'elite';
  if (points >= 4_000) return 'vip';
  if (points >= 1_000) return 'traveler';
  return 'explorer';
}

// The identity-check state for a given customer. Written as a list of exceptions
// rather than a random draw, so the interesting rows are always the same rows and
// a bug report can name one.
const EXCEPTIONS: Record<number, { status: VerificationStatus; reason?: string }> = {
  2: { status: 'pending' },
  5: {
    status: 'rejected',
    reason: 'The photograph of the driving licence was too blurred to read the expiry date.',
  },
  8: { status: 'pending' },
  11: { status: 'resubmit', reason: 'Passport photo page was cut off at the edge.' },
  14: { status: 'pending' },
  19: { status: 'unstarted' },
  23: { status: 'pending' },
  27: {
    status: 'rejected',
    reason: 'The selfie did not match the photograph on the submitted passport.',
  },
};

export const mockUsers: AdminUser[] = Array.from({ length: 30 }, (_, i) => {
  const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
  const lastName = LAST_NAMES[(i * 7 + 3) % LAST_NAMES.length];

  // Roughly a third are residents. The island's year-round local market is a
  // deliberate part of the product, so it should be a deliberate part of the
  // test data rather than a rounding error.
  const isLocal = i % 3 === 0;
  const exception = EXCEPTIONS[i];
  const status: VerificationStatus = exception?.status ?? 'approved';
  const approved = status === 'approved';

  // Only people who have actually been through a rental have points.
  const bookingCount = approved ? between(rng, 0, 14) : 0;
  const points = bookingCount === 0 ? 0 : between(rng, 120, 13_500);
  const lifetimeSpend = bookingCount === 0 ? 0 : between(rng, 180, 9_400);

  return {
    id: `u${i + 1}`,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
    phone: isLocal ? `+1 721 555 0${between(rng, 100, 999)}` : `+1 ${between(rng, 200, 989)} 555 0${between(rng, 100, 999)}`,
    accountType: isLocal ? 'local' : 'tourist',
    verification: {
      status,
      selfieDone: status !== 'unstarted',
      licenseDone: status !== 'unstarted',
      identityDocDone: status === 'approved' || status === 'rejected',
      reason: exception?.reason,
      submittedAt: status === 'unstarted' ? undefined : daysAgo(between(rng, 1, 300)),
    },
    // Islander status is a residency flag, not something earned by spending, and
    // it is only granted once residency has actually been proved. So it follows
    // "local AND approved" rather than "local".
    isIslander: isLocal && approved,
    memberSince: daysAgo(between(rng, 5, 900)),
    points,
    tier: tierFor(points),
    bookingCount,
    lifetimeSpend,
    lastActiveAt: daysAgo(between(rng, 0, 90)),
    // One closed account, kept in the list rather than removed. The audit log
    // points at it, and a row that disappears makes that entry unreadable.
    deletedAt: i === 25 ? daysAgo(12) : undefined,
  } satisfies AdminUser;
});

export function findUser(id: string): AdminUser | undefined {
  return mockUsers.find((u) => u.id === id);
}

export function userDisplayName(user: Pick<AdminUser, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`;
}

// Used to seed the mock bookings and payments with real customer names, so a
// booking row and a user row agree with each other.
export const activeUsers = mockUsers.filter((u) => !u.deletedAt);

export const mockStaffPick = (i: number): AdminUser => mockUsers[i % mockUsers.length];

export const randomUserName = (rngLocal: () => number): string => {
  const u = pick(rngLocal, activeUsers);
  return userDisplayName(u);
};
