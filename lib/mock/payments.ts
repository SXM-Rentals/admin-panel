// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The three money screens — the payment ledger, the refund
// queue, and the security deposit ledger — all built out of the fifty bookings
// in lib/mock/bookings.ts rather than invented separately.
//
// WHY THAT MATTERS: a ledger that was made up on its own could total something
// different from the dashboard, and nobody would be able to say which was
// wrong. Everything here is derived, so the two can only ever agree.
//
// THE DEPOSIT LEDGER IS A SEPARATE LIST FOR A REASON. It is not a kind of
// payment and it must never be added to one. A deposit is the customer's money,
// authorised against their card and given back when the car comes home; it earns
// the platform nothing and is owed back in full unless there is damage. Keeping
// it in its own list, on its own screen, with its own total, is how that stays
// true when somebody later adds a column.

import type { DepositLedgerEntry, LedgerEntry, RefundRequest } from '@/types';
import { between, daysAgo, seeded } from './seed';
import { mockBookings } from './bookings';

const rng = seeded(3388);

// ---- THE PAYMENT LEDGER ----
// Every movement of rental money: what the customer was charged, what was sent
// on to the business, and what the platform kept. One booking produces up to
// three lines, which is what a real Stripe ledger looks like.
export const mockLedger: LedgerEntry[] = mockBookings
  .filter((b) => b.status !== 'upcoming')
  .flatMap((b, i) => {
    const base: LedgerEntry = {
      id: `led-${b.id}-charge`,
      at: b.createdAt,
      bookingRef: b.reference,
      customerName: b.customerName,
      providerName: b.providerName,
      kind: 'charge',
      amount: b.gross,
      status: b.paymentStatus === 'failed' ? 'failed' : 'succeeded',
      stripeRef: `pi_${between(rng, 100000, 999999)}${i}`,
    };

    if (b.status === 'cancelled') {
      // A cancelled booking is a charge followed by a refund, and nothing else:
      // no payout was ever made and no commission was ever kept.
      return [
        base,
        {
          id: `led-${b.id}-refund`,
          at: daysAgo(between(rng, 1, 120)),
          bookingRef: b.reference,
          customerName: b.customerName,
          providerName: b.providerName,
          kind: 'refund' as const,
          amount: -b.gross,
          status: 'succeeded' as const,
          stripeRef: `re_${between(rng, 100000, 999999)}${i}`,
        },
      ];
    }

    return [
      base,
      {
        id: `led-${b.id}-commission`,
        at: b.createdAt,
        bookingRef: b.reference,
        customerName: b.customerName,
        providerName: b.providerName,
        kind: 'commission' as const,
        amount: b.commission,
        status: 'succeeded' as const,
        stripeRef: `fee_${between(rng, 100000, 999999)}${i}`,
      },
      {
        id: `led-${b.id}-payout`,
        at: b.createdAt,
        bookingRef: b.reference,
        customerName: b.customerName,
        providerName: b.providerName,
        kind: 'payout' as const,
        amount: b.payout,
        // A payout on an active rental has not gone out yet — the money moves
        // when the car comes back, not when it leaves.
        status: b.status === 'active' ? ('pending' as const) : ('succeeded' as const),
        stripeRef: `po_${between(rng, 100000, 999999)}${i}`,
      },
    ];
  })
  .sort((a, b) => (a.at < b.at ? 1 : -1));

// ---- THE REFUND QUEUE ----
// Nine requests waiting on a decision, plus a few already decided so the screen
// shows what a settled row looks like. Every one carries what the customer said,
// because a refund decision made without reading that is not a decision.
const REFUND_REASONS = [
  'Flight was cancelled and we never made it to the island.',
  'The car was not at the pickup point and we hired elsewhere.',
  'Booked the wrong dates — need to rebook for November.',
  'Vehicle had a flat battery on the second morning and lost us a day.',
  'Provider cancelled on us the night before.',
  'Charged twice for the same booking.',
  'Air conditioning did not work for the whole week.',
  'Had to return the car three days early for a family emergency.',
  'The deposit was taken twice on the same card.',
];

