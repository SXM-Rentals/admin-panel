// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Works out what a typical rental actually earns under
// whatever point values are currently set — the worked example on the rewards
// screen.
//
// WHY IT MATTERS: "+10 points per rental day" is an abstraction nobody can hold
// against a margin. "A $500 rental over five days earns 600 points" is a number
// somebody can say yes or no to. Recalculating it live as the values are edited
// is the whole reason the rewards screen is editable rather than a table.
//
// It is a calculation over whatever configuration it is handed, so it survives
// the backend swap and does not belong in lib/mock.

import type { RewardsConfig } from '@/types';

// The worked example from the Overview doc, shown on the rewards screen so
// somebody changing a number can see immediately what it does to a real rental
// rather than having to work it out on paper.
export function workedExample(config: RewardsConfig): {
  spend: number;
  days: number;
  lines: { label: string; points: number }[];
  total: number;
} {
  const spend = 500;
  const days = 5;
  const perDollar = config.earning.find((e) => e.id === 'e1')?.points ?? 0;
  const perDay = config.earning.find((e) => e.id === 'e2')?.points ?? 0;
  const perCompletion = config.earning.find((e) => e.id === 'e3')?.points ?? 0;

  const lines = [
    { label: `$${spend} of spend`, points: spend * perDollar },
    { label: `${days} rental days`, points: days * perDay },
    { label: 'Completing the rental', points: perCompletion },
  ];

  return { spend, days, lines, total: lines.reduce((t, l) => t + l.points, 0) };
}
