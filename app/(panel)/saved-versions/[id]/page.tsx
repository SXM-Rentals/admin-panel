'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: One saved version, opened up — everything it holds, searchable
// and sortable, with which of it has been deleted since, and the buttons that put it
// back: everything, one kind, or chosen records.
//
// THE SERVER DOES THE SEARCHING, FILTERING, SORTING AND PAGING. A version can hold tens
// of thousands of records and none of that is fetched at once; this screen asks for one
// page at a time, in the order and with the filters chosen, and shows what comes back.
// That is why the table below has no sortable column headers of its own — a header that
// re-sorted the fifty rows on screen would look like it had sorted the version, and
// would not have.
//
// THE KIND TABS AND THEIR BADGES ARE BUILT FROM THE SERVER'S LIST OF KINDS, not from a
// list kept here, so a kind it starts saving tomorrow gets a tab, a count and a
// "deleted since" badge without the panel being touched.
//
// "DELETED SINCE" IS THE WHOLE POINT OF THE SCREEN. Each record says whether it is on
// the platform now. Those that are not are what putting the version back would bring
// back, and they are the only ones offered a Put Back button — a record that is still
// there has nothing to put back, and offering the button would suggest restoring could
// overwrite it. It cannot: the server only ever puts back what is missing.
//
// MONEY ON THIS SCREEN IS CONVERTED FROM CENTS, once, in savedAmount().

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAdminSession } from '@/lib/auth';
import { clockTime, longDate, shortDate } from '@/lib/format';
import { TIER_LABELS, whyNeedsTier } from '@/lib/tiers';
import { cx } from '@/lib/utils';
import { savedAmount, totalHeld, totalMissing, versionLabel } from '@/lib/saved-versions';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { CellStack, DataTable, type Column } from '@/components/tables/DataTable';
import { Pagination } from '@/components/tables/Pagination';
import { FilterBar, FilterChips, FilterSelect } from '@/components/admin/FilterBar';
import { DeleteVersion } from '@/components/admin/DeleteVersion';
import { PutBack } from '@/components/admin/PutBack';
import { RestoreResult } from '@/components/admin/RestoreResult';
import { Note } from '@/components/admin/shared';
import { Button, Sheet, Skeleton, StatusPill, Text } from '@/components/ui';
import type { RestoreResult as Result, SavedRecord } from '@/types';
import styles from '@/components/admin/admin.module.css';

type Show = 'all' | 'missing';
type SortBy = 'at' | 'summary' | 'amount' | 'kind';
type Direction = 'asc' | 'desc';

// One saved record, in full, exactly as it was — and only ever shown as text. What is
// inside came from customers and businesses, and nothing here puts it on the page as
// anything but the string it is.
function RecordInFull({ versionId, record }: { versionId: string; record: SavedRecord }) {
  const { data, loading, error } = useAsyncData(() => apiClient.getVersionRecord(versionId, record.id), [versionId, record.id]);

  if (loading) return <Skeleton height={200} />;
  if (error) return <Note icon="warning-outline" tone="ink2">The saved record could not be read.</Note>;
  if (!data) return <Note>This record is no longer in the version.</Note>;

  return (
    <>
      <div className={styles.pillRow}>
        {data.inLive ? (
          <StatusPill label="On The Platform Now" tone="success" />
        ) : (
          <StatusPill label="Deleted Since" tone="warning" />
        )}
        <Text variant="small" tone="ink3" as="span" raw>
          {data.label}
        </Text>
      </div>
      <pre className={styles.savedJson}>{JSON.stringify(data.data, null, 2)}</pre>
    </>
  );
}

