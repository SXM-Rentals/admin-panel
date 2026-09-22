'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Changing your own password — the current one, a new one,
// and the new one again. Used on the Your Account screen, and on the screen
// somebody sees when they first sign in with a temporary password.
//
// IT ASKS FOR THE CURRENT PASSWORD EVERY TIME, even though you are already
// signed in. A session left open on a shared desk should not be enough for
// somebody else to take the account over by giving it a password only they
// know.
//
// WHEN IT WORKS, EVERY OTHER SIGN-IN OF YOURS ENDS. The server signs the account
// out everywhere else and this session carries on — so if the reason for the
// change is a password somebody else might know, they are out.
//
// WHY THIS DOES NOT GO THROUGH THE REASON DIALOG. Every change to a record in
// this panel asks for a reason, because somebody reading the log later needs
// to know why. Changing your own password is not that kind of change: there is
// nothing useful to ask. The server still writes it into the audit log — that
// you changed it, and when — and never the password itself.

import React, { useState } from 'react';
import { useAdminSession } from '@/lib/auth';
import { presentError } from '@/lib/api/errors';
import { passwordProblem } from '@/lib/passwords';
import { Button, PasswordInput, Text, useToast } from '@/components/ui';
import styles from './admin.module.css';

export function ChangePasswordForm({
  currentLabel = 'Current password',
  onDone,
}: {
  // "Temporary password" when this is somebody's first sign-in.
  currentLabel?: string;
  onDone?: () => void;
}) {
  const { changePassword } = useAdminSession();
  const { showToast } = useToast();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [touched, setTouched] = useState(false);
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | undefined>(undefined);

  const nextProblem =
    passwordProblem(next) ??
    (next === current && next !== '' ? 'Choose a password you have not been using.' : undefined);
  const againProblem = again !== next ? 'The two new passwords are not the same.' : undefined;
  const blocked = current === '' || nextProblem !== undefined || againProblem !== undefined;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (blocked) return;

    setWorking(true);
    setProblem(undefined);
    try {
      await changePassword(current, next);
    } catch (caught) {
      // A wrong current password, a password found in a data breach, or a
      // server that does not offer this yet — each said in its own words.
      setProblem(presentError(caught));
      setWorking(false);
      return;
    }

    setWorking(false);
    setCurrent('');
    setNext('');
    setAgain('');
    setTouched(false);
    showToast('Password changed. You have been signed out everywhere else.');
    onDone?.();
  };

  return (
    // A real form, so a password manager recognises it and offers to save the
    // new password.
    <form className={styles.passwordForm} onSubmit={submit}>
      <PasswordInput
        label={currentLabel}
        autoComplete="current-password"
        iconLeft="lock-closed-outline"
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
        required
      />
      <PasswordInput
        label="New password"
        autoComplete="new-password"
        iconLeft="key-outline"
        value={next}
        onChange={(event) => setNext(event.target.value)}
        onBlur={() => setTouched(true)}
        error={touched && next !== '' ? nextProblem : undefined}
        hint="At least 12 characters. A short sentence is stronger than a jumble, and easier to remember."
        required
      />
      <PasswordInput
        label="New password again"
        autoComplete="new-password"
        iconLeft="key-outline"
        value={again}
        onChange={(event) => setAgain(event.target.value)}
        onBlur={() => setTouched(true)}
        error={touched && again !== '' ? againProblem : undefined}
        required
      />

      {problem ? (
        <div className={styles.dialogProblem} role="alert">
          <Text variant="small" as="p" raw>
            {problem}
          </Text>
        </div>
      ) : null}

      <div>
        <Button label="Change Password" type="submit" size="md" loading={working} disabled={blocked} />
      </div>
    </form>
  );
}

export default ChangePasswordForm;
