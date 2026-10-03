// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks the fleet set-up screens — a business sending us its
// own records and asking us to put its cars on — and the queue row that leads to
// them.
//
// WHY THE QUEUE ROW IS TESTED HERE TOO. The server decides what goes in the action
// queue, and it added this kind of work without the panel knowing. The queue screen
// looked its kind up in a table of three, got undefined, and read .icon off it —
// so one new kind of work on the server took the whole queue screen down, and the
// link on the row pointed at a page that did not exist. Both halves are fixed here,
// and this holds them: an unknown kind draws as something rather than throwing.
//
// AND WHY FINISHING ONE ASKS FOR NO REASON. Every change to a record in this panel
// carries a written reason, and this one does not — because nothing about a record
// changes. A job is being ticked off a list of work. The screen says so out loud,
// and this checks it still does, so the absence reads as a decision rather than as
// the one place somebody forgot.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../render';
import { reply, sentTo, serve } from '../fake-server';
import FleetRequestsPage from '@/app/(panel)/fleet-requests/page';
import FleetRequestPage from '@/app/(panel)/fleet-requests/[id]/page';
import ActionQueuePage from '@/app/(panel)/queue/page';
import type { FleetRequest } from '@/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/fleet-requests/fr-1',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: 'fr-1' }),
}));

const ME = { id: 'st-me', name: 'Gio Bertin-Maurice', email: 'gio@sxmrentals.app', avatarInitials: 'GB', tier: 'owner' };

const REQUEST: FleetRequest = {
  id: 'fr-1',
  providerId: 'pr-1',
  businessName: 'Bay Road Rentals',
  fleetSize: 6,
  recordFormat: 'A spreadsheet and photos of the keys board',
  contact: 'Marcel on +1 721 555 0188',
  notes: 'Six cars, two are off the road until November.',
  status: 'waiting',
  createdAt: '2026-09-28T10:00:00.000Z',
  handledAt: null,
  files: [
    { id: 'f-1', fileName: 'fleet.xlsx', contentType: 'application/vnd.ms-excel', size: 48210 },
    { id: 'f-2', fileName: 'keys-board.jpg', contentType: 'image/jpeg', size: 2_400_000 },
  ],
};

describe('the list of fleet set-up requests', () => {
  it('asks the server for the waiting ones, and says what each business sent', async () => {
    const server = serve({ '/admin/me': ME, 'GET /admin/fleet-requests': [REQUEST] });
    render(<FleetRequestsPage />);

    // Waiting first is the server's own order, so the screen asks for that rather
    // than fetching everything and sorting it here.
    await waitFor(() =>
      expect(
        server.mock.calls.some(([input]) => String(input).includes('/admin/fleet-requests?status=waiting')),
      ).toBe(true),
    );

    expect(await screen.findByText('Bay Road Rentals')).toBeInTheDocument();
    expect(screen.getByText(/2 files/i)).toBeInTheDocument();
  });
});

describe('one request', () => {
  it('offers each file as a download from the server, never as something to open', async () => {
    serve({ '/admin/me': ME, '/admin/fleet-requests/fr-1': REQUEST });
    render(<FleetRequestPage />);

    const file = await screen.findByText('fleet.xlsx');
    const link = file.closest('a');
    expect(link).toHaveAttribute('href', '/api/v1/admin/fleet-requests/fr-1/files/f-1');
    // A real download, so the browser saves it rather than rendering somebody
    // else's file inside the panel.
    expect(link).toHaveAttribute('download', 'fleet.xlsx');

    // Sizes in words a person can judge, not a byte count.
    expect(screen.getByText(/47 KB/)).toBeInTheDocument();
    expect(screen.getByText(/2\.3 MB/)).toBeInTheDocument();
  });

  it('is finished without a reason, and says why there is none', async () => {
    const user = userEvent.setup();
    const server = serve({
      '/admin/me': ME,
      '/admin/fleet-requests/fr-1': REQUEST,
      'POST /admin/fleet-requests/fr-1/done': { ...REQUEST, status: 'done', handledAt: '2026-10-03T09:00:00.000Z' },
    });
    render(<FleetRequestPage />);

    expect(await screen.findByText(/It takes no reason/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /mark fleet set up/i }));

    // Nothing in the body: there is nothing to say about it.
    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/fleet-requests/fr-1/done')).toBeUndefined(),
    );
    expect(
      server.mock.calls.some(
        ([input, init]) =>
          String(input).includes('/admin/fleet-requests/fr-1/done') && (init?.method ?? '') === 'POST',
      ),
    ).toBe(true);
  });

  it('shows the server’s own words when it refuses', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': ME,
      '/admin/fleet-requests/fr-1': REQUEST,
      'POST /admin/fleet-requests/fr-1/done': reply(409, {
        error: { code: 'already_done', message: 'This request was already finished.', requestId: 'r1' },
      }),
    });
    render(<FleetRequestPage />);

    await user.click(await screen.findByRole('button', { name: /mark fleet set up/i }));

    expect(await screen.findByText('This request was already finished.')).toBeInTheDocument();
  });

  it('lets an account that changes nothing read it all and finish none of it', async () => {
    serve({ '/admin/me': { ...ME, tier: 'viewer' }, '/admin/fleet-requests/fr-1': REQUEST });
    render(<FleetRequestPage />);

    // Everything is readable, including the files.
    expect(await screen.findByText('fleet.xlsx')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /mark fleet set up/i })).toBeDisabled(),
    );
    expect(screen.getByText(/can see the panel but not change anything/i)).toBeInTheDocument();
  });
});

describe('the action queue', () => {
  it('draws a kind of work it has never heard of instead of falling over', async () => {
    // The server has added kinds before now without the panel knowing.
    serve({
      '/admin/me': ME,
      '/admin/queue': [
        {
          id: 'fr-1',
          kind: 'fleet_request',
          title: 'Fleet to set up — Bay Road Rentals',
          detail: 'A business asked us to add its cars for it.',
          waitingSince: '2026-09-28T10:00:00.000Z',
          href: '/fleet-requests/fr-1',
          urgency: 'aging',
        },
        {
          id: 'x-1',
          kind: 'something_nobody_here_has_heard_of',
          title: 'A kind of work from the future',
          detail: 'Added to the server after this screen was written.',
          waitingSince: '2026-09-29T10:00:00.000Z',
          href: '/',
          urgency: 'normal',
        },
      ],
    });
    render(<ActionQueuePage />);

    // The fleet request has its own words and a link that now goes somewhere.
    const row = await screen.findByText(/Fleet to set up/);
    expect(row.closest('a')).toHaveAttribute('href', '/fleet-requests/fr-1');
    // And the unknown one is still drawn, in the server's own words, rather than
    // taking the screen down on its way past.
    expect(screen.getByText('A kind of work from the future')).toBeInTheDocument();
    expect(screen.getByText('Added to the server after this screen was written.')).toBeInTheDocument();
  });
});
