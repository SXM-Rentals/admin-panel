// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The rewards programme as numbers rather than as code —
// the four tiers, what it takes to reach each one, and how many points each
// activity is worth.
//
// THIS IS THE DRAFT TABLE FROM THE OVERVIEW DOC, MOVED SOMEWHERE IT CAN BE
// CHANGED. The doc is explicit that the values are a first pass and want
// modelling against the roughly 30% platform margin before anybody relies on
// them — which is exactly the argument for holding them as editable data rather
// than burying them in the rewards engine. Somebody who works out that "+100 for
// a repeat booking" is too generous should be able to fix it on a screen.
//
// POINTS AND STATUS ARE SEPARATE THINGS. Islander is a residency flag: you get
// it by living on the island and proving it, and no amount of spending earns it.
// The tiers below are about how much somebody has rented. Nothing in this file
// touches Islander status, on purpose.

import type { RewardsConfig } from '@/types';

export const mockRewardsConfig: RewardsConfig = {
  tiers: [
    {
      tier: 'explorer',
      label: 'Explorer',
      threshold: 0,
      benefits: ['Standard support', 'Booking confirmations by email and SMS'],
    },
    {
      tier: 'traveler',
      label: 'Traveler',
      threshold: 1_000,
      benefits: ['5% rental discount', 'Priority support queue'],
    },
    {
      tier: 'vip',
      label: 'VIP',
      threshold: 4_000,
      benefits: [
        '10% rental discount',
        'Free delivery within the island',
        'Partner restaurant offers',
      ],
    },
    {
      tier: 'elite',
      label: 'Elite',
      threshold: 10_000,
      benefits: [
        '15% rental discount',
        'Free airport transfer',
        'Dedicated support contact',
        'Exclusive partner experiences',
      ],
    },
  ],

  earning: [
    { id: 'e1', activity: 'Each $1 of rental spend', points: 1 },
    { id: 'e2', activity: 'Each day of a rental', points: 10 },
    { id: 'e3', activity: 'Completing a rental', points: 50 },
    { id: 'e4', activity: 'A repeat booking', points: 100 },
    { id: 'e5', activity: 'A referral that completes a rental', points: 500 },
    {
      id: 'e6',
      activity: 'A purchase at a participating business',
      points: null,
      note: 'Variable — set per partner once the partner programme exists.',
    },
    {
      id: 'e7',
      activity: 'Special promotions',
      points: null,
      note: 'Variable — set per campaign on the Promotions screen.',
    },
  ],
};
