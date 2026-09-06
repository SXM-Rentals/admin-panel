'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Every vehicle across every rental business, and the state
// of the three documents each one needs before it can be listed.
//
// THE DOCUMENTS COLUMN COUNTS RATHER THAN SUMMARISING. "2 of 3 read" tells
// somebody there is work here and roughly how much; a single pill saying
// "Pending" does not. On a screen whose main job is working through a queue, the
// count is the useful number.

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money, vehicleClassLabels } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { DataTable, CellStack, type Column } from '@/components/tables/DataTable';
import { FilterBar, FilterChips } from '@/components/admin/FilterBar';
import { LISTING_STYLE } from '@/components/admin/shared';
import { Button, MockBanner, StatusPill, Text } from '@/components/ui';
import type { AdminVehicle } from '@/types';

type ListingFilter = 'all' | AdminVehicle['listingStatus'];
type DocFilter = 'all' | 'needs_reading';

export default function VehiclesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [listing, setListing] = useState<ListingFilter>('all');
  const [docs, setDocs] = useState<DocFilter>('all');

  const { data: vehicles, loading } = useAsyncData(() => apiClient.listVehicles(), []);

  const rows = useMemo(() => {
    const all = vehicles ?? [];
    const q = search.trim().toLowerCase();

    return all.filter((vehicle) => {
      if (listing !== 'all' && vehicle.listingStatus !== listing) return false;
      if (docs === 'needs_reading' && !vehicle.documents.some((d) => d.status === 'pending')) {
        return false;
      }
      if (!q) return true;
      return `${vehicle.make} ${vehicle.model} ${vehicle.reference} ${vehicle.providerName}`
        .toLowerCase()
        .includes(q);
    });
  }, [vehicles, search, listing, docs]);

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
      id: 'documents',
      header: 'Documents',
      sortValue: (v) => v.documents.filter((d) => d.status === 'pending').length,
      cell: (v) => {
        const pending = v.documents.filter((d) => d.status === 'pending').length;
        const rejected = v.documents.filter((d) => d.status === 'rejected').length;
        const read = v.documents.length - pending;

        if (rejected > 0) {
          return <StatusPill label={`${rejected} rejected`} tone="danger" />;
        }
        if (pending > 0) {
          return <StatusPill label={`${read} of ${v.documents.length} read`} tone="warning" />;
        }
        return <StatusPill label="All read" tone="success" />;
      },
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

  return (
    <>
      <PageHead
        title="Vehicles"
        description="Every vehicle on the platform, and the registration, insurance and roadworthiness documents that gate it."
      />

      <MockBanner />

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
          <FilterChips
            label="Documents"
            value={docs}
            onChange={setDocs}
            options={[
              { value: 'all', label: 'Any' },
              {
                value: 'needs_reading',
                label: 'Waiting to Be Read',
                count: countBy((v) => v.documents.some((d) => d.status === 'pending')),
              },
            ]}
          />
        </FilterBar>

        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(v) => v.id}
          rowMuted={(v) => v.listingStatus === 'suspended'}
          loading={loading}
          initialSort={{ columnId: 'documents', direction: 'desc' }}
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
