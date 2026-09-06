'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Reviewing one vehicle's paperwork — the registration, the
// insurance certificate and the roadworthiness certificate — and approving or
// rejecting each one with a reason.
//
// WHETHER THE VEHICLE IS LISTED FOLLOWS FROM THE DOCUMENTS, and is not a
// separate switch somebody has to remember to flick. All three approved and it
// goes live; anything still unread and it waits; anything rejected and it is
// suspended. Tying the two together is what stops a car with expired insurance
// sitting on the site because a rejection was recorded and the listing was not.

import React from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAdminSession } from '@/lib/auth';
import { money, vehicleClassLabels } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { DocumentReview } from '@/components/admin/DocumentReview';
import { InfoRow, InfoRows, LISTING_STYLE, Note } from '@/components/admin/shared';
import { Button, MockBanner, Skeleton, StatusPill, Text } from '@/components/ui';
import styles from '@/components/admin/admin.module.css';

export default function VehicleVerificationPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { staff } = useAdminSession();

  const { data: vehicle, loading, refresh } = useAsyncData(() => apiClient.getVehicle(id), [id]);

  if (loading) return <Skeleton height={420} />;

  if (!vehicle) {
    return (
      <>
        <PageHead title="Vehicle not found" description="No vehicle with that reference." />
        <Button label="Back to Vehicles" href="/vehicles" variant="secondary" size="md" />
      </>
    );
  }

  const label = `${vehicle.make} ${vehicle.model} ${vehicle.year}`;
  const pending = vehicle.documents.filter((d) => d.status === 'pending').length;
  const listing = LISTING_STYLE[vehicle.listingStatus];

  return (
    <>
      <PageHead
        title={label}
        description={`${vehicle.reference} · ${vehicle.providerName} · ${money(vehicle.dailyRate)} a day`}
        actions={<Button label="Back to Vehicles" href="/vehicles" variant="ghost" size="md" />}
      />

      <MockBanner />

      <div className={styles.detailGrid}>
        <div className={styles.detailStack}>
          <PageCard
            title="Documents"
            subtitle={
              pending === 0
                ? 'Everything here has been read'
                : `${pending} still to read`
            }
          >
            <div className={styles.docList}>
              {vehicle.documents.map((document) => (
                <DocumentReview
                  key={document.kind}
                  document={document}
                  subjectType="vehicle"
                  subjectId={vehicle.id}
                  subjectLabel={`${label} · ${vehicle.reference}`}
                  onDecided={async (decision, reason) => {
                    await apiClient.reviewVehicleDocument(
                      vehicle.id,
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
          <PageCard title="Vehicle">
            <InfoRows>
              <InfoRow label="Reference" value={vehicle.reference} />
              <InfoRow label="Make and model" value={`${vehicle.make} ${vehicle.model}`} />
              <InfoRow label="Year" value={String(vehicle.year)} />
              <InfoRow label="Class" value={vehicleClassLabels[vehicle.vehicleClass] ?? vehicle.vehicleClass} />
              <InfoRow label="Daily rate" value={money(vehicle.dailyRate)} />
              <InfoRow
                label="Side of the island"
                value={vehicle.side === 'dutch' ? 'Dutch · Sint Maarten' : 'French · Saint-Martin'}
              />
              <InfoRow
                label="Listing"
                value={<StatusPill label={listing.label} tone={listing.tone} />}
              />
            </InfoRows>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Note>
                The listing state follows from the documents. All three approved and it goes
                live; anything unread and it waits; anything rejected and it is suspended.
              </Note>
            </div>
          </PageCard>

          <PageCard title="Business">
            <InfoRows>
              <InfoRow label="Listed by" value={vehicle.providerName} />
            </InfoRows>
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Button
                label="Open Business"
                href={`/providers/${vehicle.providerId}`}
                variant="secondary"
                size="sm"
              />
            </div>
          </PageCard>

          <PageCard title="Why A Person Does This">
            <Text variant="small" tone="ink2" as="p" raw>
              Customer identity checks run through an automated service — passports are standard
              documents and there are thousands a month. Vehicle paperwork is the opposite: far
              fewer, and what matters is context a machine does not have. Whether the insurance
              covers rental use. Whether the certificate is for this registration. Whether the
              dates make sense.
            </Text>
            <Text variant="small" tone="ink3" as="p" raw style={{ marginTop: 'var(--space-md)' }}>
              So there is no per-check cost here, only the time it takes to read them.
            </Text>
          </PageCard>
        </div>
      </div>
    </>
  );
}
