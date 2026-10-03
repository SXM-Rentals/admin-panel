'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The businesses that sent us their own records — a
// spreadsheet, photos of a ledger, a list in an email — and asked us to put their
// cars on SXM Rentals for them. Waiting ones first.
//
// WHY THIS SCREEN EXISTS AT ALL. Plenty of rental operators on this island do not
// keep their fleet in software, and telling them "add your cars one by one in the
// app" is telling them to go elsewhere. So they can hand us what they have and we
// do it for them, and this is the list of that work.
//
// THE ACTION QUEUE HAS BEEN SENDING PEOPLE HERE FOR DAYS. The server puts these
// in the queue with a link to /fleet-requests/:id, which did not exist until now —
// the link went nowhere and the queue screen could not even draw the row. That is
// the other half of this change; see the queue screen.

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { relativeDay } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { CellStack, DataTable, type Column } from '@/components/tables/DataTable';
import { FilterBar, FilterChips } from '@/components/admin/FilterBar';
import { Note } from '@/components/admin/shared';
import { Button, StatusPill, Text } from '@/components/ui';
import type { FleetRequest } from '@/types';

type Which = 'waiting' | 'done' | 'all';

export default function FleetRequestsPage() {
  const router = useRouter();
  const [which, setWhich] = useState<Which>('waiting');

  // Asked of the server rather than filtered here: it already sorts waiting
  // first and oldest first, which is the order this work should be done in.
  const { data: requests, loading, error, refresh } = useAsyncData(
    () => apiClient.listFleetRequests(which === 'all' ? undefined : which),
    [which],
  );

  const rows = requests ?? [];

  const columns: Column<FleetRequest>[] = [
    {
      id: 'business',
      header: 'Business',
      sortValue: (r) => r.businessName,
      cell: (r) => <CellStack title={r.businessName} detail={r.contact} />,
    },
    {
      id: 'fleet',
      header: 'Cars to add',
      sortValue: (r) => r.fleetSize,
      numeric: true,
      cell: (r) => (
        <CellStack title={String(r.fleetSize)} detail={r.fleetSize === 1 ? 'vehicle' : 'vehicles'} />
      ),
    },
    {
      id: 'format',
      header: 'What they sent',
      sortValue: (r) => r.recordFormat,
      cell: (r) => (
        <CellStack
          title={r.recordFormat || 'Not said'}
          detail={
            r.files.length === 0
              ? 'No files attached'
              : `${r.files.length} ${r.files.length === 1 ? 'file' : 'files'}`
          }
        />
      ),
    },
    {
      id: 'asked',
      header: 'Asked',
      sortValue: (r) => r.createdAt,
      cell: (r) => relativeDay(r.createdAt),
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (r) => (r.status === 'waiting' ? 0 : 1),
      cell: (r) =>
        r.status === 'waiting' ? (
          <StatusPill label="Waiting" tone="warning" />
        ) : (
          <StatusPill label="Done" tone="success" />
        ),
    },
  ];

  // Could not be fetched is not the same as none. See LoadFailed.
  if (error) {
    return <LoadFailed title="Fleet Set-up" what="These requests" error={error} onRetry={refresh} />;
  }

  return (
    <>
      <PageHead
        title="Fleet Set-up"
        description="Businesses that sent us their records and asked us to put their cars on for them."
      />

      <PageCard title="Requests" subtitle={`${rows.length} shown`} flush>
        <FilterBar>
          <FilterChips
            label="Status"
            value={which}
            onChange={setWhich}
            options={[
              { value: 'waiting', label: 'Waiting' },
              { value: 'done', label: 'Done' },
              { value: 'all', label: 'All' },
            ]}
          />
        </FilterBar>

        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          rowMuted={(r) => r.status === 'done'}
          loading={loading}
          initialSort={{ columnId: 'asked', direction: 'asc' }}
          emptyTitle={which === 'done' ? 'None finished yet' : 'Nothing waiting'}
          emptyMessage={
            which === 'done'
              ? 'Requests appear here once their cars are on.'
              : 'When a business asks us to set its fleet up, it appears here.'
          }
          rowActions={(r) => (
            <Button
              label="Open"
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/fleet-requests/${r.id}`)}
            />
          )}
        />
      </PageCard>

      <div style={{ marginTop: 'var(--space-lg)' }}>
        <Note icon="warning-outline" tone="ink2">
          What a business sent is its own paperwork. Open a request to download a file; nothing is
          shown inside the panel, and the contact detail above was given for this job rather than for
          general use.
        </Note>
      </div>

      <Text variant="small" tone="ink3" as="p" raw>
        Oldest first, because the one waiting longest is the one to do next.
      </Text>
    </>
  );
}
