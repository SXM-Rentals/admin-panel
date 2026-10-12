// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks that the Godfather's Delete the business goes straight
// through — no dialog, no reason, no authenticator code — while everybody else who
// has the button still goes through the dialog.
//
// IT IS THE OWNER'S DECISION: he built the platform, so deleting a business is his to
// do as he pleases, with nothing in the way. What these tests hold in place is the
// other half of that sentence — that it is only ever a CLICK that does it. A link that
// deletes when it is visited could be set off by a refresh, the back button or a
// browser prefetching it, so a delete flag in the address bar must never delete
// anything, and a second click while the first is still going must not send a second
// request.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../render';
import { reply, serve } from '../fake-server';
import ProviderDetailPage from '@/app/(panel)/providers/[id]/page';
import type { AdminProvider } from '@/types/admin';

let query = '';
const pushed = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: pushed, back: vi.fn() }),
  usePathname: () => '/providers/pr-1',
  useSearchParams: () => new URLSearchParams(query),
  useParams: () => ({ id: 'pr-1' }),
}));

beforeEach(() => {
  query = '';
  pushed.mockClear();
});

const me = (tier: string) => ({
  id: 'st-me',
  name: 'Gio Bertin-Maurice',
  email: 'gio@sxmrentals.app',
  avatarInitials: 'GB',
  tier,
});

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
  bookingCount: 240,
  grossVolume: 96000,
  closedAt: null,
};

const DELETED = {
  id: 'pr-1',
  businessName: 'Bay Road Rentals',
  deleted: true,
  removed: { deposits: 1, refundRequests: 0, disputes: 0, paymentLines: 9, bookings: 9, payouts: 2, vehicles: 3 },
  detail: 'Bay Road Rentals deleted, with 3 car(s) and 9 booking(s).',
};

// The calls the stand-in server was sent to this address, so a test can say how many
// and with what.
function deletesSentTo(server: ReturnType<typeof serve>) {
  return server.mock.calls.filter(
    ([input, init]) =>
      String(input).includes('/admin/providers/pr-1/delete') && (init?.method ?? 'GET').toUpperCase() === 'POST',
  );
}

describe('the Godfather deleting a business', () => {
  it('goes straight through, with nothing in the body and no dialog', async () => {
    const user = userEvent.setup();
    const server = serve({
      '/admin/me': me('godfather'),
      '/admin/providers/pr-1': BUSINESS,
      'GET /admin/vehicles': [],
      'POST /admin/providers/pr-1/delete': DELETED,
    });
    render(<ProviderDetailPage />);

    await user.click(await screen.findByRole('button', { name: /delete the business/i }));

    await waitFor(() => expect(deletesSentTo(server)).toHaveLength(1));
    // No reason, no code: the same address with nothing sent.
    expect(deletesSentTo(server)[0][1]?.body).toBeUndefined();
    // And no dialog was ever put in the way.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Then straight back to the list.
    await waitFor(() => expect(pushed).toHaveBeenCalledWith('/providers'));
  });

  it('tells the person what the server says went, as written', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': me('godfather'),
      '/admin/providers/pr-1': BUSINESS,
      'GET /admin/vehicles': [],
      'POST /admin/providers/pr-1/delete': DELETED,
    });
    render(<ProviderDetailPage />);

    await user.click(await screen.findByRole('button', { name: /delete the business/i }));

    expect(await screen.findByText(/deleted, with 3 car\(s\) and 9 booking\(s\)/i)).toBeInTheDocument();
  });

  it('sends one request however many times it is clicked', async () => {
    const user = userEvent.setup();
    const server = serve({
      '/admin/me': me('godfather'),
      '/admin/providers/pr-1': BUSINESS,
      'GET /admin/vehicles': [],
      'POST /admin/providers/pr-1/delete': DELETED,
    });
    render(<ProviderDetailPage />);

    const button = await screen.findByRole('button', { name: /delete the business/i });
    await user.dblClick(button);

    await waitFor(() => expect(deletesSentTo(server)).toHaveLength(1));
  });

  it('shows the server’s own words if it refuses, and stays on the business', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': me('godfather'),
      '/admin/providers/pr-1': BUSINESS,
      'GET /admin/vehicles': [],
      'POST /admin/providers/pr-1/delete': reply(409, {
        error: { code: 'has_history', message: 'This business has real bookings behind it.', requestId: 'r1' },
      }),
    });
    render(<ProviderDetailPage />);

    await user.click(await screen.findByRole('button', { name: /delete the business/i }));

    expect(await screen.findByText(/real bookings behind it/i)).toBeInTheDocument();
    expect(pushed).not.toHaveBeenCalled();
  });

  it('is never set off by a link, only by a click', async () => {
    query = 'delete=1';
    const server = serve({
      '/admin/me': me('godfather'),
      '/admin/providers/pr-1': BUSINESS,
      'GET /admin/vehicles': [],
      'POST /admin/providers/pr-1/delete': DELETED,
    });
    render(<ProviderDetailPage />);

    await screen.findByRole('button', { name: /delete the business/i });
    // Give anything a link might have started time to happen.
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(deletesSentTo(server)).toHaveLength(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('everybody else who may delete a business', () => {
  it('still goes through the dialog, and nothing is sent until it is confirmed', async () => {
    const user = userEvent.setup();
    const server = serve({
      '/admin/me': me('owner'),
      '/admin/providers/pr-1': BUSINESS,
      'GET /admin/vehicles': [],
    });
    render(<ProviderDetailPage />);

    await user.click(await screen.findByRole('button', { name: /delete the business/i }));

    expect(await screen.findByRole('dialog')).toHaveTextContent(/delete bay road rentals/i);
    expect(deletesSentTo(server)).toHaveLength(0);
  });

  it('is not offered at all to an Administrator', async () => {
    serve({ '/admin/me': me('administrator'), '/admin/providers/pr-1': BUSINESS, 'GET /admin/vehicles': [] });
    render(<ProviderDetailPage />);

    await screen.findAllByText('Bay Road Rentals');
    expect(screen.queryByRole('button', { name: /delete the business/i })).not.toBeInTheDocument();
  });
});
