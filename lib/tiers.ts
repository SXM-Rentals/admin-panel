// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Says what each kind of staff account may do, so the panel
// can grey out an action somebody cannot take and say why — rather than offering
// it and letting the server refuse.
//
// THE SERVER IS THE REAL BARRIER, NOT THIS FILE. Everything here is a copy of
// src/services/admin/tiers.ts in the backend, kept for one purpose: telling
// somebody, before they type a reason and their authenticator code, that this is
// not theirs to do. Nothing here keeps anybody out. A viewer who edited this file
// in their own browser would still be refused by SXM Rentals on every change,
// because the server checks the method of every admin request and the tier of
// whoever sent it.
//
// WHICH IS WHY THE WORDS ARE COPIED VERBATIM. When the panel can say in advance
// why something is not on offer, it says exactly what the server would have said.
// Two sentences for one rule, differently worded, is how somebody ends up arguing
// with a screen.
//
// THE FOUR RULES, which are the server's and not ours to soften:
//   1. Nobody may act on an account at their own level or above.
//   2. Nobody may grant a level at or above their own, and nobody grants
//      Godfather at all — that moves by a command on the server.
//   3. Nobody may change their own level, not even the Godfather.
//   4. The Godfather account cannot be touched by anybody else, so the panel can
//      never lock out the person whose business this is.

import type { AdminTier } from '@/types';

// Highest first. Position in this list IS the hierarchy — a lower index means
// more authority — so the order is not cosmetic.
export const TIERS: AdminTier[] = ['godfather', 'owner', 'administrator', 'viewer'];

// What each one is called on screen. The same words the audit log uses, so a log
// entry and a screen never disagree about what somebody is.
export const TIER_LABELS: Record<AdminTier, string> = {
  godfather: 'Godfather',
  owner: 'Owner',
  administrator: 'Administrator',
  viewer: 'Viewer',
};

// What each tier is for, in one line, for the screen where somebody picks one.
export const TIER_MEANINGS: Record<AdminTier, string> = {
  godfather: 'The owner of the business. One account, and it cannot be granted here.',
  owner: 'Everything, including who else can get in.',
  administrator: 'The everyday work — verification, refunds, deposits, disputes. Not staff accounts.',
  viewer: 'Can see the whole panel, including the audit log, and change nothing.',
};

// What can be handed out from the panel. Godfather is deliberately absent.
export const GRANTABLE_TIERS: AdminTier[] = ['owner', 'administrator', 'viewer'];

export function rank(tier: AdminTier): number {
  return TIERS.indexOf(tier);
}

export function outranks(actor: AdminTier, other: AdminTier): boolean {
  return rank(actor) < rank(other);
}

export function atLeast(actor: AdminTier, needed: AdminTier): boolean {
  return rank(actor) <= rank(needed);
}

// ---- WHY NOT, OR NOTHING ----
// Each of these answers the same question — "may I?" — with the sentence to show
// when the answer is no, and undefined when it is yes. A string is more useful
// than a boolean here, because a greyed control with no explanation reads as "you
// are not allowed" when the truth is often "not you, this account" or "nobody,
// through this panel".
//
// AN UNKNOWN TIER MEANS YES, ON PURPOSE. A server from before tiers does not say
// what anybody is, and there every account could do everything. Guessing the
// other way would grey out controls that work.

// A viewer changes nothing at all. The server enforces this by method, on every
// admin address, including ones written after this was.
export function whyCannotChange(tier: AdminTier | undefined): string | undefined {
  if (tier !== 'viewer') return undefined;
  return 'Your account can see the panel but not change anything.';
}

// "You have to be at least this senior to do this at all." What needs Owner
// today: everything on the Staff screen except reading the list.
export function whyNeedsTier(tier: AdminTier | undefined, needed: AdminTier): string | undefined {
  if (!tier || atLeast(tier, needed)) return undefined;
  return `This needs ${TIER_LABELS[needed]} access or higher. Your account is ${TIER_LABELS[tier]} — ask somebody with ${TIER_LABELS[needed]} access.`;
}

// Acting on somebody else's account: resetting them, taking their access away,
// changing what they may do.
export function whyCannotActOn(
  actor: { id: string; tier?: AdminTier },
  subject: { id: string; name: string; tier?: AdminTier },
): string | undefined {
  if (!actor.tier || !subject.tier) return undefined;

  // Said first, and in its own words, because it is the rule that keeps the
  // business's owner able to get back in.
  if (subject.tier === 'godfather' && subject.id !== actor.id) {
    return 'The Godfather account cannot be changed by anybody else.';
  }
  if (subject.id === actor.id) return undefined;
  if (!outranks(actor.tier, subject.tier)) {
    return `${subject.name} is ${TIER_LABELS[subject.tier]}, the same as you or above. Only somebody more senior can change this account.`;
  }
  return undefined;
}

// Granting a level, whether when creating an account or changing one.
export function whyCannotGrant(actor: { tier?: AdminTier }, tier: AdminTier): string | undefined {
  if (tier === 'godfather') {
    // Not "you are not senior enough": nobody is, through the panel.
    return 'Godfather cannot be granted from the admin panel.';
  }
  if (!actor.tier) return undefined;
  if (!outranks(actor.tier, tier)) {
    return `You cannot make somebody ${TIER_LABELS[tier]} — that is your own level or above. Ask somebody more senior.`;
  }
  return undefined;
}

// Changing your own level is the one change that always comes from somebody
// else, whoever you are: otherwise the top of the ladder is whoever thought of
// it first.
export function whyCannotChangeOwn(actor: { id: string }, subjectId: string): string | undefined {
  if (actor.id !== subjectId) return undefined;
  return 'You cannot change your own access level. Ask somebody else to.';
}
