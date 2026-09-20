'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The two things the panel shows when the problem is the
// server rather than anything on the screen — "it is starting up" and "we cannot
// reach it at all".
//
// WHY THESE ARE WORTH BUILDING RATHER THAN SHOWING A SPINNER. The SXM Rentals
// server sleeps when nobody has used the panel for about a quarter of an hour,
// and waking it takes the better part of a minute. That is a deliberate trade —
// it is what keeps the server free to run — but it means the first person in on
// a Monday morning waits the longest.
//
// Without these, that wait looks exactly like a broken panel: a loading skeleton
// that never fills in, with nothing to say whether to keep waiting or go and
// find somebody. One sentence naming what is happening turns a fault into a
// short wait, and it costs nothing.
//
// The two states are kept apart on purpose. "Starting up" means wait. "Cannot
// reach" means something is actually wrong. Showing the first when we mean the
// second leaves somebody waiting for a server that is never going to answer.

import React, { useEffect, useState } from 'react';
import { subscribeToWaking } from '@/lib/api/http';
import { Button, Logo, Text } from '@/components/ui';
import styles from './shell.module.css';

// Whether the server is currently being woken up. Any screen can ask, so the
// sign-in page can say so too — for most staff the first slow request of the day
// is the sign-in itself, long before the panel is on screen.
export function useServerWaking(): boolean {
  const [waking, setWaking] = useState(false);
  useEffect(() => subscribeToWaking(setWaking), []);
  return waking;
}

export function ServerWaking() {
  return (
    <div className={styles.serverState}>
      <Logo size={26} />
      <Text variant="h2" as="h1">
        Waking the server
      </Text>
      <Text variant="body" tone="ink2" as="p" raw style={{ maxWidth: 420 }}>
        SXM Rentals puts the server to sleep when the panel has not been used for a while, which
        keeps it free to run. Starting it again takes up to a minute. Nothing is wrong.
      </Text>
    </div>
  );
}

export function ServerUnreachable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.serverState}>
      <Logo size={26} />
      <Text variant="h2" as="h1">
        We cannot reach SXM Rentals
      </Text>
      <Text variant="body" tone="ink2" as="p" raw style={{ maxWidth: 420 }}>
        The panel could not reach the server at all. That is usually this computer&rsquo;s
        connection rather than the server itself — but until it answers, there is nothing here
        to show.
      </Text>
      {/* Deliberately NOT the sign-in screen. Sending somebody there would
          invite them to type a password into a panel that cannot check it. */}
      <Button label="Try again" variant="secondary" size="md" onClick={onRetry} />
    </div>
  );
}
