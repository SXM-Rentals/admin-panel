'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: When every member of staff signed in and out of this panel, how
// long each session lasted, how it ended, and from where. For the Godfather alone.
//
// NOT THE AUDIT LOG, AND NOT ACTIVITY. The audit log is what staff DID, with a reason
// against each thing. Activity is what customers and businesses are doing on the
// platform. This is neither: it is who was in the panel and when, which is the question
// to ask when something looks wrong and the audit log says only that "somebody" did it
// — or when somebody who should not have been signed in was.
//
// NOTHING NEW IS RECORDED. The server has always kept a row for every sign-in and never
// deletes one; this reads them, and reading writes nothing, anywhere. A sign-in counts
// once the authenticator code has been given — a session that stopped at the password
// step is not one, which is also why this is a fair picture of who actually got in.
//
// HOW A SESSION ENDED IS NOT THE SAME AS WHETHER IT DID, and the difference is worth
// reading rather than just seeing a time. "Signed out" means somebody ended it: the
// member of staff signing out, or an administrator resetting or switching off their
// account. "Timed out" means nobody did — half an hour without use, or eight hours
// since it began. A string of sessions that all timed out is somebody who never signs
// out; one that was signed out by a reset is somebody who was removed.
//
// THE SERVER FILTERS AND PAGES. There is a row per sign-in, ever, so none of it is
// fetched at once. The device is the browser's own description of itself, and is shown
// as text and nothing more.

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAdminSession } from '@/lib/auth';
import { clockTime, lengthOfTime, longDate } from '@/lib/format';
import { TIER_LABELS, whyNeedsTier } from '@/lib/tiers';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { CellStack, DataTable, type Column } from '@/components/tables/DataTable';
import { Pagination } from '@/components/tables/Pagination';
import { FilterBar, FilterChips, FilterSelect } from '@/components/admin/FilterBar';
import { Note } from '@/components/admin/shared';
import { StatusPill, Text } from '@/components/ui';
import type { AdminTier, StaffSession } from '@/types';

type TierFilter = 'all' | AdminTier;
type StatusFilter = 'all' | 'active' | 'ended';

const ENDED: Record<StaffSession['status'], { label: string; tone: 'success' | 'neutral' | 'warning' }> = {
  active: { label: 'Still Signed In', tone: 'success' },
  signed_out: { label: 'Signed Out', tone: 'neutral' },
  timed_out: { label: 'Timed Out', tone: 'warning' },
};

