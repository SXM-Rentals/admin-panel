'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The pop-up that appears whenever a member of staff is
// about to change something — approve a document, reject one, decide a refund,
// keep a deposit, adjust somebody's points. It shows what is about to change,
// asks why, and will not let the change through without an answer.
//
// THIS IS THE SINGLE MOST IMPORTANT COMPONENT IN THE PANEL, and the reason is
// worth spelling out. The admin doc says every account change must be logged
// with who, what, before, after and when. A log like that is only worth having
// if it is complete, and completeness cannot be left to whoever writes the next
// screen remembering to call the logging function. So it works the other way
// round: the only way to make a change is through this dialog, and this dialog
// always writes the entry. Forgetting becomes impossible rather than unlikely.
//
// WHY THE REASON IS REQUIRED RATHER THAN ENCOURAGED: the reason is the only part
// of an audit entry a computer cannot reconstruct afterwards. The values, the
// timestamp and the person are all knowable from the change itself. Why it was
// done exists nowhere else, and it is the one thing anybody reading the log a
// year later actually needs — a refund denied with no reason recorded cannot be
// explained to the customer who asks about it.
//
// The bar is deliberately low: fifteen characters, which is a short sentence,
// not an essay. The aim is to stop "ok" and "fixed", not to make people write.

import React, { useEffect, useState } from 'react';
import { Button, Icon, Sheet, Text, TextArea, useToast } from '@/components/ui';
import { useAdminSession } from '@/lib/auth';
import { recordAuditEntry } from '@/lib/audit';
import type { AuditAction, AuditEntry } from '@/types';
import styles from './admin.module.css';

// The shortest reason worth recording. See the note above.
const MIN_REASON = 15;

export type ReasonDialogProps = {
  open: boolean;
  onClose: () => void;
  // What the person is about to do, in the imperative: "Reject insurance
  // document", "Approve refund", "Adjust rewards points".
  title: string;
  // One line of context under the title, so the dialog can be understood without
  // reading the screen behind it.
  description?: string;
  // The button. Written as the action itself — "Reject document" — rather than
  // "Confirm", so the last thing somebody reads before clicking is what will
  // happen.
  confirmLabel: string;
  // Red for anything that takes money, deletes an account, or turns somebody
  // down. Those should not look like routine confirmations.
  destructive?: boolean;
  // A suggested wording, for the cases where there is an obvious one. Always
  // editable, never submitted on its own.
  reasonPlaceholder?: string;

  // ---- WHAT GETS WRITTEN TO THE LOG ----
  audit: {
    action: AuditAction;
    subjectType: AuditEntry['subjectType'];
    subjectId: string;
    subjectLabel: string;
    field: string;
    before: string;
    after: string;
  };

  // What actually performs the change. Called only after the reason passes, and
  // only after the audit entry is written, so a failure here leaves a record
  // that somebody tried — which is the safer way round for a money action.
  onConfirm: (reason: string) => Promise<void> | void;
};

export function ReasonDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  destructive = false,
  reasonPlaceholder = 'Why are you making this change?',
  audit,
  onConfirm,
}: ReasonDialogProps) {
  const { staff } = useAdminSession();
  const { showToast } = useToast();

  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [working, setWorking] = useState(false);

  // Empty the box each time the dialog opens. Without this, the reason typed for
  // the last vehicle is sitting there ready to be submitted against the next
  // one, which is how a log fills up with reasons attached to the wrong thing.
  useEffect(() => {
    if (open) {
      setReason('');
      setTouched(false);
      setWorking(false);
    }
  }, [open]);

  const tooShort = reason.trim().length < MIN_REASON;

  const submit = async () => {
    setTouched(true);
    if (tooShort || !staff) return;

    setWorking(true);

    // The record first, then the change. If the change fails there is still a
    // note that it was attempted, by whom and why.
    recordAuditEntry({
      staffId: staff.id,
      staffName: staff.name,
      ...audit,
      reason: reason.trim(),
    });

    // IF THE CHANGE FAILS, SAY SO AND STAY OPEN. This used to close the dialog
    // and announce "Done" whatever happened, because nothing was catching a
    // rejected save — so a change that never landed looked exactly like one that
    // did. On a screen that approves refunds and keeps deposits, that is the
    // worst possible failure mode: the person walks away believing money moved.
    //
    // Now the dialog stays where it is with the reason still typed, so the
    // action can simply be tried again. The audit entry above is already
    // written, which is the right way round — a record of an attempt is useful,
    // and a silent failure is not.
    try {
      await onConfirm(reason.trim());
    } catch {
      setWorking(false);
      showToast('That did not go through', 'Nothing was changed. The attempt is in the audit log — please try again.');
      return;
    }

    setWorking(false);
    onClose();
    showToast('Done, and written to the audit log.');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button label="Cancel" variant="outline" size="md" onClick={onClose} />
          <Button
            label={confirmLabel}
            variant={destructive ? 'danger' : 'primary'}
            size="md"
            onClick={submit}
            loading={working}
            disabled={tooShort}
          />
        </>
      }
    >
      <div className={styles.reasonBody}>
        {description ? (
          <Text variant="body" tone="ink2" as="p" raw>
            {description}
          </Text>
        ) : null}

        {/* What is about to change, shown before it changes. Somebody clicking
            through five of these in a row should still be able to see which one
            they are on. */}
        <div className={styles.changePreview}>
          <Text variant="caption" tone="ink3" as="p" raw>
            {audit.field}
          </Text>
          <div className={styles.changeRow}>
            <Text variant="label" tone="ink2" as="span" raw>
              {audit.before}
            </Text>
            <Icon name="arrow-forward" size={15} color="var(--ink3)" />
            <Text variant="label" tone={destructive ? 'danger' : 'success'} as="span" raw>
              {audit.after}
            </Text>
          </div>
          <Text variant="small" tone="ink3" as="p" raw>
            {audit.subjectLabel}
          </Text>
        </div>

        <TextArea
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={reasonPlaceholder}
          rows={3}
          required
          error={touched && tooShort ? `Please give a reason of at least ${MIN_REASON} characters.` : undefined}
          hint={
            touched && tooShort
              ? undefined
              : 'Recorded in the audit log against your name. Write it for whoever reads it next year.'
          }
        />
      </div>
    </Sheet>
  );
}

export default ReasonDialog;
