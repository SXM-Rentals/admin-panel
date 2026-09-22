'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The only thing somebody sees after signing in with a
// temporary password: a request to choose their own, before anything else.
//
// WHY NOTHING ELSE IS AVAILABLE UNTIL THEY DO. A temporary password was chosen
// by somebody else — whoever added them, or reset their sign-in — and that
// person knows it. If it stayed the working password, two people could act as
// one account, and every entry in the audit log saying "done by Carla" would
// really mean "done by Carla, or by whoever set her up". The whole panel rests
// on that log meaning what it says. So until the account has a password only its
// owner knows, it can do nothing but set one; the server refuses everything else
// too, so this is not a screen that can be walked round.
//
// It replaces the panel rather than sitting over it, unlike the "your session
// ended" sign-in: somebody who has just signed in has no work in progress to
// keep, and loading screens behind it would only fill them with refusals.

import React from 'react';
import { useAdminSession } from '@/lib/auth';
import { ChangePasswordForm } from '@/components/admin/ChangePasswordForm';
import { Button, Logo, Text } from '@/components/ui';
import styles from './shell.module.css';

export function SetOwnPassword() {
  const { staff, signOut } = useAdminSession();

  return (
    <div className={styles.serverState}>
      <div className={styles.lockCard}>
        <Logo size={24} />

        <Text variant="h3" as="h1">
          Set your own password
        </Text>

        <Text variant="small" tone="ink2" as="p" raw>
          {staff ? `Welcome, ${staff.name.split(' ')[0]}. ` : ''}You signed in with a temporary
          password somebody else chose. Choose your own before you carry on — the temporary one
          stops working as soon as you do.
        </Text>

        <ChangePasswordForm currentLabel="Temporary password" />

        <Button label="Sign out instead" variant="ghost" size="md" fullWidth onClick={signOut} />
      </div>
    </div>
  );
}

export default SetOwnPassword;