export default function SignInsPage() {
  const { staff: me } = useAdminSession();
  const mine = whyNeedsTier(me?.tier, 'godfather') === undefined;

  const [staffId, setStaffId] = useState<string>('all');
  const [tier, setTier] = useState<TierFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // For the "who" filter: everybody who can sign in, removed accounts included —
  // somebody who was removed is exactly who this screen gets asked about.
  const people = useAsyncData(() => (mine ? apiClient.listStaffAccounts() : Promise.resolve([])), [mine]);

  const sessions = useAsyncData(
    () =>
      mine
        ? apiClient.listSignIns({
            staffId: staffId === 'all' ? undefined : staffId,
            tier: tier === 'all' ? undefined : tier,
            status: status === 'all' ? undefined : status,
            limit: pageSize,
            offset: page * pageSize,
          })
        : Promise.resolve(undefined),
    [mine, staffId, tier, status, page, pageSize],
  );

  // Nobody else gets to see when their colleagues were in the panel.
  if (!mine) {
    return (
      <>
        <PageHead title="Staff Sign-Ins" description="Not an account that can do this." />
        <PageCard title="Only the Godfather">
          <Note icon="lock-closed-outline" tone="ink2">
            When staff signed in and out is kept to the Godfather account alone. Your account is{' '}
            {me?.tier ? TIER_LABELS[me.tier] : 'not set'}.
          </Note>
        </PageCard>
      </>
    );
  }

  if (sessions.error) {
    return (
      <LoadFailed title="Staff Sign-Ins" what="The sign-in history" error={sessions.error} onRetry={sessions.refresh} />
    );
  }

  // Any change of filter starts again from the first page.
  const narrow = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(0);
  };

  const rows = sessions.data?.sessions ?? [];

  const columns: Column<StaffSession>[] = [
    {
      id: 'who',
      header: 'Who',
      cell: (s) => (
        <CellStack title={s.staff.name} detail={`${s.staff.email} · ${TIER_LABELS[s.staff.tier]}`} />
      ),
    },
    {
      id: 'in',
      header: 'Signed in',
      cell: (s) => <CellStack title={longDate(s.signedInAt)} detail={clockTime(s.signedInAt)} />,
    },
    {
      id: 'out',
      header: 'Ended',
      cell: (s) =>
        s.endedAt ? (
          <CellStack title={longDate(s.endedAt)} detail={clockTime(s.endedAt)} />
        ) : (
          <Text variant="small" tone="ink3" as="span" raw>
            Not yet
          </Text>
        ),
    },
    {
      id: 'how',
      header: 'How',
      cell: (s) => {
        const style = ENDED[s.status];
        return <StatusPill label={style.label} tone={style.tone} />;
      },
    },
    {
      id: 'length',
      header: 'Lasted',
      numeric: true,
      // While it is open this is "so far", which is not the same as how long it
      // lasted, and the cell says so.
      cell: (s) => (s.status === 'active' ? `${lengthOfTime(s.durationSeconds)} so far` : lengthOfTime(s.durationSeconds)),
    },
    {
      id: 'from',
      header: 'From',
      cell: (s) => (
        <CellStack
          title={s.ipAddress ?? 'Address not kept'}
          // The browser's own words, as text. Cut short on screen; the whole of it is
          // in the tooltip for the rare case somebody needs it.
          detail={s.device ? <span title={s.device}>{s.device.length > 48 ? `${s.device.slice(0, 48)}…` : s.device}</span> : undefined}
        />
      ),
    },
  ];

  return (
    <>
      <PageHead
        title="Staff Sign-Ins"
        description="When each member of staff signed in and out of this panel, and how it ended. Yours alone — not the audit log, which is what they did."
      />

      <PageCard
        title="Sessions"
        subtitle={sessions.data ? `${sessions.data.total.toLocaleString()} sign-ins` : undefined}
        flush
      >
        <FilterBar>
          <FilterSelect<string>
            label="Who"
            value={staffId}
            onChange={narrow(setStaffId)}
            options={[
              { value: 'all', label: 'Everybody' },
              ...(people.data ?? []).map((person) => ({
                value: person.id,
                label: person.disabledAt ? `${person.name} (access removed)` : person.name,
              })),
            ]}
          />
          <FilterChips<TierFilter>
            label="Level"
            value={tier}
            onChange={narrow(setTier)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'godfather', label: TIER_LABELS.godfather },
              { value: 'owner', label: TIER_LABELS.owner },
              { value: 'administrator', label: TIER_LABELS.administrator },
              { value: 'viewer', label: TIER_LABELS.viewer },
            ]}
          />
          <FilterChips<StatusFilter>
            label="Show"
            value={status}
            onChange={narrow(setStatus)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Signed in now' },
              { value: 'ended', label: 'Ended' },
            ]}
          />
        </FilterBar>

        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(s) => s.id}
          rowMuted={(s) => s.status !== 'active'}
          loading={sessions.loading}
          paginate={false}
          emptyTitle="No sign-ins match"
          emptyMessage="Try a different person or level, or show all of them."
        />

        <Pagination
          page={page}
          pageSize={pageSize}
          total={sessions.data?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(Math.min(size, 200));
            setPage(0);
          }}
        />
      </PageCard>

      <div style={{ marginTop: 'var(--space-lg)' }}>
        <Note icon="warning-outline" tone="ink2">
          <strong>Signed out</strong> means somebody ended it — the member of staff signing out, or an
          administrator resetting or switching off their account. <strong>Timed out</strong> means
          nobody did: half an hour without use, or eight hours since it began. A sign-in counts once
          the authenticator code has been given; a session that stopped at the password is not one.
          Nothing is recorded for this screen — it reads what the server has always kept.
        </Note>
      </div>
    </>
  );
}
