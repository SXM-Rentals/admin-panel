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
//
// TWO PIECES OF WRITING, NOT ONE, BECAUSE THEY ARE READ BY DIFFERENT PEOPLE. The
// NOTES are the outcome, shown on this dispute for anybody who opens it. The
// REASON is why this person closed it, and goes into the audit log with their
// name against it. They used to be one box that did both jobs; the server keeps
// them apart, and so does this screen: the notes are written here on the card,
// and the reason is asked for when the dispute is actually closed.
//
// ASSIGNING IS A RECORDED CHANGE TOO. It used to happen with one click and no
// trace. An unowned dispute is the one most likely to be forgotten, so who took
// it on, and why them, is worth being able to look up — and the server will not
// accept an assignment without a reason.

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money, longDate, relativeDay } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { FilterSelect } from '@/components/admin/FilterBar';
import { DISPUTE_STYLE, InfoRow, InfoRows, Note, Quote } from '@/components/admin/shared';
import { Button, Skeleton, StatusPill, Text, TextArea } from '@/components/ui';
import styles from '@/components/admin/admin.module.css';

// The shortest resolution note worth keeping — a sentence, not "sorted". The
// longest is the server's.
const MIN_NOTES = 15;
const MAX_NOTES = 4000;

export default function DisputeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const { data: dispute, loading, error, refresh } = useAsyncData(() => apiClient.getDispute(id), [id]);
  const { data: allStaff } = useAsyncData(() => apiClient.listStaff(), []);

  // A dispute stores the booking REFERENCE, so the booking itself has to be
  // looked up before it can be linked to.
  const { data: booking } = useAsyncData(
    () => (dispute ? apiClient.getBookingByRef(dispute.bookingRef) : Promise.resolve(undefined)),
    [dispute?.bookingRef],
  );

  const [notes, setNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [assignTo, setAssignTo] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  // Could not be fetched is not the same as "no such dispute". See LoadFailed.
  if (error) return <LoadFailed title="Dispute" what="This dispute" error={error} onRetry={refresh} />;

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
  const notesReady = notes.trim().length >= MIN_NOTES;
  const assignee = (allStaff ?? []).find((s) => s.id === assignTo);

  return (
    <>
      <PageHead
        title={dispute.subject}
        description={`${dispute.reference} · opened ${relativeDay(dispute.openedAt)} by the ${dispute.openedBy} · ${money(dispute.amountAtStake)} at stake`}
        actions={<Button label="Back to Disputes" href="/disputes" variant="ghost" size="md" />}
      />

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
                <TextArea
                  label="What was found, and what was decided"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="e.g. Pickup photographs show the tank three-quarters full at collection. Charge reduced to $48 and the business agreed. Both sides notified."
                  rows={4}
                  maxLength={MAX_NOTES}
                  showCount
                  hint="Shown on this dispute for whoever picks up the phone three weeks from now — write it for them, not for you."
                />
                <div style={{ marginTop: 'var(--space-lg)' }}>
                  <Button
                    label="Resolve This Dispute"
                    variant="primary"
                    size="md"
                    disabled={!notesReady}
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
                    ...(allStaff ?? [])
                      .filter((s) => s.id !== dispute.assignedToId)
                      .map((s) => ({ value: s.id, label: s.name })),
                  ]}
                />
                <Button
                  label="Assign"
                  variant="secondary"
                  size="sm"
                  disabled={!assignTo}
                  onClick={() => setAssigning(true)}
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
        open={assigning}
        onClose={() => setAssigning(false)}
        title="Assign this dispute"
        description="Say why this person. Somebody reading the log later should be able to see why it went to them."
        confirmLabel="Assign dispute"
        reasonPlaceholder="e.g. Renée handled the last dispute with this business and knows their pickup process."
        change={{
          subjectLabel: `${dispute.reference} · ${dispute.subject}`,
          field: 'Assigned to',
          before: dispute.assignedToName ?? 'Nobody',
          after: assignee?.name ?? '—',
        }}
        onConfirm={async (reason) => {
          await apiClient.assignDispute(dispute.id, assignTo, reason);
          setAssignTo('');
          refresh();
        }}
      />

      <ReasonDialog
        open={resolving}
        onClose={() => setResolving(false)}
        title="Resolve this dispute"
        description="Your notes above will be shown on the dispute. Here, say why it is ready to close — this goes into the audit log against your name."
        confirmLabel="Resolve dispute"
        reasonPlaceholder="e.g. Both sides accepted the reduced charge in writing."
        change={{
          subjectLabel: `${dispute.reference} · ${dispute.subject}`,
          field: 'Dispute',
          before: style.label,
          after: 'Resolved',
        }}
        onConfirm={async (reason) => {
          await apiClient.resolveDispute(dispute.id, notes.trim(), reason);
          setNotes('');
          refresh();
        }}
      />
    </>
  );
}
