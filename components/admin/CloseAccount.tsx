'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Closing a customer's account.
//
// THE RULE THAT MATTERS: an account cannot be closed while a rental is still
// running or a security deposit is still being held. Closing it then would
// strand money that belongs to somebody — the customer could not be given their
// deposit back, and nobody could be chased about the car. Both are much harder
// to unpick afterwards than to prevent.
//
// THE SERVER APPLIES THAT RULE, AND THE PANEL NO LONGER GUESSES AT IT. This used
// to work out, in the browser, whether an account could be closed, and grey the
// button out if not. With the real records that guess can be wrong in either
// direction, and a wrong guess here either blocks a closure that is fine or
// waves through one that is not. So the button is always there, the rule is
// stated beside it, and when the server refuses it says exactly what is in the
// way — "This account has a rental that is active (SXM-4228)" — in the dialog,
// where the reason that was typed is still waiting to be sent again.
//
// THE RECORD IS MARKED CLOSED, NOT DELETED. The audit log points at it, and an
// entry reading "closed the account of Noelia Vlaun" is unreadable if there is
// no Noelia Vlaun left to look at. Actually erasing somebody on request is a
// data-protection job for the backend, and a different piece of work.

import React, { useState } from 'react';
import { ReasonDialog } from './ReasonDialog';
import { Button, Icon, Text } from '@/components/ui';
import styles from './admin.module.css';

export function CloseAccount({
  subjectLabel,
  // What the record looks like now, for the "before" in the dialog.
  currentState,
  onClose,
  alreadyClosed,
  closedOn,
}: {
  subjectLabel: string;
  currentState: string;
  // Sends the closure, with the reason. If the server refuses, this throws and
  // the dialog shows why.
  onClose: (reason: string) => Promise<void>;
  alreadyClosed?: boolean;
  closedOn?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (alreadyClosed) {
    return (
      <div className={styles.inlineNote}>
        <Icon name="information-circle-outline" size={15} color="var(--ink3)" />
        <Text variant="small" tone="ink3" as="p" raw>
          This account was closed{closedOn ? ` on ${closedOn}` : ''}. The record is kept so the
          audit log still has something to point at.
        </Text>
      </div>
    );
  }

  return (
    <>
      <Text variant="small" tone="ink2" as="p" raw>
        SXM Rentals will not close an account while a rental is running or a deposit is still being
        held — closing it then would strand money that belongs to somebody. If either is the case,
        you will be told which, and nothing will change. The record stays in the list, marked
        closed, so the audit log still points at something.
      </Text>

      <div style={{ marginTop: 'var(--space-lg)' }}>
        <Button
          label="Close This Account"
          variant="danger"
          size="md"
          onClick={() => setConfirming(true)}
        />
      </div>

      <ReasonDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Close this account"
        description="This is the change the audit log exists to record. Say who asked and why."
        confirmLabel="Close account"
        destructive
        reasonPlaceholder="e.g. Customer asked in writing for their account to be closed."
        change={{
          subjectLabel,
          field: 'Account',
          before: currentState,
          after: 'Closed',
        }}
        onConfirm={(reason) => onClose(reason)}
      />
    </>
  );
}

export default CloseAccount;
