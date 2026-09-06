'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Every customer on the platform — search them, see whether
// their identity check passed, whether they are a resident or a visitor, and
// what rewards tier they are on.
//
// THE SEARCH LOOKS AT NAME, EMAIL AND PHONE TOGETHER, because somebody on a
// support call has whichever one the customer read out. Making them choose which
// field they are searching is making them do the computer's job.
//
// CLOSED ACCOUNTS STAY IN THE LIST, dimmed. It is tempting to hide them, but the
// audit log points at them — an entry reading "deleted the account of Noelia
// Vlaun" is unreadable if there is no Noelia Vlaun to look at. Dimmed and marked
// is the honest middle: over, but still there.

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money, shortDate } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { DataTable, CellStack, type Column } from '@/components/tables/DataTable';
import { FilterBar, FilterChips } from '@/components/admin/FilterBar';
import { VerificationPill } from '@/components/admin/shared';
import { Button, MockBanner, StatusPill, Text } from '@/components/ui';
import type { AdminUser, VerificationStatus } from '@/types';

type StatusFilter = 'all' | VerificationStatus;
type TypeFilter = 'all' | 'local' | 'tourist';

export default function UsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [accountType, setAccountType] = useState<TypeFilter>('all');

  const { data: users, loading } = useAsyncData(() => apiClient.listUsers(), []);

  const rows = useMemo(() => {
    const all = users ?? [];
    const q = search.trim().toLowerCase();

    return all.filter((user) => {
      if (status !== 'all' && user.verification.status !== status) return false;
      if (accountType !== 'all' && user.accountType !== accountType) return false;
      if (!q) return true;
      return `${user.firstName} ${user.lastName} ${user.email} ${user.phone}`
        .toLowerCase()
        .includes(q);
    });
  }, [users, search, status, accountType]);

  const columns: Column<AdminUser>[] = [
    {
      id: 'name',
      header: 'Customer',
      sortValue: (u) => `${u.lastName} ${u.firstName}`,
      cell: (u) => (
        <CellStack title={`${u.firstName} ${u.lastName}`} detail={u.email} />
      ),
    },
    {
      id: 'joined',
      header: 'Joined',
      sortValue: (u) => u.memberSince,
      cell: (u) => (
        <CellStack title={shortDate(u.memberSince)} detail={u.phone} />
      ),
    },
    {
      id: 'type',
      header: 'Account type',
      sortValue: (u) => u.accountType,
      cell: (u) => (
        <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <StatusPill
            label={u.accountType === 'local' ? 'Local' : 'Tourist'}
            tone={u.accountType === 'local' ? 'brand' : 'neutral'}
            dot={false}
          />
          {/* Islander is a residency flag, not a loyalty tier — it is shown
              beside the account type rather than beside the points. */}
          {u.isIslander ? <StatusPill label="Islander" tone="success" dot={false} /> : null}
        </span>
      ),
    },
    {
      id: 'verification',
      header: 'Verification',
      sortValue: (u) => u.verification.status,
      cell: (u) => <VerificationPill status={u.verification.status} />,
    },
    {
      id: 'tier',
      header: 'Rewards',
      sortValue: (u) => u.points,
      numeric: true,
      cell: (u) => (
        <CellStack
          title={u.points.toLocaleString()}
          detail={u.tier.charAt(0).toUpperCase() + u.tier.slice(1)}
        />
      ),
    },
    {
      id: 'spend',
      header: 'Lifetime spend',
      sortValue: (u) => u.lifetimeSpend,
      numeric: true,
      cell: (u) => (
        <CellStack
          title={money(u.lifetimeSpend)}
          detail={`${u.bookingCount} ${u.bookingCount === 1 ? 'booking' : 'bookings'}`}
        />
      ),
    },
  ];

  const countBy = (predicate: (u: AdminUser) => boolean) => (users ?? []).filter(predicate).length;

  return (
    <>
      <PageHead
        title="Users"
        description="Every customer account — identity checks, resident or visitor, and where they are in the rewards programme."
      />

      <MockBanner />

      <PageCard
        title="Customers"
        subtitle={`${rows.length} of ${(users ?? []).length} shown`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email or phone"
        flush
      >
        <FilterBar>
          <FilterChips
            label="Verification"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All' },
              { value: 'approved', label: 'Verified', count: countBy((u) => u.verification.status === 'approved') },
              { value: 'pending', label: 'Pending', count: countBy((u) => u.verification.status === 'pending') },
              { value: 'rejected', label: 'Rejected', count: countBy((u) => u.verification.status === 'rejected') },
            ]}
          />
          <FilterChips
            label="Type"
            value={accountType}
            onChange={setAccountType}
            options={[
              { value: 'all', label: 'All' },
              { value: 'local', label: 'Local', count: countBy((u) => u.accountType === 'local') },
              { value: 'tourist', label: 'Tourist', count: countBy((u) => u.accountType === 'tourist') },
            ]}
          />
        </FilterBar>

        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(u) => u.id}
          rowMuted={(u) => Boolean(u.deletedAt)}
          loading={loading}
          initialSort={{ columnId: 'joined', direction: 'desc' }}
          emptyTitle="No customers match"
          emptyMessage="Try a shorter search, or clear the filters above."
          rowActions={(u) => (
            <>
              <Button
                label="Modify"
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/users/${u.id}`)}
              />
              <Button
                label="View"
                variant="outline"
                size="sm"
                onClick={() => router.push(`/users/${u.id}`)}
              />
            </>
          )}
        />
      </PageCard>

      <Text variant="small" tone="ink3" as="p" raw>
        Closed accounts stay in this list, dimmed, so the audit log still has something to point
        at.
      </Text>
    </>
  );
}
