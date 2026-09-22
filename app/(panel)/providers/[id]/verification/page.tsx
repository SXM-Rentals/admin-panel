'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The "SXM Verified" decision for a rental business —
// whether this is a real company, trading under the name it says, and fit to
// rent vehicles out.
//
// ONE DECISION, NOT A DOCUMENT-BY-DOCUMENT REVIEW. This screen used to list the
// business's filed paperwork and derive the business's status from how each
// document was marked. The SXM Rentals server has no record of a business's
// documents at all: what it has is one decision, verified or not, with a reason.
// So that is what this screen asks for. What to look at before deciding is
// still listed — as a reminder, not as boxes to tick, because ticks that are
// not recorded anywhere are theatre.
//
// WHAT THE DECISION DOES, AND DOES NOT, DO — said plainly on screen because
// both are easy to get wrong:
//
//   - It sets the public "SXM Verified" badge. Turning a business down takes
//     the badge away.
//   - It does NOT take their vehicles off the site. On the server as it stands,
//     whether customers can find and book a car depends only on that car's own
//     listing. Stopping a business trading means taking each vehicle down.
//   - The reason goes into the audit log. The business is NOT sent it — nothing
//     tells them automatically — so if they need to fix something, somebody has
//     to tell them.

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { longDate } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { InfoRow, InfoRows, Note, VerificationPill } from '@/components/admin/shared';
import { Button, Skeleton, Text } from '@/components/ui';
import styles from '@/components/admin/admin.module.css';

export default function ProviderVerificationPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const { data: provider, loading, error, refresh } = useAsyncData(() => apiClient.getProvider(id), [id]);

  // Which decision is being made, while the reason dialog is open.
  const [deciding, setDeciding] = useState<'approve' | 'reject' | null>(null);

  // Could not be fetched is not the same as "no such business". See LoadFailed.
  if (error) return <LoadFailed title="Verification" what="This business" error={error} onRetry={refresh} />;

  if (loading) return <Skeleton height={420} />;

  if (!provider) {
    return (
      <>
        <PageHead title="Business not found" description="No rental business with that reference." />
        <Button label="Back to Providers" href="/providers" variant="secondary" size="md" />
      </>
    );
  }

  const status = provider.verificationStatus;
  const verified = status === 'approved';
  const turnedDown = status === 'rejected';

  return (
    <>
      <PageHead
        title={`Verify ${provider.businessName}`}
        description={`Applied ${longDate(provider.memberSince)} · ${provider.town}, ${provider.side === 'dutch' ? 'Dutch side' : 'French side'}`}
        actions={
          <Button label="Back to Business" href={`/providers/${provider.id}`} variant="ghost" size="md" />
        }
      />

      <div className={styles.detailGrid}>
        <div className={styles.detailStack}>
          <PageCard
            title="The Decision"
            subtitle={
              verified ? 'Verified — the badge is showing' : turnedDown ? 'Turned down' : 'Not decided yet'
            }
          >
            <InfoRows>
              <InfoRow label="Current status" value={<VerificationPill status={status} />} />
            </InfoRows>

            {/* A decision can be changed later — verification withdrawn when
                something turns up, a refusal overturned on appeal. Both go
                through the same dialog and both are logged. */}
            <div style={{ marginTop: 'var(--space-lg)', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
              {!verified ? (
                <Button
                  label={turnedDown ? 'Verify After All' : 'Verify This Business'}
                  variant="primary"
                  size="md"
                  onClick={() => setDeciding('approve')}
                />
              ) : null}
              {!turnedDown ? (
                <Button
                  label={verified ? 'Withdraw Verification' : 'Turn This Business Down'}
                  variant="outline"
                  size="md"
                  onClick={() => setDeciding('reject')}
                />
              ) : null}
            </div>
          </PageCard>

          <PageCard title="What Happens Next">
            <Text variant="small" tone="ink2" as="p" raw>
              Verifying this business shows the SXM Verified badge on their profile and their
              listings. Turning them down, or withdrawing it, takes the badge away.
            </Text>
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Note icon="warning-outline" tone="ink2">
                Neither decision takes their vehicles off the site. Whether customers can book a car
                depends on that car&rsquo;s own listing — to stop this business trading, open each of
                its vehicles and take the listing down.
              </Note>
            </div>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <Note>
                Your reason goes into the audit log. The business is not sent it — if they need to
                fix something, tell them yourself.
              </Note>
            </div>
          </PageCard>
        </div>

        <div className={styles.detailStack}>
          <PageCard title="The Application">
            <InfoRows>
              <InfoRow label="Trading name" value={provider.businessName} />
              <InfoRow label="Legal name" value={provider.legalName || 'Not supplied'} />
              <InfoRow
                label="Registration number"
                value={provider.registrationNumber ?? 'Not supplied'}
              />
              <InfoRow label="Contact email" value={provider.contactEmail || 'Not supplied'} />
              <InfoRow label="Phone" value={provider.phone} />
              <InfoRow label="Vehicles submitted" value={String(provider.vehicleCount)} />
            </InfoRows>
          </PageCard>

          <PageCard title="What To Check">
            <Text variant="small" tone="ink2" as="p" raw>
              That the company registration carries the same name as the application. That their
              insurance is current and covers renting vehicles out, not just driving them. And that
              the trading name and the legal name are plausibly the same business.
            </Text>
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Note>
                The server does not hold the business&rsquo;s documents yet, so they are not shown
                here. Ask the business for them directly before deciding.
              </Note>
            </div>
          </PageCard>
        </div>
      </div>

      <ReasonDialog
        open={deciding !== null}
        onClose={() => setDeciding(null)}
        title={deciding === 'approve' ? 'Verify this business' : 'Turn this business down'}
        description={
          deciding === 'approve'
            ? 'Say what you checked. Somebody reviewing this later needs to know it was read rather than waved through.'
            : 'Say what was wrong. This goes into the audit log — the business is not sent it.'
        }
        confirmLabel={deciding === 'approve' ? 'Verify business' : 'Turn down'}
        destructive={deciding === 'reject'}
        reasonPlaceholder={
          deciding === 'approve'
            ? 'e.g. Registration extract matches the legal name; fleet insurance current to March 2027 and covers rental use.'
            : 'e.g. Registration extract is for a different company name. Asked them to send the correct one.'
        }
        change={{
          subjectLabel: provider.businessName,
          field: 'SXM Verified',
          before: verified ? 'Verified' : turnedDown ? 'Turned down' : 'Not decided',
          after: deciding === 'approve' ? 'Verified' : 'Turned down',
        }}
        onConfirm={async (reason) => {
          await apiClient.decideProviderVerification(provider.id, deciding === 'approve', reason);
          refresh();
        }}
      />
    </>
  );
}
