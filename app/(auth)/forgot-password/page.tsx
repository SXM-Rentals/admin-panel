'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The screen behind the "Forgot password?" link. It says
// how a staff password gets reset, which today is by asking somebody.
//
// WHY THERE IS NO "SEND RESET LINK" BUTTON. The SXM Rentals server has no way
// to reset a staff password by email: staff accounts are created and looked
// after from the server itself. This screen used to take an address, wait half
// a second and announce that a reset link was on its way — and no link was ever
// sent. Somebody locked out would have waited for an email that was never
// coming, and then assumed the email was the problem. Saying who to ask is the
// honest answer, and the quickest one.
//
// A SELF-SERVICE RESET WILL WANT ONE RULE when it is built, kept here so it is
// not lost: it must say the same thing whether the address belongs to a staff
// account or not. A page that answers "no such account" for one address and
// "email sent" for another will tell anybody who asks which addresses are staff
// addresses — and for an internal tool, that is a list worth having if you are
// trying to get in.

import React from 'react';
import Link from 'next/link';
import { Icon, Logo, Text } from '@/components/ui';
import styles from '../auth.module.css';

export default function ForgotPasswordPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.brand}>
        <Logo size={30} priority />
        <Text variant="h2" as="h1">
          Reset Your Password
        </Text>
      </div>

      <div className={styles.card}>
        <div className={styles.form}>
          <Text variant="body" tone="ink2" as="p" raw>
            Staff passwords are not reset by email. Ask whoever looks after the SXM Rentals server
            to reset yours — staff accounts are managed there, not from this panel.
          </Text>

          <div className={styles.demoNote}>
            <Icon name="key-outline" size={15} color="var(--ink3)" />
            <Text variant="small" tone="ink3" as="p" raw>
              Lost your authenticator app instead? That is reset the same way — the code cannot be
              recovered from here either.
            </Text>
          </div>
        </div>

        <div className={styles.formFoot}>
          <Link href="/login" className={styles.link}>
            Back to sign in
          </Link>
        </div>
      </div>

      <div className={styles.footer}>
        <Text variant="small" tone="ink3" as="p" raw>
          SXM Rentals © 2026 — Administration Portal
        </Text>
      </div>
    </div>
  );
}
