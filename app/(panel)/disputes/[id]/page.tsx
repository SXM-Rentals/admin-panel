'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: One dispute in full — what happened, who is arguing, how
// much is at stake, who owns it, and where the resolution gets written down.
//
// THE RESOLUTION NOTES ARE FOR SOMEBODY ELSE. Whoever resolves a dispute already
// knows what they decided. The note exists for the person who picks up the phone
// three weeks later when the customer rings back, or for the next dispute
// between the same two parties, or for a chargeback where the card company wants
// to know what was done. So it wants the finding and the evidence, not "sorted".

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAdminSession } from '@/lib/auth';
import { money, longDate, relativeDay } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { FilterSelect } from '@/components/admin/FilterBar';
import { DISPUTE_STYLE, InfoRow, InfoRows, Note, Quote } from '@/components/admin/shared';
import { Button, MockBanner, Skeleton, StatusPill, Text } from '@/components/ui';
import styles from '@/components/admin/admin.module.css';

export default function DisputeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { staff } = useAdminSession();

  const { data: dispute, loading, refresh } = useAsyncData(() => apiClient.getDispute(id), [id]);
  const { data: allStaff } = useAsyncData(() => apiClient.listStaff(), []);

  // A dispute stores the booking REFERENCE, so the booking itself has to be
  // looked up before it can be linked to.
  const { data: booking } = useAsyncData(
    () => (dispute ? apiClient.getBookingByRef(dispute.bookingRef) : Promise.resolve(undefined)),
    [dispute?.bookingRef],
  );

  const [resolving, setResolving] = useState(false);
  const [assignTo, setAssignTo] = useState<string>('');

  if (loading) return <Skeleton height={420} />;

  if (!dispute) {
    return (
      <>
        <PageHead title="Dispute not found" description="No dispute with that reference." />
        <Button label="Back to Disputes" href="/disputes" variant="secondary" size="md" />
      </>
    );
  }

  const style = DISPUTE_STYLE[dispute.status];

  return (
    <>
      <PageHead
        title={dispute.subject}
        description={`${dispute.reference} · opened ${relativeDay(dispute.openedAt)} by the ${dispute.openedBy} · ${money(dispute.amountAtStake)} at stake`}
        actions={<Button label="Back to Disputes" href="/disputes" variant="ghost" size="md" />}
      />

      <MockBanner />

      <div className={styles.detailGrid}>
        <div className={styles.detailStack}>
          <PageCard title="What Happened">
            <Text variant="body" tone="ink2" as="p" raw>
              {dispute.detail}
            </Text>
          </PageCard>

          <PageCard
            title="Resolution"
            subtitle={
              dispute.status === 'resolved'
                ? `Resolved ${dispute.resolvedAt ? longDate(dispute.resolvedAt) : ''}`
                : 'Not resolved yet'
            }
          >
            {dispute.resolutionNotes ? (
              <Quote>{dispute.resolutionNotes}</Quote>
            ) : (
              <>
                <Note>
                  Nothing written down yet. When this is resolved, write what was found and what
                  was decided — the note is for whoever picks up the phone three weeks from now,
                  not for you.
                </Note>
                <div style={{ marginTop: 'var(--space-lg)' }}>
                  <Button
                    label="Resolve This Dispute"
                    variant="primary"
                    size="md"
                    onClick={() => setResolving(true)}
                  />
                </div>
              </>
            )}
          </PageCard>
        </div>

        <div className={styles.detailStack}>
          <PageCard title="The Case">
            <InfoRows>
              <InfoRow label="Status" value={<StatusPill label={style.label} tone={style.tone} />} />
              <InfoRow label="Reference" value={dispute.reference} />
              <InfoRow
                label="Booking"
                value={
                  booking ? (
                    <Link href={`/bookings/${booking.id}`}>
                      <Text variant="label" tone="brand" as="span" raw>
                        {dispute.bookingRef}
                      </Text>
                    </Link>
                  ) : (
                    dispute.bookingRef
                  )
                }
              />
              <InfoRow label="Opened" value={longDate(dispute.openedAt)} />
              <InfoRow label="Raised by" value={dispute.openedBy === 'customer' ? 'The Customer' : 'The Business'} />
              <InfoRow label="At stake" value={money(dispute.amountAtStake)} />
            </InfoRows>
          </PageCard>

          <PageCard title="Who Owns This">
            {dispute.assignedToName ? (
              <InfoRows>
                <InfoRow label="Assigned to" value={dispute.assignedToName} />
              </InfoRows>
            ) : (
              <Note icon="warning-outline" tone="ink2">
                Nobody has picked this up. An unowned dispute is the one that gets forgotten.
              </Note>
            )}

            {dispute.status !== 'resolved' ? (
              <div style={{ marginTop: 'var(--space-lg)', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                <FilterSelect
                  label="Assign to"
                  value={assignTo}
                  onChange={setAssignTo}
                  options={[
                    { value: '', label: 'Choose Somebody' },
                    ...(allStaff ?? []).map((s) => ({ value: s.id, label: s.name })),
                  ]}
                />
                <Button
                  label="Assign"
                  variant="secondary"
                  size="sm"
                  disabled={!assignTo}
                  onClick={async () => {
                    await apiClient.assignDispute(dispute.id, assignTo);
                    setAssignTo('');
                    refresh();
                  }}
                />
              </div>
            ) : null}
          </PageCard>

          <PageCard title="The Two Parties">
            <InfoRows>
              <InfoRow label="Customer" value={dispute.customerName} />
              <InfoRow label="Business" value={dispute.providerName} />
            </InfoRows>
            <div style={{ marginTop: 'var(--space-lg)', display: 'flex', gap: 'var(--space-sm)' }}>
              <Button
                label={`Open ${dispute.bookingRef}`}
                href={booking ? `/bookings/${booking.id}` : '/bookings'}
                variant="secondary"
                size="sm"
              />
            </div>
          </PageCard>
        </div>
      </div>

      <ReasonDialog
        open={resolving}
        onClose={() => setResolving(false)}
        title="Resolve this dispute"
        description="Write what was found and what was decided. This is the record anybody asking about it later will read."
        confirmLabel="Resolve dispute"
        reasonPlaceholder="e.g. Pickup photographs show the tank three-quarters full at collection. Charge reduced to $48 and the business agreed. Both sides notified."
        change={{
          subjectLabel: `${dispute.reference} · ${dispute.subject}`,
          field: 'Dispute',
          before: style.label,
          after: 'Resolved',
        }}
        onConfirm={async (reason) => {
          await apiClient.resolveDispute(dispute.id, reason);
          refresh();
        }}
      />
    </>
  );
}
