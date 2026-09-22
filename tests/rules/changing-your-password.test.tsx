// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks changing your own password, and the rule that
// somebody signed in with a temporary password can do nothing else until they
// have chosen their own.
//
// WHY THE TEMPORARY-PASSWORD RULE IS WORTH A TEST. A temporary password was
// chosen by somebody else, who knows it. Until it is replaced, two people could
// act as one account, and the audit log's "who did this" would stop meaning
// anything. The server refuses everything else in the meantime too — this
// checks the panel does not show a screen full of refusals instead of saying
// what to do.
//
// AND WHY A WRONG PASSWORD HERE MUST NOT LOOK LIKE A LOST SESSION. The panel
// treats "you are not signed in" as a session that has ended, and puts a
// sign-in over the screen. A typo in your current password is not that. The
// server answers it differently on purpose, and this checks the panel keeps the
// two apart.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../render';
import { reply, sentTo, serve } from '../fake-server';
import { useAdminSession } from '@/lib/auth';
import { ChangePasswordForm } from '@/components/admin/ChangePasswordForm';
import { AdminShell } from '@/components/layout/AdminShell';

// The frame reads the address bar and can move around the panel. Here there is
// no address bar, so it is given a stand-in.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const ME = { id: 'st-me', name: 'Carla Ruiz', email: 'carla@sxmrentals.app', avatarInitials: 'CR' };

// Says out loud what the session believes, next to the form.
function PhaseProbe() {
  const { phase } = useAdminSession();
  return <p data-testid="phase">{phase}</p>;
}

async function fillIn(user: ReturnType<typeof userEvent.setup>, current: string, next: string, again = next) {
  await user.click(screen.getByLabelText(/current password|temporary password/i));
  await user.paste(current);
  await user.click(screen.getByLabelText(/^new password(?! again)/i));
  await user.paste(next);
  await user.click(screen.getByLabelText(/new password again/i));
  await user.paste(again);
}

describe('changing your own password', () => {
  it('will not send two different new passwords', async () => {
    const user = userEvent.setup();
    serve({ '/admin/me': ME });
    render(<ChangePasswordForm />);

    await fillIn(user, 'the old passphrase', 'a brand new passphrase', 'a different passphrase');

    expect(screen.getByRole('button', { name: /change password/i })).toBeDisabled();
  });

  it('sends the current and the new password, and nothing else', async () => {
    const user = userEvent.setup();
    const server = serve({ '/admin/me': ME, 'POST /admin/auth/password': reply(204) });
    render(<ChangePasswordForm />);

    await fillIn(user, 'the old passphrase', 'a brand new passphrase');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/auth/password')).toEqual({
        currentPassword: 'the old passphrase',
        newPassword: 'a brand new passphrase',
      }),
    );
  });

  it('says a wrong current password is wrong — and does not treat it as a lost session', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': ME,
      'POST /admin/auth/password': reply(400, {
        error: { code: 'wrong_current_password', message: 'Your current password is not correct.', requestId: 'r1' },
      }),
    });
    render(
      <>
        <PhaseProbe />
        <ChangePasswordForm />
      </>,
    );
    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('signed-in'));

    await fillIn(user, 'not my password', 'a brand new passphrase');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText('Your current password is not correct.')).toBeInTheDocument();
    // Still signed in: no sign-in thrown over the screen for a typo.
    expect(screen.getByTestId('phase')).toHaveTextContent('signed-in');
  });

  it('says plainly when the server has not been updated to allow it yet', async () => {
    const user = userEvent.setup();
    // No POST /admin/auth/password: the stand-in answers "nothing at this
    // address", as a server from before this feature does.
    serve({ '/admin/me': ME });
    render(<ChangePasswordForm />);

    await fillIn(user, 'the old passphrase', 'a brand new passphrase');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/does not offer this yet/i)).toBeInTheDocument();
  });
});

describe('a temporary password must be replaced before anything else', () => {
  it('shows nothing but "set your own password" until it has been', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': { ...ME, mustChangePassword: true },
      'POST /admin/auth/password': reply(204),
    });
    render(
      <AdminShell>
        <p>A screen full of customer records</p>
      </AdminShell>,
    );

    expect(await screen.findByText('Set Your Own Password')).toBeInTheDocument();
    expect(screen.queryByText('A screen full of customer records')).not.toBeInTheDocument();

    await fillIn(user, 'the temporary one', 'a brand new passphrase');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    // Once the server has accepted it, and only then, the panel opens.
    expect(await screen.findByText('A screen full of customer records')).toBeInTheDocument();
    expect(screen.queryByText('Set Your Own Password')).not.toBeInTheDocument();
  });
});
