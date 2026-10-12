// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks the three ways the platform can step in on rentals and see
// who has been in the panel — cancelling a rental as SXM Rentals, closing a business over
// the top of its upcoming rentals, and the Godfather's list of staff sign-ins.
//
// THE REFUND IS THE WHOLE DECISION when a rental is cancelled, so it is two buttons and
// not a default: "refund in full" and "no refund" are separate, labelled, and each sends
// exactly what it says. The test that matters most is that neither can be sent as the
// other.
//
// CLOSING OVER UPCOMING RENTALS CANCELS REAL CUSTOMERS' BOOKINGS. So it is never sent
// unless the Owner-and-above button for it was pressed — plain closing must go on sending
// no `override` at all, because an override that rides along by accident is a business
// closed over the top of its renters.
//
// AND THE SIGN-IN HISTORY IS ONE ACCOUNT'S TO SEE, read-only, filtered and paged by the
// server. The device is whatever the browser chose to say about itself, so it must only
// ever be text.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../render';
import { reply, sentTo, serve } from '../fake-server';
import BookingPage from '@/app/(panel)/bookings/[id]/page';
import ProviderPage from '@/app/(panel)/providers/[id]/page';
import SignInsPage from '@/app/(panel)/sign-ins/page';
import { lengthOfTime } from '@/lib/format';
import type { AdminBooking, AdminProvider } from '@/types/admin';

let here = 'booking';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: here === 'booking' ? 'bk-1' : 'pr-1' }),
}));

beforeEach(() => {
  here = 'booking';
});

const me = (tier: string) => ({
  id: 'st-me',
  name: 'Gio Bertin-Maurice',
  email: 'gio@sxmrentals.app',
  avatarInitials: 'GB',
  tier,
});

const BOOKING: AdminBooking = {
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
  depositAmount: 500,
  depositStatus: 'held',
  paymentStatus: 'paid',
  agreementSigned: true,
  messageCount: 0,
  createdAt: '2026-10-01T10:00:00.000Z',
};

async function confirm(user: ReturnType<typeof userEvent.setup>, button: RegExp, reason = 'The car was written off and cannot be replaced.') {
  const dialog = await screen.findByRole('dialog');
  await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));
  await user.click(screen.getByLabelText(/reason/i));
  await user.paste(reason);
  await user.type(screen.getByLabelText(/authenticator code/i), '246810');
  await user.click(within(dialog).getByRole('button', { name: button }));
}

describe('cancelling a rental as SXM Rentals', () => {
  const OPEN = {
    '/admin/me': me('owner'),
    '/admin/bookings/bk-1': BOOKING,
    '/admin/bookings/bk-1/agreement': { signedAt: null, version: '1', signature: null, platform: null, ipAddress: null },
  };

  it('sends a full refund only from the full-refund button', async () => {
    const user = userEvent.setup();
    const server = serve({ ...OPEN, 'POST /admin/bookings/bk-1/cancel': { ...BOOKING, status: 'cancelled' } });
    render(<BookingPage />);

    await user.click(await screen.findByRole('button', { name: /cancel and refund in full/i }));
    // It says what the renter gets back, and that the deposit hold goes either way.
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(/gets back everything they paid/i);
    expect(dialog).toHaveTextContent(/deposit hold is let go/i);

    await confirm(user, /cancel and refund in full/i);

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/bookings/bk-1/cancel')).toEqual({
        reason: 'The car was written off and cannot be replaced.',
        code: '246810',
        refund: 'full',
      }),
    );
  });

  it('sends no refund only from the no-refund button', async () => {
    const user = userEvent.setup();
    const server = serve({ ...OPEN, 'POST /admin/bookings/bk-1/cancel': { ...BOOKING, status: 'cancelled' } });
    render(<BookingPage />);

    await user.click(await screen.findByRole('button', { name: /cancel with no refund/i }));
    expect(await screen.findByRole('dialog')).toHaveTextContent(/gets nothing back/i);

    await confirm(user, /cancel with no refund/i, 'Booked with a stolen card — the bank confirmed it.');

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/bookings/bk-1/cancel')).toEqual({
        reason: 'Booked with a stolen card — the bank confirmed it.',
        code: '246810',
        refund: 'none',
      }),
    );
  });

  it('shows the server’s own refusal, with nothing changed', async () => {
    const user = userEvent.setup();
    serve({
      ...OPEN,
      'POST /admin/bookings/bk-1/cancel': reply(409, {
        error: { code: 'not_cancellable', message: 'That rental is already completed, so there is nothing to cancel.', requestId: 'r1' },
      }),
    });
    render(<BookingPage />);

    await user.click(await screen.findByRole('button', { name: /cancel and refund in full/i }));
    await confirm(user, /cancel and refund in full/i);

    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(dialog).toHaveTextContent(/already completed, so there is nothing to cancel/i));
    expect(dialog).toHaveTextContent(/Nothing was changed/i);
  });

  it('greys both buttons for an Administrator and says why, rather than hiding them', async () => {
    serve({ ...OPEN, '/admin/me': me('administrator') });
    render(<BookingPage />);

    const full = await screen.findByRole('button', { name: /cancel and refund in full/i });
    await waitFor(() => expect(full).toBeDisabled());
    expect(screen.getByRole('button', { name: /cancel with no refund/i })).toBeDisabled();
    expect(screen.getByText(/needs Owner access or higher/i)).toBeInTheDocument();
  });

  it('is not on a rental that has already finished or been called off', async () => {
    serve({ ...OPEN, '/admin/bookings/bk-1': { ...BOOKING, status: 'completed' } });
    render(<BookingPage />);

    await screen.findAllByText('BK-1001');
    expect(screen.queryByRole('button', { name: /cancel and refund in full/i })).not.toBeInTheDocument();
  });
});

