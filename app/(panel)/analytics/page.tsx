'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Revenue, bookings and new customers over any period —
// either one of the quick ranges, or two dates typed in by hand.
//
// THE QUICK RANGES AND THE EXACT DATES ARE THE SAME CONTROL. Pressing "Last 12
// months" fills in the two date boxes; typing in the boxes turns the chips off.
// They are two ways of setting one thing rather than two competing filters, so
// there is never a moment where the chips say one thing and the dates say
// another and nobody knows which the chart is showing.
//
// THE BUCKET SIZE FOLLOWS THE SPAN. Fifty days shown as two monthly bars is an
// answer to a question nobody asked — at that resolution the shape of fifty days
// is invisible. So a short range is counted by day, a season by week, and a year
// by month, and the chart says underneath which one it used. The server does the
// grouping; see lib/analytics.ts for how the panel knows which one it chose.
//
// THREE CHARTS, NOT ONE CHART WITH THREE LINES. Revenue is in dollars and runs
// to five figures; bookings and new customers are counts that run to two. On one
// picture either the counts flatten into a line along the bottom, or each gets
// its own scale up its own side — at which point the lines cross wherever the
// scales happen to make them cross, and the reader sees a relationship that is
// an artefact of the axis choice rather than anything about the business.

import React, { useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { bucketFor, bucketNames } from '@/lib/analytics';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money, longDate } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { StatGrid, StatTile } from '@/components/admin/StatTile';
import { Note } from '@/components/admin/shared';
import { BarChart, ChartFrame, LineChart } from '@/components/charts/Chart';
import { Icon, Skeleton, Text } from '@/components/ui';
import { cx } from '@/lib/utils';
import styles from '@/components/admin/admin.module.css';

// Today, as the date boxes show it: the person's own calendar day, not the
// server's. This used to be a fixed date — the day the sample bookings were
// built around — which would now point every chart at a window that ended
// weeks ago.
function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// The quick ranges, in days back from today. Named for what somebody would
// actually ask for rather than for a number of months.
const QUICK_RANGES: { id: string; label: string; days: number }[] = [
  { id: '30d', label: 'Last 30 Days', days: 30 },
  { id: '90d', label: 'Last 90 Days', days: 90 },
  { id: '6m', label: 'Last 6 Months', days: 182 },
  { id: '12m', label: 'Last 12 Months', days: 365 },
  { id: '24m', label: 'Last 24 Months', days: 730 },
];

function shiftDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function AnalyticsPage() {
  // The dates are the single source of truth. A quick range just sets them.
  // Fixed for as long as the screen is open, so a range picked just before
  // midnight does not shift under somebody's feet.
  const [todayISO] = useState(today);
  const [start, setStart] = useState(() => shiftDays(todayISO, 365));
  const [end, setEnd] = useState(todayISO);

  const { data: series, loading, error, refresh } = useAsyncData(
    () => apiClient.getSeries(start, end),
    [start, end],
  );

  const rows = series ?? [];

  // Which quick range, if any, the current dates happen to match. Derived rather
  // than stored, so typing a date by hand simply stops matching and the chips
  // unlight themselves — no second piece of state to keep in step.
  const activeQuick = QUICK_RANGES.find(
    (r) => r.days === Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000)
      && end === todayISO,
  )?.id;

  // A range typed backwards is the one mistake this control invites, so it is
  // caught and explained rather than silently drawing an empty chart.
  const backwards = new Date(start) > new Date(end);
  const spanDays = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000,
  );

  // Asked for rather than worked out again here. The rule for how wide a bucket
  // should be lives in one place; a second copy on this screen would drift the
  // moment either changed, and the chart would then be labelled wrongly.
  const bucketName = backwards ? 'day' : bucketNames[bucketFor(start, end)];

  const totals = useMemo(
    () => ({
      gmv: rows.reduce((t, r) => t + r.gmv, 0),
      bookings: rows.reduce((t, r) => t + r.bookings, 0),
      newUsers: rows.reduce((t, r) => t + r.newUsers, 0),
    }),
    [rows],
  );

  const applyQuick = (days: number) => {
    setStart(shiftDays(todayISO, days));
    setEnd(todayISO);
  };

  // Could not be fetched is not the same as empty. See LoadFailed.
  if (error) return <LoadFailed title="Analytics" what="The figures" error={error} onRetry={refresh} />;

  return (
    <>
      <PageHead
        title="Analytics"
        description="How the platform is moving — money, bookings and new customers, over whatever period you ask for."
      />

      {/* ---- THE PERIOD ---- */}
      <PageCard title="Period" subtitle={backwards ? undefined : `${longDate(start)} to ${longDate(end)}`}>
        <div className={styles.rangeRow}>
          <div className={styles.filterGroup}>
            <Text variant="caption" tone="ink3" as="span" className={styles.filterLabel} raw>
              Quick
            </Text>
            {QUICK_RANGES.map((range) => (
              <button
                key={range.id}
                type="button"
                className={cx(styles.rangeChip, activeQuick === range.id && styles.rangeChipOn)}
                onClick={() => applyQuick(range.days)}
                aria-pressed={activeQuick === range.id}
              >
                {range.label}
              </button>
            ))}
          </div>

          <div className={styles.filterGroup}>
            <Text variant="caption" tone="ink3" as="label" htmlFor="range-start" className={styles.filterLabel} raw>
              From
            </Text>
            <input
              id="range-start"
              type="date"
              className={styles.dateInput}
              value={start}
              max={end}
              onChange={(event) => setStart(event.target.value)}
            />

            <Text variant="caption" tone="ink3" as="label" htmlFor="range-end" className={styles.filterLabel} raw>
              To
            </Text>
            <input
              id="range-end"
              type="date"
              className={styles.dateInput}
              value={end}
              min={start}
              onChange={(event) => setEnd(event.target.value)}
            />
          </div>
        </div>

        {backwards ? (
          <div className={styles.openQuestion} style={{ marginTop: 'var(--space-lg)' }}>
            <Icon name="warning-outline" size={16} color="var(--warning)" />
            <Text variant="small" as="p" raw>
              The start date is after the end date, so there is nothing to show. Swap them round.
            </Text>
          </div>
        ) : (
          <div style={{ marginTop: 'var(--space-lg)' }}>
            <Note>
              {spanDays.toLocaleString()} {spanDays === 1 ? 'day' : 'days'}, counted by{' '}
              {bucketName}, giving {rows.length} {rows.length === 1 ? 'bar' : 'bars'}. The width
              is chosen from the span so the chart always lands somewhere readable — any range
              works, from a few days to several years.
            </Note>
          </div>
        )}
      </PageCard>

      <StatGrid columns={3}>
        <StatTile
          icon="cash-outline"
          label="Gross booking value"
          value={money(totals.gmv)}
          detail="Everything customers paid, before the split"
        />
        <StatTile
          icon="calendar-outline"
          label="Bookings"
          value={totals.bookings.toLocaleString()}
          detail={
            spanDays > 0
              ? `${(totals.bookings / (spanDays / 30)).toFixed(1)} a month on average`
              : 'Over the chosen period'
          }
        />
        <StatTile
          icon="people-outline"
          label="New customers"
          value={totals.newUsers.toLocaleString()}
          detail="Accounts created in the period"
        />
      </StatGrid>

      {loading ? (
        <Skeleton height={720} />
      ) : rows.length === 0 ? (
        <PageCard title="Nothing in this period">
          <Note>
            No bookings or sign-ups fall between those two dates. Try widening the range.
          </Note>
        </PageCard>
      ) : (
        <div className={styles.sectionStack}>
          <PageCard>
            <ChartFrame
              title="Revenue"
              subtitle={`Gross booking value by ${bucketName}, in dollars`}
              valueColumn="Gross value"
              points={rows.map((r) => ({ label: r.label, value: r.gmv }))}
              format={(value) => money(value)}
            >
              <LineChart
                points={rows.map((r) => ({ label: r.label, value: r.gmv }))}
                color="var(--chart-1)"
                format={(value) => money(value)}
              />
            </ChartFrame>
          </PageCard>

          <PageCard>
            <ChartFrame
              title="Bookings"
              subtitle={`How many bookings were made, by ${bucketName}`}
              valueColumn="Bookings"
              points={rows.map((r) => ({ label: r.label, value: r.bookings }))}
              format={(value) => value.toLocaleString()}
            >
              <BarChart
                points={rows.map((r) => ({ label: r.label, value: r.bookings }))}
                color="var(--chart-2)"
                format={(value) => value.toLocaleString()}
              />
            </ChartFrame>
          </PageCard>

          <PageCard>
            <ChartFrame
              title="New customers"
              subtitle={`Accounts created, by ${bucketName}`}
              valueColumn="New accounts"
              points={rows.map((r) => ({ label: r.label, value: r.newUsers }))}
              format={(value) => value.toLocaleString()}
            >
              <BarChart
                points={rows.map((r) => ({ label: r.label, value: r.newUsers }))}
                color="var(--chart-3)"
                format={(value) => value.toLocaleString()}
              />
            </ChartFrame>
          </PageCard>
        </div>
      )}

      <Note>
        Each chart has one measure on one scale. Revenue runs to five figures and the counts to
        two, so putting them on one picture would either flatten the counts or need two
        different scales — and lines drawn against different scales cross wherever the scales
        make them cross, which looks like a finding and is not one.
      </Note>
    </>
  );
}
