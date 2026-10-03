// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks the four levels of staff account — Godfather,
// Owner, Administrator, Viewer — do what they say in the panel: that an account
// which may not do a thing is told so instead of being offered it, and that the
// rules which stop a hierarchy becoming a ladder hold.
//
// WHY THESE ARE WORTH TESTING WHEN THE SERVER ENFORCES THEM ANYWAY. Nothing here
// keeps anybody out — the server refuses every change from a viewer by the method
// of the request, whatever the panel does. What the panel owes somebody is the
// truth in advance: that this is not theirs to do, and which rule says so. Get
// that wrong in the safe direction and a viewer types a reason and an
// authenticator code into a dialog that was always going to be refused. Get it
// wrong in the other direction and somebody is told they cannot do something they
// can.
//
// THE DIFFERENCE BETWEEN THE REASONS IS THE POINT. "This needs Owner access",
// "Carla is Owner, the same as you", "you cannot change your own level" and
// "Godfather cannot be granted here at all" are four different facts. A greyed
// item with no words, or with the wrong words, is how somebody ends up arguing
// with a screen.
//
// AND A SERVER FROM BEFORE TIERS SAYS NOTHING about what anybody is. There, every
// account could do everything, so the panel greys out nothing — guessing the other
// way would hide controls that work.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../render';
import { reply, sentTo, serve } from '../fake-server';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import StaffPage from '@/app/(panel)/staff/page';
import { EditableRow } from '@/components/admin/EditableRow';
import type { AdminTier, StaffAccount } from '@/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/staff',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

function account(overrides: Partial<StaffAccount> & { id: string; name: string }): StaffAccount {
  return {
    email: `${overrides.name.split(' ')[0].toLowerCase()}@sxmrentals.app`,
    avatarInitials: 'XX',
    mfaEnrolled: true,
    mustChangePassword: false,
    lastSignInAt: '2026-10-01T12:00:00.000Z',
    createdAt: '2026-09-01T12:00:00.000Z',
    disabledAt: null,
    tier: 'administrator',
    ...overrides,
  };
}

// Whoever is signed in, as GET /admin/me answers.
const me = (tier: AdminTier) => ({
  id: 'st-me',
  name: 'Gio Bertin-Maurice',
  email: 'gio@sxmrentals.app',
  avatarInitials: 'GB',
  tier,
});

const CARLA = account({ id: 'st-carla', name: 'Carla Ruiz', tier: 'administrator' });

// Opens the Manage menu on somebody's row, once the list has arrived. The name
// is matched exactly: half these people share the start of their email address
// with their name, and "carla" finds both cells.
async function openManage(user: ReturnType<typeof userEvent.setup>, name: string) {
  const cell = await screen.findByText(name);
  const row = cell.closest('tr');
  if (!row) throw new Error(`no row for ${name}`);
  await user.click(within(row as HTMLElement).getByRole('button', { name: /manage/i }));
}