describe('closing a business over the top of its upcoming rentals', () => {
  const BUSINESS: AdminProvider = {
    id: 'pr-1',
    businessName: 'Bay Road Rentals',
    legalName: 'Bay Road Rentals N.V.',
    contactEmail: 'hello@bayroad.sx',
    registrationNumber: 'SX-4471',
    side: 'dutch',
    town: 'Simpson Bay',
    rating: 4.6,
    reviewCount: 31,
    isVerified: true,
    verificationStatus: 'approved',
    respondsIn: 'within_hours',
    phone: '+1 721 555 0110',
    description: 'Family-run.',
    deliversVehicles: true,
    airportPickup: true,
    memberSince: '2025-03-04',
    ownerName: 'Marcel Peters',
    ownerPhone: '+1 721 555 0188',
    vehicleCount: 0,
    bookingCount: 3,
    grossVolume: 960,
    closedAt: null,
  };

  const OPEN = {
    '/admin/me': me('owner'),
    '/admin/providers/pr-1': BUSINESS,
    'GET /admin/vehicles': [],
    'GET /admin/bookings': [
      { ...BOOKING, id: 'bk-a', reference: 'BK-A' },
      { ...BOOKING, id: 'bk-b', reference: 'BK-B', gross: 180 },
      { ...BOOKING, id: 'bk-c', reference: 'BK-C', status: 'completed' },
      { ...BOOKING, id: 'bk-d', reference: 'BK-D', providerId: 'pr-other' },
    ],
  };

  it('sends override only from the button made for it, and says how many renters it touches', async () => {
    here = 'provider';
    const user = userEvent.setup();
    const server = serve({ ...OPEN, 'POST /admin/providers/pr-1/close': { ...BUSINESS, closedAt: '2026-10-12T10:00:00.000Z' } });
    render(<ProviderPage />);

    await user.click(await screen.findByRole('button', { name: /close and cancel their rentals/i }));

    // Two upcoming rentals of theirs, $500 between them: not the finished one, and not
    // another business's.
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog).toHaveTextContent(/2 rentals, \$500 in all, will be cancelled and refunded/i));
    expect(dialog).toHaveTextContent(/still refused while a car is out with a renter/i);

    await confirm(user, /cancel their rentals and close/i, 'Licence withdrawn on 2 October — closing now.');

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/providers/pr-1/close')).toEqual({
        reason: 'Licence withdrawn on 2 October — closing now.',
        code: '246810',
        override: true,
      }),
    );
  });

  it('never sends override from plain closing', async () => {
    here = 'provider';
    const user = userEvent.setup();
    const server = serve({ ...OPEN, 'POST /admin/providers/pr-1/close': { ...BUSINESS, closedAt: '2026-10-12T10:00:00.000Z' } });
    render(<ProviderPage />);

    await user.click(await screen.findByRole('button', { name: /^close the business$/i }));
    await confirm(user, /^close the business$/i, 'Owner is retiring and asked us to take it down.');

    // An override that rides along by accident is a business closed over its renters.
    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/providers/pr-1/close')).toEqual({
        reason: 'Owner is retiring and asked us to take it down.',
        code: '246810',
      }),
    );
  });

  it('is not offered to an Administrator at all', async () => {
    here = 'provider';
    serve({ ...OPEN, '/admin/me': me('administrator') });
    render(<ProviderPage />);

    await screen.findAllByText('Bay Road Rentals');
    expect(screen.queryByRole('button', { name: /close and cancel their rentals/i })).not.toBeInTheDocument();
  });
});

