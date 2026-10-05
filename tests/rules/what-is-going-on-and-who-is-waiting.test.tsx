// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks the three things added for seeing what is happening
// rather than changing it — the activity screen, answering a customer, and
// deciding somebody's identity papers — and the one rule they share: a sentence
// meant for a customer is never the sentence written for the audit log.
//
// WHY THE ACTIVITY SCREEN NEEDS A TEST AT ALL, being read-only. It is assembled
// out of three lists that were never meant to be one, so it is the screen most
// able to state something false. Two ways in particular: commission must never
// appear as money moving, because it is our share of a charge already on the list
// — counted twice, a quiet day looks twice as busy as it was. And a cancellation
// must sit at the time it was cancelled, not the time it was booked, now that the
// server says which is which.
//
// AND WHY THE TWO PIECES OF WRITING ARE WORTH GUARDING. The reason goes in the
// audit log and can be internal; the message is read by the customer. One sentence
// serving both ends up either a log entry that explains nothing or a note that
// should never have been sent.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../render';
import { sentTo, serve } from '../fake-server';
import ActivityPage from '@/app/(panel)/activity/page';
import SupportConversationPage from '@/app/(panel)/support/[id]/page';
import UserDetailPage from '@/app/(panel)/users/[id]/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/activity',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: 'cu-1' }),
}));

const ME = { id: 'st-me', name: 'Gio Bertin-Maurice', email: 'gio@sxmrentals.app', avatarInitials: 'GB', tier: 'owner' };

const BOOKING = {
  id: 'bk-1',
  reference: 'BK-1001',
  status: 'upcoming',
  customerId: 'cu-1',
  customerName: 'Dana Illidge',
  providerId: 'pr-1',
  providerName: 'Bay Road Rentals',
  vehicleLabel: 'Toyota Yaris 2023',
  startDate: '2026-10-10',
  endDate: '2026-10-14',
  gross: 320,
  commission: 48,
  payout: 272,
  depositAmount: 500,
  depositStatus: 'held',
  paymentStatus: 'paid',
  agreementSigned: true,
  messageCount: 0,
  createdAt: '2026-10-03T09:30:00.000Z',
};

const CANCELLED = {
  ...BOOKING,
  id: 'bk-2',
  reference: 'BK-1002',
  status: 'cancelled',
  createdAt: '2026-09-20T08:00:00.000Z',
  cancelledAt: '2026-09-28T14:20:00.000Z',
  cancelledBy: 'provider',
  cancellationReason: 'The renters changed their plans and asked us to call it off.',
};

const LEDGER = [
  {
    id: 'le-1',
    at: '2026-10-03T09:31:00.000Z',
    bookingRef: 'BK-1001',
    customerName: 'Dana Illidge',
    providerName: 'Bay Road Rentals',
    kind: 'charge',
    amount: 320,
    status: 'succeeded',
    stripeRef: 'pi_1',
  },
  {
    id: 'le-2',
    at: '2026-10-03T09:31:00.000Z',
    bookingRef: 'BK-1001',
    customerName: 'Dana Illidge',
    providerName: 'Bay Road Rentals',
    // Our share of the charge above — not money moving on its own.
    kind: 'commission',
    amount: 48,
    status: 'succeeded',
    stripeRef: 'pi_1',
  },
];

describe('seeing what has been happening', () => {
  it('puts bookings and money in one order, and counts commission as neither', async () => {
    serve({
      '/admin/me': ME,
      'GET /admin/bookings': [BOOKING, CANCELLED],
      'GET /admin/payments': LEDGER,
      'GET /admin/vehicles': [],
    });
    render(<ActivityPage />);

    expect(await screen.findByText(/BK-1001 booked/)).toBeInTheDocument();
    expect(screen.getByText(/\$320 paid/)).toBeInTheDocument();

    // Commission is our share of that same $320. On this screen it would be the
    // same money twice.
    expect(screen.queryByText(/\$48/)).not.toBeInTheDocument();
  });

  it('places a cancellation when it was cancelled, and says who called it off', async () => {
    serve({
      '/admin/me': ME,
      'GET /admin/bookings': [CANCELLED],
      'GET /admin/payments': [],
      'GET /admin/vehicles': [],
    });
    render(<ActivityPage />);

    const row = (await screen.findByText(/BK-1002 cancelled by the business/)).closest('a');
    // The time it was CANCELLED (14:20 UTC), not the time it was booked
    // (08:00 UTC). Which of the two it uses is the whole point of the change.
    expect(row).toHaveTextContent(/10:20/);
    expect(row).not.toHaveTextContent(/04:00/);
    expect(row).toHaveTextContent(/changed their plans/);
  });

  it('does not pretend an old cancellation had no reason', async () => {
    // Cancellations before 30 September have a time and nobody's words.
    serve({
      '/admin/me': ME,
      'GET /admin/bookings': [{ ...CANCELLED, cancellationReason: null }],
      'GET /admin/payments': [],
      'GET /admin/vehicles': [],
    });
    render(<ActivityPage />);

    expect(await screen.findByText(/no reason recorded/i)).toBeInTheDocument();
  });

  it('shows a car appearing and going on sale as two different days', async () => {
    serve({
      '/admin/me': ME,
      'GET /admin/bookings': [],
      'GET /admin/payments': [],
      'GET /admin/vehicles': [
        {
          id: 'v-1',
          reference: 'VH-V1',
          providerId: 'pr-1',
          providerName: 'Bay Road Rentals',
          make: 'Toyota',
          model: 'Yaris',
          year: 2023,
          vehicleClass: 'economy',
          dailyRate: 55,
          side: 'dutch',
          listingStatus: 'live',
          registration: 'M-4471',
          createdAt: '2026-09-20T10:00:00.000Z',
          listedAt: '2026-09-27T10:00:00.000Z',
        },
      ],
    });
    render(<ActivityPage />);

    // Two events, because they are two days and the gap is the paperwork.
    expect(await screen.findByText(/Toyota Yaris 2023 added/)).toBeInTheDocument();
    expect(screen.getByText(/Toyota Yaris 2023 went on sale/)).toBeInTheDocument();
  });
});

