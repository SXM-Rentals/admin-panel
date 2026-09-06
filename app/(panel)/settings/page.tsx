'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The platform-wide settings — the commission the platform
// keeps, which identity-check company is used, which legal entity Stripe pays
// out from, and the feature flags.
//
// TWO OF THESE ARE OPEN QUESTIONS RATHER THAN SETTLED FACTS, and the screen says
// so instead of presenting a guess as a decision:
//
//   Whether a passport check and a licence check bill as one verification or
//   two. The Overview doc flags this as the thing that either doubles or does
//   not double the per-customer cost, and says to confirm it with the provider
//   directly. Until somebody does, it is a switch with a warning attached.
//
//   Whether a Sint Maarten entity can receive Stripe payouts at all. It does not
//   appear on Stripe's standard supported list. The US entity is the working
//   answer because it covers payouts platform-wide.
//
// Marking those two as unconfirmed is not decoration. A setting that looks
// settled gets built on, and both of these have real money behind them.
//
// CHANGING THE COMMISSION RATE GOES THROUGH THE REASON DIALOG like everything
// else. It is one number, and it decides what every rental business on the
// platform is paid.

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import {
  kycProviderLabels,
  kycProviderNotes,
  payoutEntityLabels,
  payoutEntityNotes,
} from '@/lib/labels';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { FilterSelect } from '@/components/admin/FilterBar';
import { Note } from '@/components/admin/shared';
import { Button, Icon, MockBanner, Skeleton, Text, Toggle, useToast } from '@/components/ui';
import type { PlatformSettings } from '@/types';
import styles from '@/components/admin/admin.module.css';

