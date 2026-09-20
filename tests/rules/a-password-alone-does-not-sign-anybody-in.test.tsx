// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks that sending the correct password does not, on its
// own, sign anybody in to the admin panel.
//
// WHY THIS IS THE ONE TO GUARD. This panel can see every customer record, every
// booking and every payment on the platform. The second step is what stands
// between a password that has been reused, written down or phished and all of
// that. It would be very easy for somebody later — reasonably, trying to make
// sign-in less annoying — to treat a successful password as being signed in,
// because for one moment in the sequence the server has already set a cookie and
// the panel already knows who you are.
//
// It has not signed you in. The session that exists at that point is allowed to
// do exactly one thing: finish signing in. This test fails if that distinction
// is ever quietly dropped.

import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminSessionProvider, useAdminSession } from '@/lib/auth';

const STAFF = {
  id: 'st-1',
  name: 'Gio Bertin-Maurice',
  email: 'gio@sxmrentals.com',
  avatarInitials: 'GB',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Answers the way the real server does, one step at a time.
function serverThatWants(next: 'enroll' | 'code') {
  return vi.fn(async (url: RequestInfo | URL) => {
    const path = String(url);

    if (path.endsWith('/admin/me')) {
      return json({ error: { code: 'unauthorized', message: 'Please sign in.' } }, 401);
    }
    if (path.endsWith('/admin/auth/login')) {
      return json({ next, expiresAt: '2026-09-20T12:00:00Z' });
    }
    if (path.endsWith('/admin/auth/mfa/enroll')) {
      return json({ secret: 'ABCD1234', otpauthUrl: 'otpauth://totp/SXM?secret=ABCD1234' });
    }
    if (path.endsWith('/admin/auth/mfa/verify')) {
      return json({ staff: STAFF, expiresAt: '2026-09-20T12:00:00Z' });
    }
    return json({ error: { code: 'route_not_found', message: 'Nothing here.' } }, 404);
  });
}

// A bare screen that says what the panel currently believes, and two buttons to
// walk through signing in one step at a time.
function Probe() {
  const { isSignedIn, phase, staff, signIn, verifyCode } = useAdminSession();

  return (
    <div>
      <p data-testid="state">{isSignedIn ? 'signed in' : 'not signed in'}</p>
      <p data-testid="phase">{phase}</p>
      <p data-testid="who">{staff?.name ?? 'nobody'}</p>
      <button onClick={() => void signIn('gio@sxmrentals.com', 'correct-password')}>
        send password
      </button>
      <button onClick={() => void verifyCode('123456')}>send code</button>
    </div>
  );
}

function mount() {
  return render(
    <AdminSessionProvider>
      <Probe />
    </AdminSessionProvider>,
  );
}

describe('signing in takes two steps', () => {
  beforeEach(() => {
    global.fetch = serverThatWants('code') as unknown as typeof fetch;
  });

  it('does not sign anybody in on the strength of a correct password', async () => {
    const person = userEvent.setup();
    mount();

    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('signed-out'));

    await person.click(screen.getByRole('button', { name: 'send password' }));

    // The server has accepted the password and set a cookie by now. That is
    // still not being signed in.
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('not signed in'));
    expect(screen.getByTestId('who')).toHaveTextContent('nobody');
  });

  it('signs somebody in only once the code has been accepted', async () => {
    const person = userEvent.setup();
    mount();

    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('signed-out'));

    await person.click(screen.getByRole('button', { name: 'send password' }));
    await person.click(screen.getByRole('button', { name: 'send code' }));

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signed in'));
    expect(screen.getByTestId('who')).toHaveTextContent('Gio Bertin-Maurice');
  });
});

describe('when the server cannot be reached, nobody is told to sign in', () => {
  // Asking who is signed in is a read, so it is tried again a few times before
  // giving up — the request that fails is often the one waking the server. Those
  // waits are real seconds, so the clock is wound forward rather than waited
  // out; without this the test alone takes twenty seconds.
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('says so plainly instead of showing the sign-in screen', async () => {
    // Not a refusal — nothing came back at all.
    global.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;

    mount();

    await vi.advanceTimersByTimeAsync(30_000);

    // Sending somebody to sign in here would invite them to type a password at
    // a server that is not going to answer.
    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('unreachable'));
    expect(screen.getByTestId('phase')).not.toHaveTextContent('signed-out');
  });
});
