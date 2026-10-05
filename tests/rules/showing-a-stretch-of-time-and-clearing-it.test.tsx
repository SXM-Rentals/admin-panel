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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../render';
import { reply, sentTo, serve } from '../fake-server';
import { isWithin, localDay, periodFor } from '@/lib/period';
import { onQueueCount } from '@/lib/queue-count';
import { forgetTestDataStatus } from '@/lib/test-data';
import ActionQueuePage from '@/app/(panel)/queue/page';
import ActivityPage from '@/app/(panel)/activity/page';
import TestDataPage from '@/app/(panel)/test-data/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/queue',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Whether the test-data window is open is asked once and kept for the whole
// panel, so each test starts with it forgotten — otherwise the first test to ask
// decides the answer for all the others.
beforeEach(() => forgetTestDataStatus());

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

const OPEN = {
  open: true,
  conditions: [
    { name: 'allow_test_reset', met: true, sentence: 'ALLOW_TEST_RESET is switched on.' },
    { name: 'stripe_never_live', met: true, sentence: 'Stripe has never run with live keys.' },
  ],
};

const SHUT = {
  open: false,
  conditions: [
    { name: 'allow_test_reset', met: true, sentence: 'ALLOW_TEST_RESET is switched on.' },
    { name: 'stripe_never_live', met: false, sentence: 'Stripe has run with live keys, so this is shut for good.' },
  ],
};

describe('clearing test records', () => {
  it('is offered to the Godfather and to nobody else', async () => {
    serve({
      '/admin/me': me('godfather'),
      '/admin/test-data/status': OPEN,
      'GET /admin/bookings': [],
      'GET /admin/payments': [],
      'GET /admin/vehicles': [],
    });
    render(<ActivityPage />);

    const clear = await screen.findAllByRole('button', { name: /^clear$/i });
    expect(clear.length).toBeGreaterThan(0);
    await waitFor(() => expect(clear[0]).toBeEnabled());
  });

  it('is not on the screen at all for an Owner', async () => {
    serve({
      '/admin/me': me('owner'),
      '/admin/test-data/status': OPEN,
      'GET /admin/bookings': [],
      'GET /admin/payments': [],
      'GET /admin/vehicles': [],
    });
    render(<ActivityPage />);

    await screen.findByText(/Activity/);
    await waitFor(() => expect(screen.queryByRole('button', { name: /^clear$/i })).not.toBeInTheDocument());
  });

  it('turns an Owner away from the Test Data screen outright', async () => {
    serve({ '/admin/me': me('owner'), '/admin/test-data/status': OPEN });
    render(<TestDataPage />);

    expect(await screen.findByText(/Only the Godfather/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^clear$/i })).not.toBeInTheDocument();
  });

  it('sends the kind, the reason and the code, and says what the server did', async () => {
    const user = userEvent.setup();
    const server = serve({
      '/admin/me': me('godfather'),
      '/admin/test-data/status': OPEN,
      'POST /admin/test-data/clear': {
        what: 'deposits',
        cleared: 12,
        detail: '12 deposits cleared. Bookings untouched.',
      },
    });
    render(<TestDataPage />);

    await user.click((await screen.findAllByRole('button', { name: /^clear$/i }))[0]);
    await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));
    await user.click(screen.getByLabelText(/reason/i));
    await user.paste('Finished testing the booking flow; starting the pre-launch run clean.');
    await user.type(screen.getByLabelText(/authenticator code/i), '246810');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /clear the deposits/i }));

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/test-data/clear')).toEqual({
        what: 'deposits',
        reason: 'Finished testing the booking flow; starting the pre-launch run clean.',
        code: '246810',
      }),
    );

    // The server's own account of what it did, as written — not "done".
    expect(await screen.findByText('12 deposits cleared. Bookings untouched.')).toBeInTheDocument();
  });

  it('shows the server own refusal when one would take more with it', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': me('godfather'),
      '/admin/test-data/status': OPEN,
      'POST /admin/test-data/clear': reply(409, {
        error: {
          code: 'would_take_more',
          message: 'Clearing the bookings would take the deposits with them. Clear the deposits first.',
          requestId: 'r1',
        },
      }),
    });
    render(<TestDataPage />);

    await user.click((await screen.findAllByRole('button', { name: /^clear$/i }))[0]);
    await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));
    await user.click(screen.getByLabelText(/reason/i));
    await user.paste('Clearing up after the pre-launch run.');
    await user.type(screen.getByLabelText(/authenticator code/i), '246810');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /clear the deposits/i }));

    // Word for word: that sentence is the one that says what to do next.
    expect(await screen.findByText(/Clear the deposits first/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing was changed/i)).toBeInTheDocument();
  });

  it('shuts for good, and says which condition shut it', async () => {
    serve({ '/admin/me': me('godfather'), '/admin/test-data/status': SHUT });
    render(<TestDataPage />);

    expect(
      await screen.findByText(/Stripe has run with live keys, so this is shut for good/),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^clear$/i })[0]).toBeDisabled());
  });

  it('never offers to clear the refunds, because they are not a kind of their own', async () => {
    serve({ '/admin/me': me('godfather'), '/admin/test-data/status': OPEN });
    render(<TestDataPage />);

    await screen.findAllByRole('button', { name: /^clear$/i });
    expect(screen.queryByText(/clear the refund/i)).not.toBeInTheDocument();
  });
});
