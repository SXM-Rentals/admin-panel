// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks the Delete button at the end of a row — removing one
// record rather than a whole kind — on the rules it shares with the Clear buttons,
// and on the two that are particular to it.
//
// THE SHARED RULES: the Godfather alone (an Owner does not even see the button), a
// written reason and the authenticator code, and only while the window for clearing
// test records is open. These are the same guarantees as the Clear buttons give and
// are tested the same way, because a delete that is easier to reach than a clear is
// a clear with the safeguards removed.
//
// THE PARTICULAR ONES. First, the button lights up only when the server says it can
// delete a single record of that kind — until then it is greyed with the reason,
// rather than offered and failed after somebody has typed a reason and a code.
// Second, the audit log: removing one entry leaves a note in its place, the dialog
// says so, and the entry that IS the note of a clearing cannot be removed at all,
// because deleting the note would leave the log with no memory of having been
// tampered with.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../render';
import { reply, sentTo, serve } from '../fake-server';
import { forgetTestDataStatus } from '@/lib/test-data';
import BookingsPage from '@/app/(panel)/bookings/page';
import AuditPage from '@/app/(panel)/audit/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/bookings',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

beforeEach(() => forgetTestDataStatus());

const me = (tier: string) => ({
  id: 'st-me',
  name: 'Gio Bertin-Maurice',
  email: 'gio@sxmrentals.app',
  avatarInitials: 'GB',
  tier,
});

const CONDITIONS = [{ name: 'allow_test_reset', met: true, sentence: 'ALLOW_TEST_RESET is switched on.' }];

// The server says it can delete a single booking and a single audit entry.
const CAN = {
  open: true,
  conditions: CONDITIONS,
  kinds: [
    { what: 'bookings', label: 'Bookings', single: true },
    { what: 'audit_log', label: 'Audit log', single: true },
  ],
};

// …or has not learnt to yet: the kinds are named and none says `single`.
const NOT_YET = {
  open: true,
  conditions: CONDITIONS,
  kinds: [{ what: 'bookings', label: 'Bookings' }],
};

const SHUT = {
  open: false,
  conditions: [{ name: 'stripe_never_live', met: false, sentence: 'Stripe has run with live keys.' }],
  kinds: [{ what: 'bookings', label: 'Bookings', single: true }],
};

const BOOKING = {
  id: 'bk-1',
  reference: 'BK-1001',
  status: 'upcoming',
  customerId: 'cu-1',
  customerName: 'Dana Illidge',
  providerId: 'pr-1',
  providerName: 'Bay Road Rentals',
  vehicleLabel: 'Toyota Yaris 2023',
  startDate: '2026-11-01',
  endDate: '2026-11-04',
  gross: 320,
  commission: 48,
  payout: 272,
  depositAmount: 0,
  depositStatus: 'not_taken',
  paymentStatus: 'paid',
  agreementSigned: true,
  messageCount: 0,
  createdAt: '2026-10-01T10:00:00.000Z',
};

function entry(overrides: Record<string, unknown>) {
  return {
    id: 'au-1',
    at: '2026-10-02T10:00:00.000Z',
    staffId: 'st-me',
    staffName: 'Gio Bertin-Maurice',
    action: 'account_updated',
    subjectType: 'customer',
    subjectId: 'cu-1',
    subjectLabel: 'Customer · Dana Illidge',
    field: 'Phone',
    before: '1',
    after: '2',
    reason: 'Customer asked for it by phone.',
    ...overrides,
  };
}

