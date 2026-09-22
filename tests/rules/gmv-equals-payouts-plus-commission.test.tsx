// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks the other sentence that holds across the whole
// panel — what a customer paid is what the business got plus what SXM Rentals
// kept — as it appears on screen, and that the two counts of waiting work agree.
//
// WHAT CHANGED, AND WHY THIS TEST CHANGED WITH IT. This used to check that the
// sample bookings had been generated so the split added up. The SXM Rentals
// server now does the arithmetic, and holds itself to the rule. What the panel
// can still get wrong is how it SHOWS the split — and it did get it wrong, in a
// way the sample data could never reveal, because every made-up price was a
// whole number of dollars.
//
// Three days at $45 is $135: $94.50 to the business, $40.50 kept. Rounded to the
// whole dollar, as the panel used to round everything, that reads "$95 + $41 =
// $135" — a sum that visibly does not add up, on the one screen that exists to
// show the split adding up. So the first check here draws a real booking screen
// from exactly those figures.
//
// THE SECOND CHECK IS ABOUT COUNTING THE SAME WORK TWICE. The dashboard's
// "Waiting on us" and the number on the sidebar must agree — a mismatch sends
// somebody hunting for work that is not there, and it happened before (the badge
// said 23, the dashboard said 30). The server's own summary counts a little
// differently from its queue, so both now count from the queue, and this checks
// the dashboard does even when the summary disagrees.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../render';
import { serve } from '../fake-server';
import { money } from '@/lib/format';
import AdminDashboardPage from '@/app/(panel)/page';
import BookingDetailPage from '@/app/(panel)/bookings/[id]/page';
import type { AdminBooking, PlatformSummary, QueueItem } from '@/types';

// The booking screen reads its id from the address. Here there is no address,
// so it is told.
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return { ...actual, useParams: () => ({ id: 'b-135' }) };
});

describe('a booking’s money visibly adds up', () => {
  const booking: AdminBooking = {
    id: 'b-135',
    reference: 'SXM-4135',
    status: 'completed',
    customerId: 'u1',
    customerName: 'Aria Duncan',
    providerId: 'p1',
    providerName: 'Island Wheels',
    vehicleLabel: 'Toyota RAV4 (SXM-V-118)',
    startDate: '2026-09-01',
    endDate: '2026-09-04',
    // Three days at $45, thirty per cent kept.
    gross: 135,
    commission: 40.5,
    payout: 94.5,
    depositAmount: 300,
    depositStatus: 'released',
    paymentStatus: 'paid',
    agreementSigned: true,
    messageCount: 0,
    createdAt: '2026-08-28T12:00:00.000Z',
  };

  it('shows the cents, so the two parts add up to the whole on screen', async () => {
    serve({ '/admin/bookings/b-135': booking });
    render(<BookingDetailPage />);

    expect(await screen.findByText('$94.50 + $40.50')).toBeInTheDocument();
    // What the customer paid, and the sum, are the same figure.
    expect(screen.getAllByText('$135').length).toBeGreaterThanOrEqual(2);
    // The rounded version — which does not add up — must not appear.
    expect(screen.queryByText('$95 + $41')).not.toBeInTheDocument();
  });

  it('never lets rounding decide whether cents appear', () => {
    // 0.1 + 0.2 is 0.30000000000000004 to a computer. It is thirty cents.
    expect(money(0.1 + 0.2)).toBe('$0.30');
    // A whole amount stays whole.
    expect(money(45)).toBe('$45');
    expect(money(1234.5)).toBe('$1,234.50');
  });
});

describe('the dashboard and the sidebar count the same waiting work', () => {
  const queue: QueueItem[] = [
    {
      id: 'q1',
      kind: 'verification',
      title: 'Business waiting for approval — Island Wheels',
      detail: 'Its paperwork has not been checked yet.',
      waitingSince: '2026-09-10T09:00:00.000Z',
      href: '/providers/p1/verification',
      urgency: 'aging',
    },
    {
      // A vehicle document. The server's summary does not count these.
      id: 'q2',
      kind: 'verification',
      title: 'Vehicle insurance to review',
      detail: 'A document has been uploaded and needs reading.',
      waitingSince: '2026-09-12T09:00:00.000Z',
      href: '/vehicles/v1/verification',
      urgency: 'normal',
    },
    {
      id: 'q3',
      kind: 'refund',
      title: 'Refund request — $48.00',
      detail: 'Waiting for a decision.',
      waitingSince: '2026-09-13T09:00:00.000Z',
      href: '/payments/refunds',
      urgency: 'normal',
    },
  ];

  // The summary counts one verification (businesses only) and one refund: two.
  // The queue holds three. The dashboard must say three, as the sidebar does.
  const summary: PlatformSummary = {
    totalUsers: 0,
    usersVerified: 0,
    usersPending: 0,
    totalProviders: 1,
    providersVerified: 0,
    providersPending: 1,
    gmv: 0,
    paidOutToProviders: 0,
    commissionRetained: 0,
    bookingsInRange: 0,
    depositsCurrentlyHeld: 0,
    verificationsWaiting: 1,
    disputesOpen: 0,
    refundsPending: 1,
    bookingTrend: [],
  };

  it('counts everything in the queue, not the summary’s narrower figure', async () => {
    serve({ '/admin/summary': summary, '/admin/queue': queue });
    render(<AdminDashboardPage />);

    const label = await screen.findByText('Waiting on us');
    const tile = label.parentElement?.parentElement;
    expect(tile?.children[1]?.textContent).toBe('3');
  });
});
