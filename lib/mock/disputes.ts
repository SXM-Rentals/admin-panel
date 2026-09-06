// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Six made-up disputes — a customer and a business
// disagreeing about something, with real money resting on the answer.
//
// TWO OF THE SIX ARE UNASSIGNED, ON PURPOSE. An unowned dispute is the thing
// most likely to sit for a fortnight while everybody assumes somebody else has
// it, so the list has to make "nobody has this" look like a state rather than a
// blank cell. If the screen makes those two hard to spot, the screen is wrong.

import type { DisputeCase } from '@/types';
import { daysAgo } from './seed';
import { mockBookings } from './bookings';
import { mockStaff } from './staff';

const completed = mockBookings.filter((b) => b.status === 'completed');

export const mockDisputes: DisputeCase[] = [
  {
    id: 'd1',
    reference: 'DSP-1041',
    bookingRef: completed[3].reference,
    openedAt: daysAgo(2),
    openedBy: 'customer',
    customerName: completed[3].customerName,
    providerName: completed[3].providerName,
    subject: 'Deposit not returned after 14 days',
    detail:
      'Renter says the car was returned undamaged on the agreed date and the $500 deposit has still not come back. The business says it released it the same week. Stripe shows the authorisation still open.',
    amountAtStake: 500,
    status: 'open',
    // Nobody has picked this up yet.
    assignedToId: undefined,
    assignedToName: undefined,
  },
  {
    id: 'd2',
    reference: 'DSP-1038',
    bookingRef: completed[6].reference,
    openedAt: daysAgo(5),
    openedBy: 'provider',
    customerName: completed[6].customerName,
    providerName: completed[6].providerName,
    subject: 'Damage to front bumper disputed',
    detail:
      'Business has claimed $340 against the deposit for a cracked bumper. Renter has sent photographs taken at pickup that appear to show the same crack already present.',
    amountAtStake: 340,
    status: 'investigating',
    assignedToId: mockStaff[0].id,
    assignedToName: mockStaff[0].name,
  },
  {
    id: 'd3',
    reference: 'DSP-1035',
    bookingRef: completed[9].reference,
    openedAt: daysAgo(8),
    openedBy: 'customer',
    customerName: completed[9].customerName,
    providerName: completed[9].providerName,
    subject: 'Charged for a second week that was never agreed',
    detail:
      'Renter extended by two days over the phone and was billed for a further seven. The business says the extension was made through its own booking system rather than through SXM Rentals.',
    amountAtStake: 385,
    status: 'investigating',
    assignedToId: mockStaff[2].id,
    assignedToName: mockStaff[2].name,
  },
  {
    id: 'd4',
    reference: 'DSP-1032',
    bookingRef: completed[12].reference,
    openedAt: daysAgo(11),
    openedBy: 'customer',
    customerName: completed[12].customerName,
    providerName: completed[12].providerName,
    subject: 'Vehicle not available at pickup',
    detail:
      'Renter arrived at Grand Case to be told the car had not come back from the previous hire. They took a taxi and hired elsewhere for the week.',
    amountAtStake: 620,
    status: 'open',
    // Also unassigned, and eleven days old — this is the one the queue should be
    // shouting about.
    assignedToId: undefined,
    assignedToName: undefined,
  },
  {
    id: 'd5',
    reference: 'DSP-1029',
    bookingRef: completed[15].reference,
    openedAt: daysAgo(21),
    openedBy: 'provider',
    customerName: completed[15].customerName,
    providerName: completed[15].providerName,
    subject: 'Fuel policy not followed on return',
    detail:
      'Returned with a quarter tank against a full-to-full agreement. Business charged $95 for refuelling. Renter says the gauge was not full at collection either.',
    amountAtStake: 95,
    status: 'resolved',
    assignedToId: mockStaff[1].id,
    assignedToName: mockStaff[1].name,
    resolutionNotes:
      'Pickup photographs show the tank three-quarters full at collection. Charge reduced to $48 and the business agreed. Both sides notified.',
    resolvedAt: daysAgo(16),
  },
  {
    id: 'd6',
    reference: 'DSP-1024',
    bookingRef: completed[18].reference,
    openedAt: daysAgo(34),
    openedBy: 'customer',
    customerName: completed[18].customerName,
    providerName: completed[18].providerName,
    subject: 'Cleaning fee applied without notice',
    detail:
      'A $120 cleaning fee was taken from the deposit. Renter says the car was returned as collected and no fee was mentioned in the rental agreement.',
    amountAtStake: 120,
    status: 'resolved',
    assignedToId: mockStaff[0].id,
    assignedToName: mockStaff[0].name,
    resolutionNotes:
      'The signed agreement carries no cleaning clause. Fee refunded in full and the business asked to add the clause before charging it again.',
    resolvedAt: daysAgo(28),
  },
];

export function findDispute(id: string): DisputeCase | undefined {
  return mockDisputes.find((d) => d.id === id);
}

export function openDisputes(): DisputeCase[] {
  return mockDisputes.filter((d) => d.status !== 'resolved');
}
