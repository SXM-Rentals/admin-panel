// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Works out the headline figures on the dashboard — how
// many accounts there are, how much money has moved, and what is waiting to be
// dealt with — by counting the other mock files rather than making numbers up.
//
// WHY IT IS CALCULATED RATHER THAN WRITTEN DOWN: if the dashboard held its own
// hard-coded "GMV: $84,000" it could disagree with the payments ledger, and
// there would be no way to know which one was lying. Counting the same rows the
// ledger shows means the two can only ever agree.
//
// THE DEPOSIT RULE, ONCE MORE, BECAUSE THIS IS THE FILE WHERE IT WOULD GET
// BROKEN: a security deposit is the customer's money, held against damage and
// given back. It is not revenue, not commissionable, and never added to GMV. It
// gets its own field, its own tile on the dashboard, and its own label saying it
// is not ours. tests/rules/deposits-are-never-revenue checks this.

import type { DateRangeKey, PlatformSummary, QueueItem } from '@/types';
import { TODAY } from './seed';
import { mockUsers } from './users';
import { mockProviders } from './providers';
import { mockBookings, revenueBookings } from './bookings';
import { vehiclesAwaitingReview, vehicleLabel } from './vehicles';
import { mockDeposits, mockRefunds, depositsCurrentlyHeld } from './payments';
import { openDisputes } from './disputes';

// How far back each range reaches, in days.
const RANGE_DAYS: Record<DateRangeKey, number> = {
  month: 30,
  quarter: 90,
  year: 365,
  all: 100_000,
};

function withinRange(iso: string, range: DateRangeKey): boolean {
  const days = (TODAY.getTime() - new Date(iso).getTime()) / 86_400_000;
  return days >= 0 && days <= RANGE_DAYS[range];
}

export function buildSummary(range: DateRangeKey = 'quarter'): PlatformSummary {
  const queue = buildQueue();
  const inRange = revenueBookings().filter((b) => withinRange(b.createdAt, range));

  // The three-way split. Worked out by adding up the bookings themselves, so
  // gmv === paidOutToProviders + commissionRetained holds by construction rather
  // than by somebody remembering to keep three numbers in step.
  const gmv = inRange.reduce((t, b) => t + b.gross, 0);
  const paidOutToProviders = inRange.reduce((t, b) => t + b.payout, 0);
  const commissionRetained = inRange.reduce((t, b) => t + b.commission, 0);

  // The trend chart: the last twelve weeks, whatever range is chosen above. The
  // headline figures answer "how are we doing"; the chart answers "which way are
  // we going", and that second question wants a fixed window or the shape of the
  // line changes every time somebody touches the filter.
  const bookingTrend = Array.from({ length: 12 }, (_, i) => {
    const weeksAgo = 11 - i;
    const start = weeksAgo * 7;
    const end = start + 7;
    const week = mockBookings.filter((b) => {
      const days = (TODAY.getTime() - new Date(b.createdAt).getTime()) / 86_400_000;
      return days >= start - 7 && days < end - 7 + 7;
    });
    return {
      label: weeksAgo === 0 ? 'This week' : `${weeksAgo}w ago`,
      bookings: week.length,
      gmv: week.reduce((t, b) => t + b.gross, 0),
    };
  });

  return {
    totalUsers: mockUsers.filter((u) => !u.deletedAt).length,
    usersVerified: mockUsers.filter((u) => u.verification.status === 'approved' && !u.deletedAt)
      .length,
    usersPending: mockUsers.filter((u) => u.verification.status === 'pending').length,

    totalProviders: mockProviders.length,
    providersVerified: mockProviders.filter((p) => p.verificationStatus === 'approved').length,
    providersPending: mockProviders.filter((p) => p.verificationStatus === 'pending').length,

    gmv,
    paidOutToProviders,
    commissionRetained,
    bookingsInRange: inRange.length,

    // Kept well away from the three figures above. Not ours.
    depositsCurrentlyHeld: depositsCurrentlyHeld(),

    // COUNTED FROM THE QUEUE ITSELF, not worked out again from scratch. These
    // three numbers appear on this screen, on the sidebar badge and on the bell,
    // and they used to be calculated twice — which meant the badge said 23 while
    // this screen said 30, and a staff member had no way to know which was true.
    verificationsWaiting: queue.filter((item) => item.kind === 'verification').length,
    disputesOpen: queue.filter((item) => item.kind === 'dispute').length,
    refundsPending: queue.filter((item) => item.kind === 'refund').length,

    bookingTrend,
  };
}

