// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks what staff can do to a rental business —
// correcting one of its details, stopping it trading, closing it, opening it
// again — and the two of those that are easy to get subtly wrong.
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
//
// STOPPING THEM TRADING AND CLOSING THEM ARE NOT THE SAME THING, and the second
// one is not the end of the story either: opening a business again does NOT put
// its cars back on the site. Anybody who believes it does will tell a business
// they are live when they are not, so the screen says it before the button is
// pressed and this file holds that wording in place.
//
// AND A CLOSED BUSINESS IS A RECORD, NOT A LIVE ONE. Nothing on it can be
// edited, the same as a closed customer account.

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
  respondsIn: 'within_hours',
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
  closedAt: null,
};

// The same business after it closed: every car came down with it.
const CLOSED: AdminProvider = { ...BUSINESS, vehicleCount: 1, closedAt: '2026-09-30T14:00:00.000Z' };

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

// Fills in a reason and a code in whichever of these dialogs is open, and
// presses its button.
async function confirmWithCode(
  user: ReturnType<typeof userEvent.setup>,
  reason: string,
  button: RegExp,
  code = '246810',
) {
  await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));
  await user.click(screen.getByLabelText(/reason/i));
  await user.paste(reason);
  await user.type(screen.getByLabelText(/authenticator code/i), code);
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: button }));
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
  it('offers every decision that applies, and leaves editing to the rows', async () => {
    const user = userEvent.setup();
    serve({ '/admin/me': ME, '/admin/providers/pr-1': BUSINESS, 'GET /admin/vehicles': FLEET });
    render(<ProviderDetailPage />);

    await user.click(await screen.findByRole('button', { name: /^modify$/i }));

    for (const name of [/verification/i, /stop them trading/i, /close the business/i]) {
      expect(screen.getByRole('menuitem', { name })).not.toHaveAttribute('aria-disabled');
    }

    // Editing is not an item here, because on this screen it is not somewhere
    // else: each detail has its own pencil, one field and one reason at a time.
    expect(screen.queryByRole('menuitem', { name: /edit their details/i })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: /edit contact email/i })).toBeInTheDocument();
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
    expect(await screen.findByText(/none of their vehicles are live/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(replaced).toHaveBeenCalledWith('/providers/pr-1'));
  });
});

describe('closing a business', () => {
  it('sends the reason and the authenticator code, and nothing else', async () => {
    const user = userEvent.setup();
    const server = serve({
      '/admin/me': ME,
      '/admin/providers/pr-1': BUSINESS,
      'GET /admin/vehicles': FLEET,
      'POST /admin/providers/pr-1/close': { ...BUSINESS, closedAt: '2026-10-03T12:00:00.000Z' },
    });
    render(<ProviderDetailPage />);

    await user.click(await screen.findByRole('button', { name: /close the business/i }));
    await confirmWithCode(user, 'Owner is retiring and asked us to take it down.', /close the business/i);

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/providers/pr-1/close')).toEqual({
        reason: 'Owner is retiring and asked us to take it down.',
        code: '246810',
      }),
    );
  });

  it('will not go through on a reason alone — a session left open is not enough', async () => {
    const user = userEvent.setup();
    serve({ '/admin/me': ME, '/admin/providers/pr-1': BUSINESS, 'GET /admin/vehicles': FLEET });
    render(<ProviderDetailPage />);

    await user.click(await screen.findByRole('button', { name: /close the business/i }));
    await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));
    await user.click(screen.getByLabelText(/reason/i));
    await user.paste('Owner is retiring and asked us to take it down.');

    const confirm = within(screen.getByRole('dialog')).getByRole('button', { name: /close the business/i });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText(/authenticator code/i), '246810');
    expect(confirm).toBeEnabled();
  });

  it('shows the server’s own refusal when money is still in the air', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': ME,
      '/admin/providers/pr-1': BUSINESS,
      'GET /admin/vehicles': FLEET,
      'POST /admin/providers/pr-1/close': reply(409, {
        error: {
          code: 'has_live_rental',
          message: 'A rental is active (BK-4471). The business can be closed once it is finished.',
          requestId: 'r1',
        },
      }),
    });
    render(<ProviderDetailPage />);

    await user.click(await screen.findByRole('button', { name: /close the business/i }));
    await confirmWithCode(user, 'Owner is retiring and asked us to take it down.', /close the business/i);

    // Word for word, naming the booking — and nothing was changed, which here is
    // true and worth saying.
    expect(await screen.findByText(/A rental is active \(BK-4471\)/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing was changed/i)).toBeInTheDocument();
  });
});