describe('an account that may only look', () => {
  it('is told so in the dialog, wherever it was opened from, and cannot confirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    serve({ '/admin/me': me('viewer') });
    render(
      <ReasonDialog
        open
        onClose={() => {}}
        title="Keep part of this deposit"
        confirmLabel="Keep it"
        change={{ subjectLabel: 'BK-1', field: 'Deposit', before: '$500 held', after: '$240 kept' }}
        onConfirm={onConfirm}
      />,
    );

    // Said in the dialog, not left to a refusal from the server afterwards.
    expect(
      await screen.findByText(/Your account can see the panel but not change anything/i),
    ).toBeInTheDocument();

    await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));
    await user.click(screen.getByLabelText(/reason/i));
    await user.paste('A perfectly good reason, long enough to pass.');

    const confirm = screen.getByRole('button', { name: /keep it/i });
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('gets a greyed pencil that says why, not a record with no pencil at all', async () => {
    const onSave = vi.fn();
    serve({ '/admin/me': me('viewer') });
    render(
      <EditableRow label="Contact email" value="hello@bayroad.sx" subjectLabel="Bay Road Rentals" onSave={onSave} />,
    );

    // The value is readable, as everything is for a viewer.
    expect(screen.getByText('hello@bayroad.sx')).toBeInTheDocument();

    const pencil = await waitFor(() => {
      const button = screen.getByRole('button', { name: /edit contact email/i });
      expect(button).toBeDisabled();
      return button;
    });
    // Greyed is not an explanation on its own, so it carries one.
    expect(pencil).toHaveAttribute('title', expect.stringMatching(/can see the panel but not change anything/i));
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('looking after who can get in needs Owner access', () => {
  it('tells an Administrator so, and offers them nothing that would fail', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': me('administrator'),
      'GET /admin/staff': [account({ ...me('administrator') }), CARLA],
    });
    render(<StaffPage />);

    await screen.findByText(/Carla Ruiz/);
    expect(screen.getByText(/needs Owner access or higher/i)).toHaveTextContent(
      /Your account is Administrator/i,
    );
    // No add form at all, rather than one that fails on submit.
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();

    // And every item on the row says the same thing rather than disappearing.
    await openManage(user, 'Carla Ruiz');
    for (const name of [/reset sign-in/i, /remove access/i, /make viewer/i]) {
      const item = screen.getByRole('menuitem', { name });
      expect(item).toHaveAttribute('aria-disabled', 'true');
      expect(item).toHaveTextContent(/needs Owner access or higher/i);
    }
  });

  it('lets an Owner do all of it', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': me('owner'),
      'GET /admin/staff': [account({ ...me('owner') }), CARLA],
    });
    render(<StaffPage />);
    await openManage(user, 'Carla Ruiz');

    for (const name of [/reset sign-in/i, /remove access/i, /make viewer/i]) {
      expect(screen.getByRole('menuitem', { name })).not.toHaveAttribute('aria-disabled');
    }
  });
});

