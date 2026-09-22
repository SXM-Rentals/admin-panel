'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: One vehicle — reading its paperwork (the registration,
// the insurance certificate and the roadworthiness certificate), and deciding
// whether customers can book it.
//
// TWO DECISIONS, AND THEY ARE KEPT APART ON PURPOSE. Approving the paperwork and
// putting the car live are separate on the SXM Rentals server: every document
// can be approved and the car still not be listed, and a listed car does not
// come down by itself when a document is rejected. This screen used to say the
// opposite — "all three approved and it goes live" — because the sample data
// worked that way. The real one does not, so the listing now has its own card,
// its own buttons and its own reason, and the screen says plainly that the two
// do not follow each other.
//
// THE LISTING BUTTONS ARE NEVER GREYED OUT BY WHAT THE DOCUMENTS SAY. It would
// be easy to stop somebody putting a car live while a document is unread — and
// it would be the panel guessing at a rule the server does not have. Instead the
// dialog says, in so many words, which documents are not yet approved, and the
// decision stays with the person making it.

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money, vehicleClassLabels } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { DocumentReview } from '@/components/admin/DocumentReview';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { DOCUMENT_KIND_LABELS, InfoRow, InfoRows, LISTING_STYLE, Note } from '@/components/admin/shared';
import { Button, Skeleton, StatusPill, Text } from '@/components/ui';
import styles from '@/components/admin/admin.module.css';

export default function VehicleVerificationPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const { data: vehicle, loading, error, refresh } = useAsyncData(() => apiClient.getVehicle(id), [id]);

  // Which listing decision is being made, while the reason dialog is open.
  const [listingDecision, setListingDecision] = useState<'live' | 'down' | null>(null);

  // Could not be fetched is not the same as "no such vehicle". See LoadFailed.
  if (error) return <LoadFailed title="Vehicle" what="This vehicle" error={error} onRetry={refresh} />;

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
  const notApproved = vehicle.documents.filter((d) => d.status !== 'approved');
  const listing = LISTING_STYLE[vehicle.listingStatus];
  const isLive = vehicle.listingStatus === 'live';

  // Said in the dialog when putting a car live with paperwork still open —
  // never used to stop it. See the note at the top of this file.
  const paperworkWarning =
    notApproved.length === 0
      ? vehicle.documents.length === 0
        ? 'No documents have been uploaded for this vehicle.'
        : 'All of its documents are approved.'
      : `Not yet approved: ${notApproved
          .map((d) => (DOCUMENT_KIND_LABELS[d.kind] ?? d.kind).toLowerCase())
          .join(', ')}.`;

  return (
    <>
      <PageHead
        title={label}
        description={`${vehicle.reference} · ${vehicle.providerName} · ${money(vehicle.dailyRate)} a day`}
        actions={<Button label="Back to Vehicles" href="/vehicles" variant="ghost" size="md" />}
      />

      <div className={styles.detailGrid}>
        <div className={styles.detailStack}>
          <PageCard
            title="The Paperwork"
            subtitle={
              vehicle.documents.length === 0
                ? 'Nothing uploaded yet'
                : pending === 0
                  ? 'Everything here has been read'
                  : `${pending} still to read`
            }
          >
            {vehicle.documents.length === 0 ? (
              <Note>
                The business has not uploaded any documents for this vehicle yet. There is nothing
                to read until they do.
              </Note>
            ) : (
              <div className={styles.docList}>
                {vehicle.documents.map((document) => (
                  <DocumentReview
                    // The document's own id: a car can have had more than one
                    // insurance certificate, and each is read on its own.
                    key={document.id}
                    document={document}
                    subjectLabel={`${label} · ${vehicle.reference}`}
                    onDecided={async (approve, reason) => {
                      await apiClient.reviewVehicleDocument(document.id, approve, reason);
                      refresh();
                    }}
                  />
                ))}
              </div>
            )}
          </PageCard>
        </div>

        <div className={styles.detailStack}>
          <PageCard title="The Listing" subtitle="Whether customers can find and book it">
            <InfoRows>
              <InfoRow label="Listing" value={<StatusPill label={listing.label} tone={listing.tone} />} />
            </InfoRows>

            <div style={{ marginTop: 'var(--space-lg)', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
              {!isLive ? (
                <Button
                  label="Put This Vehicle Live"
                  variant="primary"
                  size="md"
                  onClick={() => setListingDecision('live')}
                />
              ) : null}
              {vehicle.listingStatus !== 'suspended' ? (
                <Button
                  label="Take This Vehicle Down"
                  variant="outline"
                  size="md"
                  onClick={() => setListingDecision('down')}
                />
              ) : null}
            </div>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Note>
                A separate decision from the paperwork. Approving every document does not put the
                car live, and rejecting one does not take it down — both are done here, on purpose,
                with a reason.
              </Note>
            </div>
          </PageCard>

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
            </InfoRows>
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
          </PageCard>
        </div>
      </div>

      <ReasonDialog
        open={listingDecision !== null}
        onClose={() => setListingDecision(null)}
        title={listingDecision === 'live' ? 'Put this vehicle live' : 'Take this vehicle down'}
        description={
          listingDecision === 'live'
            ? `Customers will be able to find and book it straight away. ${paperworkWarning}`
            : 'It stops appearing to customers straight away. Bookings already made are not cancelled.'
        }
        confirmLabel={listingDecision === 'live' ? 'Put live' : 'Take down'}
        destructive={listingDecision === 'down'}
        reasonPlaceholder={
          listingDecision === 'live'
            ? 'e.g. Registration, insurance and roadworthiness all read and current.'
            : 'e.g. Insurance lapsed on 14 June — down until the renewal is uploaded.'
        }
        change={{
          subjectLabel: `${label} · ${vehicle.reference}`,
          field: 'Listing',
          before: listing.label,
          after: listingDecision === 'live' ? LISTING_STYLE.live.label : LISTING_STYLE.suspended.label,
        }}
        onConfirm={async (reason) => {
          await apiClient.decideVehicleListing(vehicle.id, listingDecision === 'live', reason);
          refresh();
        }}
      />
    </>
  );
}
