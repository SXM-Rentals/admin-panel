'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The sign-in that appears over the top of the panel when a
// session ends while somebody is still working.
//
// WHY IT APPEARS OVER THE PANEL INSTEAD OF REPLACING IT. Sessions end after half
// an hour of sitting still, and eight hours at the outside, so this happens
// often enough to design for rather than often enough to ignore. The obvious
// answer — send them back to the sign-in screen — throws away whatever screen
// they were on and everything they had typed into it.
//
// That is not a small loss here. Every change in this panel goes through a
// dialog that will not submit without a written reason of at least fifteen
// characters, so what gets thrown away is a considered sentence about somebody's
// money, written by somebody who now has to remember what they wrote. So the
// panel underneath stays exactly where it is, still holding everything, and this
// appears in front of it. Signing in again puts them back at the button they
// were about to press.
//
// IT CANNOT BE DISMISSED, and there is no cancel. Behind it is a screen full of
// customer records loaded under a session that has ended; closing it would leave
// somebody reading records they are no longer signed in to see, and every button
// on that screen would fail. Signing in again, or signing out, are the only two
// honest ways out.
//
// NOTHING IS RETRIED AUTOMATICALLY once the session is back. The change that
// failed is not resent on their behalf: resending "claim $240 against this
// deposit" without being asked is how a deposit gets claimed twice. The dialog
// they were in is still open, with their reason still in it, and they press the
// button themselves.

import React, { useState } from 'react';
import { useAdminSession } from '@/lib/auth';
import { presentError } from '@/lib/api/errors';
import { Button, Input, Logo, PasswordInput, Text } from '@/components/ui';
import styles from './shell.module.css';

export function SessionExpired() {
  const { staff, signIn, verifyCode, signOut } = useAdminSession();

  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | undefined>(undefined);

  const email = staff?.email ?? '';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProblem(undefined);
    setWorking(true);

    try {
      if (!needsCode) {
        await signIn(email, password);
        // Their authenticator is already set up — this is somebody who was
        // signed in a moment ago — so it is always the code from here.
        setNeedsCode(true);
      } else {
        await verifyCode(code.trim());
        // Nothing more to do. The session goes back to signed-in and this
        // disappears, leaving the panel exactly as it was.
      }
    } catch (caught) {
      setProblem(presentError(caught));
      setCode('');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className={styles.lockOverlay} role="dialog" aria-modal="true" aria-label="Session ended">
      <div className={styles.lockCard}>
        <Logo size={24} />

        <Text variant="h3" as="h2">
          Your session ended
        </Text>

        <Text variant="small" tone="ink2" as="p" raw>
          {staff
            ? `Sign in again to carry on, ${staff.name.split(' ')[0]}. Nothing you were working on has been lost — it is still behind this.`
            : 'Sign in again to carry on. Nothing you were working on has been lost.'}
        </Text>

        <form className={styles.lockForm} onSubmit={submit}>
          {/* Shown but not editable. This is the same person coming back, not a
              chance to sign in as somebody else — that is what signing out is
              for, and it is the button underneath. */}
          <Input label="Email" type="email" value={email} readOnly disabled />

          {!needsCode ? (
            <PasswordInput
              label="Password"
              autoComplete="current-password"
              iconLeft="lock-closed-outline"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={problem}
              required
              autoFocus
            />
          ) : (
            <Input
              label="Six-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              iconLeft="key-outline"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              error={problem}
              required
              autoFocus
            />
          )}

          <Button
            label={needsCode ? 'Sign in' : 'Continue'}
            type="submit"
            fullWidth
            size="lg"
            loading={working}
            disabled={needsCode ? code.trim().length < 6 : password.length === 0}
          />
        </form>

        {/* The other honest way out: give up on what was open and start clean. */}
        <Button label="Sign out instead" variant="ghost" size="md" fullWidth onClick={signOut} />
      </div>
    </div>
  );
}

export default SessionExpired;
