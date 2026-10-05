'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: What has actually been happening on SXM Rentals, newest
// first — bookings made, bookings cancelled, money taken, refunded and paid out.
//
// WHY THIS IS NOT THE AUDIT LOG, AND WHY BOTH EXIST. The audit log answers "which
// member of staff did this, and why" — it is a record of OUR actions, and it is
// deliberately nothing else. This screen answers "what are customers and
// businesses doing", which nothing in the panel could say before: every other
// screen is a list of records to go and change, sorted by the thing it is about
// rather than by when it happened.
//
// IT IS ASSEMBLED HERE, OUT OF TWO LISTS THE SERVER ALREADY SENDS, and the screen
// says so rather than implying it is a complete history. Bookings carry when they
// were made; the payments ledger carries when each charge, refund, payout and
// commission line landed. Put in one order, that is most of what moves on this
// platform in a day.
//
// WHAT IT CANNOT SHOW YET, SAID ON THE SCREEN AND NOT ONLY HERE:
//   · When a car was added. The vehicle the server sends has no created date, so
//     "six cars went up this week" is not answerable. One field on the server.
//   · When a booking was cancelled, or by whom. A booking says it IS cancelled,
//     and nothing says when that happened, so a cancellation appears at the time
//     the booking was MADE rather than when it fell through. The screen marks
//     those rows for exactly that reason.
// Both are written up for the backend in SXM_RENTALS_ACTIVITY_HANDOFF.md.

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { clockTime, longDate, money, relativeDay } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { FilterBar, FilterChips } from '@/components/admin/FilterBar';
import { Note } from '@/components/admin/shared';
import { Icon, Skeleton, StatusPill, Text, type IconName } from '@/components/ui';
import styles from '@/components/admin/admin.module.css';

// What kind of thing happened. Not the server's words: the server sends bookings
// and ledger lines, and these are the events a person would name.
type Happening =
  | 'booking_made'
  | 'booking_cancelled'
  | 'booking_finished'
  | 'money_in'
  | 'money_back'
  | 'money_out';

type Event = {
  key: string;
  at: string;
  // True when `at` is not when this happened, only the nearest time we have. The
  // row says so rather than quietly placing it wrongly.
  atIsApproximate: boolean;
  what: Happening;
  title: string;
  detail: string;
  href?: string;
};

const LOOK: Record<Happening, { icon: IconName; colour: string; label: string }> = {
  booking_made: { icon: 'calendar-outline', colour: 'var(--brand)', label: 'Booked' },
  booking_cancelled: { icon: 'alert-circle-outline', colour: 'var(--danger)', label: 'Cancelled' },
  booking_finished: { icon: 'checkmark-circle-outline', colour: 'var(--success)', label: 'Finished' },
  money_in: { icon: 'card-outline', colour: 'var(--success)', label: 'Paid' },
  money_back: { icon: 'swap-horizontal', colour: 'var(--warning)', label: 'Refunded' },
  money_out: { icon: 'cash-outline', colour: 'var(--ink2)', label: 'Paid out' },
};

type Which = 'all' | 'bookings' | 'money';

