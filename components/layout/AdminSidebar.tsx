'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The list of sections down the left of the panel, and the
// count of things waiting to be dealt with.
//
// WHY THE SECTIONS ARE GROUPED: sixteen links in one undivided column is a wall.
// Grouped into five short headings — the overview, the accounts, operations,
// finance, and the platform itself — somebody can find the one they want by
// heading rather than by reading every row. The customer website's provider
// portal does the same thing for the same reason.
//
// ACTION QUEUE SITS SECOND, DIRECTLY UNDER THE DASHBOARD. It is the only row
// that carries a number, and it is the row somebody should look at first each
// morning: the verifications, disputes and refunds that are all blocking
// somebody else. Everything below it is work you go looking for; this is work
// that is waiting for you.

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/lib/utils';
import { Icon, Logo, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import styles from './shell.module.css';

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  // Only Action Queue has one. Everything else would be noise.
  badge?: boolean;
};

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    // Dashboard, Action Queue and Analytics are the three "how are we doing"
    // screens — none of them is a list of records you go and change. Analytics
    // used to sit down under Platform beside Settings and the Audit Log, which
    // put a reporting screen among the configuration ones.
    title: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: 'grid-outline' },
      { href: '/queue', label: 'Action Queue', icon: 'flash-outline', badge: true },
      { href: '/analytics', label: 'Analytics', icon: 'bar-chart-outline' },
    ],
  },
  {
    title: 'Accounts',
    items: [
      { href: '/users', label: 'Users', icon: 'people-outline' },
      { href: '/providers', label: 'Providers', icon: 'storefront-outline' },
      { href: '/vehicles', label: 'Vehicles', icon: 'car-outline' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/bookings', label: 'Bookings', icon: 'calendar-outline' },
      { href: '/disputes', label: 'Disputes', icon: 'alert-circle-outline' },
      { href: '/promotions', label: 'Promotions', icon: 'ticket-outline' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/payments', label: 'Payments', icon: 'card-outline' },
      { href: '/payments/refunds', label: 'Refunds', icon: 'swap-horizontal' },
      { href: '/payments/deposits', label: 'Deposits', icon: 'wallet-outline' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { href: '/rewards', label: 'Rewards', icon: 'medal-outline' },
      { href: '/audit', label: 'Audit Log', icon: 'documents-outline' },
      { href: '/settings', label: 'Settings', icon: 'settings-outline' },
      { href: '/playbook', label: 'Playbook', icon: 'library-outline' },
    ],
  },
];

export function AdminSidebar({ queueCount }: { queueCount: number }) {
  const pathname = usePathname();

  // "/" is the dashboard itself, so it only counts as current on an exact match
  // — otherwise it would light up on every screen in the panel.
  //
  // "/payments" needs the same treatment for a different reason: Refunds and
  // Deposits live underneath it, and without the exact match all three rows
  // would highlight at once whenever somebody opened the refund queue.
  const isActive = (href: string): boolean => {
    if (href === '/' || href === '/payments') return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className={styles.sidebar} data-print="hide">
      <div className={styles.brandRow}>
        <Link href="/" aria-label="SXM Rentals administration portal">
          <Logo size={22} decorative priority />
        </Link>
      </div>

      <nav className={cx(styles.nav, 'thinScroll')} aria-label="Sections">
        {GROUPS.map((group) => (
          <React.Fragment key={group.title}>
            <Text variant="caption" tone="ink3" as="p" className={styles.navGroup} raw>
              {group.title}
            </Text>

            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(styles.navLink, active && styles.navLinkActive)}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon name={item.icon} size={17} />
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.badge && queueCount > 0 ? (
                    <span className={styles.badge} aria-label={`${queueCount} waiting`}>
                      {queueCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </React.Fragment>
        ))}
      </nav>
    </aside>
  );
}

export default AdminSidebar;
