'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Every vehicle across every rental business, and whether
// each one is listed for customers to book.
//
// THERE IS NO DOCUMENTS COLUMN ANY MORE, and that is a deliberate trade. It used
// to say "2 of 3 read" on every row. The server sends a vehicle's paperwork only
// when that one vehicle is opened, not with the list — sending every document
// for every car just to draw a list would be most of the answer and none of the
// point. Asking for each car separately to fill the column would be one request
// per row. So the work of reading documents is found where it already lives: in
// the Action Queue, where every document waiting to be read has its own line,
// and on each vehicle's own screen.

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money, vehicleClassLabels } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { DataTable, CellStack, type Column } from '@/components/tables/DataTable';
import { FilterBar, FilterChips } from '@/components/admin/FilterBar';
import { LISTING_STYLE } from '@/components/admin/shared';
import { Button, StatusPill, Text } from '@/components/ui';
import type { AdminVehicle } from '@/types';

type ListingFilter = 'all' | AdminVehicle['listingStatus'];

export default function VehiclesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [listing, setListing] = useState<ListingFilter>('all');

  const { data: vehicles, loading, error, refresh } = useAsyncData(() => apiClient.listVehicles(), []);

  const rows = useMemo(() => {
    const all = vehicles ?? [];
    const q = search.trim().toLowerCase();

    return all.filter((vehicle) => {
      if (listing !== 'all' && vehicle.listingStatus !== listing) return false;
      if (!q) return true;
      return `${vehicle.make} ${vehicle.model} ${vehicle.reference} ${vehicle.providerName}`
        .toLowerCase()
        .includes(q);
    });
  }, [vehicles, search, listing]);

  const columns: Column<AdminVehicle>[] = [
    {
      id: 'vehicle',
      header: 'Vehicle',
      sortValue: (v) => `${v.make} ${v.model}`,
      cell: (v) => (
        <CellStack title={`${v.make} ${v.model} ${v.year}`} detail={v.reference} />
      ),
    },
    {
      id: 'provider',
      header: 'Business',
      sortValue: (v) => v.providerName,
      cell: (v) => (
        <CellStack
          title={v.providerName}
          detail={v.side === 'dutch' ? 'Dutch side' : 'French side'}
        />
      ),
    },
    {
      id: 'class',
      header: 'Class',
      sortValue: (v) => v.vehicleClass,
      cell: (v) => (
        <Text variant="small" tone="ink2" as="span" raw>
          {vehicleClassLabels[v.vehicleClass] ?? v.vehicleClass}
        </Text>
      ),
    },
    {
      id: 'listing',
      header: 'Listing',
      sortValue: (v) => v.listingStatus,
      cell: (v) => {
        const style = LISTING_STYLE[v.listingStatus];
        return <StatusPill label={style.label} tone={style.tone} />;
      },
    },
    {
      id: 'rate',
      header: 'Daily rate',
      sortValue: (v) => v.dailyRate,
      numeric: true,
      cell: (v) => money(v.dailyRate),
    },
  ];

  const countBy = (predicate: (v: AdminVehicle) => boolean) =>
    (vehicles ?? []).filter(predicate).length;

  // Could not be fetched is not the same as empty. See LoadFailed.
  if (error) return <LoadFailed title="Vehicles" what="The vehicles" error={error} onRetry={refresh} />;

  return (
    <>
      <PageHead
        title="Vehicles"
        description="Every vehicle on the platform, and whether customers can book it. Each vehicle's documents are on its own screen; the ones waiting to be read are in the Action Queue."
      />

      <PageCard
        title="Fleet"
        subtitle={`${rows.length} of ${(vehicles ?? []).length} shown`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by make, model, reference or business"
        flush
      >
        <FilterBar>
          <FilterChips
            label="Listing"
            value={listing}
            onChange={setListing}
            options={[
              { value: 'all', label: 'All' },
              { value: 'live', label: 'Live', count: countBy((v) => v.listingStatus === 'live') },
              { value: 'pending_review', label: 'Awaiting Review', count: countBy((v) => v.listingStatus === 'pending_review') },
              { value: 'suspended', label: 'Suspended', count: countBy((v) => v.listingStatus === 'suspended') },
            ]}
          />
        </FilterBar>

        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(v) => v.id}
          rowMuted={(v) => v.listingStatus === 'suspended'}
          loading={loading}
          initialSort={{ columnId: 'listing', direction: 'asc' }}
          emptyTitle="No vehicles match"
          emptyMessage="Try a shorter search, or clear the filters above."
          rowActions={(v) => (
            <>
              <Button
                label="Review"
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/vehicles/${v.id}/verification`)}
              />
              <Button
                label="View"
                variant="outline"
                size="sm"
                onClick={() => router.push(`/providers/${v.providerId}`)}
              />
            </>
          )}
        />
      </PageCard>
    </>
  );
}