describe('deleting one record', () => {
  it('sends the kind, the id, the reason and the code — and nothing else', async () => {
    const user = userEvent.setup();
    const server = serve({
      '/admin/me': me('godfather'),
      '/admin/test-data/status': CAN,
      'GET /admin/bookings': [BOOKING],
      'POST /admin/test-data/delete': { what: 'bookings', id: 'bk-1', deleted: true, detail: 'Booking BK-1001 deleted.' },
    });
    render(<BookingsPage />);

    const button = await screen.findByRole('button', { name: /^delete$/i });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    const dialog = await screen.findByRole('dialog');
    // It says WHICH one, because "delete this" is not something to confirm blind.
    expect(dialog).toHaveTextContent(/booking BK-1001/);

    await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));
    await user.click(screen.getByLabelText(/reason/i));
    await user.paste('A test booking made while checking the checkout flow.');
    await user.type(screen.getByLabelText(/authenticator code/i), '246810');
    await user.click(within(dialog).getByRole('button', { name: /delete it/i }));

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/test-data/delete')).toEqual({
        what: 'bookings',
        id: 'bk-1',
        reason: 'A test booking made while checking the checkout flow.',
        code: '246810',
      }),
    );
  });

  it('is not on the screen at all for an Owner', async () => {
    serve({ '/admin/me': me('owner'), '/admin/test-data/status': CAN, 'GET /admin/bookings': [BOOKING] });
    render(<BookingsPage />);

    await screen.findByText('BK-1001');
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
  });

  it('stays greyed, saying why, until the server can delete a single one', async () => {
    serve({ '/admin/me': me('godfather'), '/admin/test-data/status': NOT_YET, 'GET /admin/bookings': [BOOKING] });
    render(<BookingsPage />);

    const button = await screen.findByRole('button', { name: /^delete$/i });
    await waitFor(() => expect(button).toBeDisabled());
    // Not offered and then failed after a reason and a code have been typed.
    expect(button).toHaveAttribute('title', expect.stringMatching(/does not offer deleting a single one/i));
  });

  it('is shut for good along with everything else', async () => {
    serve({ '/admin/me': me('godfather'), '/admin/test-data/status': SHUT, 'GET /admin/bookings': [BOOKING] });
    render(<BookingsPage />);

    const button = await screen.findByRole('button', { name: /^delete$/i });
    await waitFor(() => expect(button).toBeDisabled());
    expect(button).toHaveAttribute('title', expect.stringMatching(/closed for good/i));
  });

  it('shows the server’s own refusal, with nothing changed', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': me('godfather'),
      '/admin/test-data/status': CAN,
      'GET /admin/bookings': [BOOKING],
      'POST /admin/test-data/delete': reply(409, {
        error: {
          code: 'would_take_more',
          message: 'This booking has a deposit held against it. Delete the deposit first.',
          requestId: 'r1',
        },
      }),
    });
    render(<BookingsPage />);

    const button = await screen.findByRole('button', { name: /^delete$/i });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));
    await user.click(screen.getByLabelText(/reason/i));
    await user.paste('A test booking made while checking the checkout flow.');
    await user.type(screen.getByLabelText(/authenticator code/i), '246810');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /delete it/i }));

    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(dialog).toHaveTextContent(/Delete the deposit first/));
    expect(dialog).toHaveTextContent(/Nothing was changed/i);
  });
});

describe('deleting one audit entry', () => {
  it('says a note takes its place, so the log still shows it was tampered with', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': me('godfather'),
      '/admin/test-data/status': CAN,
      'GET /admin/audit': [entry({ id: 'au-1' })],
    });
    render(<AuditPage />);

    const button = await screen.findByRole('button', { name: /^delete$/i });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    expect(await screen.findByRole('dialog')).toHaveTextContent(/A note takes its place/i);
  });

  it('will not offer to delete the note of a clearing', async () => {
    serve({
      '/admin/me': me('godfather'),
      '/admin/test-data/status': CAN,
      'GET /admin/audit': [entry({ id: 'au-9', action: 'test_records_cleared', subjectLabel: 'Platform · Bookings' })],
    });
    render(<AuditPage />);

    const button = await screen.findByRole('button', { name: /^delete$/i });
    await waitFor(() => expect(button).toBeDisabled());
    // Deleting the note would leave the log with no memory of having been
    // tampered with, which is the one thing it must not lose.
    expect(button).toHaveAttribute('title', expect.stringMatching(/note of a clearing/i));
  });
});
