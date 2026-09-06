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
import styles from './shell.module.css';

const EMPTY_INDEX: SearchIndex = { users: [], providers: [], vehicles: [], bookings: [] };

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isSignedIn, loading } = useAdminSession();

  const [queueCount, setQueueCount] = useState(0);
  const [index, setIndex] = useState<SearchIndex>(EMPTY_INDEX);

  // Send anybody without a session to the sign-in screen. Waits for "loading" to
  // finish first: without that check, somebody who IS signed in gets bounced to
  // the sign-in screen for a split second on every page load, while the browser
  // is still reading back whether they were.
  useEffect(() => {
    if (!loading && !isSignedIn) router.replace('/login');
  }, [loading, isSignedIn, router]);

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

  // Nothing at all while the session is being read back. A blank moment is
  // better than a flash of the panel followed by a redirect away from it.
  if (loading || !isSignedIn) return null;

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
