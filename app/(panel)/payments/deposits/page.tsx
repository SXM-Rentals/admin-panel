'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The security deposit ledger — every deposit through its
// four states: authorised against a card, held during the rental, and then
// either released back or claimed against damage.
//
// WHY DEPOSITS HAVE THEIR OWN SCREEN, AWAY FROM PAYMENTS. A deposit is not
// revenue and never becomes revenue. It is the customer's money, held against
// damage and given back when the vehicle comes home. The platform takes no
// commission on it and is not owed any of it. Keeping it in its own ledger, with
// its own total, is what stops it drifting into a figure labelled as earnings —
// which would overstate the size of the business and, worse, overstate what it
// is owed.
//
// CLAIMING A DEPOSIT IS THE MOST DISPUTABLE THING THIS PLATFORM CAN DO. Keeping
// somebody's money is what produces the angry phone call, the chargeback and the
// review. So a claim cannot be made without a written reason, and the reason
// should say what the damage was, what it cost, and what went back — because
// that is the sentence somebody will have to read out later.

import React, { useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money, shortDate } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { DataTable, CellStack, type Column } from '@/components/tables/DataTable';
import { FilterBar, FilterChips } from '@/components/admin/FilterBar';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { StatGrid, StatTile } from '@/components/admin/StatTile';
import { DEPOSIT_STYLE, DepositNotRevenueNote, Quote } from '@/components/admin/shared';
import { Button, StatusPill, Text } from '@/components/ui';
import type { DepositLedgerEntry, DepositStatus } from '@/types';

type StatusFilter = 'all' | DepositStatus;

