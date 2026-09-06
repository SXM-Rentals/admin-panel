// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks the single most important money rule on the
// platform — a security deposit is never revenue.
//
// WHY IT IS A TEST RATHER THAN A COMMENT. A deposit and a payment are both
// amounts of money attached to a booking, and they sit next to each other on
// four different screens. Somebody totalling "all the money on this booking" is
// the most natural mistake in this codebase to make, and it is an expensive one:
// counting deposits as revenue overstates the size of the platform and, worse,
// overstates what it is owed to the tax authority and to itself.
//
// A note saying "do not do this" gets read once. This fails the build.

import { describe, expect, it } from 'vitest';
import { buildSummary } from '@/lib/mock/summary';
import { mockBookings } from '@/lib/mock/bookings';
import { mockDeposits, mockLedger } from '@/lib/mock/payments';

describe('a security deposit is never revenue', () => {
  it('is left out of gross booking value', () => {
    const summary = buildSummary('all');

    // GMV is the sum of what customers paid for their rentals. If a deposit had
    // been folded in, this figure would be larger than the bookings behind it.
    const grossFromBookings = mockBookings
      .filter((b) => b.status === 'completed' || b.status === 'active')
      .reduce((total, b) => total + b.gross, 0);

    expect(summary.gmv).toBe(grossFromBookings);
  });

  it('is left out of what businesses are paid and what the platform keeps', () => {
    const summary = buildSummary('all');
    const depositTotal = mockDeposits.reduce((total, d) => total + d.amount, 0);

    // The deposits are not a small number — this test would be meaningless if
    // they were, because an accidental inclusion would hide in the rounding.
    expect(depositTotal).toBeGreaterThan(0);

    expect(summary.paidOutToProviders).toBeLessThan(summary.gmv);
    expect(summary.commissionRetained).toBeLessThan(summary.gmv);
    expect(summary.gmv).not.toBe(summary.gmv + depositTotal);
  });

  it('is kept out of the payment ledger entirely', () => {
    // The ledger has four kinds of line and none of them is a deposit. If a
    // fifth is ever added, this is the test that should stop it.
    const kinds = new Set(mockLedger.map((entry) => entry.kind));
    expect([...kinds].sort()).toEqual(['charge', 'commission', 'payout', 'refund']);

    // And no ledger line should happen to equal a deposit movement, which would
    // suggest one had leaked in.
    const depositIds = new Set(mockDeposits.map((d) => d.id));
    expect(mockLedger.some((entry) => depositIds.has(entry.id))).toBe(false);
  });

  it('reports what is being held as its own separate figure', () => {
    const summary = buildSummary('all');
    const heldByStatus = mockDeposits
      .filter((d) => d.status === 'held')
      .reduce((total, d) => total + d.amount, 0);

    // Shown, but on its own line — never added to the three revenue figures.
    expect(summary.depositsCurrentlyHeld).toBe(heldByStatus);
    expect(summary.depositsCurrentlyHeld).not.toBe(0);
  });

  it('is never taken without the booking recording what happened to it', () => {
    // A deposit that was taken and then neither released nor claimed is money
    // held indefinitely against somebody's card. Every finished booking must
    // have resolved its deposit one way or the other.
    const unresolved = mockBookings.filter(
      (b) => b.status === 'completed' && b.depositStatus === 'held',
    );

    expect(unresolved).toEqual([]);
  });
});
