'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Every booking on the platform, filterable by status,
// business and customer.
//
// THIS IS THE ONLY SCREEN IN THE COMPANY THAT SHOWS BOTH SIDES OF A BOOKING. The
// customer app shows a person their own rental. The provider dashboard shows a
// business its own bookings, deliberately without the customer's contact details.
// Staff need the whole thing on one row, because every support call is somebody
// telling one half of a story.
//
// THE FILTERS CAN BE SET FROM THE ADDRESS BAR. A link from a customer's record
// arrives here as ?customer=Aria%20Duncan with the filter already applied, so
// "show me everything this person has booked" is one click from their profile
// rather than a search somebody has to retype.

import React, { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money, shortDate } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { DataTable, CellStack, type Column } from '@/components/tables/DataTable';
import { FilterBar, FilterChips, FilterSelect } from '@/components/admin/FilterBar';
import { BOOKING_STYLE, DEPOSIT_STYLE, Note } from '@/components/admin/shared';
import { Button, MockBanner, StatusPill, Text } from '@/components/ui';
import filterStyles from '@/components/admin/admin.module.css';
import type { AdminBooking, BookingStatus } from '@/types';

type StatusFilter = 'all' | BookingStatus;

function BookingsList() {
  const router = useRouter();
  const params = useSearchParams();

  // A link from a customer or a business arrives with the search already filled
  // in. Held in state after that, so the filters can then be changed by hand.
  const [search, setSearch] = useState(
    params.get('customer') ?? params.get('provider') ?? '',
  );
  const [status, setStatus] = useState<StatusFilter>('all');
  const [provider, setProvider] = useState<string>('all');

  // Empty means no limit at either end, so the filter starts out of the way
  // and only narrows things once somebody actually types a date.
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: bookings, loading } = useAsyncData(() => apiClient.listBookings(), []);
  const { data: providers } = useAsyncData(() => apiClient.listProviders(), []);

  const rows = useMemo(() => {
    const all = bookings ?? [];
    const q = search.trim().toLowerCase();

    return all.filter((booking) => {
      if (status !== 'all' && booking.status !== status) return false;
      if (provider !== 'all' && booking.providerId !== provider) return false;

      // MATCHED ON THE RENTAL DATES, NOT THE DAY IT WAS BOOKED. Somebody asking
      // "what have we got out over Christmas" means the cars, not the orders. A
      // booking counts if any part of it falls inside the range, so a fortnight
      // that straddles the start date is not silently dropped.
      if (from && booking.endDate.slice(0, 10) < from) return false;
      if (to && booking.startDate.slice(0, 10) > to) return false;
      if (!q) return true;
      return `${booking.reference} ${booking.customerName} ${booking.providerName} ${booking.vehicleLabel}`
        .toLowerCase()
        .includes(q);
    });
  }, [bookings, search, status, provider, from, to]);

  const columns: Column<AdminBooking>[] = [
    {
      id: 'reference',
      header: 'Booking',
      sortValue: (b) => b.reference,
      cell: (b) => <CellStack title={b.reference} detail={b.vehicleLabel} />,
    },
    {
      id: 'customer',
      header: 'Customer',
      sortValue: (b) => b.customerName,
      cell: (b) => <CellStack title={b.customerName} detail={b.providerName} />,
    },
    {
      id: 'dates',
      header: 'Dates',
      sortValue: (b) => b.startDate,
      cell: (b) => (
        <CellStack
          title={`${shortDate(b.startDate)} – ${shortDate(b.endDate)}`}
          detail={`booked ${shortDate(b.createdAt)}`}
        />
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (b) => b.status,
      cell: (b) => {
        const style = BOOKING_STYLE[b.status];
        return <StatusPill label={style.label} tone={style.tone} />;
      },
    },
    {
      id: 'deposit',
      header: 'Deposit',
      sortValue: (b) => b.depositStatus,
      cell: (b) => {
        const style = DEPOSIT_STYLE[b.depositStatus];
        return (
          <CellStack
            title={<StatusPill label={style.label} tone={style.tone} />}
            detail={b.depositAmount > 0 ? money(b.depositAmount) : undefined}
          />
        );
      },
    },
    {
      id: 'gross',
      header: 'Gross',
      sortValue: (b) => b.gross,
      numeric: true,
      // The commission sits under the gross figure so the split is visible on
      // the list rather than only on the detail screen.
      cell: (b) => (
        <CellStack title={money(b.gross)} detail={`${money(b.commission)} commission`} />
      ),
    },
  ];

  const countBy = (predicate: (b: AdminBooking) => boolean) =>
    (bookings ?? []).filter(predicate).length;

  return (
    <>
      <PageHead
        title="Bookings"
        description="Every booking on the platform, both sides of it — who rented what, from whom, and what happened to the money."
      />

      <MockBanner />

      <PageCard
        title="All bookings"
        subtitle={`${rows.length} of ${(bookings ?? []).length} shown`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by reference, customer, business or vehicle"
        flush
      >
        <FilterBar>
          <FilterChips
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Out Now', count: countBy((b) => b.status === 'active') },
              { value: 'upcoming', label: 'Upcoming', count: countBy((b) => b.status === 'upcoming') },
              { value: 'completed', label: 'Completed', count: countBy((b) => b.status === 'completed') },
              { value: 'cancelled', label: 'Cancelled', count: countBy((b) => b.status === 'cancelled') },
            ]}
          />
          <FilterSelect
            label="Business"
            value={provider}
            onChange={setProvider}
            options={[
              { value: 'all', label: 'Every Business' },
              ...(providers ?? []).map((p) => ({ value: p.id, label: p.businessName })),
            ]}
          />

          <div className={filterStyles.filterGroup}>
            <Text variant="caption" tone="ink3" as="label" htmlFor="bookings-from" className={filterStyles.filterLabel} raw>
              Out between
            </Text>
            <input
              id="bookings-from"
              type="date"
              className={filterStyles.dateInput}
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
            />
            <Text variant="caption" tone="ink3" as="label" htmlFor="bookings-to" className={filterStyles.filterLabel} raw>
              and
            </Text>
            <input
              id="bookings-to"
              type="date"
              className={filterStyles.dateInput}
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
            />
            {from || to ? (
              <Button
                label="Clear"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFrom('');
                  setTo('');
                }}
              />
            ) : null}
          </div>
        </FilterBar>

        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(b) => b.id}
          rowMuted={(b) => b.status === 'cancelled'}
          loading={loading}
          initialSort={{ columnId: 'dates', direction: 'desc' }}
          emptyTitle="No bookings match"
          emptyMessage="Try a shorter search, or clear the filters above."
          rowActions={(b) => (
            <Button
              label="View"
              variant="outline"
              size="sm"
              onClick={() => router.push(`/bookings/${b.id}`)}
            />
          )}
        />
      </PageCard>

      <Note>
        The Gross column is what the customer paid. The deposit beside it is not part of that
        figure — it is held against their card and given back.
      </Note>
    </>
  );
}

export default function AdminBookingsPage() {
  // Reading the filters out of the address is something only the browser can do,
  // so Next.js needs it marked as arriving later.
  return (
    <Suspense fallback={null}>
      <BookingsList />
    </Suspense>
  );
}
