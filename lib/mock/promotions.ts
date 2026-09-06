// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Eight made-up promotional codes, covering all four states
// a code can be in: running now, scheduled for later, paused by somebody, and
// expired.
//
// EXPIRED CODES STAY IN THE LIST. A customer will ring up in November asking why
// SUMMER26 no longer works, and the answer has to be findable. A promotions
// screen that only shows live codes cannot answer that question.

import type { PromoCode } from '@/types';
import { daysAgo, daysAhead } from './seed';

export const mockPromotions: PromoCode[] = [
  {
    id: 'pr1',
    code: 'ISLANDER10',
    description: 'Ten percent off any rental for verified residents.',
    kind: 'percent',
    value: 10,
    startsAt: daysAgo(180),
    endsAt: daysAhead(180),
    status: 'active',
    usedCount: 214,
    appliesTo: 'local',
  },
  {
    id: 'pr2',
    code: 'WELCOME25',
    description: 'Twenty-five dollars off a first booking.',
    kind: 'fixed',
    value: 25,
    startsAt: daysAgo(90),
    endsAt: daysAhead(275),
    status: 'active',
    usageLimit: 2000,
    usedCount: 683,
    appliesTo: 'first_booking',
  },
  {
    id: 'pr3',
    code: 'CRUISEWEEK',
    description: 'Fifteen percent off for cruise arrivals, Philipsburg pickups.',
    kind: 'percent',
    value: 15,
    startsAt: daysAgo(30),
    endsAt: daysAhead(14),
    status: 'active',
    usageLimit: 500,
    usedCount: 312,
    appliesTo: 'tourist',
  },
  {
    id: 'pr4',
    code: 'HIGHSEASON26',
    description: 'Twelve percent off, scheduled to open with the December season.',
    kind: 'percent',
    value: 12,
    startsAt: daysAhead(86),
    endsAt: daysAhead(180),
    status: 'scheduled',
    usedCount: 0,
    appliesTo: 'all',
  },
  {
    id: 'pr5',
    code: 'REGATTA26',
    description: 'Fifty dollars off during the Heineken Regatta week.',
    kind: 'fixed',
    value: 50,
    startsAt: daysAhead(150),
    endsAt: daysAhead(158),
    status: 'scheduled',
    usageLimit: 300,
    usedCount: 0,
    appliesTo: 'all',
  },
  {
    id: 'pr6',
    code: 'PARTNER5',
    description: 'Five percent off through partner hotels. Paused while the partner list is redone.',
    kind: 'percent',
    value: 5,
    startsAt: daysAgo(210),
    endsAt: daysAhead(60),
    status: 'paused',
    usedCount: 97,
    appliesTo: 'all',
  },
  {
    id: 'pr7',
    code: 'SUMMER26',
    description: 'Twenty percent off through the quiet summer months.',
    kind: 'percent',
    value: 20,
    startsAt: daysAgo(150),
    endsAt: daysAgo(20),
    status: 'expired',
    usageLimit: 1000,
    usedCount: 741,
    appliesTo: 'all',
  },
  {
    id: 'pr8',
    code: 'LOCALFRIDAY',
    description: 'Thirty dollars off weekend rentals for residents. Ran once, not renewed.',
    kind: 'fixed',
    value: 30,
    startsAt: daysAgo(300),
    endsAt: daysAgo(240),
    status: 'expired',
    usedCount: 128,
    appliesTo: 'local',
  },
];

export function findPromotion(id: string): PromoCode | undefined {
  return mockPromotions.find((p) => p.id === id);
}