describe('a business that has closed', () => {
  it('reads as closed, and offers to be opened again instead of closed', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': ME,
      '/admin/providers/pr-1': CLOSED,
      'GET /admin/vehicles': [vehicle('v2', 'suspended', 'Corolla')],
    });
    render(<ProviderDetailPage />);

    expect((await screen.findAllByText(/Closed on 30 Sep 2026/)).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /^modify$/i }));
    expect(screen.getByRole('menuitem', { name: /open the business again/i })).not.toHaveAttribute('aria-disabled');
    expect(screen.queryByRole('menuitem', { name: /close the business/i })).not.toBeInTheDocument();
    // Its cars are already off the site, so there is nothing to stop.
    expect(screen.getByRole('menuitem', { name: /stop them trading/i })).toHaveTextContent(
      /already off the site/i,
    );
  });

  it('cannot have its details edited — it is a record now', async () => {
    serve({
      '/admin/me': ME,
      '/admin/providers/pr-1': CLOSED,
      'GET /admin/vehicles': [vehicle('v2', 'suspended', 'Corolla')],
    });
    render(<ProviderDetailPage />);

    await screen.findAllByText(/Closed on 30 Sep 2026/);
    expect(screen.queryByRole('button', { name: /^edit /i })).not.toBeInTheDocument();
    expect(screen.getByText(/nothing here can be changed/i)).toBeInTheDocument();
  });

  it('says plainly, before it is confirmed, that opening it again leaves the cars down', async () => {
    const user = userEvent.setup();
    const server = serve({
      '/admin/me': ME,
      '/admin/providers/pr-1': CLOSED,
      'GET /admin/vehicles': [vehicle('v2', 'suspended', 'Corolla')],
      'POST /admin/providers/pr-1/reopen': { ...CLOSED, closedAt: null },
    });
    render(<ProviderDetailPage />);

    await user.click(await screen.findByRole('button', { name: /open it again/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(/cars stay off the site/i);

    await confirmWithCode(user, 'Closed by mistake — the owner rang about it.', /open it again/i);

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/providers/pr-1/reopen')).toEqual({
        reason: 'Closed by mistake — the owner rang about it.',
        code: '246810',
      }),
    );
  });
});

describe('correcting a business’s details', () => {
  it('sends one field, its new value and the reason — nothing else', async () => {
    const user = userEvent.setup();
    const server = serve({
      '/admin/me': ME,
      '/admin/providers/pr-1': BUSINESS,
      'GET /admin/vehicles': FLEET,
      'PATCH /admin/providers/pr-1': { ...BUSINESS, contactEmail: 'office@bayroad.sx' },
    });
    render(<ProviderDetailPage />);

    await user.click(await screen.findByRole('button', { name: /edit contact email/i }));
    const box = screen.getByLabelText(/^contact email$/i);
    await user.clear(box);
    await user.type(box, 'office@bayroad.sx');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));
    await user.click(screen.getByLabelText(/reason/i));
    await user.paste('Their old address bounced; confirmed the new one by phone.');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /save change/i }));

    await waitFor(() =>
      expect(sentTo(server, 'PATCH', '/admin/providers/pr-1')).toEqual({
        field: 'contactEmail',
        value: 'office@bayroad.sx',
        reason: 'Their old address bounced; confirmed the new one by phone.',
      }),
    );
  });

  it('says how soon they reply in words, never as the server’s code', async () => {
    serve({ '/admin/me': ME, '/admin/providers/pr-1': BUSINESS, 'GET /admin/vehicles': FLEET });
    render(<ProviderDetailPage />);

    expect(await screen.findByText('Within a few hours')).toBeInTheDocument();
    expect(screen.queryByText('within_hours')).not.toBeInTheDocument();
  });
});
