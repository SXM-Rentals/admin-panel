'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The rewards programme — the four tiers, what it takes to
// reach each one, and how many points every activity is worth. All of it
// editable here rather than written into the code.
//
// WHY THESE NUMBERS ARE ON A SCREEN AT ALL. The Overview doc is explicit that
// the values are a first pass and want modelling against the roughly 30%
// platform margin before anybody relies on them. Numbers described that way
// belong somewhere they can be changed by whoever does that modelling, not in a
// source file that needs a developer and a deployment to touch.
//
// THE WORKED EXAMPLE UPDATES AS YOU TYPE, and that is the point of it. "+100 for
// a repeat booking" is an abstraction; "a $500 rental over five days now earns
// 600 points" is a number somebody can hold against the margin and say yes or
// no to. Changing a value and watching the example move is the whole job this
// screen exists to support.
//
// POINTS AND ISLANDER STATUS ARE SEPARATE, and nothing on this screen touches
// Islander. It is a residency flag — you get it by living on the island and
// proving it. No amount of spending earns it, and it is not a fifth tier.

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { workedExample } from '@/lib/rewards-example';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { Note } from '@/components/admin/shared';
import { Button, MockBanner, Skeleton, StatusPill, Text, useToast } from '@/components/ui';
import type { RewardsConfig } from '@/types';
import styles from '@/components/admin/admin.module.css';

export default function RewardsConfigPage() {
  const { showToast } = useToast();
  const { data: loaded, loading } = useAsyncData(() => apiClient.getRewardsConfig(), []);

  // Edited in a local copy so the example can update on every keystroke without
  // anything being saved until the button is pressed.
  const [draft, setDraft] = useState<RewardsConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loaded) setDraft(structuredClone(loaded));
  }, [loaded]);

  if (loading || !draft) return <Skeleton height={420} />;

  const example = workedExample(draft);
  const changed = JSON.stringify(draft) !== JSON.stringify(loaded);

  const setThreshold = (tier: string, value: number) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            tiers: current.tiers.map((t) => (t.tier === tier ? { ...t, threshold: value } : t)),
          }
        : current,
    );
  };

  const setEarning = (id: string, value: number) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            earning: current.earning.map((e) => (e.id === id ? { ...e, points: value } : e)),
          }
        : current,
    );
  };

  return (
    <>
      <PageHead
        title="Rewards"
        description="Tier thresholds and point values. A draft framework, held here so it can be tuned rather than hardcoded."
        actions={
          <Button
            label="Save Changes"
            variant="primary"
            size="md"
            disabled={!changed}
            loading={saving}
            onClick={async () => {
              setSaving(true);
              await apiClient.saveRewardsConfig(draft);
              setSaving(false);
              showToast('Rewards configuration saved.');
            }}
          />
        }
      />

      <MockBanner />

      <div className={styles.detailGrid}>
        <div className={styles.detailStack}>
          {/* ---- THE FOUR TIERS ---- */}
          <PageCard
            title="Tiers"
            subtitle="How many points it takes to reach each one"
          >
            {draft.tiers.map((tier) => (
              <div key={tier.tier} className={styles.settingRow}>
                <div className={styles.settingText}>
                  <div className={styles.pillRow}>
                    <Text variant="label" as="span" raw>
                      {tier.label}
                    </Text>
                    {tier.threshold === 0 ? (
                      <StatusPill label="Everybody Starts Here" tone="neutral" dot={false} />
                    ) : null}
                  </div>
                  <Text variant="small" tone="ink3" as="p" raw>
                    {tier.benefits.join(' · ')}
                  </Text>
                </div>

                <div className={styles.settingControl}>
                  <input
                    className={styles.numberInput}
                    type="number"
                    min={0}
                    step={100}
                    value={tier.threshold}
                    onChange={(event) => setThreshold(tier.tier, Number(event.target.value))}
                    aria-label={`Points needed for ${tier.label}`}
                    disabled={tier.threshold === 0}
                  />
                  <Text variant="small" tone="ink3" as="span" raw>
                    points
                  </Text>
                </div>
              </div>
            ))}
          </PageCard>

          {/* ---- HOW POINTS ARE EARNED ---- */}
          <PageCard
            title="Earning"
            subtitle="What each activity is worth"
          >
            {draft.earning.map((rule) => (
              <div key={rule.id} className={styles.settingRow}>
                <div className={styles.settingText}>
                  <Text variant="label" as="span" raw>
                    {rule.activity}
                  </Text>
                  {rule.note ? (
                    <Text variant="small" tone="ink3" as="p" raw>
                      {rule.note}
                    </Text>
                  ) : null}
                </div>

                <div className={styles.settingControl}>
                  {rule.points === null ? (
                    <StatusPill label="Variable" tone="neutral" dot={false} />
                  ) : (
                    <>
                      <input
                        className={styles.numberInput}
                        type="number"
                        min={0}
                        value={rule.points}
                        onChange={(event) => setEarning(rule.id, Number(event.target.value))}
                        aria-label={`Points for ${rule.activity}`}
                      />
                      <Text variant="small" tone="ink3" as="span" raw>
                        points
                      </Text>
                    </>
                  )}
                </div>
              </div>
            ))}
          </PageCard>
        </div>

        <div className={styles.detailStack}>
          {/* ---- THE WORKED EXAMPLE ---- */}
          <PageCard
            title="Worked Example"
            subtitle={`A $${example.spend} rental over ${example.days} days`}
          >
            <div className={styles.infoRows}>
              {example.lines.map((line) => (
                <div key={line.label} className={styles.infoRow}>
                  <Text variant="small" tone="ink3" as="span" raw>
                    {line.label}
                  </Text>
                  <span className={styles.infoValue}>
                    <Text variant="label" as="span" raw>
                      {line.points.toLocaleString()}
                    </Text>
                  </span>
                </div>
              ))}
            </div>

            <div className={`${styles.moneyRow} ${styles.moneyTotal}`}>
              <Text variant="label" as="span" raw>
                Total Earned
              </Text>
              <Text variant="label" tone="brand" as="span" raw className="tabular">
                {example.total.toLocaleString()} points
              </Text>
            </div>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Note>
                Changing a value above moves this figure straight away. That is what it is for —
                these numbers want checking against the platform margin before anybody relies on
                them.
              </Note>
            </div>
          </PageCard>

          <PageCard title="Islander Status">
            <Text variant="body" tone="ink2" as="p" raw>
              Islander is not a tier and nothing on this screen affects it. It is a residency
              flag: a verified Sint Maarten or Saint-Martin resident gets it by proving where
              they live, not by spending. Somebody can be an Islander on the Explorer tier, and
              an Elite member who has never lived on the island.
            </Text>
          </PageCard>

          <PageCard title="Before This Goes Live">
            <Text variant="small" tone="ink2" as="p" raw>
              The benefits listed against each tier are illustrative. Most of the interesting
              ones — partner restaurant discounts, activity offers, airport transfers — need
              partner businesses signed up first. An MVP can launch with the smaller slice that
              needs nobody else: rental discounts, priority support, and referral bonuses.
            </Text>
          </PageCard>
        </div>
      </div>
    </>
  );
}
