'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The refund queue — requests waiting on a decision, each
// one approved or denied with a reason.
//
// WHAT THE CUSTOMER SAID IS SHOWN IN FULL, not summarised into a category. "The
// car was not at the pickup point and we hired elsewhere" and "booked the wrong
// dates" are both refund requests and they are not remotely the same decision.
// A dropdown reading "Reason: Other" is how a queue gets worked through without
// being read.
//
// EVERY DECISION NEEDS A WRITTEN REASON, INCLUDING A DENIAL — arguably
// especially a denial. Approving a refund makes somebody happy and nobody asks
// again. Denying one produces a reply asking why, and the answer has to be
// findable by whoever picks up that email, who will not be the person who
// decided it.

import React, { useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money, relativeDay, shortDate } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { DataTable, CellStack, type Column } from '@/components/tables/DataTable';
import { FilterBar, FilterChips } from '@/components/admin/FilterBar';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { StatGrid, StatTile } from '@/components/admin/StatTile';
import { Note, Quote } from '@/components/admin/shared';
import { Button, StatusPill, Text } from '@/components/ui';
import type { RefundRequest } from '@/types';
import type { StatusTone } from '@/components/ui';

const STATUS_STYLE: Record<RefundRequest['status'], { label: string; tone: StatusTone }> = {
  pending: { label: 'Waiting', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  denied: { label: 'Denied', tone: 'danger' },
};

type StatusFilter = 'all' | RefundRequest['status'];

export default function RefundsQueuePage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('pending');

  // Which request is being decided, and which way.
  const [deciding, setDeciding] = useState<{ refund: RefundRequest; decision: 'approved' | 'denied' } | null>(null);

  const { data: refunds, loading, error, refresh } = useAsyncData(() => apiClient.listRefunds(), []);

  const all = refunds ?? [];

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((refund) => {
      if (status !== 'all' && refund.status !== status) return false;
      if (!q) return true;
      return `${refund.bookingRef} ${refund.customerName} ${refund.providerName} ${refund.reasonGiven}`
        .toLowerCase()
        .includes(q);
    });
  }, [all, search, status]);

  const pending = all.filter((r) => r.status === 'pending');
  const pendingValue = pending.reduce((t, r) => t + r.amount, 0);

  const columns: Column<RefundRequest>[] = [
    {
      id: 'booking',
      header: 'Booking',
      sortValue: (r) => r.bookingRef,
      cell: (r) => <CellStack title={r.bookingRef} detail={r.customerName} />,
    },
    {
      id: 'provider',
      header: 'Business',
      sortValue: (r) => r.providerName,
      cell: (r) => (
        <Text variant="small" tone="ink2" as="span" raw>
          {r.providerName}
        </Text>
      ),
    },
    {
      id: 'reason',
      header: 'What the customer said',
      width: '32%',
      cell: (r) => (
        <Text variant="small" tone="ink2" as="span" raw>
          {r.reasonGiven}
        </Text>
      ),
    },
    {
      id: 'requested',
      header: 'Waiting since',
      sortValue: (r) => r.requestedAt,
      cell: (r) => (
        <CellStack title={relativeDay(r.requestedAt)} detail={shortDate(r.requestedAt)} />
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (r) => r.status,
      cell: (r) => {
        const style = STATUS_STYLE[r.status];
        return (
          <CellStack
            title={<StatusPill label={style.label} tone={style.tone} />}
            detail={r.decidedBy ? `by ${r.decidedBy}` : undefined}
          />
        );
      },
    },
    {
      id: 'amount',
      header: 'Amount',
      sortValue: (r) => r.amount,
      numeric: true,
      cell: (r) => money(r.amount),
    },
  ];

  // Could not be fetched is not the same as empty. See LoadFailed.
  if (error) return <LoadFailed title="Refunds" what="The refund requests" error={error} onRetry={refresh} />;

  return (
    <>
      <PageHead
        title="Refunds"
        description="Requests waiting on a decision. Each one is a customer waiting to hear back from somebody here."
      />

      <StatGrid columns={3}>
        <StatTile
          icon="time-outline"
          label="Waiting on a decision"
          value={String(pending.length)}
          detail={pending.length === 0 ? 'Nothing outstanding' : 'Oldest first below'}
        />
        <StatTile
          icon="cash-outline"
          label="Value of those requests"
          value={money(pendingValue)}
          detail="If every one were approved in full"
        />
        <StatTile
          icon="checkmark-circle-outline"
          label="Decided"
          value={String(all.length - pending.length)}
          detail="Approved or denied, with a reason on file"
        />
      </StatGrid>

      <PageCard
        title="Refund queue"
        subtitle={`${rows.length} of ${all.length} shown`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by booking, customer or what they said"
        flush
      >
        <FilterBar>
          <FilterChips
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'pending', label: 'Waiting', count: pending.length },
              { value: 'approved', label: 'Approved', count: all.filter((r) => r.status === 'approved').length },
              { value: 'denied', label: 'Denied', count: all.filter((r) => r.status === 'denied').length },
              { value: 'all', label: 'Everything', count: all.length },
            ]}
          />
        </FilterBar>

        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          rowMuted={(r) => r.status !== 'pending'}
          loading={loading}
          initialSort={{ columnId: 'requested', direction: 'asc' }}
          emptyTitle={status === 'pending' ? 'No refunds are waiting' : 'Nothing matches'}
          emptyMessage={
            status === 'pending'
              ? 'Every request has been decided. Nobody is waiting to hear back.'
              : 'Try a shorter search, or a different status above.'
          }
          rowActions={(r) =>
            r.status === 'pending' ? (
              <>
                <Button
                  label="Approve"
                  variant="secondary"
                  size="sm"
                  onClick={() => setDeciding({ refund: r, decision: 'approved' })}
                />
                <Button
                  label="Deny"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeciding({ refund: r, decision: 'denied' })}
                />
              </>
            ) : (
              <Text variant="small" tone="ink3" as="span" raw>
                {r.decidedAt ? shortDate(r.decidedAt) : ''}
              </Text>
            )
          }
        />
      </PageCard>

      {/* The reason the customer gave, shown in full under the table for
          whichever request is being decided — the table cell truncates on a
          narrow column and this is the text the decision rests on. */}
      {deciding ? (
        <PageCard title="What the customer said">
          <Quote>{deciding.refund.reasonGiven}</Quote>
        </PageCard>
      ) : null}

      <Note>
        A denial needs a reason as much as an approval does. The customer will reply asking why,
        and whoever picks up that email will not be the person who decided it.
      </Note>

      <ReasonDialog
        open={deciding !== null}
        onClose={() => setDeciding(null)}
        title={deciding?.decision === 'approved' ? 'Approve this refund' : 'Deny this refund'}
        description={
          deciding
            ? `${deciding.refund.customerName} asked for ${money(deciding.refund.amount)} back on ${deciding.refund.bookingRef}. They said: “${deciding.refund.reasonGiven}”`
            : undefined
        }
        confirmLabel={deciding?.decision === 'approved' ? 'Approve refund' : 'Deny refund'}
        destructive={deciding?.decision === 'denied'}
        reasonPlaceholder={
          deciding?.decision === 'approved'
            ? 'e.g. Business confirmed the vehicle was unavailable at pickup.'
            : 'e.g. Rental ran to completion with no fault reported at the time.'
        }
        change={{
          subjectLabel: `Refund on ${deciding?.refund.bookingRef ?? ''} · ${deciding?.refund.customerName ?? ''}`,
          field: 'Refund request',
          before: `Waiting · ${money(deciding?.refund.amount ?? 0)}`,
          after: deciding?.decision === 'approved' ? 'Approved' : 'Denied',
        }}
        onConfirm={async (reason) => {
          if (!deciding) return;
          // The server records who decided, from the session; the panel only
          // says what was decided and why. Approving goes through Stripe, and
          // is refused with an explanation until Stripe is connected.
          await apiClient.decideRefund(deciding.refund.id, deciding.decision === 'approved', reason);
          refresh();
        }}
      />
    </>
  );
}
