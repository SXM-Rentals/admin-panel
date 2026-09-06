'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The sign-in screen — the first thing anybody sees. The
// SXM Rentals logo, the words "Administration Portal", an email box, a password
// box, and a button.
//
// THIS IS A PRETEND SIGN-IN. No password is checked and any email works. Real
// sign-in is a backend job — and for a tool that can see every customer record
// on the platform it needs to be a serious one, with server-side sessions and
// almost certainly a second factor. The note on the screen says so out loud, so
// nobody looks at a working-looking sign-in page and assumes that part is done.
//
// THERE IS NO "CREATE AN ACCOUNT" LINK, on purpose. Staff accounts are made by
// somebody who already has one, not by whoever finds the address. A sign-up form
// on an internal tool is a door with a sign on it.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminSession } from '@/lib/auth';
import { Button, Icon, Input, Logo, PasswordInput, Text } from '@/components/ui';
import styles from '../auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isSignedIn, loading } = useAdminSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);

  // Somebody already signed in who lands here — from a bookmark, or by pressing
  // back after signing in — goes straight to the dashboard rather than being
  // asked to sign in a second time.
  useEffect(() => {
    if (!loading && isSignedIn) router.replace('/');
  }, [loading, isSignedIn, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setWorking(true);
    await signIn(email);
    router.replace('/');
  };

  return (
    <div className={styles.shell}>
      <div className={styles.brand}>
        <Logo size={30} priority />
        <Text variant="h2" as="h1">
          Administration Portal
        </Text>
      </div>

      <div className={styles.card}>
        {/* A real form, so pressing Enter submits it and a password manager
            recognises it for what it is. */}
        <form className={styles.form} onSubmit={submit}>
          <Input
            label="Email"
            type="email"
            autoComplete="username"
            iconLeft="person-outline"
            placeholder="you@sxmrentals.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <PasswordInput
            label="Password"
            autoComplete="current-password"
            iconLeft="lock-closed-outline"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <Button label="Login" type="submit" fullWidth size="lg" loading={working} />
        </form>

        <div className={styles.formFoot}>
          <Link href="/forgot-password" className={styles.link}>
            Forgot password?
          </Link>
        </div>

        <div className={styles.demoNote}>
          <Icon name="information-circle-outline" size={15} color="var(--ink3)" />
          <Text variant="small" tone="ink3" as="p" raw>
            Sign-in is not connected yet — any email and password will get you in. Real
            authentication is a backend job and is still to be built.
          </Text>
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
