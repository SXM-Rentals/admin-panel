'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Reviewing a rental business's own paperwork — the company
// registration and the fleet insurance policy — before they are allowed to list
// anything.
//
// THIS IS A DIFFERENT JOB FROM THE VEHICLE SCREEN even though it looks the same.
// There, the question is whether one car is roadworthy and insured. Here it is
// whether this is a real company, trading under the name it says, and covered to
// rent vehicles out at all. Turning this one down stops everything they have
// listed; the vehicle screen stops one car. Same tools, much larger consequence,
// which is why the note on the right says so plainly.

import React from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAdminSession } from '@/lib/auth';
import { longDate } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { DocumentReview } from '@/components/admin/DocumentReview';
import { InfoRow, InfoRows, Note, VerificationPill } from '@/components/admin/shared';
import { Button, MockBanner, Skeleton, Text } from '@/components/ui';
import styles from '@/components/admin/admin.module.css';

export default function ProviderVerificationPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { staff } = useAdminSession();

  const { data: provider, loading, refresh } = useAsyncData(
    () => apiClient.getProvider(id),
    [id],
  );

  if (loading) return <Skeleton height={420} />;

  if (!provider) {
    return (
      <>
        <PageHead title="Business not found" description="No rental business with that reference." />
        <Button label="Back to Providers" href="/providers" variant="secondary" size="md" />
      </>
    );
  }

  const pending = provider.documents.filter((d) => d.status === 'pending').length;

  return (
    <>
      <PageHead
        title={`Verify ${provider.businessName}`}
        description={`Applied ${longDate(provider.memberSince)} · ${provider.town}, ${provider.side === 'dutch' ? 'Dutch side' : 'French side'}`}
        actions={
          <Button
            label="Back to Business"
            href={`/providers/${provider.id}`}
            variant="ghost"
            size="md"
          />
        }
      />

      <MockBanner />

      <div className={styles.detailGrid}>
        <div className={styles.detailStack}>
          <PageCard
            title="Filed Documents"
            subtitle={pending === 0 ? 'Everything here has been read' : `${pending} still to read`}
          >
            <div className={styles.docList}>
              {provider.documents.map((document) => (
                <DocumentReview
                  key={document.kind}
                  document={document}
                  subjectType="provider"
                  subjectId={provider.id}
                  subjectLabel={provider.businessName}
                  onDecided={async (decision, reason) => {
                    await apiClient.reviewProviderDocument(
                      provider.id,
                      document.kind,
                      decision,
                      reason,
                      staff?.name ?? 'Unknown',
                    );
                    refresh();
                  }}
                />
              ))}
            </div>
          </PageCard>
        </div>

        <div className={styles.detailStack}>
          <PageCard title="The Application">
            <InfoRows>
              <InfoRow label="Trading name" value={provider.businessName} />
              <InfoRow label="Legal name" value={provider.legalName} />
              <InfoRow
                label="Registration number"
                value={provider.registrationNumber ?? 'Not supplied'}
              />
              <InfoRow label="Contact email" value={provider.contactEmail} />
              <InfoRow label="Phone" value={provider.phone} />
              <InfoRow label="Vehicles submitted" value={String(provider.vehicleCount)} />
              <InfoRow
                label="Current status"
                value={<VerificationPill status={provider.verificationStatus} />}
              />
            </InfoRows>
          </PageCard>

          <PageCard title="What Happens Next">
            <Text variant="small" tone="ink2" as="p" raw>
              The business status follows from these documents. Approve them all and it becomes
              Verified and drops out of the queue; reject any one and the business is turned
              down. There is no separate switch to remember.
            </Text>
          </PageCard>

          <PageCard title="What To Check">
            <Text variant="small" tone="ink2" as="p" raw>
              That the registration extract carries the same company name as the application.
              That the insurance policy is current and covers renting vehicles out, not just
              driving them. And that the trading name and the legal name are plausibly the same
              business.
            </Text>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Note icon="warning-outline" tone="ink2">
                Turning this down stops everything this business has listed, not one vehicle.
                Whatever you write as the reason is what they are told, so make it something
                they can act on.
              </Note>
            </div>
          </PageCard>
        </div>
      </div>
    </>
  );
}
