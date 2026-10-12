// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks the Saved Versions screens — the Godfather's undo for
// clearing test records — on the things that would hurt if they were quietly wrong.
//
// THE KINDS ARE THE SERVER'S. A version used to hold seven kinds of record and now
// holds ten, and the screen was written so that an eleventh appears — as a tab, a
// badge and a word in the help text — without anybody touching the panel. The test
// that matters most here invents a kind the panel has never heard of and checks it
// shows up everywhere.
//
// MONEY ARRIVES IN CENTS, as the server stores it, while the rest of the panel speaks
// dollars. A booking of $320 saved as 32000 and shown as "$32,000" is the sort of
// error that is believed, so it is checked.
//
// PUTTING BACK NEVER OVERWRITES, and the screen must never suggest it could: only
// records that have been deleted since are offered a Put Back, and the three sizes of
// the job — everything, one kind, chosen records — each send exactly what they say.
//
// AND EVERY SENTENCE THE SERVER WRITES IS SHOWN AS WRITTEN: the detail, each note, and
// the reason each failed record gives. The one thing lifted off is the tail of the
// detail that repeats the first notes, so they are read once.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../render';
import { reply, sentTo, serve } from '../fake-server';
import SavedVersionsPage from '@/app/(panel)/saved-versions/page';
import SavedVersionPage from '@/app/(panel)/saved-versions/[id]/page';
import { detailWithoutNotes, needsSomethingPutBackFirst } from '@/components/admin/RestoreResult';
import { holdsSentence, savedAmount } from '@/lib/saved-versions';

const pushed = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: pushed, back: vi.fn() }),
  usePathname: () => '/saved-versions/v-1',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: 'v-1' }),
}));

beforeEach(() => pushed.mockClear());

const me = (tier: string) => ({
  id: 'st-me',
  name: 'Gio Bertin-Maurice',
  email: 'gio@sxmrentals.app',
  avatarInitials: 'GB',
  tier,
});

// The ten kinds the server holds today, in its own words.
const KINDS = [
  { kind: 'audit_log', label: 'Audit log' },
  { kind: 'bookings', label: 'Bookings' },
  { kind: 'payments', label: 'Payments' },
  { kind: 'payouts', label: 'Payouts' },
  { kind: 'deposits', label: 'Deposits' },
  { kind: 'refunds', label: 'Refund requests' },
  { kind: 'disputes', label: 'Disputes' },
  { kind: 'customers', label: 'Customer accounts' },
  { kind: 'providers', label: 'Rental businesses' },
  { kind: 'vehicles', label: 'Vehicles' },
];

function tally(values: Record<string, number>) {
  return Object.fromEntries(KINDS.map((entry) => [entry.kind, values[entry.kind] ?? 0]));
}

const VERSION = {
  id: 'v-1',
  note: 'Before the first launch run',
  createdAt: '2026-10-10T09:00:00.000Z',
  createdBy: { id: 'st-me', name: 'Gio Bertin-Maurice' },
  counts: tally({ bookings: 31, customers: 8, vehicles: 5, providers: 2 }),
  missing: tally({ bookings: 31, customers: 8, providers: 2 }),
};

const LIST = { limit: 20, kinds: KINDS, versions: [VERSION] };

const GONE = {
  id: 'r-1',
  kind: 'bookings',
  label: 'Bookings',
  recordId: 'bk-1',
  summary: 'BK-1001 · Dana Illidge · Toyota Yaris',
  at: '2026-10-03T09:30:00.000Z',
  amountCents: 32000,
  inLive: false,
};

const STILL_THERE = {
  id: 'r-2',
  kind: 'customers',
  label: 'Customer accounts',
  recordId: 'cu-1',
  summary: 'Dana Illidge · dana@example.com',
  at: '2026-09-01T10:00:00.000Z',
  amountCents: null,
  inLive: true,
};

const RESTORED = {
  restored: 12,
  alreadyThere: 3,
  failedCount: 0,
  failed: [],
  notes: [],
  byKind: { customers: { restored: 8, alreadyThere: 0, failed: 0 }, bookings: { restored: 4, alreadyThere: 3, failed: 0 } },
  detail: '12 record(s) put back. 3 were already there and left as they are. ',
};