// ---- THE ACTION QUEUE ----
// The three queues flattened into one list, oldest first, so a staff member can
// work top to bottom rather than checking three screens in turn and forgetting
// the third. This is also what the sidebar badge counts.
export function buildQueue(): QueueItem[] {
  const daysSince = (iso: string) => (TODAY.getTime() - new Date(iso).getTime()) / 86_400_000;

  const urgency = (days: number): QueueItem['urgency'] =>
    days > 10 ? 'overdue' : days > 4 ? 'aging' : 'normal';

  const verifications: QueueItem[] = [
    ...mockProviders
      .filter((p) => p.verificationStatus === 'pending')
      .map((p) => ({
        id: `q-prov-${p.id}`,
        kind: 'verification' as const,
        title: `Verify ${p.businessName}`,
        detail: `Business application from ${p.town}, ${p.vehicleCount} vehicles submitted`,
        waitingSince: p.memberSince,
        href: `/providers/${p.id}/verification`,
        urgency: urgency(daysSince(p.memberSince)),
      })),
    ...vehiclesAwaitingReview().map((v) => {
      const oldest = v.documents
        .filter((d) => d.status === 'pending')
        .map((d) => d.uploadedAt)
        .sort()[0];
      return {
        id: `q-veh-${v.id}`,
        kind: 'verification' as const,
        title: `Review documents · ${vehicleLabel(v)}`,
        detail: `${v.providerName} · ${v.documents.filter((d) => d.status === 'pending').length} documents unread`,
        waitingSince: oldest,
        href: `/vehicles/${v.id}/verification`,
        urgency: urgency(daysSince(oldest)),
      };
    }),
  ];

  const disputes: QueueItem[] = openDisputes().map((d) => ({
    id: `q-disp-${d.id}`,
    kind: 'dispute' as const,
    title: d.subject,
    detail: d.assignedToName
      ? `${d.reference} · assigned to ${d.assignedToName}`
      : `${d.reference} · NOT ASSIGNED to anybody`,
    waitingSince: d.openedAt,
    href: `/disputes/${d.id}`,
    urgency: d.assignedToName ? urgency(daysSince(d.openedAt)) : 'overdue',
  }));

  const refunds: QueueItem[] = mockRefunds
    .filter((r) => r.status === 'pending')
    .map((r) => ({
      id: `q-ref-${r.id}`,
      kind: 'refund' as const,
      title: `Refund request · ${r.bookingRef}`,
      detail: `${r.customerName} · ${r.reasonGiven}`,
      waitingSince: r.requestedAt,
      href: '/payments/refunds',
      urgency: urgency(daysSince(r.requestedAt)),
    }));

  // Oldest at the top. The thing that has been waiting longest is the thing most
  // likely to turn into a complaint.
  return [...verifications, ...disputes, ...refunds].sort((a, b) =>
    a.waitingSince < b.waitingSince ? -1 : 1,
  );
}

// ---- ANALYTICS ----
// Figures for the three charts on the analytics screen, between any two dates.
//
// THE BUCKET SIZE FOLLOWS THE SPAN, and that is the whole trick. Somebody asking
// for the last fifty days and getting two monthly bars has been given an answer
// to a question they did not ask — the shape of fifty days is invisible at that
// resolution. So a short range is counted by day, a season by week, and a year
// or more by month. The chart adapts to the question instead of making the
// person phrase the question to suit the chart.
export type Bucket = 'day' | 'week' | 'month' | 'quarter';

// The widths, in days, and how many bars each would produce for a given span.
// Quarter is here so that a range of several years still comes out as something
// a person can read across rather than as a hundred slivers.
const BUCKET_DAYS: Record<Bucket, number> = { day: 1, week: 7, month: 30.44, quarter: 91.3 };

// ABOVE ABOUT FORTY BARS A CHART STOPS BEING READABLE — the marks get thinner
// than the gaps between them and the labels collide. Below about six it stops
// being a trend and becomes a couple of numbers. So the bucket is chosen to land
// the bar count inside that band, whatever the span.
//
// This is picked by the answer rather than by fixed thresholds, which is what
// makes an arbitrary range work: fifty days, a hundred days, eighteen months and
// five years all come out readable without anybody choosing a bucket by hand,
// and there is no span that silently overflows.
const MAX_BARS = 40;

