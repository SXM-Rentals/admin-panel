'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The Godfather's saved versions — copies of the platform's
// records, saved only when he asks, that anything deleted since can be put back from.
// It is the undo for clearing test records.
//
// A VERSION IS SAVED ONLY WHEN ASKED FOR. Nothing is copied in the background, so a
// clear or a delete leaves no copy behind unless a version was saved first. That is
// the point: the Godfather decides what is kept, and nothing is quietly kept for him.
// The practical rule that follows is the one this screen leads with — save a version
// BEFORE clearing, not after.
//
// IT DOES NOT NEED THE TEST-DATA WINDOW. Clearing is only possible while the platform
// has never run live; putting records back is allowed afterwards too, because putting
// records back harms nobody. So nothing here asks whether the window is open.
//
// THE KINDS COME FROM THE SERVER. The help text, the badges on each version and the
// counts are all built from the list the server sends, so a kind it starts saving
// tomorrow appears here without a change to the panel.

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAdminSession } from '@/lib/auth';
import { clockTime, longDate } from '@/lib/format';
import { presentError } from '@/lib/api/errors';
import { TIER_LABELS, whyNeedsTier } from '@/lib/tiers';
import { holdsSentence, totalHeld, totalMissing, versionLabel } from '@/lib/saved-versions';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { CellStack, DataTable, type Column } from '@/components/tables/DataTable';
import { DeleteVersion } from '@/components/admin/DeleteVersion';
import { PutBack } from '@/components/admin/PutBack';
import { RestoreResult } from '@/components/admin/RestoreResult';
import { Note } from '@/components/admin/shared';
import { Button, Icon, Input, Skeleton, StatusPill, Text, useToast } from '@/components/ui';
import type { RestoreResult as Result, SavedVersion } from '@/types';
import styles from '@/components/admin/admin.module.css';

