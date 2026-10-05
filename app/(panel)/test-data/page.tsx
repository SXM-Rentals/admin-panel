'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The Godfather's screen for trying the platform out for real
// and then clearing up after it — every kind of test record that can go, in one
// place, with the order they have to go in and what is keeping the window open.
//
// WHY A SCREEN AS WELL AS THE BUTTONS ON EACH LIST. They are for different
// moments. The button on the Bookings screen is for "I have just made six test
// bookings, clear those". This is for standing back before a launch and seeing
// everything that can go — which matters because the dangerous mistake here is not
// pressing one button, it is pressing five and losing track of which.
//
// THE ORDER IS NOT A SUGGESTION. Some records hold others up, and the server
// refuses rather than taking more than was asked for — deposits before bookings,
// bookings before payouts, and so on. That refusal names what to clear first, and
// the order is printed here so nobody has to discover it one refusal at a time.
//
// WINDING BACK TO A DAY IS NOT HERE, AND THAT IS THE ANSWER RATHER THAN AN
// OMISSION. It was asked for and the backend's reply was that it is a database
// procedure on Neon rather than anything the panel can call. A button that cannot
// work is worse than a documented procedure somebody has to ask for, so there is no
// button — only this paragraph saying where it lives.

import React from 'react';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAdminSession } from '@/lib/auth';
import { whyNeedsTier, TIER_LABELS } from '@/lib/tiers';
import { testDataStatus } from '@/lib/test-data';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { ResetControl } from '@/components/admin/ResetControl';
import { Note } from '@/components/admin/shared';
import { Icon, Skeleton, StatusPill, Text } from '@/components/ui';
import styles from '@/components/admin/admin.module.css';

export default function TestDataPage() {
  const { staff: me } = useAdminSession();
  const notYours = whyNeedsTier(me?.tier, 'godfather');
  const mine = notYours === undefined;

  const { data: status, loading, error, refresh } = useAsyncData(
    () => (mine ? testDataStatus() : Promise.resolve(undefined)),
    [mine],
  );

  // Nobody else gets a list of ways to destroy the platform's records, even a
  // greyed one. This is the single screen in the panel kept to one account.
  if (!mine) {
    return (
      <>
        <PageHead title="Test Data" description="Not an account that can do this." />
        <PageCard title="Only the Godfather">
          <Note icon="lock-closed-outline" tone="ink2">
            Clearing records is kept to the Godfather account alone — not Owners, who can do
            everything else in this panel. Your account is {me?.tier ? TIER_LABELS[me.tier] : 'not set'}.
          </Note>
        </PageCard>
      </>
    );
  }

  if (error) return <LoadFailed title="Test Data" what="Whether records can be cleared" error={error} onRetry={refresh} />;

  return (
    <>
      <PageHead
        title="Test Data"
        description="Try the platform out properly, then clear up after it. Yours alone — not Owners."
      />

      {/* ---- WHAT IS KEEPING THIS OPEN ----
          First on the screen, because it is the thing that decides whether
          anything below it will work, and because it will one day say "closed"
          and somebody will need to know why without asking a developer. */}
      <PageCard
        title="Whether This Is Still Possible"
        subtitle={status ? (status.open ? 'Open' : 'Closed for good') : undefined}
      >
        {loading ? (
          <Skeleton height={120} />
        ) : !status ? (
          <Note>The server did not say.</Note>
        ) : (
          <>
            <div className={styles.pillRow}>
              <StatusPill
                label={status.open ? 'Open' : 'Closed For Good'}
                tone={status.open ? 'warning' : 'neutral'}
              />
              <Text variant="small" tone="ink3" as="span" raw>
                {status.open
                  ? 'Records can still be cleared. This shuts permanently the first time Stripe runs live.'
                  : 'Nothing here can be cleared any more, and it cannot be reopened.'}
              </Text>
            </div>

            {/* The server's own sentences, printed as written. Two versions of
                one condition is how a screen ends up disagreeing with the thing
                it is describing. */}
            <div style={{ marginTop: 'var(--space-lg)' }} className={styles.conditionList}>
              {status.conditions.map((condition) => (
                <div key={condition.name} className={styles.conditionRow}>
                  <Icon
                    name={condition.met ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                    size={16}
                    color={condition.met ? 'var(--success)' : 'var(--danger)'}
                  />
                  <Text variant="small" tone="ink2" as="span" raw>
                    {condition.sentence}
                  </Text>
                </div>
              ))}
            </div>
          </>
        )}
      </PageCard>

      <div className={styles.detailGrid} style={{ marginTop: 'var(--space-lg)' }}>
        <div className={styles.detailStack}>
          <PageCard title="Clear One Thing At A Time" subtitle="Each one leaves the others alone">
            <ResetControl
              what="deposits"
              label="the deposits"
              detail="Every deposit held, released and claimed. The bookings stay."
            />
            <ResetControl
              what="bookings"
              label="the bookings"
              detail="Every booking and its history, and the refund requests that belong to them. Payments and payouts stay."
            />
            <ResetControl
              what="payouts"
              label="the payouts"
              detail="What businesses were owed and what was sent. The bookings behind them stay."
            />
            <ResetControl
              what="vehicles"
              label="the cars"
              detail="Every vehicle a business added, with its listing decisions and paperwork. The businesses stay."
            />
            <ResetControl
              what="providers"
              label="the businesses"
              detail="Every rental business and its fleet. Staff accounts and the audit log stay."
            />
            <ResetControl
              what="payments"
              label="the payments ledger"
              detail="Charges, refunds and commission. The bookings stay. Can go at any point."
            />
            <ResetControl
              what="customer_spend"
              label="what customers have spent"
              detail="Lifetime spend, points and booking counts back to nothing. The accounts themselves stay, and they can still sign in."
            />
          </PageCard>
        </div>

        <div className={styles.detailStack}>
          <PageCard title="The Order They Go In">
            <Note>
              Some records hold others up. This order always works, and anything refused will say
              what to clear first rather than taking more than you asked for:
            </Note>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <Text variant="label" as="p" raw>
                Deposits → bookings → payouts → cars → businesses
              </Text>
              <div style={{ marginTop: 'var(--space-xs)' }}>
                <Text variant="small" tone="ink3" as="p" raw>
                  The payments ledger and what customers have spent can go at any point, in any
                  order.
                </Text>
              </div>
            </div>
          </PageCard>

          <PageCard title="What Is Never Cleared">
            <Note>
              Staff accounts and the audit log survive all of this. The log is the record of what was
              done to this platform — including each of these clearances, under the name of whoever
              pressed it — and a record the person it is about can erase is not a record.
            </Note>
          </PageCard>

          <PageCard title="Winding Back To A Day">
            <Note icon="warning-outline" tone="ink2">
              There is no button for this and there will not be one. Putting the platform back to how
              it stood on a particular day is a database procedure on Neon rather than anything the
              panel can ask for — ask whoever looks after the database. A button that cannot work
              would be worse than this paragraph.
            </Note>
          </PageCard>
        </div>
      </div>
    </>
  );
}
