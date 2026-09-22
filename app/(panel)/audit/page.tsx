'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The audit log — every change any member of staff has made
// to any account, with the value before, the value after, why, and when.
//
// THIS IS THE DEFINING SCREEN OF THE WHOLE PANEL. The admin doc names
// account-change tracking as the core purpose: who deleted an account, what was
// updated on a user or a business, and when. Everything else in this panel is
// somebody doing their job. This is the record that they did it.
//
// IT IS ALSO THE ONE PLACE WHERE ONE FLAT ACCESS LEVEL IS DEFENSIBLE. Every
// admin account can do everything, which is a reasonable choice for a small team
// and an unreasonable one without a record. Accountability instead of
// restriction only works if the accountability is real — complete, searchable,
// and impossible to make a change without.
//
// THE BEFORE AND AFTER ARE WORDS, NOT DATABASE VALUES. "Explorer → VIP" can be
// read a year later by an accountant who has never seen the schema. "tier: 2 →
// 3" cannot, and a log nobody can read is a log nobody will check.

import React, { useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { stamp } from '@/lib/format';
import { auditActionLabels } from '@/lib/labels';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { DataTable, CellStack, type Column } from '@/components/tables/DataTable';
import { FilterSelect } from '@/components/admin/FilterBar';
import { Note } from '@/components/admin/shared';
import { Button, Icon, StatusPill, Text } from '@/components/ui';
import type { AuditAction, AuditEntry } from '@/types';
import styles from '@/components/tables/table.module.css';

// How far back to look. A date range, offered as the three windows somebody
// actually asks for rather than a pair of date pickers nobody fills in.
type Window = 'all' | '7' | '30' | '90';

const WINDOW_LABELS: Record<Window, string> = {
  '7': 'Last 7 Days',
  '30': 'Last 30 Days',
  '90': 'Last 90 Days',
  all: 'All Time',
};

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [staffId, setStaffId] = useState('all');
  const [action, setAction] = useState<'all' | AuditAction>('all');
  const [window, setWindow] = useState<Window>('all');

  const { data: entries, loading, error, refresh } = useAsyncData(() => apiClient.getAuditLog(), []);
  const { data: allStaff } = useAsyncData(() => apiClient.listStaff(), []);

  const all = entries ?? [];

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cutoff =
      window === 'all' ? 0 : Date.now() - Number(window) * 86_400_000;

    return all.filter((entry) => {
      if (staffId !== 'all' && entry.staffId !== staffId) return false;
      if (action !== 'all' && entry.action !== action) return false;
      if (cutoff && new Date(entry.at).getTime() < cutoff) return false;
      if (!q) return true;
      // Searches the account, the field, the values and the reason together —
      // "which of you gave that customer points, and why" is one question, not
      // four separate searches.
      return `${entry.subjectLabel} ${entry.field} ${entry.before} ${entry.after} ${entry.reason} ${entry.staffName}`
        .toLowerCase()
        .includes(q);
    });
  }, [all, search, staffId, action, window]);

  const columns: Column<AuditEntry>[] = [
    {
      id: 'at',
      header: 'When',
      sortValue: (e) => e.at,
      cell: (e) => <CellStack title={stamp(e.at)} detail={e.staffName} />,
    },
    {
      id: 'subject',
      header: 'Account',
      sortValue: (e) => e.subjectLabel,
      cell: (e) => (
        <CellStack
          title={e.subjectLabel}
          detail={e.subjectType.charAt(0).toUpperCase() + e.subjectType.slice(1)}
        />
      ),
    },
    {
      id: 'action',
      header: 'What changed',
      sortValue: (e) => e.action,
      cell: (e) => (
        <CellStack
          title={<StatusPill label={auditActionLabels[e.action]} tone={toneFor(e.action)} />}
          detail={e.field}
        />
      ),
    },
    {
      id: 'change',
      header: 'Before → after',
      width: '20%',
      cell: (e) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text variant="small" tone="ink3" as="span" raw>
            {e.before}
          </Text>
          <Icon name="arrow-forward" size={13} color="var(--ink3)" />
          <Text variant="label" as="span" raw>
            {e.after}
          </Text>
        </span>
      ),
    },
    {
      id: 'reason',
      header: 'Why',
      width: '28%',
      cell: (e) => (
        <Text variant="small" tone="ink2" as="span" raw>
          {e.reason}
        </Text>
      ),
    },
  ];

  // Could not be fetched is not the same as empty. See LoadFailed.
  if (error) return <LoadFailed title="Audit Log" what="The audit log" error={error} onRetry={refresh} />;

  return (
    <>
      <PageHead
        title="Audit Log"
        description="Every change made by staff — which account, what changed, the value before and after, why, and when."
        actions={
          <Button
            label="Export CSV"
            variant="secondary"
            size="md"
            onClick={() => downloadCsv(rows)}
          />
        }
      />

      <PageCard
        title="Changes"
        subtitle={`${rows.length} of ${all.length} entries`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by account, field, value or reason"
        flush
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', padding: '0 var(--space-2xl) var(--space-lg)', gap: 'var(--space-lg)' }}>
          <FilterSelect
            label="Staff member"
            value={staffId}
            onChange={setStaffId}
            options={[
              { value: 'all', label: 'Anybody' },
              ...(allStaff ?? []).map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
          <FilterSelect
            label="Kind of change"
            value={action}
            onChange={setAction}
            options={[
              { value: 'all', label: 'Everything' },
              ...(Object.keys(auditActionLabels) as AuditAction[]).map((key) => ({
                value: key,
                label: auditActionLabels[key],
              })),
            ]}
          />
          <FilterSelect
            label="When"
            value={window}
            onChange={setWindow}
            options={(Object.keys(WINDOW_LABELS) as Window[]).map((key) => ({
              value: key,
              label: WINDOW_LABELS[key],
            }))}
          />
        </div>

        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(e) => e.id}
          loading={loading}
          initialSort={{ columnId: 'at', direction: 'desc' }}
          pageSize={25}
          emptyTitle="No entries match"
          emptyMessage="Try a wider date range, or clear the filters above."
        />
      </PageCard>

      <Note>
        Entries made while this tab has been open are held in memory and disappear on a refresh
        — the log is not connected to a backend yet. Everything above them is seeded history.
      </Note>
    </>
  );
}

// Which colour a kind of change gets. Rejections, denials, deletions and claims
// are the ones somebody would go looking for, so they carry the weight.
function toneFor(action: AuditAction): 'neutral' | 'success' | 'warning' | 'danger' {
  if (
    action === 'account_deleted' ||
    action === 'verification_rejected' ||
    action === 'refund_denied' ||
    action === 'deposit_claimed'
  ) {
    return 'danger';
  }
  if (action === 'points_adjusted' || action === 'settings_changed' || action === 'promotion_changed') {
    return 'warning';
  }
  if (
    action === 'verification_approved' ||
    action === 'refund_approved' ||
    action === 'deposit_released' ||
    action === 'dispute_resolved'
  ) {
    return 'success';
  }
  return 'neutral';
}

// ---- EXPORTING ----
// The admin doc leaves it open whether the log needs to be exportable, or
// whether searching it in the app is enough. This answers it the cheap way: the
// rows currently on screen, filters and all, saved as a spreadsheet file. No
// server involved and nothing to maintain.
//
// It exports WHAT IS FILTERED, not everything, which is almost always what
// somebody wants — "every change Kayla made to that account in March" is a
// question you answer with the filters and then hand over.
function downloadCsv(rows: AuditEntry[]): void {
  const header = ['When', 'Staff', 'Account', 'Type', 'Field', 'Before', 'After', 'Reason'];

  // A value containing a comma or a quotation mark has to be wrapped and its
  // quotes doubled, or the file falls apart in the spreadsheet — and the reason
  // field is a sentence, so this matters on nearly every row.
  const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;

  const lines = rows.map((entry) =>
    [
      entry.at,
      entry.staffName,
      entry.subjectLabel,
      auditActionLabels[entry.action],
      entry.field,
      entry.before,
      entry.after,
      entry.reason,
    ]
      .map(escape)
      .join(','),
  );

  const csv = [header.map(escape).join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `sxm-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}