export function bucketFor(startISO: string, endISO: string): Bucket {
  const days = Math.max(
    1,
    (new Date(endISO).getTime() - new Date(startISO).getTime()) / 86_400_000,
  );

  // The narrowest bucket that keeps the bar count under the ceiling. Ordered
  // narrowest first, so a short range still gets the detail it can support.
  const order: Bucket[] = ['day', 'week', 'month', 'quarter'];
  for (const bucket of order) {
    if (days / BUCKET_DAYS[bucket] <= MAX_BARS) return bucket;
  }

  // Longer than about ten years. Quarters is as coarse as this goes.
  return 'quarter';
}

// What to call the bucket on screen, so the chart can say what it did.
export const bucketNames: Record<Bucket, string> = {
  day: 'day',
  week: 'week',
  month: 'month',
  quarter: 'quarter',
};

// How each bucket is labelled on the axis. Short, because twelve of them share
// the width of one card.
function bucketLabel(date: Date, bucket: Bucket): string {
  if (bucket === 'quarter') {
    return `Q${Math.floor(date.getMonth() / 3) + 1} ${String(date.getFullYear()).slice(2)}`;
  }
  if (bucket === 'month') {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

// Steps the start date forward by one bucket.
function advance(date: Date, bucket: Bucket): Date {
  const next = new Date(date);
  if (bucket === 'day') next.setDate(next.getDate() + 1);
  else if (bucket === 'week') next.setDate(next.getDate() + 7);
  else if (bucket === 'month') next.setMonth(next.getMonth() + 1);
  else next.setMonth(next.getMonth() + 3);
  return next;
}

// The series between two dates, bucketed to suit the span.
export function buildSeries(
  startISO: string,
  endISO: string,
): { label: string; gmv: number; bookings: number; newUsers: number }[] {
  const bucket = bucketFor(startISO, endISO);
  const end = new Date(endISO);
  end.setHours(23, 59, 59, 999);

  // A month bucket should start on the 1st, and a week bucket on the day the
  // range starts — otherwise the first bar covers a stub of a period and reads
  // as a collapse in trade rather than as a partial bucket.
  const cursor = new Date(startISO);
  cursor.setHours(0, 0, 0, 0);
  if (bucket === 'month') cursor.setDate(1);
  if (bucket === 'quarter') {
    cursor.setMonth(Math.floor(cursor.getMonth() / 3) * 3, 1);
  }

  const out: { label: string; gmv: number; bookings: number; newUsers: number }[] = [];

  // No cap is needed here: bucketFor above has already chosen a width that keeps
  // the count inside MAX_BARS, so the loop cannot run away however long the range
  // is. An earlier version capped the output instead, which silently dropped the
  // end of any long range — the chart looked fine and was simply missing months.
  while (cursor <= end) {
    const bucketStart = new Date(cursor);
    const bucketEnd = advance(cursor, bucket);

    const inBucket = (iso: string) => {
      const d = new Date(iso);
      return d >= bucketStart && d < bucketEnd;
    };

    const bookings = mockBookings.filter((b) => inBucket(b.createdAt));

    out.push({
      label: bucketLabel(bucketStart, bucket),
      gmv: bookings.filter((b) => b.status !== 'cancelled').reduce((t, b) => t + b.gross, 0),
      bookings: bookings.length,
      newUsers: mockUsers.filter((u) => inBucket(u.memberSince)).length,
    });

    cursor.setTime(bucketEnd.getTime());
  }

  return out;
}

// The old month-count form, kept because the dashboard and the quick ranges on
// the analytics screen still think in whole months.
export function buildMonthlySeries(months: number): {
  label: string;
  gmv: number;
  bookings: number;
  newUsers: number;
}[] {
  return Array.from({ length: months }, (_, i) => {
    const monthsAgo = months - 1 - i;
    const start = new Date(TODAY);
    start.setMonth(start.getMonth() - monthsAgo, 1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const inMonth = (iso: string) => {
      const d = new Date(iso);
      return d >= start && d < end;
    };

    const bookings = mockBookings.filter((b) => inMonth(b.createdAt));

    return {
      label: start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      gmv: bookings
        .filter((b) => b.status !== 'cancelled')
        .reduce((t, b) => t + b.gross, 0),
      bookings: bookings.length,
      newUsers: mockUsers.filter((u) => inMonth(u.memberSince)).length,
    };
  });
}

// Every deposit ever taken, for the deposits screen total line. Its own function
// so nobody is tempted to fold it into the revenue maths above.
export function depositsEverTaken(): number {
  return mockDeposits.reduce((t, d) => t + d.amount, 0);
}
