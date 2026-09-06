'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Platform-wide promotional codes — what each one gives,
// who it applies to, how many times it has been used, and whether it is running.
//
// EXPIRED CODES STAY IN THE LIST. It is tempting to hide them and show only what
// is live, but a customer will ring up in November asking why SUMMER26 no longer
// works, and the answer has to be findable. A promotions screen that only shows
// live codes cannot answer the question it will most often be asked.
//
// PAUSING IS NOT DELETING, and both are here for a reason. A code with a problem
// — a partner list being redone, a discount that turned out to be too generous —
// wants stopping now and thinking about later. Deleting it would take its usage
// history with it.

import React, { useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money, shortDate } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { DataTable, CellStack, type Column } from '@/components/tables/DataTable';
import { FilterBar, FilterChips } from '@/components/admin/FilterBar';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { NewPromotion } from '@/components/admin/NewPromotion';
import { StatGrid, StatTile } from '@/components/admin/StatTile';
import { Note } from '@/components/admin/shared';
import { Button, MockBanner, StatusPill, Text } from '@/components/ui';
import type { PromoCode } from '@/types';
import type { StatusTone } from '@/components/ui';

const STATUS_STYLE: Record<PromoCode['status'], { label: string; tone: StatusTone }> = {
  active: { label: 'Running', tone: 'success' },
  scheduled: { label: 'Scheduled', tone: 'brand' },
  paused: { label: 'Paused', tone: 'warning' },
  expired: { label: 'Expired', tone: 'neutral' },
};

const AUDIENCE_LABELS: Record<PromoCode['appliesTo'], string> = {
  all: 'Everybody',
  local: 'Residents Only',
  tourist: 'Visitors Only',
  first_booking: 'First Booking Only',
};

type StatusFilter = 'all' | PromoCode['status'];

export default function PromotionsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [changing, setChanging] = useState<{ promo: PromoCode; next: PromoCode['status'] } | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: promotions, loading, refresh } = useAsyncData(() => apiClient.listPromotions(), []);

  const all = promotions ?? [];

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((promo) => {
      if (status !== 'all' && promo.status !== status) return false;
      if (!q) return true;
      return `${promo.code} ${promo.description}`.toLowerCase().includes(q);
    });
  }, [all, search, status]);

  const columns: Column<PromoCode>[] = [
    {
      id: 'code',
      header: 'Code',
      sortValue: (p) => p.code,
      width: '26%',
      cell: (p) => <CellStack title={p.code} detail={p.description} />,
    },
    {
      id: 'value',
      header: 'Gives',
      sortValue: (p) => p.value,
      cell: (p) => (
        <Text variant="label" as="span" raw>
          {p.kind === 'percent' ? `${p.value}% off` : `${money(p.value)} off`}
        </Text>
      ),
    },
    {
      id: 'audience',
      header: 'Applies to',
      sortValue: (p) => p.appliesTo,
      cell: (p) => (
        <Text variant="small" tone="ink2" as="span" raw>
          {AUDIENCE_LABELS[p.appliesTo]}
        </Text>
      ),
    },
    {
      id: 'window',
      header: 'Runs',
      sortValue: (p) => p.startsAt,
      cell: (p) => (
        <CellStack
          title={`${shortDate(p.startsAt)} – ${shortDate(p.endsAt)}`}
          detail={STATUS_STYLE[p.status].label}
        />
      ),
    },
    {
      id: 'used',
      header: 'Used',
      sortValue: (p) => p.usedCount,
      numeric: true,
      cell: (p) => (
        <CellStack
          title={p.usedCount.toLocaleString()}
          detail={p.usageLimit ? `of ${p.usageLimit.toLocaleString()}` : 'no limit'}
        />
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (p) => p.status,
      cell: (p) => {
        const style = STATUS_STYLE[p.status];
        return <StatusPill label={style.label} tone={style.tone} />;
      },
    },
  ];

  const countBy = (s: PromoCode['status']) => all.filter((p) => p.status === s).length;
  const totalRedemptions = all.reduce((t, p) => t + p.usedCount, 0);

  return (
    <>
      <PageHead
        title="Promotions"
        description="Platform-wide discount codes and campaigns — what is running, what is coming, and what has finished."
        actions={<Button label="New Code" variant="primary" size="md" onClick={() => setCreating(true)} />}
      />

      <MockBanner />

      <StatGrid columns={3}>
        <StatTile
          icon="ticket-outline"
          label="Running now"
          value={String(countBy('active'))}
          detail={`${countBy('scheduled')} scheduled to start later`}
        />
        <StatTile
          icon="people-outline"
          label="Times used"
          value={totalRedemptions.toLocaleString()}
          detail="Across every code ever created"
        />
        <StatTile
          icon="pause-outline"
          label="Paused"
          value={String(countBy('paused'))}
          detail="Stopped, but kept along with their history"
        />
      </StatGrid>

      <PageCard
        title="Promotional codes"
        subtitle={`${rows.length} of ${all.length} shown`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by code or description"
        flush
      >
        <FilterBar>
          <FilterChips
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Running', count: countBy('active') },
              { value: 'scheduled', label: 'Scheduled', count: countBy('scheduled') },
              { value: 'paused', label: 'Paused', count: countBy('paused') },
              { value: 'expired', label: 'Expired', count: countBy('expired') },
            ]}
          />
        </FilterBar>

        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(p) => p.id}
          rowMuted={(p) => p.status === 'expired'}
          loading={loading}
          initialSort={{ columnId: 'window', direction: 'desc' }}
          emptyTitle="No codes match"
          emptyMessage="Try a shorter search, or a different status above."
          rowActions={(p) =>
            p.status === 'expired' ? null : p.status === 'paused' ? (
              <Button
                label="Resume"
                variant="secondary"
                size="sm"
                onClick={() => setChanging({ promo: p, next: 'active' })}
              />
            ) : (
              <Button
                label="Pause"
                variant="outline"
                size="sm"
                onClick={() => setChanging({ promo: p, next: 'paused' })}
              />
            )
          }
        />
      </PageCard>

      <Note>
        Expired codes stay here on purpose. Somebody will ring in November asking why SUMMER26
        no longer works, and the answer has to be findable.
      </Note>

      <NewPromotion
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={async (draft) => {
          await apiClient.createPromotion(draft);
          refresh();
        }}
      />

      <ReasonDialog
        open={changing !== null}
        onClose={() => setChanging(null)}
        title={changing?.next === 'paused' ? 'Pause this code' : 'Resume this code'}
        description={
          changing
            ? changing.next === 'paused'
              ? `${changing.promo.code} will stop working immediately. Its history is kept.`
              : `${changing.promo.code} will start working again straight away.`
            : undefined
        }
        confirmLabel={changing?.next === 'paused' ? 'Pause code' : 'Resume code'}
        destructive={changing?.next === 'paused'}
        reasonPlaceholder="e.g. Partner list is being redone — pausing until the new one is agreed."
        audit={{
          action: 'promotion_changed',
          subjectType: 'platform',
          subjectId: changing?.promo.id ?? '',
          subjectLabel: `Promotion ${changing?.promo.code ?? ''}`,
          field: 'Promotion status',
          before: changing ? STATUS_STYLE[changing.promo.status].label : '',
          after: changing ? STATUS_STYLE[changing.next].label : '',
        }}
        onConfirm={async () => {
          if (!changing) return;
          await apiClient.setPromotionStatus(changing.promo.id, changing.next);
          refresh();
        }}
      />
    </>
  );
}