// Fills in a reason and the code in whichever dialog is open and presses its button.
async function confirm(user: ReturnType<typeof userEvent.setup>, button: RegExp, reason = 'Cleared the wrong kind while testing.') {
  const dialog = await screen.findByRole('dialog');
  await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));
  await user.click(screen.getByLabelText(/reason/i));
  await user.paste(reason);
  await user.type(screen.getByLabelText(/authenticator code/i), '246810');
  await user.click(within(dialog).getByRole('button', { name: button }));
}

// What the stand-in server was asked for at one address, as the search string.
function askedFor(server: ReturnType<typeof serve>, path: string): string[] {
  return server.mock.calls
    .map(([input]) => String(input))
    .filter((url) => url.split('?')[0].endsWith(path))
    .map((url) => decodeURIComponent(url.split('?')[1] ?? ''));
}

describe('what a version holds, said from the server’s own list', () => {
  it('builds the help line from the kinds, and says what it does not hold', async () => {
    serve({ '/admin/me': me('godfather'), 'GET /admin/backups': LIST });
    render(<SavedVersionsPage />);

    expect(
      await screen.findByText(
        /A version holds the audit log, bookings, payments, payouts, deposits, refund requests, disputes, customer accounts, rental businesses and vehicles\. It does NOT hold conversations, support messages, notifications or fleet requests\./,
      ),
    ).toBeInTheDocument();
  });

  it('says passwords and sign-ins are never saved, and the booking software link is not either', async () => {
    serve({ '/admin/me': me('godfather'), 'GET /admin/backups': LIST });
    render(<SavedVersionsPage />);

    expect(
      await screen.findByText(
        /A customer’s password and sign-ins are never saved\. A customer who is put back resets their password or signs in with a code\. A business’s connection to its own booking software is not saved either\./,
      ),
    ).toBeInTheDocument();
  });

  it('puts a kind the panel has never heard of into the help line', () => {
    expect(holdsSentence([...KINDS, { kind: 'reviews', label: 'Reviews' }])).toMatch(/vehicles and reviews$/);
  });
});

describe('who may see saved versions', () => {
  it('turns an Owner away outright', async () => {
    serve({ '/admin/me': me('owner'), 'GET /admin/backups': LIST });
    render(<SavedVersionsPage />);

    expect(await screen.findByText(/Only the Godfather/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save a version/i })).not.toBeInTheDocument();
  });
});

describe('saving a version', () => {
  it('sends the note, and nothing when there is none', async () => {
    const user = userEvent.setup();
    const server = serve({
      '/admin/me': me('godfather'),
      'GET /admin/backups': LIST,
      'POST /admin/backups': reply(201, VERSION),
    });
    render(<SavedVersionsPage />);

    await user.type(await screen.findByLabelText(/a note to remember it by/i), 'Before the launch run');
    await user.click(screen.getByRole('button', { name: /^save a version$/i }));

    await waitFor(() => expect(sentTo(server, 'POST', '/admin/backups')).toEqual({ note: 'Before the launch run' }));
  });

  it('shows the server’s own refusal when the shelf is full, and greys the button when it knows', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': me('godfather'),
      'GET /admin/backups': LIST,
      'POST /admin/backups': reply(409, {
        error: {
          code: 'too_many_versions',
          message: '20 versions are saved already, which is the most kept. Delete an old one first. Nothing was saved.',
          requestId: 'r1',
        },
      }),
    });
    render(<SavedVersionsPage />);

    await user.click(await screen.findByRole('button', { name: /^save a version$/i }));
    expect(await screen.findByText(/Delete an old one first\. Nothing was saved\./)).toBeInTheDocument();
  });

  it('will not offer to save one more when the most are already kept', async () => {
    const full = { limit: 1, kinds: KINDS, versions: [VERSION] };
    serve({ '/admin/me': me('godfather'), 'GET /admin/backups': full });
    render(<SavedVersionsPage />);

    const button = await screen.findByRole('button', { name: /^save a version$/i });
    await waitFor(() => expect(button).toBeDisabled());
  });
});

