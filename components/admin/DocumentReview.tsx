'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: One document waiting to be read, with the two decisions
// attached to it — approve, or reject with a reason.
//
// WHY THIS IS DONE BY A PERSON AND NOT BY SOFTWARE. Customer identity checks go
// through an automated service: a passport is a standard document, there are
// thousands a month, and a machine is better at spotting a forged one than a
// person is. Vehicle paperwork is the opposite. There are far fewer of them, and
// what matters is context a machine does not have — whether the insurance
// actually covers rental use, whether the roadworthiness certificate is for this
// registration number, whether the dates make sense. So it is somebody reading
// it, and this is the screen they read it on.
//
// THE REJECT REASON IS NOT PAPERWORK. It is what the rental business is told,
// and it decides whether they can fix the problem or have to ring up and ask
// what was wrong. "Rejected" on its own generates a phone call every time.

import React, { useState } from 'react';
import { cx } from '@/lib/utils';
import { longDate, shortDate } from '@/lib/format';
import { ReasonDialog } from './ReasonDialog';
import { DOCUMENT_KIND_LABELS, DOCUMENT_STYLE } from './shared';
import { Button, Icon, StatusPill, Text } from '@/components/ui';
import type { VehicleDocument } from '@/types';
import styles from './admin.module.css';

export function DocumentReview({
  document,
  subjectLabel,
  onDecided,
}: {
  document: VehicleDocument;
  // What the document belongs to, in words: "Toyota RAV4 2023 · SXM-V-118".
  // Shown in the reason dialog so it is obvious which car this is about.
  subjectLabel: string;
  // Called once a reason has been given, with whether it was approved, so the
  // screen above can send the decision and refresh.
  onDecided: (approve: boolean, reason: string) => Promise<void> | void;
}) {
  const [pending, setPending] = useState<'approved' | 'rejected' | null>(null);

  const style = DOCUMENT_STYLE[document.status];
  const name = DOCUMENT_KIND_LABELS[document.kind] ?? document.kind;

  // An insurance certificate that has already run out is not a document to
  // approve — it is a document to reject. Worth catching on the screen rather
  // than leaving to whoever is reading the dates.
  const expired = document.expiresAt ? new Date(document.expiresAt) < new Date() : false;

  return (
    <div
      className={cx(
        styles.doc,
        document.status === 'pending' && styles.docPending,
        document.status === 'approved' && styles.docApproved,
        document.status === 'rejected' && styles.docRejected,
      )}
    >
      <div className={styles.docHead}>
        <Icon name="document-outline" size={18} color="var(--ink3)" />
        <Text variant="label" as="h3" raw>
          {name}
        </Text>
        <span style={{ marginLeft: 'auto' }}>
          <StatusPill label={style.label} tone={style.tone} />
        </span>
      </div>

      {/* Standing in for the actual scan, which needs the encrypted storage
          bucket the documents live in. */}
      <div className={styles.docPreview}>
        <Icon name="scan-outline" size={24} />
        <Text variant="small" tone="ink3" as="p" raw>
          {document.fileName}
        </Text>
        <Text variant="caption" tone="ink3" as="p" raw>
          The scan itself loads from encrypted storage — not wired up yet
        </Text>
      </div>

      <div>
        <Text variant="small" tone="ink3" as="p" raw>
          Filed {longDate(document.uploadedAt)}
          {document.expiresAt ? ` · expires ${shortDate(document.expiresAt)}` : ''}
          {/* When, but not who: the server does not say who read it here. That
              is in the audit log, against their name, with their reason. */}
          {document.reviewedAt ? ` · read on ${shortDate(document.reviewedAt)}` : ''}
        </Text>

        {expired && document.status !== 'rejected' ? (
          <div className={styles.openQuestion} style={{ marginTop: 'var(--space-md)' }}>
            <Icon name="warning-outline" size={15} color="var(--warning)" />
            <Text variant="small" as="p" raw>
              This document has already expired. It should not be approved as it stands.
            </Text>
          </div>
        ) : null}
      </div>

      {document.status === 'rejected' && document.reason ? (
        <div className={styles.rejectionNote}>
          <Text variant="caption" tone="danger" as="p" raw>
            WHAT THE BUSINESS WAS TOLD
          </Text>
          <Text variant="small" as="p" raw>
            {document.reason}
          </Text>
        </div>
      ) : null}

      {/* A decided document can still be changed — a rejection overturned on
          appeal, an approval pulled when something later turns up. Both go
          through the same dialog and both land in the log. */}
      <div className={styles.docActions}>
        {document.status !== 'approved' ? (
          <Button
            label={document.status === 'rejected' ? 'Approve After All' : 'Approve'}
            variant="secondary"
            size="sm"
            onClick={() => setPending('approved')}
          />
        ) : null}
        {document.status !== 'rejected' ? (
          <Button
            label={document.status === 'approved' ? 'Withdraw Approval' : 'Reject'}
            variant="outline"
            size="sm"
            onClick={() => setPending('rejected')}
          />
        ) : null}
      </div>

      <ReasonDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending === 'approved' ? `Approve ${name.toLowerCase()}` : `Reject ${name.toLowerCase()}`}
        description={
          pending === 'approved'
            ? 'Say what you checked. Somebody reviewing this later needs to know it was read rather than waved through.'
            : 'What you write here is what the rental business is told, so write it as an instruction they can act on.'
        }
        confirmLabel={pending === 'approved' ? 'Approve document' : 'Reject document'}
        destructive={pending === 'rejected'}
        reasonPlaceholder={
          pending === 'approved'
            ? 'e.g. Policy is current to March 2027 and covers rental use.'
            : 'e.g. The policy expired on 14 June — please upload the renewal certificate.'
        }
        change={{
          subjectLabel,
          field: name,
          before: style.label,
          after: pending === 'approved' ? 'Approved' : 'Rejected',
        }}
        onConfirm={async (reason) => {
          if (pending) await onDecided(pending === 'approved', reason);
        }}
      />
    </div>
  );
}

export default DocumentReview;
