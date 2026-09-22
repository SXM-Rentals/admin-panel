// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks one of the two sentences that hold across the
// whole panel — a security deposit is never counted as revenue — on the real
// screens, drawn from known figures.
//
// WHY IT MATTERS: a deposit is the customer's money, held against damage and
// given back. Counting it as revenue would overstate the size of the platform
// and, worse, overstate what it is owed. The dashboard is where that mistake
// would be easiest to make, because the deposits figure sits right beside the
// revenue figures.
//
// WHAT CHANGED, AND WHY THIS TEST CHANGED WITH IT. This used to check the sample
// data — that the made-up bookings and deposits had been generated so as to
// keep the two apart. There is no sample data any more; the SXM Rentals server
// adds up the figures, and its ledger has no such thing as a deposit line. What
// is left for the panel to get wrong is what it draws and what it adds up itself.
// So this puts the real screens in front of known figures and checks:
//
//   - the dashboard shows the revenue figures as the server gave them, and the
//     deposits figure apart from them, never added in;
//   - the deposits screen's "kept" figure counts only what was actually kept.
//     Part of a deposit can be kept — $240 of $500 — and adding up the whole
//     deposit instead would call the $260 that went back to the customer money
//     the platform kept.

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '../render';
import { serve } from '../fake-server';
import AdminDashboardPage from '@/app/(panel)/page';
import DepositsLedgerPage from '@/app/(panel)/payments/deposits/page';
import type { DepositLedgerEntry, PlatformSummary } from '@/types';

// The value shown in the tile with this label. A tile is its label, then its
// value, then a line of detail — read by position, so a "$500" elsewhere on the
// screen can never be mistaken for this one.
function tileValue(label: string): string {
  const labelNode = screen.getByText(label);
  const tile = labelNode.parentElement?.parentElement;
  return tile?.children[1]?.textContent ?? '';
}

describe('the dashboard never counts a deposit as revenue', () => {
  const summary: PlatformSummary = {
    totalUsers: 12,
    usersVerified: 9,
    usersPending: 2,
    totalProviders: 3,
    providersVerified: 2,
    providersPending: 1,
    gmv: 1000,
    paidOutToProviders: 700,
    commissionRetained: 300,
    bookingsInRange: 8,
    depositsCurrentlyHeld: 450,
    verificationsWaiting: 1,
    disputesOpen: 0,
    refundsPending: 0,
    bookingTrend: [{ label: '2026-09', bookings: 8, gmv: 1000 }],
  };

  beforeEach(() => {
    serve({ '/admin/summary': summary, '/admin/queue': [] });
  });

  it('shows the revenue figures exactly as the server added them up', async () => {
    render(<AdminDashboardPage />);
    await screen.findByText('Gross booking value');

    expect(tileValue('Gross booking value')).toBe('$1,000');
    expect(tileValue('Paid out to businesses')).toBe('$700');
    expect(tileValue('Commission retained')).toBe('$300');
  });

  it('shows the deposits held on their own, and adds them to nothing', async () => {
    render(<AdminDashboardPage />);
    await screen.findByText('Gross booking value');

    expect(tileValue('Security deposits held')).toBe('$450');

    // Each revenue figure with the deposits wrongly added in. None of them may
    // appear anywhere on the screen.
    for (const wrong of ['$1,450', '$1,150', '$750']) {
      expect(screen.queryByText(wrong)).not.toBeInTheDocument();
    }
  });
});

describe('the deposits screen counts only what was actually kept', () => {
  const deposits: DepositLedgerEntry[] = [
    {
      id: 'd1',
      bookingRef: 'SXM-1001',
      customerName: 'Aria Duncan',
      providerName: 'Island Wheels',
      amount: 500,
      status: 'claimed',
      authorizedAt: '2026-09-01T10:00:00.000Z',
      claimedAt: '2026-09-06T10:00:00.000Z',
      claimReason: 'Kerbed alloy on the front nearside, photographed at return.',
      claimedAmount: 240,
    },
    {
      id: 'd2',
      bookingRef: 'SXM-1002',
      customerName: 'Ben Carty',
      providerName: 'Island Wheels',
      amount: 300,
      status: 'held',
      authorizedAt: '2026-09-10T10:00:00.000Z',
    },
    {
      // Never taken, so there is no moment of authorising to show.
      id: 'd3',
      bookingRef: 'SXM-1003',
      customerName: 'Cleo Arrindell',
      providerName: 'Sunset Rentals',
      amount: 200,
      status: 'not_taken',
      authorizedAt: null,
    },
  ];

  beforeEach(() => {
    serve({ '/admin/deposits': deposits });
  });

  it('counts $240 kept from a $500 deposit as $240, not $500', async () => {
    render(<DepositsLedgerPage />);
    await screen.findByText('Kept against damage');

    expect(tileValue('Kept against damage')).toBe('$240');
  });

  it('says how much of the deposit was kept, next to what was held', async () => {
    render(<DepositsLedgerPage />);
    await screen.findByText('Kept against damage');

    expect(screen.getByText(/kept \$240 of a\s+\$500 deposit/)).toBeInTheDocument();
  });

  it('keeps the money still held apart from the money kept', async () => {
    render(<DepositsLedgerPage />);
    await screen.findByText('Kept against damage');

    expect(tileValue('Held right now')).toBe('$300');
  });

  it('shows a deposit that was never taken as not taken, rather than a broken date', async () => {
    render(<DepositsLedgerPage />);
    await screen.findByText('Kept against damage');

    expect(screen.getByText('Not taken')).toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
  });
});
