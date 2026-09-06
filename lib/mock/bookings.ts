// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Fifty made-up bookings — who rented what, from whom, for
// how long, and what happened to the money.
//
// THIS IS THE FILE EVERY OTHER MONEY FILE IS BUILT FROM. The payment ledger, the
// refund queue, the deposit ledger and the dashboard totals are all worked out
// from these fifty rows rather than invented separately. That is deliberate: if
// the ledger were made up on its own, the dashboard could say $84,000 while the
// ledger added up to $79,000, and there would be no way to tell which was wrong.
// Here there is one source of truth and the rest is arithmetic.
//
// THE TWO RULES THIS FILE OBEYS, AND tests/rules CHECKS:
//
//   gross === payout + commission        the split always adds up
//   the deposit is not part of gross     it is the customer's money, held
//
// The second one is the one worth staring at. A security deposit is authorised
// against a card and given back at the end of the rental. It is never revenue,
// never commissionable, and never included in a total labelled as either.

import type { AdminBooking, BookingStatus, DepositStatus } from '@/types';
import { between, daysAgo, daysAhead, pick, seeded } from './seed';
import { mockVehicles, vehicleLabel } from './vehicles';
import { activeUsers, userDisplayName } from './users';
import { mockProviders } from './providers';

const rng = seeded(7712);

// The commission the platform keeps. Held here as the number the seed data was
// generated with; the live, editable value is in lib/mock/settings.ts. They
// start the same, and the settings screen is what changes it going forward.
export const SEED_COMMISSION_RATE = 0.3;

// Only vehicles that are actually listed can have been booked.
const bookableVehicles = mockVehicles.filter((v) => v.listingStatus === 'live');

// How the fifty split across the four states. Weighted the way a real platform
// looks: mostly finished business, a handful live right now, some cancelled.
function statusFor(i: number): BookingStatus {
  if (i < 28) return 'completed';
  if (i < 38) return 'upcoming';
  if (i < 45) return 'active';
  return 'cancelled';
}

// What has happened to the deposit follows from what has happened to the
// booking. A completed rental has had its deposit given back — except for the
// two below, where damage was claimed against it.
const CLAIMED_DEPOSITS = new Set([4, 17]);

function depositStatusFor(i: number, status: BookingStatus): DepositStatus {
  if (status === 'cancelled') return 'not_taken';
  if (status === 'upcoming') return 'not_taken';
  if (status === 'active') return 'held';
  return CLAIMED_DEPOSITS.has(i) ? 'claimed' : 'released';
}

export const mockBookings: AdminBooking[] = Array.from({ length: 50 }, (_, i) => {
  const vehicle = bookableVehicles[i % bookableVehicles.length];
  const provider = mockProviders.find((p) => p.id === vehicle.providerId)!;
  const customer = activeUsers[(i * 3 + 1) % activeUsers.length];

  const status = statusFor(i);
  const days = between(rng, 2, 12);

  // Completed and cancelled bookings sit in the past; upcoming ones in the
  // future; an active one started a few days ago and has not finished.
  const startOffset =
    status === 'completed' || status === 'cancelled'
      ? -between(rng, 14, 240)
      : status === 'active'
        ? -between(rng, 1, 5)
        : between(rng, 2, 60);

  const startDate = startOffset < 0 ? daysAgo(-startOffset) : daysAhead(startOffset);
  const endDate =
    startOffset < 0 ? daysAgo(-startOffset - days) : daysAhead(startOffset + days);

  // The money. gross is what the customer paid; commission is the platform's
  // 30%; payout is what is left for the business. Rounded to whole dollars so
  // the two parts always add back to the whole — a rounding gap of one cent
  // across fifty rows is exactly the kind of thing that makes a finance person
  // stop trusting a dashboard.
  const gross = vehicle.dailyRate * days;
  const commission = Math.round(gross * SEED_COMMISSION_RATE);
  const payout = gross - commission;

  const depositStatus = depositStatusFor(i, status);

  return {
    id: `b${i + 1}`,
    reference: `SXM-${4200 + i * 7}`,
    status,
    customerId: customer.id,
    customerName: userDisplayName(customer),
    providerId: provider.id,
    providerName: provider.businessName,
    vehicleLabel: vehicleLabel(vehicle),
    startDate,
    endDate,
    gross,
    commission,
    payout,
    // A deposit of a few hundred dollars, sized to the class of car. Kept apart
    // from every figure above.
    depositAmount: vehicle.dailyRate > 90 ? 800 : vehicle.dailyRate > 60 ? 500 : 300,
    depositStatus,
    paymentStatus:
      status === 'cancelled' ? 'refunded' : status === 'upcoming' ? 'authorized' : 'paid',
    agreementSigned: status !== 'cancelled',
    messageCount: between(rng, 0, 9),
    createdAt: startOffset < 0 ? daysAgo(-startOffset + between(rng, 1, 20)) : daysAgo(between(rng, 1, 30)),
  } satisfies AdminBooking;
});

export function findBooking(id: string): AdminBooking | undefined {
  return mockBookings.find((b) => b.id === id);
}

export function findBookingByRef(reference: string): AdminBooking | undefined {
  return mockBookings.find((b) => b.reference === reference);
}

// The bookings that count towards revenue: money actually taken. A cancelled and
// refunded booking is not revenue, and an upcoming one has only been authorised
// rather than charged, so neither belongs in a GMV figure.
export function revenueBookings(): AdminBooking[] {
  return mockBookings.filter((b) => b.status === 'completed' || b.status === 'active');
}

// A short made-up conversation for the booking detail screen, so the message
// history has something in it rather than an empty box.
export function messagesFor(booking: AdminBooking): { from: string; body: string; at: string }[] {
  if (booking.messageCount === 0) return [];
  const local = seeded(booking.reference.length * 31 + booking.messageCount);
  const openers = [
    'Good morning — is the car available for an earlier pickup, around 9am?',
    'Hi, can you confirm the pickup point at the marina?',
    'Is a child seat available with this booking?',
    'We land at 14:20, will someone be at the desk?',
  ];
  const replies = [
    'Morning! 9am is fine, we will have it ready.',
    'Yes — the desk is by the ferry car park, we will text the exact spot.',
    'We can add one, no charge. See you at pickup.',
    'No problem, we track the flight and will be waiting.',
  ];
  const n = Math.min(booking.messageCount, 4);
  return Array.from({ length: n }, (_, i) => ({
    from: i % 2 === 0 ? booking.customerName : booking.providerName,
    body: i % 2 === 0 ? pick(local, openers) : pick(local, replies),
    at: daysAgo(between(local, 1, 40)),
  }));
}