export default function ActivityPage() {
  const [which, setWhich] = useState<Which>('all');

  const bookings = useAsyncData(() => apiClient.listBookings(), []);
  const ledger = useAsyncData(() => apiClient.getLedger(), []);

  const events = useMemo<Event[]>(() => {
    const out: Event[] = [];

    for (const booking of bookings.data ?? []) {
      const who = `${booking.customerName} · ${booking.vehicleLabel}`;
      if (booking.status === 'cancelled') {
        out.push({
          key: `b-cancel-${booking.id}`,
          // THE ONLY TIME WE HAVE is when the booking was made. See the note at
          // the top: the server does not say when it was cancelled.
          at: booking.createdAt,
          atIsApproximate: true,
          what: 'booking_cancelled',
          title: `${booking.reference} cancelled`,
          detail: `${who} · ${money(booking.gross)}`,
          href: `/bookings/${booking.id}`,
        });
      } else {
        out.push({
          key: `b-made-${booking.id}`,
          at: booking.createdAt,
          atIsApproximate: false,
          what: booking.status === 'completed' ? 'booking_finished' : 'booking_made',
          title: `${booking.reference} ${booking.status === 'completed' ? 'ran and finished' : 'booked'}`,
          detail: `${who} · ${money(booking.gross)} · ${booking.providerName}`,
          href: `/bookings/${booking.id}`,
        });
      }
    }

    for (const line of ledger.data ?? []) {
      // Commission is not an event in the world: it is our share of a charge that
      // is already on this list. Showing it would double every payment.
      if (line.kind === 'commission') continue;
      const what: Happening = line.kind === 'charge' ? 'money_in' : line.kind === 'refund' ? 'money_back' : 'money_out';
      out.push({
        key: `l-${line.id}`,
        at: line.at,
        atIsApproximate: false,
        what,
        title:
          line.kind === 'charge'
            ? `${money(line.amount)} paid`
            : line.kind === 'refund'
              ? `${money(line.amount)} refunded`
              : `${money(line.amount)} paid out`,
        detail:
          line.kind === 'payout'
            ? `${line.providerName} · ${line.bookingRef}`
            : `${line.customerName} · ${line.bookingRef}`,
      });
    }

    return out.sort((a, b) => b.at.localeCompare(a.at));
  }, [bookings.data, ledger.data]);

  const shown = events.filter((event) => {
    if (which === 'all') return true;
    if (which === 'money') return event.what.startsWith('money');
    return event.what.startsWith('booking');
  });

  // Either list failing makes this screen a half-truth, so it says so rather than
  // showing the half it has.
  const failure = bookings.error ?? ledger.error;
  if (failure) {
    return (
      <LoadFailed
        title="Activity"
        what="What has been happening"
        error={failure}
        onRetry={() => {
          bookings.refresh();
          ledger.refresh();
        }}
      />
    );
  }

  const loading = bookings.loading || ledger.loading;

  // Today's own tally, for the one question somebody opening this screen has.
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = events.filter((event) => !event.atIsApproximate && event.at.slice(0, 10) === today).length;

  return (
    <>
      <PageHead
        title="Activity"
        description="What customers and businesses have been doing, newest first. Not the audit log — that is what staff have done."
      />

      <PageCard
        title="Lately"
        subtitle={loading ? undefined : `${todayCount} today · ${shown.length} shown`}
      >
        <FilterBar>
          <FilterChips
            label="Show"
            value={which}
            onChange={setWhich}
            options={[
              { value: 'all', label: 'Everything', count: events.length },
              { value: 'bookings', label: 'Bookings', count: events.filter((e) => e.what.startsWith('booking')).length },
              { value: 'money', label: 'Money', count: events.filter((e) => e.what.startsWith('money')).length },
            ]}
          />
        </FilterBar>

        {loading ? (
          <Skeleton height={320} />
        ) : shown.length === 0 ? (
          <Note>Nothing yet. Bookings and payments appear here as they happen.</Note>
        ) : (
          <div className={styles.timeline}>
            {shown.map((event) => {
              const look = LOOK[event.what];
              const row = (
                <>
                  <span className={styles.timelineMark} style={{ color: look.colour }}>
                    <Icon name={look.icon} size={16} color={look.colour} />
                  </span>
                  <span className={styles.timelineText}>
                    <Text variant="label" as="span" raw>
                      {event.title}
                    </Text>
                    <Text variant="small" tone="ink3" as="p" raw>
                      {event.detail}
                    </Text>
                  </span>
                  <span className={styles.timelineWhen}>
                    <Text variant="small" tone="ink3" as="span" raw>
                      {relativeDay(event.at)}
                      {event.atIsApproximate ? '' : ` at ${clockTime(event.at)}`}
                    </Text>
                    {event.atIsApproximate ? (
                      // Said on the row itself. A cancellation sitting under the
                      // date it was booked would otherwise read as a lie.
                      <StatusPill label="Time unknown" tone="neutral" dot={false} />
                    ) : null}
                  </span>
                </>
              );

              return event.href ? (
                <Link key={event.key} href={event.href} className={styles.timelineRow} title={longDate(event.at)}>
                  {row}
                </Link>
              ) : (
                <div key={event.key} className={styles.timelineRow} title={longDate(event.at)}>
                  {row}
                </div>
              );
            })}
          </div>
        )}
      </PageCard>

      <div style={{ marginTop: 'var(--space-lg)' }}>
        <Note icon="warning-outline" tone="ink2">
          Built from the bookings and the payments ledger, which is what the server can tell us
          about when things happened. Two things are missing on purpose rather than by oversight: a
          car being added carries no date at all, and a cancellation carries no time — those rows say
          &ldquo;time unknown&rdquo; and sit under the day the booking was made. Both are asked for in
          SXM_RENTALS_ACTIVITY_HANDOFF.md.
        </Note>
      </div>
    </>
  );
}
