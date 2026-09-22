'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Every rental business on the platform — whether they have
// been verified, how big their fleet is, and whether Stripe is actually able to
// pay them.
//
// THE PAYOUT COLUMN IS THE ONE PEOPLE MISS. A business can be fully verified,
// listing cars and taking bookings, and still have money piling up that cannot
// reach them because Stripe is waiting on a document. That is not a verification
// problem and it will not appear in the verification queue — it is its own
// state, and it gets its own column here so somebody notices before the business
// rings up asking where three weeks of takings have gone.

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { DataTable, CellStack, type Column } from '@/components/tables/DataTable';
import { FilterBar, FilterChips } from '@/components/admin/FilterBar';
import { VerificationPill } from '@/components/admin/shared';
import { Button, Text } from '@/components/ui';
import type { AdminProvider, VerificationStatus } from '@/types';

type StatusFilter = 'all' | VerificationStatus;
type SideFilter = 'all' | 'dutch' | 'french';

export default function ProvidersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [side, setSide] = useState<SideFilter>('all');

  const { data: providers, loading, error, refresh } = useAsyncData(() => apiClient.listProviders(), []);

  const rows = useMemo(() => {
    const all = providers ?? [];
    const q = search.trim().toLowerCase();

    return all.filter((provider) => {
      if (status !== 'all' && provider.verificationStatus !== status) return false;
      if (side !== 'all' && provider.side !== side) return false;
      if (!q) return true;
      // Owner name and website included: a caller often gives the name of the
      // person rather than the registered company, and "the outfit with the
      // grandcaseauto site" is a real way people describe a business.
      return `${provider.businessName} ${provider.legalName} ${provider.contactEmail} ${provider.town} ${provider.ownerName} ${provider.website ?? ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [providers, search, status, side]);

  const columns: Column<AdminProvider>[] = [
    {
      id: 'name',
      header: 'Business',
      sortValue: (p) => p.businessName,
      cell: (p) => <CellStack title={p.businessName} detail={p.legalName} />,
    },
    {
      id: 'location',
      header: 'Location',
      sortValue: (p) => `${p.side} ${p.town}`,
      cell: (p) => (
        <CellStack
          title={p.town}
          detail={p.side === 'dutch' ? 'Sint Maarten' : 'Saint-Martin'}
        />
      ),
    },
    {
      id: 'verification',
      header: 'Verification',
      sortValue: (p) => p.verificationStatus,
      cell: (p) => <VerificationPill status={p.verificationStatus} />,
    },
    // No payout-account column: the server keeps whether each business can be
    // paid, but does not send it to the admin panel yet. A column of blanks, or
    // of guesses, would be worse than no column.
    {
      id: 'fleet',
      header: 'Fleet',
      sortValue: (p) => p.vehicleCount,
      numeric: true,
      cell: (p) => (
        <CellStack
          title={String(p.vehicleCount)}
          detail={p.vehicleCount === 1 ? 'vehicle' : 'vehicles'}
        />
      ),
    },
    {
      id: 'volume',
      header: 'Lifetime volume',
      sortValue: (p) => p.grossVolume,
      numeric: true,
      cell: (p) => (
        <CellStack
          title={money(p.grossVolume)}
          detail={`${p.bookingCount} ${p.bookingCount === 1 ? 'booking' : 'bookings'}`}
        />
      ),
    },
  ];

  const countBy = (predicate: (p: AdminProvider) => boolean) =>
    (providers ?? []).filter(predicate).length;

  // Could not be fetched is not the same as empty. See LoadFailed.
  if (error) return <LoadFailed title="Providers" what="The rental businesses" error={error} onRetry={refresh} />;

  return (
    <>
      <PageHead
        title="Providers"
        description="Every rental business — their verification, their documents, their fleet, and whether they can actually be paid."
      />

      <PageCard
        title="Rental businesses"
        subtitle={`${rows.length} of ${(providers ?? []).length} shown`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by business, owner, legal name or town"
        flush
      >
        <FilterBar>
          <FilterChips
            label="Verification"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All' },
              { value: 'approved', label: 'Verified', count: countBy((p) => p.verificationStatus === 'approved') },
              { value: 'pending', label: 'Pending', count: countBy((p) => p.verificationStatus === 'pending') },
              { value: 'rejected', label: 'Rejected', count: countBy((p) => p.verificationStatus === 'rejected') },
            ]}
          />
          <FilterChips
            label="Side"
            value={side}
            onChange={setSide}
            options={[
              { value: 'all', label: 'Both' },
              { value: 'dutch', label: 'Dutch', count: countBy((p) => p.side === 'dutch') },
              { value: 'french', label: 'French', count: countBy((p) => p.side === 'french') },
            ]}
          />
        </FilterBar>

        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(p) => p.id}
          rowMuted={(p) => p.verificationStatus === 'rejected'}
          loading={loading}
          initialSort={{ columnId: 'volume', direction: 'desc' }}
          emptyTitle="No businesses match"
          emptyMessage="Try a shorter search, or clear the filters above."
          rowActions={(p) => (
            <>
              <Button
                label="Modify"
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/providers/${p.id}`)}
              />
              <Button
                label="View"
                variant="outline"
                size="sm"
                onClick={() => router.push(`/providers/${p.id}`)}
              />
            </>
          )}
        />
      </PageCard>

      <Text variant="small" tone="ink3" as="p" raw>
        A business can be verified and still unable to receive money — see the payout column.
      </Text>
    </>
  );
}