export default function SavedVersionsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { staff: me } = useAdminSession();
  const mine = whyNeedsTier(me?.tier, 'godfather') === undefined;

  const { data, loading, error, refresh } = useAsyncData(
    () => (mine ? apiClient.listVersions() : Promise.resolve(undefined)),
    [mine],
  );

  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | undefined>(undefined);
  // What the last put-back did, kept until it is dismissed — it is a list, and it
  // must not vanish before somebody has read the third reason.
  const [result, setResult] = useState<Result | undefined>(undefined);

  // Nobody else gets a list of ways to bring records back, or the copies they come
  // from: a saved version is a copy of the customers' accounts.
  if (!mine) {
    return (
      <>
        <PageHead title="Saved Versions" description="Not an account that can do this." />
        <PageCard title="Only the Godfather">
          <Note icon="lock-closed-outline" tone="ink2">
            Saved versions are copies of the platform’s records, customer accounts included, and are
            kept to the Godfather account alone. Your account is{' '}
            {me?.tier ? TIER_LABELS[me.tier] : 'not set'}.
          </Note>
        </PageCard>
      </>
    );
  }

  if (error) {
    return <LoadFailed title="Saved Versions" what="The saved versions" error={error} onRetry={refresh} />;
  }

  const kinds = data?.kinds ?? [];
  const versions = data?.versions ?? [];
  const full = data ? versions.length >= data.limit : false;

  const save = async () => {
    setSaving(true);
    setProblem(undefined);
    try {
      await apiClient.saveVersion(note);
      setNote('');
      showToast('Version saved.', 'It holds everything on the platform as it is right now.');
      refresh();
    } catch (caught) {
      // `too_many_versions` says which one to delete and that nothing was saved.
      setProblem(presentError(caught));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<SavedVersion>[] = [
    {
      id: 'saved',
      header: 'Saved',
      cell: (v) => (
        <CellStack
          title={`${longDate(v.createdAt)} at ${clockTime(v.createdAt)}`}
          detail={v.createdBy ? `by ${v.createdBy.name}` : 'by somebody no longer on the server'}
        />
      ),
    },
    {
      id: 'note',
      header: 'Note',
      cell: (v) => (v.note ? v.note : <Text variant="small" tone="ink3" as="span" raw>No note</Text>),
    },
    {
      // BUILT FROM THE SERVER'S KINDS: one line saying how much it holds, and a pill
      // saying how much of it is gone from the platform now — which is what putting
      // it back would actually bring back.
      id: 'holds',
      header: 'Holds',
      cell: (v) => {
        const held = totalHeld(v, kinds);
        const gone = totalMissing(v, kinds);
        return (
          <CellStack
            title={`${held.toLocaleString()} ${held === 1 ? 'record' : 'records'}`}
            detail={
              gone > 0 ? `${gone.toLocaleString()} deleted since` : 'all still on the platform'
            }
          />
        );
      },
    },
    {
      id: 'state',
      header: '',
      cell: (v) =>
        totalMissing(v, kinds) > 0 ? (
          <StatusPill label="Has Deleted Records" tone="warning" />
        ) : (
          <StatusPill label="Nothing Missing" tone="success" />
        ),
    },
  ];

  return (
    <>
      <PageHead
        title="Saved Versions"
        description="The undo for clearing test records. A version is saved only when you ask, so save one before you clear."
      />

      {/* ---- WHAT A VERSION HOLDS, built from what the server says it holds ---- */}
      <PageCard title="What A Version Holds">
        {loading ? (
          <Skeleton height={80} />
        ) : (
          <>
            <Note icon="checkmark-circle-outline" tone="ink2">
              A version holds the {holdsSentence(kinds)}. It does NOT hold conversations, support
              messages, notifications or fleet requests.
            </Note>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <Note icon="warning-outline" tone="ink2">
                A customer’s password and sign-ins are never saved. A customer who is put back resets
                their password or signs in with a code. A business’s connection to its own booking
                software is not saved either.
              </Note>
            </div>
          </>
        )}
      </PageCard>

      {/* ---- SAVING ONE ---- */}
      <div style={{ marginTop: 'var(--space-lg)' }}>
        <PageCard
          title="Save A Version Now"
          subtitle={data ? `${versions.length} of ${data.limit} kept` : undefined}
        >
          <div className={styles.passwordForm}>
            <Input
              label="A note to remember it by"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={200}
              placeholder="e.g. Before the first launch run"
              hint="Optional. It is shown beside the version, so you can tell them apart."
              disabled={full}
            />

            {problem ? (
              <div className={styles.dialogProblem} role="alert">
                <Icon name="alert-circle-outline" size={16} color="var(--danger)" />
                <Text variant="small" as="p" raw>
                  {problem}
                </Text>
              </div>
            ) : null}

            <div>
              <Button
                label="Save A Version"
                variant="primary"
                size="md"
                loading={saving}
                disabled={saving || full}
                title={full ? 'The most that are kept are saved already. Delete an old one first.' : undefined}
                onClick={save}
              />
            </div>
          </div>

          {full ? (
            <div style={{ marginTop: 'var(--space-md)' }}>
              <Note icon="warning-outline" tone="ink2">
                {data?.limit} versions are saved already, which is the most kept. Delete an old one
                first.
              </Note>
            </div>
          ) : null}
        </PageCard>
      </div>

      {result ? (
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <RestoreResult result={result} kinds={kinds} onDismiss={() => setResult(undefined)} />
        </div>
      ) : null}

      {/* ---- THE VERSIONS ---- */}
      <div style={{ marginTop: 'var(--space-lg)' }}>
        <PageCard title="Saved" subtitle={data ? `${versions.length} saved` : undefined} flush>
          <DataTable
            rows={versions}
            columns={columns}
            rowKey={(v) => v.id}
            loading={loading}
            paginate={false}
            emptyTitle="Nothing saved yet"
            emptyMessage="Save a version before you clear anything — afterwards there is nothing to put back."
            rowActions={(v) => (
              <>
                <Button
                  label="Open"
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/saved-versions/${v.id}`)}
                />
                {/* ONE CLICK TO UNDO A CLEAR EVERYTHING, from the list as well as from
                    inside the version: the server puts customers back first, then
                    businesses, cars, payouts, bookings and the rest, in the right
                    order, so there is nothing to work out. */}
                <PutBack
                  versionId={v.id}
                  versionLabel={versionLabel(v)}
                  what={{}}
                  label="Put Back Everything"
                  subject="everything that was deleted"
                  missing={totalMissing(v, kinds)}
                  onResult={(outcome) => {
                    setResult(outcome);
                    refresh();
                  }}
                />
                <DeleteVersion versionId={v.id} versionLabel={versionLabel(v)} onDone={refresh} />
              </>
            )}
          />
        </PageCard>
      </div>

      <div style={{ marginTop: 'var(--space-lg)' }}>
        <Note icon="warning-outline" tone="ink2">
          Putting records back only brings back what is missing. Anything on the platform now is left
          exactly as it is, even if it has been changed since — so it cannot undo anything done after
          a version was saved, and it is safe to press twice. After a Clear Everything, Put Back
          Everything restores the lot in one go.
        </Note>
      </div>
    </>
  );
}
