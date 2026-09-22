'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Open disputes — a customer and a business disagreeing
// about something, with real money resting on the answer.
//
// AN UNASSIGNED DISPUTE IS SHOWN AS A STATE, NOT AS AN EMPTY CELL. This is the
// whole reason the screen is laid out the way it is. A dispute nobody owns is
// the thing most likely to sit for a fortnight while everybody assumes somebody
// else picked it up, and a blank space in a column is the easiest thing on a
// screen to skim past. So it says NOT ASSIGNED, in red, and sorts to the top.

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money, relativeDay } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { DataTable, CellStack, type Column } from '@/components/tables/DataTable';
import { FilterBar, FilterChips } from '@/components/admin/FilterBar';
import { StatGrid, StatTile } from '@/components/admin/StatTile';
import { DISPUTE_STYLE, Note } from '@/components/admin/shared';
import { Button, StatusPill, Text } from '@/components/ui';
import type { DisputeCase } from '@/types';

type StatusFilter = 'all' | DisputeCase['status'];

export default function DisputesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const { data: disputes, loading, error, refresh } = useAsyncData(() => apiClient.listDisputes(), []);

  const all = disputes ?? [];

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((dispute) => {
      if (status !== 'all' && dispute.status !== status) return false;
      if (!q) return true;
      return `${dispute.reference} ${dispute.subject} ${dispute.customerName} ${dispute.providerName} ${dispute.bookingRef}`
        .toLowerCase()
        .includes(q);
    });
  }, [all, search, status]);

  const unassigned = all.filter((d) => d.status !== 'resolved' && !d.assignedToId);
  const open = all.filter((d) => d.status !== 'resolved');

  const columns: Column<DisputeCase>[] = [
    {
      id: 'subject',
      header: 'Dispute',
      sortValue: (d) => d.subject,
      cell: (d) => <CellStack title={d.subject} detail={`${d.reference} · ${d.bookingRef}`} />,
    },
    {
      id: 'parties',
      header: 'Between',
      sortValue: (d) => d.customerName,
      cell: (d) => (
        <CellStack
          title={d.customerName}
          detail={`and ${d.providerName} · raised by the ${d.openedBy}`}
        />
      ),
    },
    {
      id: 'assigned',
      header: 'Owner',
      // Unassigned sorts first, because it is the state that needs somebody.
      sortValue: (d) => d.assignedToName ?? '',
      cell: (d) =>
        d.assignedToName ? (
          <Text variant="small" tone="ink2" as="span" raw>
            {d.assignedToName}
          </Text>
        ) : d.status === 'resolved' ? (
          <Text variant="small" tone="ink3" as="span" raw>
            —
          </Text>
        ) : (
          // Said out loud rather than left blank. See the note at the top.
          <StatusPill label="Unassigned" tone="danger" />
        ),
    },
    {
      id: 'opened',
      header: 'Open since',
      sortValue: (d) => d.openedAt,
      cell: (d) => relativeDay(d.openedAt),
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (d) => d.status,
      cell: (d) => {
        const style = DISPUTE_STYLE[d.status];
        return <StatusPill label={style.label} tone={style.tone} />;
      },
    },
    {
      id: 'amount',
      header: 'At stake',
      sortValue: (d) => d.amountAtStake,
      numeric: true,
      cell: (d) => money(d.amountAtStake),
    },
  ];

  // Could not be fetched is not the same as empty. See LoadFailed.
  if (error) return <LoadFailed title="Disputes" what="The disputes" error={error} onRetry={refresh} />;

  return (
    <>
      <PageHead
        title="Disputes"
        description="Where a customer and a business disagree, and somebody here has to decide."
      />

      <StatGrid columns={3}>
        <StatTile
          icon="alert-circle-outline"
          label="Open"
          value={String(open.length)}
          detail="Not yet resolved"
        />
        <StatTile
          icon="person-outline"
          label="Nobody has picked up"
          value={String(unassigned.length)}
          detail={
            unassigned.length === 0
              ? 'Every open dispute has an owner'
              : 'These are the ones that get forgotten'
          }
        />
        <StatTile
          icon="cash-outline"
          label="Money at stake"
          value={money(open.reduce((t, d) => t + d.amountAtStake, 0))}
          detail="Across every open dispute"
        />
      </StatGrid>

      <PageCard
        title="All disputes"
        subtitle={`${rows.length} of ${all.length} shown`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by reference, subject, customer or business"
        flush
      >
        <FilterBar>
          <FilterChips
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All' },
              { value: 'open', label: 'Open', count: all.filter((d) => d.status === 'open').length },
              { value: 'investigating', label: 'Investigating', count: all.filter((d) => d.status === 'investigating').length },
              { value: 'resolved', label: 'Resolved', count: all.filter((d) => d.status === 'resolved').length },
            ]}
          />
        </FilterBar>

        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(d) => d.id}
          rowMuted={(d) => d.status === 'resolved'}
          loading={loading}
          initialSort={{ columnId: 'opened', direction: 'asc' }}
          emptyTitle="No disputes match"
          emptyMessage="Try a shorter search, or a different status above."
          rowActions={(d) => (
            <Button
              label="Open"
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/disputes/${d.id}`)}
            />
          )}
        />
      </PageCard>

      <Note icon="warning-outline" tone="ink2">
        A dispute with no owner is the one that sits for a fortnight while everybody assumes
        somebody else has it. Those are marked in red and sort to the top.
      </Note>
    </>
  );
}
