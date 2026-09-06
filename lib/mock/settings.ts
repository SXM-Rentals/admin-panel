// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The platform-wide settings — the commission the platform
// keeps, which identity-check company is being used and what it costs, which
// legal entity Stripe pays out from, and the feature flags.
//
// TWO OF THESE ARE OPEN QUESTIONS RATHER THAN SETTLED FACTS, and the screen says
// so rather than presenting a guess as a decision:
//
//   kycBundledDocuments — whether checking a passport AND a driving licence
//   bills as one verification or two. The Overview doc flags this as the thing
//   that either doubles or does not double the per-customer cost, and says to
//   confirm it with the provider directly. Until somebody does, it is a switch
//   with a note attached, not an assumption buried in a spreadsheet.
//
//   payoutEntity — the US LLC is the working answer because it covers payouts
//   platform-wide rather than needing a different setup per side of the island.
//   The Dutch-side option is listed but does not appear on Stripe's standard
//   supported list, so it stays a question.

import type { PlatformSettings } from '@/types';

export const mockSettings: PlatformSettings = {
  // The 30% the Overview doc works from: a customer pays $100 a day, the
  // business nets $70, SXM Rentals keeps $30.
  commissionRate: 0.3,

  kycProvider: 'stripe_identity',
  kycCostPerCheck: 1.5,
  kycBundledDocuments: false,

  payoutEntity: 'us_llc',

  featureFlags: [
    {
      id: 'flag-atv',
      label: 'ATV Listings',
      description:
        'Lets providers list ATVs. Cars are the only live vehicle type at MVP; the rest show as Coming Soon.',
      enabled: false,
    },
    {
      id: 'flag-boats',
      label: 'Boat Listings',
      description: 'Same as above, for boats. Needs its own insurance rules before it can open.',
      enabled: false,
    },
    {
      id: 'flag-provider-api',
      label: 'Provider API Access',
      description:
        'Lets a rental business connect its own booking system instead of entering inventory twice.',
      enabled: true,
    },
    {
      id: 'flag-ai-support',
      label: 'AI Support Drafting',
      description:
        'Drafts a reply to a support email and posts it to Slack for a person to approve before it sends. Nothing is ever sent without a human pressing approve.',
      enabled: true,
    },
    {
      id: 'flag-delivery',
      label: 'Vehicle Delivery',
      description: 'Lets providers offer delivery to a hotel or the airport rather than a desk pickup.',
      enabled: true,
    },
    {
      id: 'flag-rewards',
      label: 'Rewards Programme',
      description:
        'Awards points and tiers. Turning this off stops points accruing; existing balances are kept.',
      enabled: true,
    },
  ],
};