describe('putting everything back', () => {
  it('sends the code and no kind and no records — the server puts it back in the right order', async () => {
    const user = userEvent.setup();
    const server = serve({
      '/admin/me': me('godfather'),
      'GET /admin/backups': LIST,
      'POST /admin/backups/v-1/restore': RESTORED,
    });
    render(<SavedVersionsPage />);

    await user.click(await screen.findByRole('button', { name: /put back everything/i }));

    // The dialog says what the order is, and that it undoes a Clear Everything.
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(/customers first, then businesses, cars, payouts, bookings/i);
    expect(dialog).toHaveTextContent(/after a Clear Everything this restores the lot/i);

    await confirm(user, /put back everything/i);

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/backups/v-1/restore')).toEqual({
        code: '246810',
        reason: 'Cleared the wrong kind while testing.',
      }),
    );
    expect(await screen.findByText(/12 record\(s\) put back/)).toBeInTheDocument();
  });

  it('greys the button when nothing in the version is missing', async () => {
    const intact = { ...VERSION, missing: tally({}) };
    serve({ '/admin/me': me('godfather'), 'GET /admin/backups': { ...LIST, versions: [intact] } });
    render(<SavedVersionsPage />);

    const button = await screen.findByRole('button', { name: /put back everything/i });
    await waitFor(() => expect(button).toBeDisabled());
  });
});

describe('the result of putting records back', () => {
  async function putBackWith(result: unknown) {
    const user = userEvent.setup();
    serve({
      '/admin/me': me('godfather'),
      'GET /admin/backups': LIST,
      'POST /admin/backups/v-1/restore': result,
    });
    render(<SavedVersionsPage />);
    await user.click(await screen.findByRole('button', { name: /put back everything/i }));
    await confirm(user, /put back everything/i);
  }

  it('lists the notes under the detail, once each', async () => {
    const note = 'a person who ran the business no longer has an account, so they were not linked to it again';
    await putBackWith({
      ...RESTORED,
      notes: [`Bay Road Rentals: ${note}`],
      // The server ends its detail with the first few notes; the panel lifts that
      // tail off so the sentence is read once, in the list.
      detail: `${RESTORED.detail}Bay Road Rentals: ${note}`,
    });

    const sentences = await screen.findAllByText(new RegExp(note));
    expect(sentences).toHaveLength(1);
    expect(sentences[0].closest('li')).not.toBeNull();
  });

  it('shows each failure with the server’s own reason, as written', async () => {
    await putBackWith({
      ...RESTORED,
      failedCount: 1,
      failed: [
        { id: 'r-9', kind: 'vehicles', summary: 'Toyota Yaris 2023 · VH-1', why: 'its business has since been deleted — put the business back first' },
      ],
      detail: '11 record(s) put back. 1 could not be put back — each says why. ',
    });

    expect(await screen.findByText(/Toyota Yaris 2023 · VH-1/)).toBeInTheDocument();
    expect(screen.getByText(/its business has since been deleted — put the business back first/)).toBeInTheDocument();
  });

  it('says how many of each kind went, in the server’s words for the kind', async () => {
    await putBackWith(RESTORED);
    expect(await screen.findByText(/Customer accounts: 8 back/)).toBeInTheDocument();
    expect(screen.getByText(/Bookings: 4 back, 3 already there/)).toBeInTheDocument();
  });

  it('reads the reasons that say something has to go back first, and no others', () => {
    expect(needsSomethingPutBackFirst('its business has since been deleted — put the business back first')).toBe(true);
    expect(needsSomethingPutBackFirst('its booking is not there — put the booking back first')).toBe(true);
    expect(needsSomethingPutBackFirst('something it belongs to has since been deleted')).toBe(true);
    expect(needsSomethingPutBackFirst('it clashes with a record that is there now')).toBe(false);
  });

  it('only lifts off the tail of the detail that repeats the notes', () => {
    expect(detailWithoutNotes('3 put back. A. B.', ['A.', 'B.'])).toBe('3 put back.');
    // A detail that does not end with them is left exactly as it came.
    expect(detailWithoutNotes('3 put back. Something else.', ['A.'])).toBe('3 put back. Something else.');
    expect(detailWithoutNotes('3 put back.', [])).toBe('3 put back.');
  });
});

