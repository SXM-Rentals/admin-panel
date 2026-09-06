'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The dashboard — the screen somebody opens first thing in
// the morning. How many accounts there are, how much money moved, which way the
// booking numbers are going, and what is waiting to be dealt with.
//
// THE ORDER OF THE SCREEN IS THE ORDER OF THE QUESTIONS somebody actually asks:
// how big are we, how are we doing, which way are we going, and what needs me
// today. The last one is at the bottom but it is the only part with links in it,
// because it is the only part that is work rather than information.
//
// THE DEPOSITS TILE IS NOT A REVENUE TILE. It sits apart, in amber, with a
// dashed edge and a label saying the money is not ours. A security deposit is
// held against a customer's card and given back; folding it into a revenue
// figure would overstate the size of the platform and, worse, overstate what it
// is owed. This is the screen where that mistake would be easiest to make, so
// the tile is deliberately built to look like a different kind of number.

import React, { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money } from '@/lib/format';
import { dateRangeLabels } from '@/lib/labels';
import { PageHead } from '@/components/layout/PageCard';
import { StatGrid, StatTile } from '@/components/admin/StatTile';
import { FilterChips } from '@/components/admin/FilterBar';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { Icon, MockBanner, Skeleton, StatusPill, Text } from '@/components/ui';
import type { DateRangeKey } from '@/types';
import styles from '@/components/admin/admin.module.css';

export default function AdminDashboardPage() {
  const [range, setRange] = useState<DateRangeKey>('quarter');

  const { data: summary, loading } = useAsyncData(() => apiClient.getSummary(range), [range]);

  return (
    <>
      <PageHead
        title="Dashboard"
        description="Where the platform stands today, and what is waiting on somebody in this office."
      />

      <MockBanner />

      {loading || !summary ? (
        <Skeleton height={160} />
      ) : (
        <>
          {/* ---- HOW MANY ACCOUNTS ---- */}
          <StatGrid>
            <StatTile
              icon="people-outline"
              label="Customers"
              value={summary.totalUsers.toLocaleString()}
              detail={`${summary.usersVerified} verified · ${summary.usersPending} waiting on us`}
            />
            <StatTile
              icon="storefront-outline"
              label="Rental businesses"
              value={summary.totalProviders.toLocaleString()}
              detail={`${summary.providersVerified} verified · ${summary.providersPending} waiting on us`}
            />
            <StatTile
              icon="calendar-outline"
              label={`Bookings · ${dateRangeLabels[range].toLowerCase()}`}
              value={summary.bookingsInRange.toLocaleString()}
              detail="Completed and currently out"
            />
            <StatTile
              icon="flash-outline"
              label="Waiting on us"
              value={(
                summary.verificationsWaiting +
                summary.disputesOpen +
                summary.refundsPending
              ).toLocaleString()}
              detail="Verifications, disputes and refunds together"
            />
          </StatGrid>

          {/* ---- THE MONEY ---- */}
          <div className={styles.sectionStack}>
            <FilterChips
              label="Revenue for"
              value={range}
              onChange={setRange}
              options={(Object.keys(dateRangeLabels) as DateRangeKey[]).map((key) => ({
                value: key,
                label: dateRangeLabels[key],
              }))}
            />

            <StatGrid>
              <StatTile
                icon="cash-outline"
                label="Gross booking value"
                value={money(summary.gmv)}
                detail="Everything customers paid, before the split"
              />
              <StatTile
                icon="storefront-outline"
                label="Paid out to businesses"
                value={money(summary.paidOutToProviders)}
                detail="Their share, after commission"
              />
              <StatTile
                icon="card-outline"
                label="Commission retained"
                value={money(summary.commissionRetained)}
                detail="What SXM Rentals kept"
              />
              {/* Not revenue. See the note at the top of this file. */}
              <StatTile
                variant="held"
                icon="wallet-outline"
                label="Security deposits held"
                value={money(summary.depositsCurrentlyHeld)}
                detail="Customers’ money, held against damage — not revenue and not ours"
              />
            </StatGrid>
          </div>

          {/* ---- WHICH WAY WE ARE GOING, AND WHAT NEEDS DOING ---- */}
          <div className={styles.dashGrid}>
            <div className={styles.chartCard}>
              <RevenueChart trend={summary.bookingTrend} />
            </div>

            <div className={styles.chartCard}>
              <Text variant="h3" as="h3">
                Needs Attention
              </Text>

              <div className={styles.linkList}>
                <ActionRow
                  href="/queue"
                  icon="shield-checkmark-outline"
                  title="Verifications Waiting"
                  count={summary.verificationsWaiting}
                  detail="Customers, businesses and vehicle documents"
                />
                <ActionRow
                  href="/disputes"
                  icon="alert-circle-outline"
                  title="Disputes Open"
                  count={summary.disputesOpen}
                  detail="Money resting on somebody making a decision"
                />
                <ActionRow
                  href="/payments/refunds"
                  icon="swap-horizontal"
                  title="Refunds Pending"
                  count={summary.refundsPending}
                  detail="Each one is a customer waiting to hear back"
                />
              </div>

              <div className={styles.inlineNote}>
                <Icon name="information-circle-outline" size={15} color="var(--ink3)" />
                <Text variant="small" tone="ink3" as="p" raw>
                  All three queues are on one screen, oldest first, under Action Queue.
                </Text>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// One row of the "needs attention" list. A count and a way to go and do it.
function ActionRow({
  href,
  icon,
  title,
  count,
  detail,
}: {
  href: string;
  icon: 'shield-checkmark-outline' | 'alert-circle-outline' | 'swap-horizontal';
  title: string;
  count: number;
  detail: string;
}) {
  return (
    <Link href={href} className={styles.linkRow}>
      <Icon name={icon} size={18} color={count > 0 ? 'var(--warning)' : 'var(--ink3)'} />
      <span className={styles.linkRowText}>
        <Text variant="label" as="span" raw>
          {title}
        </Text>
        <Text variant="small" tone="ink3" as="p" raw>
          {detail}
        </Text>
      </span>
      <StatusPill
        label={count === 0 ? 'All clear' : String(count)}
        tone={count === 0 ? 'success' : 'warning'}
      />
      <Icon name="chevron-forward" size={16} color="var(--ink3)" />
    </Link>
  );
}
