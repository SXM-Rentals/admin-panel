// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The wording the panel uses for values that are stored as
// codes — turning 'stripe_identity' into "Stripe Identity", 'quarter' into
// "This quarter", 'points_adjusted' into "Points adjusted".
//
// WHY IT IS NOT IN lib/mock: that folder is the made-up data, and it gets
// deleted the day the real backend arrives. None of this is data. The backend
// will still send 'points_adjusted' and a screen will still have to know what to
// call it, so the wording lives out here where it survives the swap.

import type { AuditAction, DateRangeKey, PlatformSettings } from '@/types';

// ---- DATE RANGES ----
// The windows every money screen filters by. Defined once so the dashboard, the
// analytics screen and the ledgers all offer the same choices in the same words.
export const dateRangeLabels: Record<DateRangeKey, string> = {
  month: 'This Month',
  quarter: 'This Quarter',
  year: 'This Year',
  all: 'All Time',
};

// ---- THE AUDIT LOG ----
// Plain-language names for each kind of change. A screen should never have to
// turn 'verification_rejected' into words on its own.
export const auditActionLabels: Record<AuditAction, string> = {
  account_updated: 'Account Updated',
  account_deleted: 'Account Deleted',
  points_adjusted: 'Points Adjusted',
  verification_approved: 'Verification Approved',
  verification_rejected: 'Verification Rejected',
  refund_approved: 'Refund Approved',
  refund_denied: 'Refund Denied',
  deposit_claimed: 'Deposit Claimed',
  deposit_released: 'Deposit Released',
  promotion_changed: 'Promotion Changed',
  settings_changed: 'Settings Changed',
  dispute_assigned: 'Dispute Assigned',
  dispute_resolved: 'Dispute Resolved',
};

// ---- IDENTITY CHECK PROVIDERS ----
export const kycProviderLabels: Record<PlatformSettings['kycProvider'], string> = {
  stripe_identity: 'Stripe Identity',
  persona: 'Persona',
  veriff: 'Veriff',
  didit: 'Didit',
};

export const kycProviderNotes: Record<PlatformSettings['kycProvider'], string> = {
  stripe_identity: '$1.50 per verification. Same vendor as payments, so one dashboard rather than two.',
  persona: 'Roughly $1–2 per verification, volume-based. Strong document coverage.',
  veriff: 'Roughly $1–2 per verification, volume-based. Strong on liveness detection.',
  didit: '$0.30 per check with 500 free each month. Cheapest of the four, no monthly minimum.',
};

// ---- WHERE PAYOUTS COME FROM ----
export const payoutEntityLabels: Record<PlatformSettings['payoutEntity'], string> = {
  us_llc: 'US Entity (Wyoming LLC)',
  french_side: 'French Side — Saint-Martin Entity',
  dutch_side: 'Dutch Side — Sint Maarten Entity',
};

export const payoutEntityNotes: Record<PlatformSettings['payoutEntity'], string> = {
  us_llc:
    'Confirmed supported by Stripe. Covers payouts platform-wide regardless of which side of the island a provider is on, because the platform entity is what Stripe pays out from.',
  french_side:
    'Confirmed supported — French overseas collectivities fall under Stripe France. A natural fit if a local entity closer to French-side providers is wanted.',
  dutch_side:
    'NOT CONFIRMED. Does not clearly appear on Stripe’s list of payout-supported countries. Needs direct confirmation from Stripe or a local banking partner before anything relies on it.',
};
