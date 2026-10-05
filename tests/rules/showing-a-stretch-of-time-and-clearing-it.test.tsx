// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks the three things that decide what a screen is
// showing and who may destroy it — the stretch of time a screen covers, the red
// number on the sidebar being true, and the Godfather-only controls for clearing
// test records.
//
// THE RED NUMBER IS THE ONE THAT WAS ACTUALLY WRONG. The frame fetched the count
// of waiting work once, when somebody signed in, and never again — so dealing with
// the last thing in the queue left a red 1 on the sidebar sitting beside a screen
// that said "Nothing Is Waiting". The panel contradicting itself in one screenshot
// is worse than either number alone, because now neither can be trusted.
//
// A DAY IS A LOCAL DAY, which is the kind of thing that is silently wrong forever.
// A booking made at 21:30 here is stamped after midnight in UTC, so comparing raw
// timestamps would file it under tomorrow on every screen in the panel.
//
// AND CLEARING RECORDS IS ONE ACCOUNT'S, not the Owners'. Every other mistake in
// this panel leaves something behind to read. This one leaves nothing.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../render';
import { serve } from '../fake-server';
import { isWithin, localDay, periodFor } from '@/lib/period';
import { onQueueCount } from '@/lib/queue-count';
import ActionQueuePage from '@/app/(panel)/queue/page';
import ActivityPage from '@/app/(panel)/activity/page';
import TestDataPage from '@/app/(panel)/test-data/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/queue',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const me = (tier: string) => ({
  id: 'st-me',
  name: 'Gio Bertin-Maurice',
  email: 'gio@sxmrentals.app',
  avatarInitials: 'GB',
  tier,
});

describe('a day is the day you are having, not the one UTC is having', () => {
  it('files a late evening here under today, not tomorrow', () => {
    // 21:30 on the 4th on this island is already the 5th in UTC.
    const lateHere = new Date(2026, 9, 4, 21, 30);
    expect(localDay(lateHere)).toBe('2026-10-04');

    const today = periodFor('today', lateHere);
    expect(isWithin(today, lateHere.toISOString())).toBe(true);
  });

  it('counts both ends of a range, and keeps everything out of none', () => {
    const period = { id: 'custom' as const, from: '2026-10-01', to: '2026-10-03' };
    expect(isWithin(period, new Date(2026, 9, 1, 0, 5).toISOString())).toBe(true);
    expect(isWithin(period, new Date(2026, 9, 3, 23, 55).toISOString())).toBe(true);
    expect(isWithin(period, new Date(2026, 9, 4, 0, 5).toISOString())).toBe(false);

    // "All" has no edges, and nothing dated falls outside it.
    expect(isWithin({ id: 'all' }, new Date(2001, 0, 1).toISOString())).toBe(true);
    // But something with no date at all is not "within" anything narrower.
    expect(isWithin(period, null)).toBe(false);
  });

  it('means seven days including today by "7 days"', () => {
    const period = periodFor('week', new Date(2026, 9, 5));
    expect(period.from).toBe('2026-09-29');
    expect(period.to).toBe('2026-10-05');
  });
});

describe('the red number on the sidebar', () => {
  it('says nothing is waiting the moment the queue screen knows it', async () => {
    const heard: number[] = [];
    const stop = onQueueCount((count) => heard.push(count));

    serve({ '/admin/me': me('owner'), '/admin/queue': [] });
    render(<ActionQueuePage />);

    // The screen counted none, so the frame is told none — rather than keeping
    // the number it fetched when somebody signed in an hour ago.
    await waitFor(() => expect(heard).toContain(0));
    stop();
  });

  it('counts everything waiting, not just what the filters are showing', async () => {
    const heard: number[] = [];
    const stop = onQueueCount((count) => heard.push(count));
    const user = userEvent.setup();

    serve({
      '/admin/me': me('owner'),
      '/admin/queue': [
        {
          id: 'q-1',
          kind: 'dispute',
          title: 'Dispute DP-1',
          detail: 'Opened a while ago',
          waitingSince: '2026-01-04T10:00:00.000Z',
          href: '/disputes/d-1',
          urgency: 'overdue',
        },
      ],
    });
    render(<ActionQueuePage />);

    await screen.findByText(/Dispute DP-1/);
    await user.click(screen.getByRole('button', { name: /^today$/i }));

    // Filtered out of sight, and still waiting: a filter is somebody looking at
    // part of the work, not the work going away.
    expect(screen.queryByText(/Dispute DP-1/)).not.toBeInTheDocument();
    expect(heard.every((count) => count === 1)).toBe(true);
    stop();
  });
});