describe('answering a customer', () => {
  it('sends what was written, and says it is not in the audit log', async () => {
    const user = userEvent.setup();
    const conversation = {
      customerId: 'cu-1',
      customerName: 'Dana Illidge',
      messages: [
        { id: 'm-1', from: 'customer', body: 'The key would not unlock the car.', sentAt: '2026-10-03T08:00:00.000Z' },
      ],
    };
    const server = serve({
      '/admin/me': ME,
      '/admin/support/cu-1': conversation,
      'POST /admin/support/cu-1/messages': conversation,
    });
    render(<SupportConversationPage />);

    expect(await screen.findByText('The key would not unlock the car.')).toBeInTheDocument();
    expect(screen.getByText(/not in the audit log/i)).toBeInTheDocument();

    await user.click(screen.getByLabelText(/your reply/i));
    await user.paste('Sorry about that — the business is sending someone with a spare key now.');
    await user.click(screen.getByRole('button', { name: /send reply/i }));

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/support/cu-1/messages')).toEqual({
        body: 'Sorry about that — the business is sending someone with a spare key now.',
      }),
    );
  });

  it('lets an account that changes nothing read it and answer nothing', async () => {
    serve({
      '/admin/me': { ...ME, tier: 'viewer' },
      '/admin/support/cu-1': { customerId: 'cu-1', customerName: 'Dana Illidge', messages: [] },
    });
    render(<SupportConversationPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: /send reply/i })).toBeDisabled());
    expect(screen.getByText(/can see the panel but not change anything/i)).toBeInTheDocument();
  });
});

describe('deciding somebody’s identity papers', () => {
  const CUSTOMER = {
    id: 'cu-1',
    firstName: 'Dana',
    lastName: 'Illidge',
    email: 'dana@example.com',
    phone: '+1 721 555 0133',
    accountType: 'tourist',
    verification: { status: 'pending', selfieDone: true, licenseDone: true, identityDocDone: false },
    isIslander: false,
    memberSince: '2026-08-01T10:00:00.000Z',
    points: 120,
    tier: 'explorer',
    bookingCount: 2,
    lifetimeSpend: 640,
    lastActiveAt: '2026-10-02T10:00:00.000Z',
  };

  it('keeps the reason and the message to the customer apart', async () => {
    const user = userEvent.setup();
    const server = serve({
      '/admin/me': ME,
      '/admin/users/cu-1': CUSTOMER,
      'POST /admin/users/cu-1/verification': { ok: true },
    });
    render(<UserDetailPage />);

    await user.click(await screen.findByRole('button', { name: /ask them again/i }));
    await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));

    await user.click(screen.getByLabelText(/reason/i));
    await user.paste('Licence photo is cut off at the expiry date.');

    // A refusal with no explanation is unkind and makes more work, so the dialog
    // will not send one.
    const confirm = within(screen.getByRole('dialog')).getByRole('button', { name: /ask again/i });
    expect(confirm).toBeDisabled();

    await user.click(screen.getByLabelText(/what to tell them/i));
    await user.paste('Please send the licence again with all four corners in shot.');
    await user.click(confirm);

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/users/cu-1/verification')).toEqual({
        decision: 'resubmit',
        reason: 'Licence photo is cut off at the expiry date.',
        customerMessage: 'Please send the licence again with all four corners in shot.',
      }),
    );
  });

  it('says plainly that the panel cannot show the documents', async () => {
    serve({ '/admin/me': ME, '/admin/users/cu-1': CUSTOMER });
    render(<UserDetailPage />);

    expect(
      await screen.findByText(/cannot show the documents themselves/i),
    ).toBeInTheDocument();
  });
});
