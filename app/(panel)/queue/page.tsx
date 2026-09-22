'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Everything waiting on somebody in this office, in one
// list — verifications to review, disputes to pick up, refunds to decide.
//
// WHY THE THREE QUEUES ARE ON ONE SCREEN. They live on three different screens
// as well, and they have to, because each needs its own tools. But three screens
// is three things to remember to check, and the one nobody checks is the one
// where a customer waits eleven days. This screen exists so there is a single
// place where "is there anything outstanding" has an answer, and so the number
// in the sidebar means something.
//
// OLDEST FIRST, NOT NEWEST. Everywhere else in this panel the newest thing is at
// the top, because that is what you want when you are reading. Here you are
// working, and the thing that has been waiting longest is the thing closest to
// becoming a complaint. It goes first.

import React, { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { relativeDay } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { FilterBar, FilterChips } from '@/components/admin/FilterBar';
import { Icon, Skeleton, StatusPill, Text } from '@/components/ui';
import type { QueueItem } from '@/types';
import styles from '@/components/admin/admin.module.css';

type KindFilter = 'all' | 'verification' | 'dispute' | 'refund';

// How each of the three kinds is drawn — its icon and its colour. Kept in one
// place so a queue row and the screen it links to agree with each other.
const KIND: Record<
  QueueItem['kind'],
  { icon: 'shield-checkmark-outline' | 'alert-circle-outline' | 'swap-horizontal'; color: string; label: string }
> = {
  verification: { icon: 'shield-checkmark-outline', color: 'var(--brand)', label: 'Verification' },
  dispute: { icon: 'alert-circle-outline', color: 'var(--danger)', label: 'Dispute' },
  refund: { icon: 'swap-horizontal', color: 'var(--warning)', label: 'Refund' },
};

// How long something has been waiting, said as a state rather than a number of
// days. "Overdue" is a judgement the screen should make, not one every reader
// should have to make for themselves from a date.
const URGENCY: Record<QueueItem['urgency'], { tone: 'neutral' | 'warning' | 'danger'; label: string }> = {
  normal: { tone: 'neutral', label: 'Waiting' },
  aging: { tone: 'warning', label: 'Getting old' },
  overdue: { tone: 'danger', label: 'Overdue' },
};

export default function ActionQueuePage() {
  const [kind, setKind] = useState<KindFilter>('all');
  const { data: queue, loading, error, refresh } = useAsyncData(() => apiClient.getActionQueue(), []);

  const items = queue ?? [];
  const visible = kind === 'all' ? items : items.filter((item) => item.kind === kind);

  const count = (k: QueueItem['kind']) => items.filter((item) => item.kind === k).length;

  // A queue that could not be fetched is not an empty queue. See LoadFailed.
  if (error) return <LoadFailed title="Action Queue" what="The queue" error={error} onRetry={refresh} />;

  return (
    <>
      <PageHead
        title="Action Queue"
        description="Everything waiting on somebody here, oldest first. This is the number on the sidebar."
      />

      <PageCard
        title="Waiting"
        subtitle={
          visible.length === 0
            ? 'Nothing outstanding'
            : `${visible.length} ${visible.length === 1 ? 'item' : 'items'}, longest wait at the top`
        }
        flush
      >
        <FilterBar>
          <FilterChips
            label="Show"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'all', label: 'Everything', count: items.length },
              { value: 'verification', label: 'Verifications', count: count('verification') },
              { value: 'dispute', label: 'Disputes', count: count('dispute') },
              { value: 'refund', label: 'Refunds', count: count('refund') },
            ]}
          />
        </FilterBar>

        {loading ? (
          <div style={{ padding: 'var(--space-2xl)' }}>
            <Skeleton height={280} />
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: 'var(--space-5xl)', textAlign: 'center' }}>
            <Icon name="checkmark-circle-outline" size={28} color="var(--success)" />
            <Text variant="h3" as="p" tone="ink2" style={{ marginTop: 12 }}>
              Nothing is waiting
            </Text>
            <Text variant="small" tone="ink3" as="p" raw>
              Every verification, dispute and refund has been dealt with.
            </Text>
          </div>
        ) : (
          <div className={styles.queueList}>
            {visible.map((item) => {
              const kindStyle = KIND[item.kind];
              const urgency = URGENCY[item.urgency];

              return (
                <Link key={item.id} href={item.href} className={styles.queueItem}>
                  <span
                    className={styles.queueIcon}
                    style={{ background: 'var(--tile)', color: kindStyle.color }}
                  >
                    <Icon name={kindStyle.icon} size={18} />
                  </span>

                  <span className={styles.queueText}>
                    <Text variant="label" as="span" raw>
                      {item.title}
                    </Text>
                    <Text variant="small" tone="ink3" as="span" raw>
                      {item.detail}
                    </Text>
                  </span>

                  <span className={styles.queueWait}>
                    {/* The state and the actual date. The pill is the judgement,
                        the date underneath is the evidence for it. */}
                    <StatusPill label={urgency.label} tone={urgency.tone} />
                    <Text variant="caption" tone="ink3" as="span" raw>
                      since {relativeDay(item.waitingSince)}
                    </Text>
                  </span>

                  <Icon name="chevron-forward" size={16} color="var(--ink3)" />
                </Link>
              );
            })}
          </div>
        )}
      </PageCard>
    </>
  );
}