const refundable = mockBookings.filter((b) => b.status === 'completed' || b.status === 'cancelled');

export const mockRefunds: RefundRequest[] = [
  // The nine still waiting on somebody.
  ...refundable.slice(0, 9).map((b, i) => ({
    id: `rf${i + 1}`,
    bookingRef: b.reference,
    customerName: b.customerName,
    providerName: b.providerName,
    // Rarely the whole booking — usually a day or two of it.
    amount: i % 3 === 0 ? b.gross : Math.round(b.gross * (i % 2 === 0 ? 0.5 : 0.25)),
    requestedAt: daysAgo(between(rng, 1, 18)),
    reasonGiven: REFUND_REASONS[i],
    status: 'pending' as const,
  })),
  // Three already settled, so the list is not made entirely of open work.
  ...refundable.slice(10, 13).map((b, i) => ({
    id: `rf${i + 10}`,
    bookingRef: b.reference,
    customerName: b.customerName,
    providerName: b.providerName,
    amount: Math.round(b.gross * 0.5),
    requestedAt: daysAgo(between(rng, 25, 70)),
    reasonGiven: REFUND_REASONS[(i + 3) % REFUND_REASONS.length],
    status: (i === 2 ? 'denied' : 'approved') as 'approved' | 'denied',
    decidedBy: 'Kayla Brooks',
    decidedAt: daysAgo(between(rng, 5, 24)),
    decisionReason:
      i === 2
        ? 'Rental ran to completion and the vehicle was returned without a fault reported at the time.'
        : 'Provider confirmed the vehicle was unavailable at pickup. Half the rental refunded as agreed.',
  })),
];

export function findRefund(id: string): RefundRequest | undefined {
  return mockRefunds.find((r) => r.id === id);
}

// ---- THE DEPOSIT LEDGER ----
// Every deposit that was ever taken, through its four states: authorised, held,
// released, or claimed. Twenty-five of them, deliberately covering all four —
// including the two that were claimed against, which are the ones a staff member
// will actually be asked about on the phone.
// TAKING THE FIRST 25 ROWS WAS A BUG, AND THE TEST SUITE CAUGHT IT. The bookings
// are ordered completed-first, so a plain slice took twenty-five finished
// rentals and not one live one — leaving no deposit in the "held" state at all.
// That emptied the dashboard tile for money currently being held, and left the
// deposits screen with nothing to release or claim, which is most of what that
// screen is for. Taking the live ones first and filling up from the rest keeps
// all four states represented however the bookings happen to be ordered.
const depositsTaken = mockBookings.filter((b) => b.depositStatus !== 'not_taken');
const heldFirst = [
  ...depositsTaken.filter((b) => b.depositStatus === 'held'),
  ...depositsTaken.filter((b) => b.depositStatus === 'claimed'),
  ...depositsTaken.filter((b) => b.depositStatus === 'released'),
];

export const mockDeposits: DepositLedgerEntry[] = heldFirst
  .slice(0, 25)
  .map((b) => ({
    id: `dep-${b.id}`,
    bookingRef: b.reference,
    customerName: b.customerName,
    providerName: b.providerName,
    amount: b.depositAmount,
    status: b.depositStatus,
    authorizedAt: b.createdAt,
    releasedAt: b.depositStatus === 'released' ? b.endDate : undefined,
    claimedAt: b.depositStatus === 'claimed' ? b.endDate : undefined,
    claimReason:
      b.depositStatus === 'claimed'
        ? b.reference.endsWith('8')
          ? 'Kerbed alloy wheel on the front nearside, photographed at return and agreed with the renter. $240 of the deposit retained against the repair quote, the balance returned.'
          : 'Vehicle returned with a quarter tank against a full-to-full agreement. $95 retained for refuelling, the balance returned.'
        : undefined,
  }));

// What is being held right now — money on the platform that belongs to
// customers. Shown on the dashboard well away from the revenue figures, and
// never added to them.
export function depositsCurrentlyHeld(): number {
  return mockDeposits
    .filter((d) => d.status === 'held')
    .reduce((total, d) => total + d.amount, 0);
}
