// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks the one action in the panel that carries out a
// single decision as several changes — stopping a business trading, which means
// taking every one of its live vehicles down.
//
// WHY THIS ONE NEEDS ITS OWN TEST. Everywhere else, one press is one change: it
// went through or it did not, and the dialog says which. Here one press can be
// four changes, and three of them going through is a real outcome that neither
// "done" nor "nothing was changed" describes. Reporting it as done leaves a car
// bookable that somebody believes is off the site. Reporting it as nothing
// changed invites them to run it all again. So the panel says exactly which cars
// are still live, and names them.
//
// AND WHY ONLY THE LIVE ONES ARE TOUCHED. A car already down cannot be booked,
// so sending a take-down for it changes nothing and puts a line in the audit log
// that somebody will later have to explain.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../render';
import { reply, sentTo, serve } from '../fake-server';
import ProviderDetailPage from '@/app/(panel)/providers/[id]/page';
import type { AdminProvider, AdminVehicle } from '@/types/admin';

// The screen reads the business's reference out of the address bar, and looks
// there for an action chosen on the list before it. There is no address bar here,
// so it is given one that a test can write to.
let query = '';
const replaced = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaced, push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/providers/pr-1',
  useSearchParams: () => new URLSearchParams(query),
  useParams: () => ({ id: 'pr-1' }),
}));

beforeEach(() => {
  query = '';
  replaced.mockClear();
});

const ME = { id: 'st-me', name: 'Gio Bertin-Maurice', email: 'gio@sxmrentals.app', avatarInitials: 'GB' };

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
  respondsIn: 'within an hour',
  phone: '+1 721 555 0110',
  description: 'Family-run, four cars.',
  deliversVehicles: true,
  airportPickup: true,
  memberSince: '2025-03-04',
  ownerName: 'Marcel Peters',
  ownerPhone: '+1 721 555 0188',
  vehicleCount: 3,
  bookingCount: 240,
  grossVolume: 96000,
};

function vehicle(id: string, listingStatus: AdminVehicle['listingStatus'], model: string): AdminVehicle {
  return {
    id,
    reference: `VH-${id.toUpperCase()}`,
    providerId: 'pr-1',
    providerName: BUSINESS.businessName,
    make: 'Toyota',
    model,
    year: 2023,
    vehicleClass: 'economy',
    dailyRate: 55,
    side: 'dutch',
    listingStatus,
  };
}

// The three cars on file: two bookable, one already down.
const FLEET = [vehicle('v1', 'live', 'Yaris'), vehicle('v2', 'suspended', 'Corolla'), vehicle('v3', 'live', 'Aygo')];

async function openTheDialog(user: ReturnType<typeof userEvent.setup>) {
  render(<ProviderDetailPage />);
  await user.click(await screen.findByRole('button', { name: /stop them trading/i }));
  // The sheet moves focus to the reason box one frame after opening, and a click
  // before it does would be taken back.
  await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));
  await user.click(screen.getByLabelText(/reason/i));
  await user.paste('Trading licence expired on 12 September.');
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /take their vehicles down/i }));
}

