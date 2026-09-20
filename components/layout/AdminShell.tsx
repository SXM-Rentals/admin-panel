'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The frame every screen in the panel sits inside — sidebar
// on the left, bar across the top, content in the middle. It also does two jobs
// that belong here rather than on any individual screen:
//
//   1. TURNS ANYBODY NOT SIGNED IN AWAY. Every screen in this panel shows real
//      customer records, so none of them draws until there is a session.
//
//   2. LOADS THE THINGS THE FRAME NEEDS. The count of work waiting, for the
//      sidebar badge and the bell, and the lists the top-bar search looks
//      through. Loading them once here rather than on each screen means the
//      badge does not flicker as somebody moves between screens.
//
// DESKTOP ONLY. On anything narrower than a laptop the whole panel is replaced
// with one line saying so, rather than being squeezed into a shape nobody
// designed. The admin doc is explicit that there is no mobile requirement, and a
// half-working phone layout would be a worse answer than an honest one.

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminSession } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import { AppErrorBoundary, Logo, Text } from '@/components/ui';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar, type SearchIndex } from './AdminTopBar';
import { ServerUnreachable, ServerWaking, useServerWaking } from './ServerState';
import { SessionExpired } from './SessionExpired';
import styles from './shell.module.css';

const EMPTY_INDEX: SearchIndex = { users: [], providers: [], vehicles: [], bookings: [] };

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isSignedIn, loading, phase, recheck } = useAdminSession();
  const waking = useServerWaking();

  const [queueCount, setQueueCount] = useState(0);
  const [index, setIndex] = useState<SearchIndex>(EMPTY_INDEX);

  // Send anybody without a session to the sign-in screen.
  //
  // ONLY WHEN THE SERVER ACTUALLY SAID SO. This deliberately fires on
  // "signed-out" rather than on "not signed in", because those are no longer the
  // same thing: a server that cannot be reached leaves us not knowing, and
  // treating not knowing as "sign in again" sends somebody off to type a
  // password at a server that is not going to answer.
  useEffect(() => {
    if (phase === 'signed-out') router.replace('/login');
  }, [phase, router]);

  // The frame's own data. Only fetched once there is somebody to show it to.
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;

    Promise.all([
      apiClient.getActionQueue(),
      apiClient.listUsers(),
      apiClient.listProviders(),
      apiClient.listVehicles(),
      apiClient.listBookings(),
    ]).then(([queue, users, providers, vehicles, bookings]) => {
      if (cancelled) return;
      setQueueCount(queue.length);
      setIndex({ users, providers, vehicles, bookings });
    });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  // The server could not be reached, so we genuinely do not know who this is.
  // Said plainly, with a way to try again.
  if (phase === 'unreachable') return <ServerUnreachable onRetry={recheck} />;

  // Still asking who is signed in. Normally that is quick enough to show
  // nothing — a blank moment beats a flash of the panel followed by a redirect
  // away from it. But when the server is asleep this takes most of a minute, and
  // a blank screen for a minute is indistinguishable from a broken one.
  if (loading) return waking ? <ServerWaking /> : null;

  if (!isSignedIn) return null;

  return (
    <>
      <div className={styles.layout}>
        <AdminSidebar queueCount={queueCount} />

        <div className={styles.main}>
          <AdminTopBar index={index} queueCount={queueCount} />

          <main className={styles.content} id="main">
            {/* One screen crashing should show a message inside the frame, not
                take the sidebar and the top bar down with it. */}
            <AppErrorBoundary>{children}</AppErrorBoundary>
          </main>
        </div>
      </div>

      {/* A session that ended while somebody was still working. Deliberately
          rendered alongside the panel rather than instead of it — see the note
          at the top of SessionExpired.tsx. */}
      {phase === 'locked' ? <SessionExpired /> : null}

      {/* Shown instead of everything above on a narrow window. */}
      <div className={styles.narrowNotice}>
        <Logo size={26} />
        <Text variant="h2" as="h1">
          This is a desktop tool
        </Text>
        <Text variant="body" tone="ink2" as="p" raw style={{ maxWidth: 420 }}>
          The SXM Rentals administration portal is built for a full-size screen — a Windows
          desktop or a MacBook. Open it on a computer to carry on.
        </Text>
      </div>
    </>
  );
}

export default AdminShell;
