// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks that the money adds up — what the customer paid is
// exactly what the business gets plus what the platform kept, on every booking
// and in every total.
//
// WHY IT MATTERS. The dashboard shows those three figures side by side, and the
// booking screen shows the sum written out. If they ever stop agreeing, the
// panel is quietly lying to whoever reads it — and the person most likely to
// notice is a rental business asking why their payout does not match the
// bookings they can see.
//
// ROUNDING IS THE REAL RISK HERE, not arithmetic. A 30% commission on an odd
// number produces fractions of a cent, and rounding each part independently
// leaves a gap. This checks the whole set, not one row, because a one-cent gap
// on one booking in fifty is exactly the kind of thing a spot check misses.

import { describe, expect, it } from 'vitest';
import { mockBookings } from '@/lib/mock/bookings';
import { buildSummary } from '@/lib/mock/summary';

describe('the money adds up', () => {
  it('splits every booking exactly, with nothing left over', () => {
    for (const booking of mockBookings) {
      expect(
        booking.payout + booking.commission,
        `booking ${booking.reference} does not add up`,
      ).toBe(booking.gross);
    }
  });

  it('gives the business the larger share and the platform the smaller one', () => {
    // At a 30% commission the business always nets more than the platform keeps.
    // If this ever flips, either the rate changed or the two were swapped.
    for (const booking of mockBookings) {
      expect(booking.payout).toBeGreaterThan(booking.commission);
    }
  });

  it('adds up across the whole platform, not only row by row', () => {
    const summary = buildSummary('all');

    expect(summary.paidOutToProviders + summary.commissionRetained).toBe(summary.gmv);
  });

  it('never produces a negative or zero figure on a real booking', () => {
    for (const booking of mockBookings) {
      expect(booking.gross).toBeGreaterThan(0);
      expect(booking.payout).toBeGreaterThan(0);
      expect(booking.commission).toBeGreaterThan(0);
    }
  });

  it('leaves cancelled bookings out of revenue', () => {
    // A cancelled booking was charged and refunded. Counting it as revenue would
    // inflate every total on the dashboard.
    const summary = buildSummary('all');
    const cancelledValue = mockBookings
      .filter((b) => b.status === 'cancelled')
      .reduce((total, b) => total + b.gross, 0);

    expect(cancelledValue).toBeGreaterThan(0);
    expect(summary.gmv).toBeLessThan(
      mockBookings.reduce((total, b) => total + b.gross, 0),
    );
  });
});

// ---- THE BADGE AND THE DASHBOARD MUST AGREE ----
// Found by looking at the running panel: the sidebar badge said 23 while the
// dashboard said 30 waiting. Both were counting the same three queues, but the
// queue capped its vehicle rows for tidiness while the summary counted every
// one. Whichever number a staff member believed, the other screen contradicted
// it — and there was no way to tell which was right.
//
// The fix was to count the queue rather than recount its sources. This is the
// test that stops the two drifting apart again.
describe('the sidebar badge agrees with the dashboard', () => {
  it('counts the same items the queue contains', async () => {
    const { buildQueue, buildSummary } = await import('@/lib/mock/summary');

    const queue = buildQueue();
    const summary = buildSummary('all');

    const waitingOnUs =
      summary.verificationsWaiting + summary.disputesOpen + summary.refundsPending;

    // The badge shows queue.length; the dashboard shows the three added up.
    expect(waitingOnUs).toBe(queue.length);
  });

  it('splits that count the same way the queue does', async () => {
    const { buildQueue, buildSummary } = await import('@/lib/mock/summary');

    const queue = buildQueue();
    const summary = buildSummary('all');

    expect(summary.verificationsWaiting).toBe(
      queue.filter((item) => item.kind === 'verification').length,
    );
    expect(summary.disputesOpen).toBe(queue.filter((item) => item.kind === 'dispute').length);
    expect(summary.refundsPending).toBe(queue.filter((item) => item.kind === 'refund').length);
  });
});