export default function DepositsLedgerPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [acting, setActing] = useState<{ deposit: DepositLedgerEntry; action: 'claim' | 'release' } | null>(null);

  const { data: deposits, loading, error, refresh } = useAsyncData(() => apiClient.getDeposits(), []);

  const all = deposits ?? [];

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((deposit) => {
      if (status !== 'all' && deposit.status !== status) return false;
      if (!q) return true;
      return `${deposit.bookingRef} ${deposit.customerName} ${deposit.providerName}`
        .toLowerCase()
        .includes(q);
    });
  }, [all, search, status]);

  const sumWhere = (predicate: (d: DepositLedgerEntry) => boolean) =>
    all.filter(predicate).reduce((t, d) => t + d.amount, 0);

  // WHAT WAS ACTUALLY KEPT, NOT WHAT WAS HELD. Part of a deposit can be kept —
  // $240 against a kerbed wheel, the rest returned — so adding up the whole
  // deposit for every claim would overstate what the platform kept by the part
  // that went back. The server says how much of each was kept; a claim from
  // before it did is counted whole.
  const keptOf = (d: DepositLedgerEntry) => d.claimedAmount ?? d.amount;
  const totalKept = all.filter((d) => d.status === 'claimed').reduce((t, d) => t + keptOf(d), 0);

  const columns: Column<DepositLedgerEntry>[] = [
    {
      id: 'booking',
      header: 'Booking',
      sortValue: (d) => d.bookingRef,
      cell: (d) => <CellStack title={d.bookingRef} detail={d.customerName} />,
    },
    {
      id: 'provider',
      header: 'Business',
      sortValue: (d) => d.providerName,
      cell: (d) => (
        <Text variant="small" tone="ink2" as="span" raw>
          {d.providerName}
        </Text>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (d) => d.status,
      cell: (d) => {
        const style = DEPOSIT_STYLE[d.status];
        return <StatusPill label={style.label} tone={style.tone} />;
      },
    },
    {
      id: 'authorized',
      header: 'Authorised',
      sortValue: (d) => d.authorizedAt ?? '',
      // A deposit that was never taken has no moment of authorising to show.
      cell: (d) => (d.authorizedAt ? shortDate(d.authorizedAt) : 'Not taken'),
    },
    {
      id: 'settled',
      header: 'Given back / kept',
      sortValue: (d) => d.releasedAt ?? d.claimedAt ?? '',
      cell: (d) =>
        d.releasedAt ? (
          <CellStack title={shortDate(d.releasedAt)} detail="released in full" />
        ) : d.claimedAt ? (
          <CellStack
            title={shortDate(d.claimedAt)}
            detail={`kept ${money(keptOf(d))} of ${money(d.amount)}`}
          />
        ) : (
          <Text variant="small" tone="ink3" as="span" raw>
            Still open
          </Text>
        ),
    },
    {
      id: 'amount',
      header: 'Amount',
      sortValue: (d) => d.amount,
      numeric: true,
      cell: (d) => money(d.amount),
    },
  ];

  const countBy = (s: DepositStatus) => all.filter((d) => d.status === s).length;

  // Could not be fetched is not the same as none on file. See LoadFailed.
  if (error) return <LoadFailed title="Deposits" what="The deposits" error={error} onRetry={refresh} />;

  return (
    <>
      <PageHead
        title="Deposits"
        description="Every security deposit through its life: authorised, held, and then released back or claimed against damage."
      />

      <StatGrid>
        <StatTile
          variant="held"
          icon="wallet-outline"
          label="Held right now"
          value={money(sumWhere((d) => d.status === 'held'))}
          detail="Customers’ money on the platform — not ours"
        />
        <StatTile
          icon="checkmark-circle-outline"
          label="Released"
          value={money(sumWhere((d) => d.status === 'released'))}
          detail="Given back in full"
        />
        <StatTile
          icon="alert-circle-outline"
          label="Kept against damage"
          value={money(totalKept)}
          detail="Only the part of each claimed deposit that was kept, each with a reason on file"
        />
        <StatTile
          icon="documents-outline"
          label="Deposits on file"
          value={String(all.length)}
          detail="Across every booking"
        />
      </StatGrid>

      <PageCard
        title="Deposit ledger"
        subtitle={`${rows.length} of ${all.length} shown`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by booking, customer or business"
        flush
      >
        <FilterBar>
          <FilterChips
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All' },
              { value: 'held', label: 'Held', count: countBy('held') },
              { value: 'released', label: 'Released', count: countBy('released') },
              { value: 'claimed', label: 'Claimed', count: countBy('claimed') },
            ]}
          />
        </FilterBar>

        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(d) => d.id}
          loading={loading}
          initialSort={{ columnId: 'authorized', direction: 'desc' }}
          pageSize={25}
          emptyTitle="No deposits match"
          emptyMessage="Try a shorter search, or clear the filters above."
          rowActions={(d) =>
            d.status === 'held' ? (
              <>
                <Button
                  label="Release"
                  variant="secondary"
                  size="sm"
                  onClick={() => setActing({ deposit: d, action: 'release' })}
                />
                <Button
                  label="Claim"
                  variant="outline"
                  size="sm"
                  onClick={() => setActing({ deposit: d, action: 'claim' })}
                />
              </>
            ) : null
          }
        />
      </PageCard>

      {/* ---- THE CLAIMED ONES, SPELLED OUT ----
          A claimed deposit is the row somebody will be asked to explain, so the
          reason is shown in full here rather than hidden behind a hover. */}
      {all.some((d) => d.status === 'claimed') ? (
        <PageCard
          title="Claims made"
          subtitle="Every deposit kept, and the reason recorded at the time"
        >
          <div className={'sectionStack'} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {all
              .filter((d) => d.status === 'claimed')
              .map((d) => (
                <div key={d.id}>
                  <Text variant="label" as="p" raw>
                    {d.bookingRef} · {d.customerName} · kept {money(keptOf(d))} of a{' '}
                    {money(d.amount)} deposit
                  </Text>
                  <Quote>{d.claimReason ?? 'No reason was recorded — this should not happen.'}</Quote>
                </div>
              ))}
          </div>
        </PageCard>
      ) : null}

      <DepositNotRevenueNote>
        None of the figures on this screen are revenue. A deposit is authorised against the
        customer’s card and given back when the vehicle returns; the platform takes no
        commission on it and is not owed any part of it. The Payments screen is where the money
        the platform actually earned lives.
      </DepositNotRevenueNote>

      <ReasonDialog
        open={acting !== null}
        onClose={() => setActing(null)}
        title={acting?.action === 'claim' ? 'Claim against this deposit' : 'Release this deposit'}
        description={
          acting
            ? acting.action === 'claim'
              ? `Keeping part or all of the ${money(acting.deposit.amount)} held from ${acting.deposit.customerName}. Enter how much to keep — whatever is not kept goes back to them — and write what the damage was and what it cost.`
              : `Returning ${money(acting.deposit.amount)} to ${acting.deposit.customerName} in full.`
            : undefined
        }
        confirmLabel={acting?.action === 'claim' ? 'Claim deposit' : 'Release deposit'}
        destructive={acting?.action === 'claim'}
        reasonPlaceholder={
          acting?.action === 'claim'
            ? 'e.g. Kerbed alloy on the front nearside, photographed at return and agreed with the renter. $240 retained against the repair quote, $260 returned.'
            : 'e.g. Vehicle returned on time and undamaged.'
        }
        change={{
          subjectLabel: `${acting?.deposit.bookingRef ?? ''} · ${acting?.deposit.customerName ?? ''}`,
          field: 'Security deposit',
          before: `Held · ${money(acting?.deposit.amount ?? 0)}`,
          after: acting?.action === 'claim' ? 'Claimed' : 'Released',
        }}
        // Only a claim asks for an amount, and never more than is held.
        amount={
          acting?.action === 'claim'
            ? { label: 'Amount to keep', max: acting.deposit.amount }
            : undefined
        }
        onConfirm={async (reason, amount) => {
          if (!acting) return;
          if (acting.action === 'claim') {
            // The dialog will not let this through without a valid amount.
            await apiClient.claimDeposit(acting.deposit.id, amount ?? 0, reason);
          } else {
            await apiClient.releaseDeposit(acting.deposit.id, reason);
          }
          refresh();
        }}
      />
    </>
  );
}