describe('the rules that keep this a hierarchy rather than a ladder', () => {
  it('will not let anybody reach sideways or upwards', async () => {
    const user = userEvent.setup();
    const marcel = account({ id: 'st-marcel', name: 'Marcel Peters', tier: 'owner' });
    serve({
      '/admin/me': me('owner'),
      'GET /admin/staff': [account({ ...me('owner') }), marcel, CARLA],
    });
    render(<StaffPage />);
    await openManage(user, 'Marcel Peters');

    // SIDEWAYS: another Owner is not an Owner's to touch.
    expect(screen.getByRole('menuitem', { name: /remove access/i })).toHaveTextContent(
      /Marcel Peters is Owner, the same as you or above/i,
    );
    // And "make them what they already are" is not an action, so it is not
    // offered on his row at all.
    expect(screen.queryByRole('menuitem', { name: /make owner/i })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');

    // UPWARDS: nor may an Owner make somebody else an Owner — which is only
    // sayable on a row where that level is on offer in the first place.
    await openManage(user, 'Carla Ruiz');
    expect(screen.getByRole('menuitem', { name: /make owner/i })).toHaveTextContent(
      /that is your own level or above/i,
    );
  });

  it('never offers the Godfather account to anybody else, or Godfather as a level', async () => {
    const user = userEvent.setup();
    const boss = account({ id: 'st-boss', name: 'The Boss', tier: 'godfather' });
    serve({
      '/admin/me': me('owner'),
      'GET /admin/staff': [account({ ...me('owner') }), boss],
    });
    render(<StaffPage />);
    await openManage(user, 'The Boss');

    expect(screen.getByRole('menuitem', { name: /remove access/i })).toHaveTextContent(
      /The Godfather account cannot be changed by anybody else/i,
    );
    // It is not a level anybody can hand out, so it is not in the menu at all.
    expect(screen.queryByRole('menuitem', { name: /make godfather/i })).not.toBeInTheDocument();
  });
});

describe('changing what somebody may do', () => {
  it('sends the level, the reason and your code — and says what is being taken away', async () => {
    const user = userEvent.setup();
    const server = serve({
      '/admin/me': me('owner'),
      'GET /admin/staff': [account({ ...me('owner') }), CARLA],
      'POST /admin/staff/st-carla/tier': { ...CARLA, tier: 'viewer' },
    });
    render(<StaffPage />);
    await openManage(user, 'Carla Ruiz');
    await user.click(screen.getByRole('menuitem', { name: /make viewer/i }));

    // The dialog says what read-only means before it is confirmed.
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(/change nothing/i);

    await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));
    await user.click(screen.getByLabelText(/reason/i));
    await user.paste('Carla moves to reporting on 1 November.');
    await user.type(screen.getByLabelText(/authenticator code/i), '135791');
    await user.click(within(dialog).getByRole('button', { name: /make viewer/i }));

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/staff/st-carla/tier')).toEqual({
        tier: 'viewer',
        reason: 'Carla moves to reporting on 1 November.',
        code: '135791',
      }),
    );
  });

  it('shows the server’s own refusal when it disagrees', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': me('owner'),
      'GET /admin/staff': [account({ ...me('owner') }), CARLA],
      'POST /admin/staff/st-carla/tier': reply(409, {
        error: { code: 'already_that_tier', message: 'Carla Ruiz is already Viewer.', requestId: 'r1' },
      }),
    });
    render(<StaffPage />);
    await openManage(user, 'Carla Ruiz');
    await user.click(screen.getByRole('menuitem', { name: /make viewer/i }));

    await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));
    await user.click(screen.getByLabelText(/reason/i));
    await user.paste('Carla moves to reporting on 1 November.');
    await user.type(screen.getByLabelText(/authenticator code/i), '135791');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /make viewer/i }));

    expect(await screen.findByText(/Carla Ruiz is already Viewer\./)).toBeInTheDocument();
  });

  it('sends the level a new account starts on', async () => {
    const user = userEvent.setup();
    const server = serve({
      '/admin/me': me('owner'),
      'GET /admin/staff': [account({ ...me('owner') })],
      'POST /admin/staff': reply(201, account({ id: 'st-new', name: 'Dana Illidge', tier: 'viewer' })),
    });
    render(<StaffPage />);

    await user.type(await screen.findByLabelText(/full name/i), 'Dana Illidge');
    await user.type(screen.getByLabelText(/^email/i), 'dana@sxmrentals.app');
    const suggested = (screen.getByLabelText(/temporary password/i) as HTMLInputElement).value;
    // An Owner may hand out Administrator and Viewer, and not another Owner.
    expect(screen.queryByRole('tab', { name: /^owner$/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /viewer/i }));

    await user.click(screen.getByRole('button', { name: /^add staff member$/i }));
    await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));
    await user.click(screen.getByLabelText(/reason/i));
    await user.paste('Dana reports on the numbers and changes nothing.');
    await user.type(screen.getByLabelText(/authenticator code/i), '246810');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /add staff member/i }));

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/staff')).toEqual({
        name: 'Dana Illidge',
        email: 'dana@sxmrentals.app',
        password: suggested,
        tier: 'viewer',
        reason: 'Dana reports on the numbers and changes nothing.',
        code: '246810',
      }),
    );
  });
});

describe('a server from before tiers', () => {
  it('greys out nothing, because there every account could do everything', async () => {
    const user = userEvent.setup();
    // No tier on "who am I", and none on the accounts either.
    const { tier: _mine, ...meWithout } = me('owner');
    const { tier: _theirs, ...carlaWithout } = CARLA;
    serve({
      '/admin/me': meWithout,
      'GET /admin/staff': [
        { ...account({ id: 'st-me', name: 'Gio Bertin-Maurice' }), tier: undefined },
        carlaWithout,
      ],
    });
    render(<StaffPage />);
    await openManage(user, 'Carla Ruiz');

    expect(screen.getByRole('menuitem', { name: /reset sign-in/i })).not.toHaveAttribute('aria-disabled');
    expect(screen.getByRole('menuitem', { name: /remove access/i })).not.toHaveAttribute('aria-disabled');
  });
});
