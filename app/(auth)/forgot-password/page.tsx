'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The screen behind the "Forgot password?" link.
//
// IT ALWAYS SAYS THE SAME THING, whether the address it was given belongs to a
// staff account or not. That is deliberate and it is worth not "fixing" later: a
// page that says "no such account" for one address and "email sent" for another
// will happily tell anybody who asks which addresses are staff addresses. For an
// internal tool that is a list worth having if you are trying to get in.

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Icon, Input, Logo, Text } from '@/components/ui';
import styles from '../auth.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [working, setWorking] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setWorking(true);
    // MOCK. TODO: replace with POST /admin/auth/forgot-password.
    await new Promise((resolve) => setTimeout(resolve, 500));
    setWorking(false);
    setSent(true);
  };

  return (
    <div className={styles.shell}>
      <div className={styles.brand}>
        <Logo size={30} priority />
        <Text variant="h2" as="h1">
          Reset Your Password
        </Text>
      </div>

      <div className={styles.card}>
        {sent ? (
          <>
            <div className={styles.demoNote}>
              <Icon name="mail-open-outline" size={16} color="var(--ink3)" />
              <Text variant="small" tone="ink2" as="p" raw>
                If {email || 'that address'} belongs to a staff account, a reset link is on its
                way. It expires in an hour.
              </Text>
            </div>
            <Button label="Back to Sign In" href="/login" variant="secondary" fullWidth size="md" />
          </>
        ) : (
          <>
            <Text variant="body" tone="ink2" as="p" raw>
              Enter the address you sign in with and we will send you a link to set a new
              password.
            </Text>

            <form className={styles.form} onSubmit={submit}>
              <Input
                label="Email"
                type="email"
                autoComplete="username"
                iconLeft="mail-outline"
                placeholder="you@sxmrentals.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <Button label="Send Reset Link" type="submit" fullWidth size="lg" loading={working} />
            </form>

            <div className={styles.formFoot}>
              <Link href="/login" className={styles.link}>
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>

      <div className={styles.footer}>
        <Text variant="small" tone="ink3" as="p" raw>
          SXM Rentals © 2026 — Administration Portal
        </Text>
      </div>
    </div>
  );
}