describe('showing one stretch of time', () => {
  it('leaves out what happened outside it, and says so', async () => {
    const user = userEvent.setup();
    const now = new Date().toISOString();
    serve({
      '/admin/me': me('owner'),
      'GET /admin/bookings': [
        {
          id: 'bk-1',
          reference: 'BK-TODAY',
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
          createdAt: now,
        },
        {
          id: 'bk-2',
          reference: 'BK-ANCIENT',
          status: 'upcoming',
          customerId: 'cu-2',
          customerName: 'Marcel Peters',
          providerId: 'pr-1',
          providerName: 'Bay Road Rentals',
          vehicleLabel: 'Toyota Aygo 2022',
          startDate: '2026-02-01',
          endDate: '2026-02-04',
          gross: 200,
          commission: 30,
          payout: 170,
          depositAmount: 0,
          depositStatus: 'not_taken',
          paymentStatus: 'paid',
          agreementSigned: true,
          messageCount: 0,
          createdAt: '2026-01-04T10:00:00.000Z',
        },
      ],
      'GET /admin/payments': [],
      'GET /admin/vehicles': [],
    });
    render(<ActivityPage />);

    expect(await screen.findByText(/BK-ANCIENT booked/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^today$/i }));

    expect(screen.getByText(/BK-TODAY booked/)).toBeInTheDocument();
    expect(screen.queryByText(/BK-ANCIENT booked/)).not.toBeInTheDocument();
    // And the count beside the title says which stretch it is counting.
    expect(screen.getByText(/shown for today/i)).toBeInTheDocument();
  });

  it('says there is older activity rather than looking empty', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': me('owner'),
      'GET /admin/bookings': [],
      'GET /admin/payments': [
        {
          id: 'le-1',
          at: '2026-01-04T10:00:00.000Z',
          bookingRef: 'BK-OLD',
          customerName: 'Dana Illidge',
          providerName: 'Bay Road Rentals',
          kind: 'charge',
          amount: 200,
          status: 'succeeded',
          stripeRef: 'pi_1',
        },
      ],
      'GET /admin/vehicles': [],
    });
    render(<ActivityPage />);

    await screen.findByText(/\$200 paid/);
    await user.click(screen.getByRole('button', { name: /^today$/i }));

    expect(screen.getByText(/There is older activity/i)).toBeInTheDocument();
  });
});

describe('clearing test records', () => {
  it('is offered to the Godfather and to nobody else', async () => {
    serve({ '/admin/me': me('godfather'), 'GET /admin/bookings': [], 'GET /admin/payments': [], 'GET /admin/vehicles': [] });
    render(<ActivityPage />);

    // Offered, and plainly not working yet — rather than hidden, or a button
    // that quietly fails.
    const clear = await screen.findAllByRole('button', { name: /^clear$/i });
    expect(clear.length).toBeGreaterThan(0);
    expect(clear[0]).toBeDisabled();
    expect(clear[0]).toHaveAttribute('title', expect.stringMatching(/does not offer this yet/i));
    expect(screen.getByText(/not something the server offers yet/i)).toBeInTheDocument();
  });

  it('is not on the screen at all for an Owner', async () => {
    serve({ '/admin/me': me('owner'), 'GET /admin/bookings': [], 'GET /admin/payments': [], 'GET /admin/vehicles': [] });
    render(<ActivityPage />);

    await screen.findByText(/Activity/);
    await waitFor(() => expect(screen.queryByRole('button', { name: /^clear$/i })).not.toBeInTheDocument());
  });

  it('turns an Owner away from the Test Data screen outright', async () => {
    serve({ '/admin/me': me('owner') });
    render(<TestDataPage />);

    expect(await screen.findByText(/Only the Godfather/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /wind back/i })).not.toBeInTheDocument();
  });

  it('warns the Godfather that winding back undoes what was right too', async () => {
    serve({ '/admin/me': me('godfather') });
    render(<TestDataPage />);

    expect(await screen.findByText(/undoes the things that were right/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wind back/i })).toBeDisabled();
  });
});