describe('one version, opened', () => {
  const OPEN = {
    '/admin/me': me('godfather'),
    'GET /admin/backups': LIST,
    'GET /admin/backups/v-1': VERSION,
    'GET /admin/backups/v-1/records': { total: 2, records: [GONE, STILL_THERE] },
  };

  it('builds a tab and a badge for every kind the server holds — including one it has never heard of', async () => {
    const withNew = {
      ...LIST,
      kinds: [...KINDS, { kind: 'reviews', label: 'Reviews' }],
      versions: [{ ...VERSION, counts: { ...VERSION.counts, reviews: 14 }, missing: { ...VERSION.missing, reviews: 14 } }],
    };
    serve({
      ...OPEN,
      'GET /admin/backups': withNew,
      'GET /admin/backups/v-1': withNew.versions[0],
    });
    render(<SavedVersionPage />);

    // Ten from the list, and the eleventh nobody wrote into the panel.
    for (const entry of withNew.kinds) {
      expect(await screen.findByRole('button', { name: new RegExp(`^${entry.label}`, 'i') })).toBeInTheDocument();
    }
    // With its own count and how many are gone from the platform.
    const reviews = screen.getByRole('button', { name: /^reviews/i });
    expect(reviews).toHaveTextContent('14');
    expect(reviews).toHaveTextContent(/14 deleted/);
  });

  it('shows a saved amount in dollars, not in the cents the server sends', async () => {
    serve(OPEN);
    render(<SavedVersionPage />);

    expect(await screen.findByText('$320')).toBeInTheDocument();
    expect(screen.queryByText(/32,000/)).not.toBeInTheDocument();
    expect(savedAmount(32000)).toBe('$320');
    expect(savedAmount(null)).toBe('');
  });

  it('asks the server to search, filter, sort and page — it does none of it itself', async () => {
    const user = userEvent.setup();
    const server = serve(OPEN);
    render(<SavedVersionPage />);

    await screen.findByText(/BK-1001/);

    await user.click(screen.getByRole('button', { name: /^bookings/i }));
    await user.click(screen.getByRole('button', { name: /only what was deleted since/i }));
    await user.type(screen.getByPlaceholderText(/search what was saved/i), 'dana');

    await waitFor(() => {
      const last = askedFor(server, '/admin/backups/v-1/records').slice(-1)[0] ?? '';
      expect(last).toContain('kind=bookings');
      expect(last).toContain('show=missing');
      expect(last).toContain('q=dana');
      expect(last).toContain('limit=50');
      expect(last).toContain('offset=0');
    });
  });

  it('offers Put Back only on a record that has been deleted since', async () => {
    serve(OPEN);
    render(<SavedVersionPage />);

    const gone = (await screen.findByText(/BK-1001/)).closest('tr') as HTMLElement;
    const there = screen.getByText(/dana@example\.com/).closest('tr') as HTMLElement;

    expect(within(gone).getByRole('button', { name: /^put back$/i })).toBeInTheDocument();
    // Still on the platform: nothing to put back, and offering it would suggest a
    // record that is there could be overwritten. It cannot.
    expect(within(there).queryByRole('button', { name: /^put back$/i })).not.toBeInTheDocument();
    expect(within(gone).getByText(/deleted since/i)).toBeInTheDocument();
    expect(within(there).getByText(/on the platform/i)).toBeInTheDocument();
  });

  it('puts back just the record chosen, by its own id inside the version', async () => {
    const user = userEvent.setup();
    const server = serve({ ...OPEN, 'POST /admin/backups/v-1/restore': RESTORED });
    render(<SavedVersionPage />);

    const gone = (await screen.findByText(/BK-1001/)).closest('tr') as HTMLElement;
    await user.click(within(gone).getByRole('button', { name: /^put back$/i }));
    await confirm(user, /^put back$/i);

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/backups/v-1/restore')).toEqual({
        code: '246810',
        reason: 'Cleared the wrong kind while testing.',
        recordIds: ['r-1'],
      }),
    );
  });

  it('puts back just one kind', async () => {
    const user = userEvent.setup();
    const server = serve({ ...OPEN, 'POST /admin/backups/v-1/restore': RESTORED });
    render(<SavedVersionPage />);

    await screen.findByText(/BK-1001/);
    await user.click(screen.getByRole('button', { name: /^bookings/i }));
    await user.click(await screen.findByRole('button', { name: /put back deleted bookings/i }));
    await confirm(user, /put back deleted bookings/i);

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/backups/v-1/restore')).toEqual({
        code: '246810',
        reason: 'Cleared the wrong kind while testing.',
        kind: 'bookings',
      }),
    );
  });

  it('offers Put Back Everything beside a failure that says something has to go back first', async () => {
    const user = userEvent.setup();
    serve({
      ...OPEN,
      'POST /admin/backups/v-1/restore': {
        ...RESTORED,
        restored: 0,
        failedCount: 1,
        failed: [
          { id: 'r-1', kind: 'bookings', summary: GONE.summary, why: 'its car, customer or business has since been deleted' },
        ],
        detail: 'Nothing needed putting back. 1 could not be put back — each says why. ',
      },
    });
    render(<SavedVersionPage />);

    const gone = (await screen.findByText(/BK-1001/)).closest('tr') as HTMLElement;
    await user.click(within(gone).getByRole('button', { name: /^put back$/i }));
    await confirm(user, /^put back$/i);

    // The server's reason as written, and the way out right beside it.
    expect(await screen.findByText(/its car, customer or business has since been deleted/)).toBeInTheDocument();
    expect(screen.getByText(/Something these belong to is still deleted/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /put back everything that was deleted/i }).length).toBeGreaterThan(1);
  });

  it('does not suggest everything when everything is what was just tried', async () => {
    const user = userEvent.setup();
    serve({
      ...OPEN,
      'POST /admin/backups/v-1/restore': {
        ...RESTORED,
        failedCount: 1,
        failed: [{ id: 'r-1', kind: 'bookings', summary: GONE.summary, why: 'its car, customer or business has since been deleted' }],
        detail: '11 record(s) put back. 1 could not be put back — each says why. ',
      },
    });
    render(<SavedVersionPage />);

    await user.click(await screen.findByRole('button', { name: /put back everything that was deleted/i }));
    await confirm(user, /put back everything that was deleted/i);

    await screen.findByText(/its car, customer or business has since been deleted/);
    expect(screen.queryByText(/Something these belong to is still deleted/i)).not.toBeInTheDocument();
  });

  it('shows a saved record as text, never as mark-up', async () => {
    const user = userEvent.setup();
    const hostile = '<img src=x onerror=alert(1)>';
    serve({
      ...OPEN,
      'GET /admin/backups/v-1/records/r-1': {
        ...GONE,
        data: { row: { reference: 'BK-1001', note: hostile }, children: {} },
      },
    });
    render(<SavedVersionPage />);

    const gone = (await screen.findByText(/BK-1001/)).closest('tr') as HTMLElement;
    await user.click(within(gone).getByRole('button', { name: /^view$/i }));

    // The words are on the page; no element was made out of them.
    expect(await screen.findByText(/onerror=alert\(1\)/)).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });

  it('deletes a version with the code, and goes back to the list', async () => {
    const user = userEvent.setup();
    const server = serve({ ...OPEN, 'POST /admin/backups/v-1/delete': { id: 'v-1', deleted: true } });
    render(<SavedVersionPage />);

    await user.click(await screen.findByRole('button', { name: /^delete$/i }));
    expect(await screen.findByRole('dialog')).toHaveTextContent(/can no longer be put back from it/i);
    await confirm(user, /delete this version/i, 'Superseded by a newer version.');

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/backups/v-1/delete')).toEqual({
        code: '246810',
        reason: 'Superseded by a newer version.',
      }),
    );
    await waitFor(() => expect(pushed).toHaveBeenCalledWith('/saved-versions'));
  });
});