describe('stopping a business trading', () => {
  it('takes down the vehicles customers can book, with the reason, and leaves the rest alone', async () => {
    const user = userEvent.setup();
    const server = serve({
      '/admin/me': ME,
      '/admin/providers/pr-1': BUSINESS,
      'GET /admin/vehicles': FLEET,
      'POST /admin/vehicles/v1/listing': { ...FLEET[0], listingStatus: 'suspended', documents: [] },
      'POST /admin/vehicles/v3/listing': { ...FLEET[2], listingStatus: 'suspended', documents: [] },
    });

    await openTheDialog(user);

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/vehicles/v3/listing')).toEqual({
        approve: false,
        reason: 'Trading licence expired on 12 September.',
      }),
    );
    expect(sentTo(server, 'POST', '/admin/vehicles/v1/listing')).toEqual({
      approve: false,
      reason: 'Trading licence expired on 12 September.',
    });
    // The one that was already down was not sent a second take-down.
    expect(sentTo(server, 'POST', '/admin/vehicles/v2/listing')).toBeUndefined();
  });

  it('names the vehicles still live when only some of them went down', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': ME,
      '/admin/providers/pr-1': BUSINESS,
      'GET /admin/vehicles': FLEET,
      'POST /admin/vehicles/v1/listing': { ...FLEET[0], listingStatus: 'suspended', documents: [] },
      'POST /admin/vehicles/v3/listing': reply(409, {
        error: { code: 'has_live_rental', message: 'This vehicle is out on a rental right now.', requestId: 'r1' },
      }),
    });

    await openTheDialog(user);

    // Which one, by name, and how far it got.
    const said = await screen.findByText(/1 of 2 vehicles were taken down/i);
    expect(said).toHaveTextContent('Toyota Aygo (VH-V3)');
    expect(said).toHaveTextContent('This vehicle is out on a rental right now.');
    // And it does not claim nothing happened — one of them really did go down.
    expect(said).not.toHaveTextContent(/nothing was changed/i);
  });

  it('will not offer to stop a business whose whole fleet it cannot see', async () => {
    // Twelve vehicles on file, one of them in the list the server sent.
    serve({
      '/admin/me': ME,
      '/admin/providers/pr-1': { ...BUSINESS, vehicleCount: 12 },
      'GET /admin/vehicles': [FLEET[0]],
    });
    render(<ProviderDetailPage />);

    expect(await screen.findByText(/cannot promise to take them all down/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /stop them trading/i })).not.toBeInTheDocument();
  });
});

describe('the Modify menu on a business', () => {
  it('offers the same actions here as on the row, and says which the server cannot do', async () => {
    const user = userEvent.setup();
    serve({ '/admin/me': ME, '/admin/providers/pr-1': BUSINESS, 'GET /admin/vehicles': FLEET });
    render(<ProviderDetailPage />);

    await user.click(await screen.findByRole('button', { name: /^modify$/i }));

    // The one that can be done here.
    expect(screen.getByRole('menuitem', { name: /stop them trading/i })).not.toHaveAttribute('aria-disabled');
    // And the two the server has no address for, each saying so.
    for (const name of [/edit their details/i, /close the business/i]) {
      const item = screen.getByRole('menuitem', { name });
      expect(item).toHaveAttribute('aria-disabled', 'true');
      expect(item).toHaveTextContent(/does not offer this yet/i);
    }
  });

  it('will not offer to stop a business with nothing live, and says why', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': ME,
      '/admin/providers/pr-1': { ...BUSINESS, vehicleCount: 1 },
      'GET /admin/vehicles': [vehicle('v2', 'suspended', 'Corolla')],
    });
    render(<ProviderDetailPage />);

    await user.click(await screen.findByRole('button', { name: /^modify$/i }));

    const stop = screen.getByRole('menuitem', { name: /stop them trading/i });
    expect(stop).toHaveAttribute('aria-disabled', 'true');
    expect(stop).toHaveTextContent(/none of their vehicles are live/i);
  });
});

describe('arriving from the businesses list with an action already chosen', () => {
  it('opens the dialog, and takes the instruction out of the address bar', async () => {
    query = 'stop=1';
    serve({ '/admin/me': ME, '/admin/providers/pr-1': BUSINESS, 'GET /admin/vehicles': FLEET });
    render(<ProviderDetailPage />);

    expect(await screen.findByRole('dialog')).toHaveTextContent(/stop this business trading/i);
    // So a refresh, or pressing Back, does not raise it again.
    await waitFor(() => expect(replaced).toHaveBeenCalledWith('/providers/pr-1'));
  });

  it('does not open it when every one of their cars is already down', async () => {
    query = 'stop=1';
    serve({
      '/admin/me': ME,
      '/admin/providers/pr-1': { ...BUSINESS, vehicleCount: 1 },
      'GET /admin/vehicles': [vehicle('v2', 'suspended', 'Corolla')],
    });
    render(<ProviderDetailPage />);

    // The screen says there is nothing to take down, and no dialog is raised
    // over it asking for a reason to take nothing down.
    expect(await screen.findByText(/nothing here to take down/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(replaced).toHaveBeenCalledWith('/providers/pr-1'));
  });
});
