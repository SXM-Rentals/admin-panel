// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks the rules around deciding who can sign in to the
// panel — adding a member of staff, resetting one, removing one.
//
// WHY THESE ARE GUARDED SO CAREFULLY. Every other change in the panel alters a
// record. These alter who can get in at all, and the panel has one flat access
// level: whoever is added can see and do everything. So each one needs your
// authenticator code as well as a reason — a session left open on a desk is not
// enough — and a new person's temporary password is shown exactly once, for
// passing on, because whoever set it knows it.
//
// And nobody can reset or remove themselves here, so the panel can never lock
// out the last person able to put things right.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../render';
import { reply, sentTo, serve } from '../fake-server';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import StaffPage from '@/app/(panel)/staff/page';
import type { StaffAccount } from '@/types';

const ME = { id: 'st-me', name: 'Gio Bertin-Maurice', email: 'gio@sxmrentals.app', avatarInitials: 'GB' };

function account(overrides: Partial<StaffAccount>): StaffAccount {
  return {
    id: 'st-x',
    name: 'Somebody',
    email: 'somebody@sxmrentals.app',
    avatarInitials: 'SO',
    mfaEnrolled: true,
    mustChangePassword: false,
    lastSignInAt: '2026-09-20T12:00:00.000Z',
    createdAt: '2026-09-01T12:00:00.000Z',
    disabledAt: null,
    ...overrides,
  };
}

describe('a change to who can get in needs your authenticator code', () => {
  it('will not go through with a reason but no code', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ReasonDialog
        open
        onClose={() => {}}
        title="Add a member of staff"
        confirmLabel="Add staff member"
        confirmWithCode
        change={{ subjectLabel: 'Carla Ruiz', field: 'Staff account', before: 'Did not exist', after: 'Can sign in' }}
        onConfirm={onConfirm}
      />,
    );
    await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));

    await user.click(screen.getByLabelText(/reason/i));
    await user.paste('Carla joins the support team on Monday.');
    const confirm = screen.getByRole('button', { name: /add staff member/i });
    expect(confirm).toBeDisabled();

    // Five digits is not a code.
    await user.type(screen.getByLabelText(/authenticator code/i), '12345');
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText(/authenticator code/i), '6');
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(onConfirm.mock.calls[0]).toEqual(['Carla joins the support team on Monday.', { code: '123456' }]);
  });
});

describe('the Staff screen', () => {
  it('sends a new member of staff with the reason and your code, then shows the password once', async () => {
    const user = userEvent.setup();
    const created = account({ id: 'st-carla', name: 'Carla Ruiz', email: 'carla@sxmrentals.app', mustChangePassword: true, mfaEnrolled: false, lastSignInAt: null });
    const server = serve({
      '/admin/me': ME,
      'GET /admin/staff': [account({ ...ME })],
      'POST /admin/staff': reply(201, created),
    });
    render(<StaffPage />);

    await user.type(await screen.findByLabelText(/full name/i), 'Carla Ruiz');
    await user.type(screen.getByLabelText(/^email/i), 'Carla@SXMRentals.app');
    // A strong temporary password is suggested before anybody types one.
    const suggested = (screen.getByLabelText(/temporary password/i) as HTMLInputElement).value;
    expect(suggested).toMatch(/^[A-Za-z0-9]{4}(-[A-Za-z0-9]{4}){3}$/);

    await user.click(screen.getByRole('button', { name: /^add staff member$/i }));
    await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));
    await user.click(screen.getByLabelText(/reason/i));
    await user.paste('Carla joins the support team on Monday.');
    await user.type(screen.getByLabelText(/authenticator code/i), '246810');
    // The one in the dialog, not the one on the page behind it.
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /add staff member/i }));

    // The email goes in lower case, and the code and the reason go with it.
    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/staff')).toEqual({
        name: 'Carla Ruiz',
        email: 'carla@sxmrentals.app',
        password: suggested,
        // Administrator unless somebody picks otherwise: the everyday job, and
        // never staff accounts. See what-each-kind-of-account-may-do.
        tier: 'administrator',
        reason: 'Carla joins the support team on Monday.',
        code: '246810',
      }),
    );

    // Shown once, for passing on.
    expect(await screen.findByText(suggested)).toBeInTheDocument();
    expect(screen.getByText(/Pass These On To Carla/i)).toBeInTheDocument();

    // And gone for good once dismissed.
    await user.click(screen.getByRole('button', { name: /hide the password/i }));
    expect(screen.queryByText(suggested)).not.toBeInTheDocument();
  });

  it('never offers to reset or remove your own account', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': ME,
      'GET /admin/staff': [account({ ...ME }), account({ id: 'st-carla', name: 'Carla Ruiz', email: 'carla@sxmrentals.app' })],
    });
    render(<StaffPage />);

    await screen.findByText('Carla Ruiz');
    // One Manage menu — Carla's — and none on your own row, which offers your
    // own account screen instead. Waited for, because here (unlike in the panel)
    // the list can arrive before the answer to "who am I".
    await waitFor(() => expect(screen.getAllByRole('button', { name: /manage/i })).toHaveLength(1));
    expect(screen.getByText(/Your account/)).toBeInTheDocument();

    // And what is inside it is about Carla, not about you.
    await user.click(screen.getByRole('button', { name: /manage/i }));
    expect(screen.getByRole('menuitem', { name: /reset sign-in/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /remove access/i })).toBeInTheDocument();
  });

  it('says so, and offers nothing that would fail, when the server has not been updated yet', async () => {
    // A server from before staff accounts: names and emails and nothing else.
    serve({ '/admin/me': ME, 'GET /admin/staff': [{ ...ME }] });
    render(<StaffPage />);

    expect(await screen.findByText(/has not been updated for staff accounts yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add staff member/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset sign-in/i })).not.toBeInTheDocument();
  });
});
