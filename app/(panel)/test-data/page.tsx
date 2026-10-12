'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The Godfather's screen for trying the platform out for real
// and then clearing up after it — everything that can go, in one place, with the
// order it has to go in and what is keeping the window open.
//
// THE BUTTONS ARE BUILT FROM WHAT THE SERVER SAYS IT CAN CLEAR, not from a list
// kept here. The server already added nine kinds in one go; a list in the panel is
// a list that is wrong the day after somebody adds the tenth. So this screen draws
// one button per kind the server names, using the server's own words for it.
//
// CLEAR EVERYTHING IS SEPARATE, AT THE TOP, AND ASKS FOR A WORD TO BE TYPED. The
// others take a reason and a six-digit code, both of which a person can produce on
// autopilot when they meant to press the button next to this one. Typing CLEAR is
// the only thing on this screen that cannot be done by muscle memory, and it is
// spent here rather than on any of the others — put it on all of them and people
// learn to type it without reading.
//
// WHAT SURVIVES, AND WHAT DOES NOT. Staff accounts and the platform settings are
// never cleared by any of this. Everything else can go, the audit log included, and
// when the Godfather clears or deletes anything NOTHING IS LEFT BEHIND — no note, no
// log entry saying it happened. That is the owner's decision and the whole point of
// the account being the Godfather's: it is the one account that answers to nobody
// for what it does to test data, so it does not leave a trail for anybody else to
// read either.
//
// WINDING BACK TO A DAY IS NOT HERE, AND THAT IS AN ANSWER RATHER THAN AN
// OMISSION. It was asked for; the backend's reply was that it is a database
// procedure on Neon rather than anything the panel can call. A button that cannot
// work is worse than a paragraph saying where the thing actually lives.

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

// What each kind means, where the server's own label does not say the part that
// matters. Anything the server names that is not in here is drawn with its own
// label and no line underneath, which is how a kind added tomorrow still works.
const SAYS: Record<string, string> = {
  bookings: 'Every booking and its history, and the refund requests that belong to them. Clear the deposits first.',
  payments: 'Charges, refunds and commission. The bookings stay. Can go at any point.',
  payouts: 'What businesses were owed and what was sent. The bookings behind them stay.',
  deposits: 'Every deposit held, released and claimed. These go before the bookings can.',
  refunds: 'Refund requests and their decisions. The payments they point at stay.',
  disputes: 'Every dispute and how it was settled.',
  vehicles: 'Every vehicle a business added, with its listing decisions and paperwork.',
  providers: 'Every rental business and its fleet.',
  customers: 'Customer accounts themselves. Everything they did goes with them.',
  customer_spend: 'Lifetime spend, points and booking counts back to nothing. The accounts stay and can still sign in.',
  messages: 'Messages between customers and businesses on their bookings.',
  notifications: 'Everything the apps have pushed to anybody.',
  support: 'Conversations between customers and us.',
  fleet_requests: 'Businesses that asked us to put their cars on for them, and the files they sent.',
  audit_log: 'The whole record of what staff did.',
};

export default function TestDataPage() {
  const { staff: me } = useAdminSession();
  const mine = whyNeedsTier(me?.tier, 'godfather') === undefined;

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

  if (error) {
    return <LoadFailed title="Test Data" what="Whether records can be cleared" error={error} onRetry={refresh} />;
  }

  // Everything the server will clear, in its order, minus the one that takes the
  // lot — that has its own button and its own ceremony above.
  const kinds = (status?.kinds ?? []).filter((kind) => kind.what !== 'everything');
  const takesTheLot = (status?.kinds ?? []).find((kind) => kind.what === 'everything');

  return (
    <>
      <PageHead
        title="Test Data"
        description="Try the platform out properly, then clear up after it. Yours alone — not Owners."
      />

      {/* ---- WHAT IS KEEPING THIS OPEN ----
          First on the screen, because it decides whether anything below it will
          work, and because one day it will say "closed" and somebody will need to
          know why without asking a developer. */}
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

      {/* ---- THE ONE THAT TAKES THE LOT ----
          On its own, above everything, and the only thing in the panel that asks
          for a word to be typed out. */}
      {takesTheLot ? (
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <PageCard title="Start Completely Again" subtitle="Everything below, in one go">
            <Note icon="warning-outline" tone="ink2">
              This clears every kind of record on this screen at once — bookings, money, cars,
              businesses, customers, messages and the audit log — and tells you how many of each
              went. Only staff accounts and the platform settings stay, and nobody can undo it.
            </Note>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <ResetControl
                what="everything"
                label={takesTheLot.label.toLowerCase()}
                detail="Every kind of record below, in one go. Only staff accounts and settings are left."
                typeToConfirm="CLEAR"
              />
            </div>
          </PageCard>
        </div>
      ) : null}

      <div className={styles.detailGrid} style={{ marginTop: 'var(--space-lg)' }}>
        <div className={styles.detailStack}>
          <PageCard title="Clear One Thing At A Time" subtitle="Each one leaves the others alone">
            {loading ? (
              <Skeleton height={240} />
            ) : kinds.length === 0 ? (
              <Note>The server did not say what it can clear.</Note>
            ) : (
              kinds.map((kind) => (
                <ResetControl
                  key={kind.what}
                  what={kind.what}
                  label={kind.label.toLowerCase()}
                  // The server's label is the name; this is the consequence. A
                  // kind nobody here has heard of gets the name and no line,
                  // which is better than a line that guesses.
                  detail={SAYS[kind.what] ?? 'Clears these records and nothing else.'}
                />
              ))
            )}
          </PageCard>
        </div>

        <div className={styles.detailStack}>
          <PageCard title="The Order They Go In">
            <Note>
              Some records hold others up. This order always works, and anything refused will say
              what to clear first — or tell you to use Everything — rather than taking more than you
              asked for:
            </Note>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <Text variant="label" as="p" raw>
                Deposits → bookings → payouts → cars → businesses
              </Text>
              <div style={{ marginTop: 'var(--space-xs)' }}>
                <Text variant="small" tone="ink3" as="p" raw>
                  The rest can go at any point, in any order.
                </Text>
              </div>
            </div>
          </PageCard>

          <PageCard title="What Is Never Cleared">
            <Note>
              Staff accounts and the platform settings survive all of this, including Everything.
            </Note>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <Note icon="warning-outline" tone="ink2">
                The audit log is not on that list: as the Godfather you can clear all of it, or
                delete a single entry. It cannot be undone.
              </Note>
            </div>
          </PageCard>

          <PageCard title="Winding Back To A Day">
            <Note icon="warning-outline" tone="ink2">
              There is no button for this and there will not be one. Putting the platform back to how
              it stood on a particular day is a database procedure on Neon rather than anything the
              panel can ask for — ask whoever looks after the database.
            </Note>
          </PageCard>
        </div>
      </div>
    </>
  );
}
