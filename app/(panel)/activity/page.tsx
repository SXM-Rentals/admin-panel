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
// IT USED TO HAVE TO LIE A LITTLE, AND NO LONGER DOES. When this screen was
// built, a cancellation carried no time and a car carried no dates, so a
// cancellation sat under the day the booking was made with "time unknown" against
// it. The server now sends `cancelledAt`, `cancelledBy` and `cancellationReason`
// on a booking, and `createdAt` and `listedAt` on a vehicle, so cars appearing and
// going on sale are events here too and every row sits at the time it happened.
//
// WHAT IS STILL THIN, AND SAID ON THE SCREEN: cancellation REASONS exist only from
// 30 September 2026. An older cancellation has a time and nobody's words, which is
// not the same as nobody having had a reason — so those say "none recorded" rather
// than implying none was given. And this feed is still assembled here out of three
// lists rather than read from one: the backend has said an events table is coming
// and will be separate from the audit log, and when it lands this screen reads one
// address instead. Nothing else depends on how it is built.

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
  | 'car_added'
  | 'car_on_sale'
  | 'money_in'
  | 'money_back'
  | 'money_out';

type Event = {
  key: string;
  at: string;
  what: Happening;
  title: string;
  detail: string;
  href?: string;
};

const LOOK: Record<Happening, { icon: IconName; colour: string; label: string }> = {
  booking_made: { icon: 'calendar-outline', colour: 'var(--brand)', label: 'Booked' },
  booking_cancelled: { icon: 'alert-circle-outline', colour: 'var(--danger)', label: 'Cancelled' },
  booking_finished: { icon: 'checkmark-circle-outline', colour: 'var(--success)', label: 'Finished' },
  car_added: { icon: 'car-outline', colour: 'var(--ink2)', label: 'Car added' },
  car_on_sale: { icon: 'storefront-outline', colour: 'var(--success)', label: 'Car on sale' },
  money_in: { icon: 'card-outline', colour: 'var(--success)', label: 'Paid' },
  money_back: { icon: 'swap-horizontal', colour: 'var(--warning)', label: 'Refunded' },
  money_out: { icon: 'cash-outline', colour: 'var(--ink2)', label: 'Paid out' },
};

type Which = 'all' | 'bookings' | 'cars' | 'money';

// Words for who called a booking off. "Provider" is what the server says; nobody
// in this office calls a rental company that out loud.
const BY: Record<'customer' | 'provider' | 'staff', string> = {
  customer: 'the customer',
  provider: 'the business',
  staff: 'us',
};

export default function ActivityPage() {
  const [which, setWhich] = useState<Which>('all');

  const bookings = useAsyncData(() => apiClient.listBookings(), []);
  const ledger = useAsyncData(() => apiClient.getLedger(), []);
  const vehicles = useAsyncData(() => apiClient.listVehicles(), []);

  const events = useMemo<Event[]>(() => {
    const out: Event[] = [];

    for (const booking of bookings.data ?? []) {
      const who = `${booking.customerName} · ${booking.vehicleLabel}`;
      if (booking.status === 'cancelled') {
        const by = booking.cancelledBy ? BY[booking.cancelledBy] : undefined;
        out.push({
          key: `b-cancel-${booking.id}`,
          // At the time it was cancelled. A booking from before the server kept
          // that falls back to when it was made, which is the only time there is.
          at: booking.cancelledAt ?? booking.createdAt,
          what: 'booking_cancelled',
          title: `${booking.reference} cancelled${by ? ` by ${by}` : ''}`,
          // The reason when there is one. Older cancellations have none kept,
          // which is not the same as nobody having given one.
          detail: `${who} · ${money(booking.gross)}${booking.cancellationReason ? ` · “${booking.cancellationReason}”` : ' · no reason recorded'}`,
          href: `/bookings/${booking.id}`,
        });
      } else {
        out.push({
          key: `b-made-${booking.id}`,
          at: booking.createdAt,
          what: booking.status === 'completed' ? 'booking_finished' : 'booking_made',
          title: `${booking.reference} ${booking.status === 'completed' ? 'ran and finished' : 'booked'}`,
          detail: `${who} · ${money(booking.gross)} · ${booking.providerName}`,
          href: `/bookings/${booking.id}`,
        });
      }
    }

    // TWO SEPARATE EVENTS FOR ONE CAR, because they are two different days and
    // the gap between them is the paperwork. A car added is a business getting
    // ready; a car on sale is a car customers can book.
    for (const vehicle of vehicles.data ?? []) {
      const label = `${vehicle.make} ${vehicle.model} ${vehicle.year}`;
      if (vehicle.createdAt) {
        out.push({
          key: `v-add-${vehicle.id}`,
          at: vehicle.createdAt,
          what: 'car_added',
          title: `${label} added`,
          detail: `${vehicle.providerName}${vehicle.registration ? ` · ${vehicle.registration}` : ''}`,
          href: `/vehicles/${vehicle.id}/verification`,
        });
      }
      if (vehicle.listedAt) {
        out.push({
          key: `v-live-${vehicle.id}`,
          at: vehicle.listedAt,
          what: 'car_on_sale',
          title: `${label} went on sale`,
          detail: `${vehicle.providerName} · ${money(vehicle.dailyRate)} a day`,
          href: `/vehicles/${vehicle.id}/verification`,
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
  }, [bookings.data, ledger.data, vehicles.data]);

  const shown = events.filter((event) => {
    if (which === 'all') return true;
    if (which === 'money') return event.what.startsWith('money');
    if (which === 'cars') return event.what.startsWith('car');
    return event.what.startsWith('booking');
  });

  // Either list failing makes this screen a half-truth, so it says so rather than
  // showing the half it has.
  const failure = bookings.error ?? ledger.error ?? vehicles.error;
  if (failure) {
    return (
      <LoadFailed
        title="Activity"
        what="What has been happening"
        error={failure}
        onRetry={() => {
          bookings.refresh();
          ledger.refresh();
          vehicles.refresh();
        }}
      />
    );
  }

  const loading = bookings.loading || ledger.loading || vehicles.loading;

  // Today's own tally, for the one question somebody opening this screen has.
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = events.filter((event) => event.at.slice(0, 10) === today).length;

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
              { value: 'cars', label: 'Cars', count: events.filter((e) => e.what.startsWith('car')).length },
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
                    <StatusPill label={look.label} tone="neutral" dot={false} />
                    <Text variant="small" tone="ink3" as="span" raw>
                      {relativeDay(event.at)} at {clockTime(event.at)}
                    </Text>
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
          Built here from the bookings, the vehicles and the payments ledger rather than read from
          one feed — the server is getting an events table of its own, and this screen will read that
          instead when it does. One thin spot in the meantime: cancellation reasons were only kept
          from 30 September, so an older one says &ldquo;no reason recorded&rdquo; rather than that
          nobody gave one.
        </Note>
      </div>
    </>
  );
}
