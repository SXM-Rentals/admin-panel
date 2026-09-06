'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The payment ledger — every movement of rental money on
// the platform. What a customer was charged, what went on to the business, what
// the platform kept, and anything refunded.
//
// THERE ARE NO DEPOSITS ON THIS SCREEN, and that is not an omission. A deposit
// is not a payment: nobody has been charged, the platform earns nothing from it,
// and it is owed back in full. Putting it in this ledger would make every total
// on this screen wrong. It has its own ledger, on its own screen, with its own
// total — see Deposits in the sidebar.
//
// THE FOUR KINDS ARE COLOURED, NOT JUST LABELLED, because this is a screen
// somebody scans rather than reads. A refund going the other way should be
// visible without reading the row.

import React, { useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money, stamp } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { DataTable, CellStack, type Column } from '@/components/tables/DataTable';
import { FilterBar, FilterChips } from '@/components/admin/FilterBar';
import { StatGrid, StatTile } from '@/components/admin/StatTile';
import { Note } from '@/components/admin/shared';
import { MockBanner, StatusPill, Text } from '@/components/ui';
import type { LedgerEntry } from '@/types';
import type { StatusTone } from '@/components/ui';

const KIND_STYLE: Record<LedgerEntry['kind'], { label: string; tone: StatusTone }> = {
  charge: { label: 'Charge', tone: 'brand' },
  commission: { label: 'Commission', tone: 'success' },
  payout: { label: 'Payout', tone: 'neutral' },
  refund: { label: 'Refund', tone: 'danger' },
};

const STATUS_STYLE: Record<LedgerEntry['status'], { label: string; tone: StatusTone }> = {
  succeeded: { label: 'Succeeded', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' },
};

type KindFilter = 'all' | LedgerEntry['kind'];

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');

  const { data: ledger, loading } = useAsyncData(() => apiClient.getLedger(), []);

  const all = ledger ?? [];

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((entry) => {
      if (kind !== 'all' && entry.kind !== kind) return false;
      if (!q) return true;
      return `${entry.bookingRef} ${entry.customerName} ${entry.providerName} ${entry.stripeRef}`
        .toLowerCase()
        .includes(q);
    });
  }, [all, search, kind]);

  // The three totals, worked out from the ledger itself so they cannot disagree
  // with the rows underneath them.
  const totals = useMemo(() => {
    const sum = (k: LedgerEntry['kind']) =>
      all.filter((e) => e.kind === k && e.status !== 'failed').reduce((t, e) => t + e.amount, 0);
    return { charged: sum('charge'), commission: sum('commission'), payout: sum('payout'), refunded: sum('refund') };
  }, [all]);

  const columns: Column<LedgerEntry>[] = [
    {
      id: 'at',
      header: 'When',
      sortValue: (e) => e.at,
      cell: (e) => <CellStack title={stamp(e.at)} detail={e.stripeRef} />,
    },
    {
      id: 'booking',
      header: 'Booking',
      sortValue: (e) => e.bookingRef,
      cell: (e) => <CellStack title={e.bookingRef} detail={e.customerName} />,
    },
    {
      id: 'provider',
      header: 'Business',
      sortValue: (e) => e.providerName,
      cell: (e) => (
        <Text variant="small" tone="ink2" as="span" raw>
          {e.providerName}
        </Text>
      ),
    },
    {
      id: 'kind',
      header: 'Kind',
      sortValue: (e) => e.kind,
      cell: (e) => {
        const style = KIND_STYLE[e.kind];
        return <StatusPill label={style.label} tone={style.tone} />;
      },
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (e) => e.status,
      cell: (e) => {
        const style = STATUS_STYLE[e.status];
        return <StatusPill label={style.label} tone={style.tone} />;
      },
    },
    {
      id: 'amount',
      header: 'Amount',
      sortValue: (e) => e.amount,
      numeric: true,
      cell: (e) => (
        <Text
          variant="label"
          as="span"
          raw
          // A refund is a negative number and reads as one. Making it look like
          // any other row is how a total ends up being read the wrong way round.
          tone={e.amount < 0 ? 'danger' : 'ink'}
        >
          {money(e.amount)}
        </Text>
      ),
    },
  ];

  const countBy = (k: LedgerEntry['kind']) => all.filter((e) => e.kind === k).length;

  return (
    <>
      <PageHead
        title="Payments"
        description="Every movement of rental money — what was charged, what was paid out, what was kept, and what went back."
      />

      <MockBanner />

      <StatGrid>
        <StatTile
          icon="cash-outline"
          label="Charged to customers"
          value={money(totals.charged)}
          detail="Gross, before the split"
        />
        <StatTile
          icon="storefront-outline"
          label="Paid out to businesses"
          value={money(totals.payout)}
          detail="Their share, after commission"
        />
        <StatTile
          icon="card-outline"
          label="Commission kept"
          value={money(totals.commission)}
          detail="What SXM Rentals earned"
        />
        <StatTile
          icon="swap-horizontal"
          label="Refunded"
          value={money(Math.abs(totals.refunded))}
          detail="Money given back to customers"
        />
      </StatGrid>

      <PageCard
        title="Ledger"
        subtitle={`${rows.length} of ${all.length} lines`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by booking, customer, business or Stripe reference"
        flush
      >
        <FilterBar>
          <FilterChips
            label="Kind"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'all', label: 'All' },
              { value: 'charge', label: 'Charges', count: countBy('charge') },
              { value: 'payout', label: 'Payouts', count: countBy('payout') },
              { value: 'commission', label: 'Commission', count: countBy('commission') },
              { value: 'refund', label: 'Refunds', count: countBy('refund') },
            ]}
          />
        </FilterBar>

        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(e) => e.id}
          loading={loading}
          initialSort={{ columnId: 'at', direction: 'desc' }}
          pageSize={25}
          emptyTitle="No payments match"
          emptyMessage="Try a shorter search, or clear the filters above."
        />
      </PageCard>

      <Note icon="wallet-outline" tone="ink2">
        Security deposits are not in this ledger. A deposit is not a payment — nobody is charged,
        the platform earns nothing from it, and it is owed back in full. It has its own ledger
        under Deposits.
      </Note>
    </>
  );
}
