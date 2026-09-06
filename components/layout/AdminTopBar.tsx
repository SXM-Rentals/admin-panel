'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The bar across the top of every screen — who is signed
// in, the notification bell, the search box, and the way out.
//
// THE SEARCH BOX SEARCHES EVERYTHING AT ONCE, and that is the point of it. A
// staff member with somebody on the phone has a name, an email address or a
// booking reference, and does not know or care whether that belongs to the Users
// list, the Providers list or the Bookings list. Making them pick a screen first
// is making them do the computer's job. Typing three characters here looks
// through customers, businesses, vehicles and bookings together and says which
// kind each answer is.
//
// THERE IS NO LIGHT/DARK TOGGLE HERE. The reference design has one; this panel
// is dark only, so a switch that does nothing would be worse than no switch.
// See the note at the top of app/globals.css.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminSession } from '@/lib/auth';
import { Icon, IconButton, StatusPill, Text } from '@/components/ui';
import type { AdminBooking, AdminProvider, AdminUser, AdminVehicle } from '@/types';
import styles from './shell.module.css';

// What the search box has to look through. Handed in by the shell, which has
// already loaded it for the screens, so opening the search costs nothing.
export type SearchIndex = {
  users: AdminUser[];
  providers: AdminProvider[];
  vehicles: AdminVehicle[];
  bookings: AdminBooking[];
};

type Result = { href: string; title: string; detail: string; kind: string };

export function AdminTopBar({
  index,
  queueCount,
}: {
  index: SearchIndex;
  queueCount: number;
}) {
  const router = useRouter();
  const { staff, signOut } = useAdminSession();

  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Clicking anywhere else closes whichever of the two is open. Without this a
  // dropdown stays up while you work behind it, which looks broken.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) setQuery('');
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  // Escape closes them too, which is what a keyboard user will try first.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setQuery('');
        setMenuOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    // Two characters is not a search, it is everything. Three is where the
    // answers start being worth showing.
    if (q.length < 3) return [];

    const users: Result[] = index.users
      .filter((u) =>
        `${u.firstName} ${u.lastName} ${u.email} ${u.phone}`.toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map((u) => ({
        href: `/users/${u.id}`,
        title: `${u.firstName} ${u.lastName}`,
        detail: u.email,
        kind: 'Customer',
      }));

    const providers: Result[] = index.providers
      .filter((p) =>
        `${p.businessName} ${p.legalName} ${p.contactEmail} ${p.ownerName}`.toLowerCase().includes(q),
      )
      .slice(0, 4)
      .map((p) => ({
        href: `/providers/${p.id}`,
        title: p.businessName,
        detail: `${p.ownerName} · ${p.town} · ${p.vehicleCount} vehicles`,
        kind: 'Provider',
      }));

    const vehicles: Result[] = index.vehicles
      .filter((v) =>
        `${v.make} ${v.model} ${v.reference} ${v.providerName}`.toLowerCase().includes(q),
      )
      .slice(0, 4)
      .map((v) => ({
        href: `/vehicles/${v.id}/verification`,
        title: `${v.make} ${v.model} ${v.year}`,
        detail: `${v.reference} · ${v.providerName}`,
        kind: 'Vehicle',
      }));

    const bookings: Result[] = index.bookings
      .filter((b) =>
        `${b.reference} ${b.customerName} ${b.providerName}`.toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map((b) => ({
        href: `/bookings/${b.id}`,
        title: b.reference,
        detail: `${b.customerName} · ${b.providerName}`,
        kind: 'Booking',
      }));

    return [...users, ...providers, ...vehicles, ...bookings];
  }, [query, index]);

  const go = (href: string) => {
    setQuery('');
    router.push(href);
  };

  return (
    <header className={styles.topbar} data-print="hide">
      {/* ---- WHO IS SIGNED IN ---- */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          type="button"
          className={styles.staffButton}
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <AvatarInitials initials={staff?.avatarInitials ?? '··'} />
          <Text variant="label" as="span" raw>
            {staff?.name ?? 'Signed out'}
          </Text>
          <Icon name="chevron-down" size={15} color="var(--ink3)" />
        </button>

        {menuOpen ? (
          <div className={styles.staffMenu} role="menu">
            <div className={styles.staffMenuHead}>
              <Text variant="label" as="p" raw>
                {staff?.name}
              </Text>
              <Text variant="small" tone="ink3" as="p" raw>
                {staff?.email}
              </Text>
              {/* Said plainly, because somebody will wonder why there is no
                  "permissions" entry in this menu. */}
              <Text variant="caption" tone="ink3" as="p" raw style={{ marginTop: 6 }}>
                Full access · one access level for all staff
              </Text>
            </div>

            <Link href="/settings" className={styles.menuItem} role="menuitem">
              <Icon name="settings-outline" size={16} />
              Platform settings
            </Link>
            <Link href="/audit" className={styles.menuItem} role="menuitem">
              <Icon name="documents-outline" size={16} />
              Audit log
            </Link>
            <button type="button" className={styles.menuItem} role="menuitem" onClick={signOut}>
              <Icon name="log-out-outline" size={16} />
              Sign out
            </button>
          </div>
        ) : null}
      </div>

      {/* ---- SEARCH ---- */}
      <div className={styles.searchWrap} ref={searchRef}>
        <div className={styles.searchBox}>
          <Icon name="search" size={17} color="var(--ink3)" />
          <input
            className={styles.searchInput}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search customers, businesses, vehicles, bookings"
            aria-label="Search the whole platform"
          />
        </div>

        {query.trim().length >= 3 ? (
          <div className={styles.results}>
            {results.length === 0 ? (
              <div className={styles.result}>
                <Text variant="small" tone="ink3" as="span" raw>
                  Nothing matches “{query.trim()}”.
                </Text>
              </div>
            ) : (
              results.map((result) => (
                <button
                  key={`${result.kind}-${result.href}`}
                  type="button"
                  className={styles.result}
                  style={{ width: '100%' }}
                  onClick={() => go(result.href)}
                >
                  <span style={{ minWidth: 0, textAlign: 'left' }}>
                    <Text variant="label" as="span" raw>
                      {result.title}
                    </Text>
                    <Text variant="small" tone="ink3" as="p" raw>
                      {result.detail}
                    </Text>
                  </span>
                  <span className={styles.resultKind}>
                    <StatusPill label={result.kind} tone="neutral" />
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      {/* ---- THE BELL AND THE WAY OUT ---- */}
      <div className={styles.topbarActions}>
        <span className={styles.bellWrap}>
          <IconButton
            icon="notifications-outline"
            label={`${queueCount} things waiting`}
            variant="plain"
            onClick={() => router.push('/queue')}
          />
          {queueCount > 0 ? (
            <span className={styles.bellCount} aria-hidden="true">
              {queueCount > 99 ? '99+' : queueCount}
            </span>
          ) : null}
        </span>

        <IconButton icon="log-out-outline" label="Sign out" variant="plain" onClick={signOut} />
      </div>
    </header>
  );
}

// The round initials beside the name. Drawn here rather than pulling in the
// shared Avatar, because that one is sized for a customer photograph and this is
// a 32px circle in a toolbar.
function AvatarInitials({ initials }: { initials: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: 'var(--brand-soft)',
        color: 'var(--brand)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </span>
  );
}

export default AdminTopBar;
