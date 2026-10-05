'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The Godfather's screen for trying the platform out for
// real and then putting it back — clearing one kind of record at a time, or
// winding the whole platform back to how it stood on a particular day.
//
// WHY A SCREEN RATHER THAN A BUTTON ON EACH LIST. Both exist, and they are for
// different moments. The button on the Bookings screen is for "I have just made
// six test bookings, clear those"; this screen is for standing back and seeing
// everything that can be cleared in one place before a launch — which matters
// because the dangerous mistake here is not pressing one button, it is pressing
// five and losing track of which.
//
// WINDING BACK TO A DAY IS NOT THE SAME AS CLEARING, and the difference is worth
// being precise about. Clearing removes a kind of record. Winding back restores
// everything to how it stood at the end of a chosen day — bookings, payments,
// customers, cars — which also means undoing things that were right. It is the
// heavier of the two and is the last thing on the screen for that reason.
//
// NONE OF IT WORKS YET, and the screen says so rather than pretending. The server
// has no address for any of this; what it needs is written down in
// SXM_RENTALS_TEST_RESET_HANDOFF.md, including the rule that matters most — that
// all of it must be refused outright once real customers are on the platform.

import React, { useState } from 'react';
import { useAdminSession } from '@/lib/auth';
import { whyNeedsTier, TIER_LABELS } from '@/lib/tiers';
import { localDay } from '@/lib/period';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { ResetControl } from '@/components/admin/ResetControl';
import { Note } from '@/components/admin/shared';
import { Button, Text } from '@/components/ui';
import styles from '@/components/admin/admin.module.css';

export default function TestDataPage() {
  const { staff: me } = useAdminSession();
  const [day, setDay] = useState('');

  const notYours = whyNeedsTier(me?.tier, 'godfather');

  // Nobody else gets a list of ways to destroy the platform's records, even a
  // greyed one. This is the single screen in the panel kept to one account.
  if (notYours !== undefined) {
    return (
      <>
        <PageHead title="Test Data" description="Not an account that can do this." />
        <PageCard title="Only the Godfather">
          <Note icon="lock-closed-outline" tone="ink2">
            Clearing records and winding the platform back are kept to the Godfather account alone —
            not Owners, who can do everything else. Your account is{' '}
            {me?.tier ? TIER_LABELS[me.tier] : 'not set'}.
          </Note>
        </PageCard>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Test Data"
        description="Try the platform out properly, then put it back. Yours alone — not Owners."
      />

      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <Note icon="warning-outline" tone="ink2">
          Everything on this screen destroys records rather than changing them, which is why it is
          one account&rsquo;s to use. None of it works yet: the server has no address for any of it,
          and when it does it will refuse all of it outright once real customers are on the platform.
          The backend work is written up in SXM_RENTALS_TEST_RESET_HANDOFF.md.
        </Note>
      </div>

      <div className={styles.detailGrid}>
        <div className={styles.detailStack}>
          <PageCard title="Clear One Thing At A Time" subtitle="Each one leaves the others alone">
            <ResetControl what="the bookings" detail="Every booking and its history. Payments, payouts and deposits stay." />
            <ResetControl what="the payments ledger" detail="Charges, refunds, payouts and commission. The bookings stay." />
            <ResetControl what="the deposits" detail="Every deposit held, released and claimed." />
            <ResetControl what="the cars" detail="Every vehicle a business added, and its listing decisions." />
            <ResetControl
              what="what customers have spent"
              detail="Lifetime spend, points and booking counts back to nothing. The accounts stay."
            />
            <ResetControl
              what="the businesses"
              detail="Every rental business and its fleet. Staff accounts and the audit log stay."
            />
          </PageCard>

          <PageCard title="What Is Never Cleared">
            <Note>
              Staff accounts and the audit log stay whatever happens here. The log is the record of
              what we did to this platform, including what was cleared and by whom, and a record that
              can be erased by the person it is about is not a record.
            </Note>
          </PageCard>
        </div>

        <div className={styles.detailStack}>
          <PageCard title="Wind Everything Back To A Day" subtitle="Heavier than clearing — read this first">
            <Note icon="warning-outline" tone="ink2">
              This puts the whole platform back to how it stood at the end of the day you choose:
              bookings, payments, customers and cars together. It undoes the things that were right
              as well as the things that were not, and there is no winding forward again.
            </Note>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Text variant="caption" tone="ink3" as="p" raw>
                END OF THIS DAY
              </Text>
              <div style={{ marginTop: 'var(--space-xs)' }}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={day}
                  max={localDay(new Date())}
                  onChange={(event) => setDay(event.target.value)}
                  aria-label="The day to wind back to"
                />
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Button
                label="Wind Back"
                variant="danger"
                size="md"
                disabled
                title="The SXM Rentals server does not offer this yet."
              />
            </div>

            <div style={{ marginTop: 'var(--space-md)' }}>
              <Note>
                Not connected yet. When it is, it will take a written reason and your authenticator
                code, and the panel will make you type the date again before it goes.
              </Note>
            </div>
          </PageCard>
        </div>
      </div>
    </>
  );
}