export default function SettingsPage() {
  const { showToast } = useToast();
  const { data: loaded, loading, refresh } = useAsyncData(() => apiClient.getSettings(), []);

  const [draft, setDraft] = useState<PlatformSettings | null>(null);
  const [rateInput, setRateInput] = useState('');
  const [changingRate, setChangingRate] = useState(false);

  useEffect(() => {
    if (loaded) {
      setDraft(structuredClone(loaded));
      setRateInput(String(Math.round(loaded.commissionRate * 100)));
    }
  }, [loaded]);

  if (loading || !draft || !loaded) return <Skeleton height={420} />;

  const parsedRate = Number(rateInput);
  const rateValid = Number.isFinite(parsedRate) && parsedRate > 0 && parsedRate < 100;
  const rateChanged = rateValid && parsedRate / 100 !== loaded.commissionRate;

  const save = async (next: Partial<PlatformSettings>, message: string) => {
    await apiClient.saveSettings(next);
    refresh();
    showToast(message);
  };

  return (
    <>
      <PageHead
        title="Settings"
        description="What the platform charges, who checks identities, where payouts come from, and what is switched on."
      />

      <MockBanner />

      <div className={styles.detailGrid}>
        <div className={styles.detailStack}>
          {/* ---- THE COMMISSION ---- */}
          <PageCard
            title="Commission"
            subtitle="What SXM Rentals keeps from every booking"
          >
            <div className={styles.settingRow}>
              <div className={styles.settingText}>
                <Text variant="label" as="span" raw>
                  Platform Commission
                </Text>
                <Text variant="small" tone="ink3" as="p" raw>
                  At {Math.round(loaded.commissionRate * 100)}%, a customer paying $100 a day
                  means the business nets ${Math.round(100 * (1 - loaded.commissionRate))} and
                  SXM Rentals keeps ${Math.round(100 * loaded.commissionRate)}.
                </Text>
              </div>

              <div className={styles.settingControl}>
                <input
                  className={styles.numberInput}
                  type="number"
                  min={1}
                  max={99}
                  value={rateInput}
                  onChange={(event) => setRateInput(event.target.value)}
                  aria-label="Commission percentage"
                />
                <Text variant="small" tone="ink3" as="span" raw>
                  %
                </Text>
                <Button
                  label="Change"
                  variant="secondary"
                  size="sm"
                  disabled={!rateChanged}
                  onClick={() => setChangingRate(true)}
                />
              </div>
            </div>

            <Note icon="warning-outline" tone="ink2">
              This one number decides what every rental business on the platform is paid.
              Changing it needs a reason and is written to the audit log.
            </Note>
          </PageCard>

          {/* ---- IDENTITY CHECKS ---- */}
          <PageCard
            title="Identity Checks"
            subtitle="Who verifies passports, local IDs and driving licences"
          >
            <div className={styles.settingRow}>
              <div className={styles.settingText}>
                <Text variant="label" as="span" raw>
                  Provider
                </Text>
                <Text variant="small" tone="ink3" as="p" raw>
                  {kycProviderNotes[draft.kycProvider]}
                </Text>
              </div>
              <div className={styles.settingControl}>
                <FilterSelect
                  label=""
                  value={draft.kycProvider}
                  onChange={(value) => {
                    setDraft({ ...draft, kycProvider: value as PlatformSettings['kycProvider'] });
                    save(
                      { kycProvider: value as PlatformSettings['kycProvider'] },
                      'Identity check provider updated.',
                    );
                  }}
                  options={(Object.keys(kycProviderLabels) as PlatformSettings['kycProvider'][]).map(
                    (key) => ({ value: key, label: kycProviderLabels[key] }),
                  )}
                />
              </div>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingText}>
                <Text variant="label" as="span" raw>
                  One Session Covers Both Documents
                </Text>
                <Text variant="small" tone="ink3" as="p" raw>
                  Whether checking a passport and a driving licence bills as one verification or
                  as two.
                </Text>
              </div>
              <div className={styles.settingControl}>
                <Toggle
                  label="One session covers both documents"
                  value={draft.kycBundledDocuments}
                  onChange={(value) => {
                    setDraft({ ...draft, kycBundledDocuments: value });
                    save({ kycBundledDocuments: value }, 'Saved.');
                  }}
                />
              </div>
            </div>

            {/* An open question, marked as one. */}
            <div className={styles.openQuestion}>
              <Icon name="help-circle-outline" size={16} color="var(--warning)" />
              <div>
                <Text variant="label" as="p" raw>
                  Not Confirmed with the Provider Yet
                </Text>
                <Text variant="small" tone="ink2" as="p" raw style={{ marginTop: 4 }}>
                  This switch either doubles the per-customer identity cost or it does not, which
                  at a thousand signups a month is the difference between roughly $1,000 and
                  $2,000. Worth confirming directly with{' '}
                  {kycProviderLabels[draft.kycProvider]} before either figure goes in a budget.
                </Text>
              </div>
            </div>
          </PageCard>

          {/* ---- FEATURE FLAGS ---- */}
          <PageCard
            title="Feature Flags"
            subtitle="What is switched on across the platform"
          >
            {draft.featureFlags.map((flag) => (
              <div key={flag.id} className={styles.settingRow}>
                <div className={styles.settingText}>
                  <Text variant="label" as="span" raw>
                    {flag.label}
                  </Text>
                  <Text variant="small" tone="ink3" as="p" raw>
                    {flag.description}
                  </Text>
                </div>
                <div className={styles.settingControl}>
                  <Toggle
                    label={flag.label}
                    value={flag.enabled}
                    onChange={(value) => {
                      const featureFlags = draft.featureFlags.map((f) =>
                        f.id === flag.id ? { ...f, enabled: value } : f,
                      );
                      setDraft({ ...draft, featureFlags });
                      save({ featureFlags }, `${flag.label} ${value ? 'switched on' : 'switched off'}.`);
                    }}
                  />
                </div>
              </div>
            ))}
          </PageCard>
        </div>

        <div className={styles.detailStack}>
          {/* ---- PAYOUTS ---- */}
          <PageCard
            title="Payout Entity"
            subtitle="Which legal entity Stripe pays providers from"
          >
            <FilterSelect
              label="Entity"
              value={draft.payoutEntity}
              onChange={(value) => {
                setDraft({ ...draft, payoutEntity: value as PlatformSettings['payoutEntity'] });
                save(
                  { payoutEntity: value as PlatformSettings['payoutEntity'] },
                  'Payout entity updated.',
                );
              }}
              options={(Object.keys(payoutEntityLabels) as PlatformSettings['payoutEntity'][]).map(
                (key) => ({ value: key, label: payoutEntityLabels[key] }),
              )}
            />

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Text variant="small" tone="ink2" as="p" raw>
                {payoutEntityNotes[draft.payoutEntity]}
              </Text>
            </div>

            {draft.payoutEntity === 'dutch_side' ? (
              <div className={styles.openQuestion} style={{ marginTop: 'var(--space-lg)' }}>
                <Icon name="warning-outline" size={16} color="var(--warning)" />
                <Text variant="small" as="p" raw>
                  This route is not confirmed. A Sint Maarten entity does not clearly appear on
                  Stripe’s list of payout-supported countries, so nothing should depend on it
                  until Stripe or a local banking partner has said yes in writing.
                </Text>
              </div>
            ) : null}
          </PageCard>

          <PageCard title="Access">
            <Text variant="body" tone="ink2" as="p" raw>
              There is one access level. Every admin account can see and do everything in this
              panel — there are no permission tiers at MVP.
            </Text>
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Note>
                That is a reasonable choice for a small team, and it is the audit log that makes
                it a choice rather than an oversight. If the team grows past the point where it
                makes sense, permission tiers and the checks that enforce them get added
                together.
              </Note>
            </div>
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Button label="Open Audit Log" href="/audit" variant="secondary" size="sm" />
            </div>
          </PageCard>

          <PageCard title="What Runs This">
            <Text variant="small" tone="ink2" as="p" raw>
              The full stack — the language, the outside companies, what each one costs and
              where it is used — is on the Playbook screen.
            </Text>
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Button label="Open Playbook" href="/playbook" variant="secondary" size="sm" />
            </div>
          </PageCard>
        </div>
      </div>

      <ReasonDialog
        open={changingRate}
        onClose={() => setChangingRate(false)}
        title="Change the platform commission"
        description="This changes what every rental business on the platform is paid on every future booking."
        confirmLabel="Change commission"
        destructive
        reasonPlaceholder="e.g. Board decision of 3 September to reduce commission to 27% for the first year."
        audit={{
          action: 'settings_changed',
          subjectType: 'platform',
          subjectId: 'platform',
          subjectLabel: 'Platform settings',
          field: 'Commission rate',
          before: `${Math.round(loaded.commissionRate * 100)}%`,
          after: rateValid ? `${parsedRate}%` : '—',
        }}
        onConfirm={async () => {
          await save({ commissionRate: parsedRate / 100 }, 'Commission rate updated.');
        }}
      />
    </>
  );
}
