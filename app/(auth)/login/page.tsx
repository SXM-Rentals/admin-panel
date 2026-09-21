'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The sign-in screen — the first thing anybody sees. It
// asks for an email address and a password, and then for a six-digit code from
// an authenticator app.
//
// THE SECOND STEP IS NOT OPTIONAL AND NOT A SETTING. A correct password gets you
// as far as this screen's second half and no further: the session it creates is
// allowed to do exactly one thing, which is finish signing in. This panel can
// see every customer record, every booking and every payment on the platform, so
// a password on its own — written down, reused, or phished — is not enough to
// open it.
//
// SOMEBODY SIGNING IN FOR THE FIRST TIME has no authenticator app set up, so
// they are shown a QR code to photograph, with the same secret written out
// underneath for anybody who cannot photograph a screen. It is shown once and
// never again, which is why it says so on screen.
//
// THERE IS NO "CREATE AN ACCOUNT" LINK, on purpose. Staff accounts are made from
// the server by somebody who already has one, not by whoever finds the address.
// A sign-up form on an internal tool is a door with a sign on it.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { useAdminSession } from '@/lib/auth';
import { presentError } from '@/lib/api/errors';
import { Button, Icon, Input, Logo, PasswordInput, Text } from '@/components/ui';
import styles from '../auth.module.css';

// Which half of signing in somebody is currently on.
type Step = 'password' | 'enrol' | 'code';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, enrol, verifyCode, signOut, isSignedIn, loading } = useAdminSession();

  const [step, setStep] = useState<Step>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | undefined>(undefined);

  // The authenticator setup, held only for as long as it is on screen.
  const [secret, setSecret] = useState('');
  const [qrImage, setQrImage] = useState('');

  // Somebody already signed in who lands here — from a bookmark, or by pressing
  // back after signing in — goes straight to the dashboard rather than being
  // asked to sign in a second time.
  useEffect(() => {
    if (!loading && isSignedIn) router.replace('/');
  }, [loading, isSignedIn, router]);

  // ---- STEP ONE: THE PASSWORD ----
  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setProblem(undefined);
    setWorking(true);

    try {
      const next = await signIn(email, password);

      if (next === 'enroll') {
        const { secret: given, otpauthUrl } = await enrol();
        setSecret(given);
        // Drawn here rather than fetched from anywhere: the secret must not
        // leave this page, and handing it to an image service would do exactly
        // that.
        setQrImage(await QRCode.toDataURL(otpauthUrl, { width: 220, margin: 1 }));
        setStep('enrol');
      } else {
        setStep('code');
      }
    } catch (caught) {
      // Wrong password, or too many attempts. The server says which, in words
      // written for the person reading them.
      setProblem(presentError(caught));
    } finally {
      setWorking(false);
    }
  };

  // ---- STEP TWO: THE CODE ----
  const submitCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setProblem(undefined);
    setWorking(true);

    try {
      await verifyCode(code.trim());
      router.replace('/');
    } catch (caught) {
      setProblem(presentError(caught));
      setCode('');
      setWorking(false);
    }
  };

  // Going back throws away the half-finished session rather than leaving one
  // sitting on the server waiting for a code that is never coming.
  const startAgain = async () => {
    setProblem(undefined);
    setCode('');
    setPassword('');
    setSecret('');
    setQrImage('');
    setStep('password');
    await signOut();
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
        {step === 'password' ? (
          /* A real form, so pressing Enter submits it and a password manager
             recognises it for what it is. */
          <form className={styles.form} onSubmit={submitPassword}>
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              iconLeft="person-outline"
              placeholder="you@sxmrentals.app"
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
              error={problem}
              required
            />

            <Button label="Continue" type="submit" fullWidth size="lg" loading={working} />
          </form>
        ) : null}

        {step === 'enrol' ? (
          <div className={styles.form}>
            <Text variant="h3" as="h2">
              Set up your authenticator
            </Text>

            <Text variant="small" tone="ink2" as="p" raw>
              Scan this with an authenticator app — Google Authenticator, 1Password, Authy,
              whichever you already use. You will be asked for a code from it every time you
              sign in.
            </Text>

            {qrImage ? (
              <div className={styles.qr}>
                {/* Drawn from the secret in this page, never fetched. A plain
                    img is right here: next/image would route it through the
                    image service, and this is already a data URL. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImage} alt="QR code for setting up your authenticator app" />
              </div>
            ) : null}

            <div className={styles.secret}>
              <Text variant="caption" tone="ink3" as="p" raw>
                OR TYPE THIS IN BY HAND
              </Text>
              <Text variant="label" as="p" raw>
                {secret}
              </Text>
            </div>

            <div className={styles.demoNote}>
              <Icon name="warning-outline" size={15} color="var(--warning)" />
              <Text variant="small" tone="ink3" as="p" raw>
                This is shown once and cannot be shown again. If you lose it, somebody with
                server access has to reset your account.
              </Text>
            </div>

            <Button
              label="I have added it"
              fullWidth
              size="lg"
              onClick={() => {
                setProblem(undefined);
                setStep('code');
              }}
            />
          </div>
        ) : null}

        {step === 'code' ? (
          <form className={styles.form} onSubmit={submitCode}>
            <Text variant="h3" as="h2">
              Enter your code
            </Text>

            <Text variant="small" tone="ink2" as="p" raw>
              Open your authenticator app and type the six digits it shows for SXM Rentals.
            </Text>

            <Input
              label="Six-digit code"
              // Brings up the number pad rather than a full keyboard, and stops
              // a browser trying to autofill it with something else.
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

            <Button
              label="Sign in"
              type="submit"
              fullWidth
              size="lg"
              loading={working}
              disabled={code.trim().length < 6}
            />

            <Button label="Start again" variant="ghost" size="md" fullWidth onClick={startAgain} />
          </form>
        ) : null}

        {step === 'password' ? (
          <div className={styles.formFoot}>
            <Link href="/forgot-password" className={styles.link}>
              Forgot password?
            </Link>
          </div>
        ) : null}
      </div>

      <div className={styles.footer}>
        <Text variant="small" tone="ink3" as="p" raw>
          SXM Rentals © 2026 — Administration Portal
        </Text>
      </div>
    </div>
  );
}