export default function SavedVersionPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const { staff: me } = useAdminSession();
  const mine = whyNeedsTier(me?.tier, 'godfather') === undefined;

  // What is being looked at.
  const [kind, setKind] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [show, setShow] = useState<Show>('all');
  const [sortBy, setSortBy] = useState<SortBy>('at');
  const [dir, setDir] = useState<Direction>('desc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const [result, setResult] = useState<Result | undefined>(undefined);
  // Whether that result was already "everything". If it was, a failure in it is a
  // real one and putting everything back would only repeat it.
  const [resultWasEverything, setResultWasEverything] = useState(false);
  const [viewing, setViewing] = useState<SavedRecord | null>(null);

  // The search waits for a pause in typing: this is asked of the server, not filtered
  // in the browser, so a request per keystroke would be a request per letter.
  useEffect(() => {
    const wait = setTimeout(() => {
      setQ(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(wait);
  }, [search]);

  const version = useAsyncData(() => (mine ? apiClient.getVersion(id) : Promise.resolve(undefined)), [id, mine]);
  // The kinds are on the list, not on the version, so it is asked for as well.
  const list = useAsyncData(() => (mine ? apiClient.listVersions() : Promise.resolve(undefined)), [mine]);

  const records = useAsyncData(
    () =>
      mine
        ? apiClient.listVersionRecords(id, {
            kind: kind === 'all' ? undefined : kind,
            q,
            show,
            sort: sortBy,
            dir,
            limit: pageSize,
            offset: page * pageSize,
          })
        : Promise.resolve(undefined),
    [id, mine, kind, q, show, sortBy, dir, page, pageSize],
  );

  if (!mine) {
    return (
      <>
        <PageHead title="Saved Version" description="Not an account that can do this." />
        <PageCard title="Only the Godfather">
          <Note icon="lock-closed-outline" tone="ink2">
            Saved versions are kept to the Godfather account alone. Your account is{' '}
            {me?.tier ? TIER_LABELS[me.tier] : 'not set'}.
          </Note>
        </PageCard>
      </>
    );
  }

  if (version.error || list.error || records.error) {
    return (
      <LoadFailed
        title="Saved Version"
        what="This saved version"
        error={(version.error ?? list.error ?? records.error)!}
        onRetry={() => {
          version.refresh();
          list.refresh();
          records.refresh();
        }}
      />
    );
  }

  if (version.loading || list.loading) return <Skeleton height={420} />;

  if (!version.data) {
    return (
      <>
        <PageHead title="Version not found" description="No saved version with that reference. It may have been deleted." />
        <Button label="Back to Saved Versions" href="/saved-versions" variant="secondary" size="md" />
      </>
    );
  }

  const v = version.data;
  const kinds = list.data?.kinds ?? [];
  const label = versionLabel(v);
  const held = totalHeld(v, kinds);
  const gone = totalMissing(v, kinds);
  const picked = kind === 'all' ? undefined : kinds.find((entry) => entry.kind === kind);

  // After anything is put back, what is missing has changed, so the counts and the
  // page are asked for again.
  const putBack = (everything: boolean) => (outcome: Result) => {
    setResult(outcome);
    setResultWasEverything(everything);
    version.refresh();
    records.refresh();
  };

  const changeFilter = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(0);
  };

  const rows = records.data?.records ?? [];

  const columns: Column<SavedRecord>[] = [
    {
      id: 'what',
      header: 'What',
      cell: (r) => <CellStack title={r.summary} detail={r.label} />,
    },
    {
      id: 'when',
      header: 'When',
      cell: (r) => (r.at ? shortDate(r.at) : 'Not dated'),
    },
    {
      id: 'amount',
      header: 'Amount',
      numeric: true,
      cell: (r) => savedAmount(r.amountCents),
    },
    {
      // THE CHIP THAT MATTERS: is it on the platform now.
      id: 'now',
      header: 'Now',
      cell: (r) =>
        r.inLive ? (
          <StatusPill label="On The Platform" tone="success" />
        ) : (
          <StatusPill label="Deleted Since" tone="warning" />
        ),
    },
  ];

  return (
    <>
      <PageHead
        title="Saved Version"
        description={`${longDate(v.createdAt)} at ${clockTime(v.createdAt)}${v.createdBy ? ` · saved by ${v.createdBy.name}` : ''}${v.note ? ` · “${v.note}”` : ''}`}
        actions={
          <>
            <DeleteVersion
              versionId={v.id}
              versionLabel={label}
              size="md"
              onDone={() => router.push('/saved-versions')}
            />
            <Button label="Back to Saved Versions" href="/saved-versions" variant="ghost" size="md" />
          </>
        }
      />

      {/* ---- PUTTING IT ALL BACK ---- */}
      <PageCard
        title="Put Back"
        subtitle={`${held.toLocaleString()} ${held === 1 ? 'record' : 'records'} held · ${gone.toLocaleString()} deleted since`}
      >
        <Note icon="warning-outline" tone="ink2">
          <strong>Put Back Everything That Was Deleted</strong> restores customers first, then
          businesses, cars, payouts, bookings and the rest, in the order the database needs — so after
          a Clear Everything, one click on it puts the lot back. It brings back only what is missing
          and leaves everything on the platform exactly as it is.
        </Note>
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <PutBack
            versionId={v.id}
            versionLabel={label}
            what={{}}
            label="Put Back Everything That Was Deleted"
            subject="everything that was deleted"
            missing={gone}
            variant="primary"
            size="md"
            onResult={putBack(true)}
          />
        </div>
      </PageCard>

      {result ? (
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <RestoreResult
            result={result}
            kinds={kinds}
            onDismiss={() => setResult(undefined)}
            // Offered when a single car or booking could not go back because what it
            // belongs to is still deleted. Not offered when that was already
            // everything — there is nothing wider to suggest.
            suggestion={
              resultWasEverything ? undefined : (
                <PutBack
                  versionId={v.id}
                  versionLabel={label}
                  what={{}}
                  label="Put Back Everything That Was Deleted"
                  subject="everything that was deleted"
                  missing={gone}
                  variant="primary"
                  size="md"
                  onResult={putBack(true)}
                />
              )
            }
          />
        </div>
      ) : null}

      {/* ---- WHAT IT HOLDS ---- */}
      <div style={{ marginTop: 'var(--space-lg)' }}>
        <PageCard
          title="What It Holds"
          subtitle={records.data ? `${records.data.total.toLocaleString()} shown` : undefined}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search what was saved"
          flush
        >
          {/* ---- ONE TAB PER KIND THE SERVER SAYS IT HOLDS ---- */}
          <FilterBar>
            <div className={styles.periodRow}>
              <button
                type="button"
                className={cx(styles.rangeChip, kind === 'all' && styles.rangeChipOn)}
                aria-pressed={kind === 'all'}
                onClick={() => changeFilter(setKind)('all')}
              >
                Everything
                <span className={styles.chipBadge}>{held.toLocaleString()}</span>
                {gone > 0 ? <span className={styles.chipBadgeWarn}>{gone.toLocaleString()} deleted</span> : null}
              </button>
              {kinds.map((entry) => {
                const have = v.counts[entry.kind] ?? 0;
                const lost = v.missing[entry.kind] ?? 0;
                return (
                  <button
                    key={entry.kind}
                    type="button"
                    className={cx(styles.rangeChip, kind === entry.kind && styles.rangeChipOn)}
                    aria-pressed={kind === entry.kind}
                    onClick={() => changeFilter(setKind)(entry.kind)}
                  >
                    {entry.label}
                    <span className={styles.chipBadge}>{have.toLocaleString()}</span>
                    {lost > 0 ? <span className={styles.chipBadgeWarn}>{lost.toLocaleString()} deleted</span> : null}
                  </button>
                );
              })}
            </div>
          </FilterBar>

          <FilterBar>
            <FilterChips<Show>
              label="Show"
              value={show}
              onChange={changeFilter(setShow)}
              options={[
                { value: 'all', label: 'Everything saved' },
                { value: 'missing', label: 'Only what was deleted since' },
              ]}
            />
            <FilterSelect<SortBy>
              label="Sort by"
              value={sortBy}
              onChange={changeFilter(setSortBy)}
              options={[
                { value: 'at', label: 'When it happened' },
                { value: 'summary', label: 'Name' },
                { value: 'amount', label: 'Amount' },
                { value: 'kind', label: 'Kind' },
              ]}
            />
            <FilterChips<Direction>
              label="Order"
              value={dir}
              onChange={changeFilter(setDir)}
              options={[
                { value: 'desc', label: 'Newest / biggest first' },
                { value: 'asc', label: 'Oldest / smallest first' },
              ]}
            />
          </FilterBar>

          {/* ---- PUTTING BACK JUST THIS KIND ---- */}
          {picked ? (
            <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>
              <PutBack
                versionId={v.id}
                versionLabel={label}
                what={{ kind: picked.kind }}
                label={`Put Back Deleted ${picked.label}`}
                subject={`the deleted ${picked.label.toLowerCase()}`}
                missing={v.missing[picked.kind] ?? 0}
                onResult={putBack(false)}
              />
            </div>
          ) : null}

          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => r.id}
            rowMuted={(r) => r.inLive}
            loading={records.loading}
            paginate={false}
            emptyTitle={show === 'missing' ? 'Nothing was deleted since' : 'Nothing matches'}
            emptyMessage={
              show === 'missing'
                ? 'Everything this version holds is still on the platform.'
                : 'Try a shorter search, or a different kind.'
            }
            rowActions={(r) => (
              <>
                <Button label="View" variant="ghost" size="sm" onClick={() => setViewing(r)} />
                {/* ONLY WHAT IS MISSING HAS ANYTHING TO PUT BACK. A record that is on
                    the platform now is never overwritten, so offering the button on it
                    would suggest that it could be. */}
                {!r.inLive ? (
                  <PutBack
                    versionId={v.id}
                    versionLabel={label}
                    what={{ recordIds: [r.id] }}
                    label="Put Back"
                    subject={r.summary}
                    onResult={putBack(false)}
                  />
                ) : null}
              </>
            )}
          />

          <Pagination
            page={page}
            pageSize={pageSize}
            total={records.data?.total ?? 0}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(Math.min(size, 200));
              setPage(0);
            }}
          />
        </PageCard>
      </div>

      <Sheet
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing?.summary ?? ''}
        subtitle="Exactly as it was saved"
        wide
      >
        {viewing ? <RecordInFull versionId={v.id} record={viewing} /> : null}
      </Sheet>
    </>
  );
}