describe('staff sign-ins', () => {
  const SESSION = {
    id: 's-1',
    staff: { id: 'st-carla', name: 'Carla Ruiz', email: 'carla@sxmrentals.app', tier: 'administrator' },
    signedInAt: '2026-10-10T09:00:00.000Z',
    endedAt: '2026-10-10T12:05:00.000Z',
    status: 'timed_out',
    lastSeenAt: '2026-10-10T11:35:00.000Z',
    durationSeconds: 11100,
    ipAddress: '203.0.113.9',
    device: 'Mozilla/5.0 <img src=x onerror=alert(1)> (Windows NT 10.0)',
  };

  const STILL_IN = {
    ...SESSION,
    id: 's-2',
    staff: { id: 'st-me', name: 'Gio Bertin-Maurice', email: 'gio@sxmrentals.app', tier: 'godfather' },
    endedAt: null,
    status: 'active',
    durationSeconds: 1800,
  };

  const STAFF = [
    { id: 'st-me', name: 'Gio Bertin-Maurice', email: 'gio@sxmrentals.app', avatarInitials: 'GB', mfaEnrolled: true, mustChangePassword: false, createdAt: '2026-09-01T00:00:00.000Z', disabledAt: null, tier: 'godfather' },
    { id: 'st-carla', name: 'Carla Ruiz', email: 'carla@sxmrentals.app', avatarInitials: 'CR', mfaEnrolled: true, mustChangePassword: false, createdAt: '2026-09-01T00:00:00.000Z', disabledAt: '2026-10-11T00:00:00.000Z', tier: 'administrator' },
  ];

  const OPEN = {
    '/admin/me': me('godfather'),
    'GET /admin/staff': STAFF,
    'GET /admin/sessions': { total: 2, sessions: [SESSION, STILL_IN] },
  };

  it('says how each one ended, and how long it lasted', async () => {
    serve(OPEN);
    render(<SignInsPage />);

    expect(await screen.findByText('Timed Out')).toBeInTheDocument();
    expect(screen.getByText('Still Signed In')).toBeInTheDocument();
    // 11,100 seconds is three hours and five minutes, said the way a person reads it;
    // and an open session is "so far", not how long it lasted.
    expect(screen.getByText('3 h 05 min')).toBeInTheDocument();
    expect(screen.getByText('30 min so far')).toBeInTheDocument();
  });

  it('shows the browser’s description of itself as text, never as mark-up', async () => {
    serve(OPEN);
    render(<SignInsPage />);

    expect((await screen.findAllByText(/onerror=alert\(1\)/)).length).toBeGreaterThan(0);
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });

  it('asks the server to filter and page, rather than doing it itself', async () => {
    const user = userEvent.setup();
    const server = serve(OPEN);
    render(<SignInsPage />);

    await screen.findByText('Timed Out');
    await user.click(screen.getByRole('button', { name: /^signed in now$/i }));
    await user.click(screen.getByRole('button', { name: /^administrator$/i }));

    await waitFor(() => {
      const last = server.mock.calls
        .map(([input]) => decodeURIComponent(String(input)))
        .filter((url) => url.includes('/admin/sessions'))
        .slice(-1)[0];
      expect(last).toContain('status=active');
      expect(last).toContain('tier=administrator');
      expect(last).toContain('limit=50');
      expect(last).toContain('offset=0');
    });
  });

  it('can be narrowed to somebody whose access has since been removed', async () => {
    serve(OPEN);
    render(<SignInsPage />);

    // Exactly who this screen gets asked about.
    expect(await screen.findByRole('option', { name: /Carla Ruiz \(access removed\)/ })).toBeInTheDocument();
  });

  it('is turned away for an Owner, who may not see when colleagues were in', async () => {
    serve({ ...OPEN, '/admin/me': me('owner') });
    render(<SignInsPage />);

    expect(await screen.findByText(/Only the Godfather/i)).toBeInTheDocument();
    expect(screen.queryByText('Timed Out')).not.toBeInTheDocument();
  });

  it('reads a length of time the way a person would', () => {
    expect(lengthOfTime(20)).toBe('1 min');
    expect(lengthOfTime(2520)).toBe('42 min');
    expect(lengthOfTime(11100)).toBe('3 h 05 min');
    expect(lengthOfTime(93600)).toBe('1 d 2 h');
    expect(lengthOfTime(-5)).toBe('Unknown');
  });
});
