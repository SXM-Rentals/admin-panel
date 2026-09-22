'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Closing an account — a customer or a rental business —
// and the check that runs first to see whether it can be closed at all.
//
// THE CHECK IS THE IMPORTANT HALF. Closing an account with a rental still
// running, or a security deposit still being held, strands money that belongs to
// somebody: the customer cannot be given their deposit back and the business
// cannot be chased about the car. Both are much harder to unpick afterwards than
// to prevent now, so the panel works out whether it is safe, and when it is not
// it says exactly what is in the way rather than greying out a button.
//
// Every blocker is written as a thing somebody can go and resolve — "2 bookings
// still running", "1 security deposit still being held" — because the person
// reading it is the person who has to resolve it.
//
// THE RECORD IS MARKED CLOSED, NOT DELETED. The audit log points at it, and an
// entry reading "closed the account of Noelia Vlaun" is unreadable if there is
// no Noelia Vlaun left to look at. Actually erasing somebody on request is a
// data-protection job for the backend, and a different piece of work.

import React, { useEffect, useState } from 'react';
import { ReasonDialog } from './ReasonDialog';
import { Button, Icon, Text } from '@/components/ui';
import type { AuditEntry } from '@/types';
import styles from './admin.module.css';

export function CloseAccount({
  subjectType,
  subjectId,
  subjectLabel,
  // What the record looks like now, for the audit entry's "before".
  currentState,
  // Runs the safety check.
  check,
  onClose,
  alreadyClosed,
  closedOn,
}: {
  subjectType: AuditEntry['subjectType'];
  subjectId: string;
  subjectLabel: string;
  currentState: string;
  check: () => Promise<{ allowed: boolean; blockers: string[] }>;
  onClose: () => Promise<void> | void;
  alreadyClosed?: boolean;
  closedOn?: string;
}) {
  const [state, setState] = useState<{ allowed: boolean; blockers: string[] } | null>(null);
  const [confirming, setConfirming] = useState(false);

  // The check runs as the screen loads rather than when the button is pressed,
  // so somebody sees the blockers while they are still deciding — not after they
  // have committed to the idea.
  useEffect(() => {
    if (alreadyClosed) return;
    let cancelled = false;
    check().then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, alreadyClosed]);

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

  const blocked = state !== null && !state.allowed;

  return (
    <>
      {blocked ? (
        <div className={styles.openQuestion}>
          <Icon name="warning-outline" size={16} color="var(--warning)" />
          <div>
            <Text variant="label" as="p" raw>
              This cannot be closed yet
            </Text>
            <ul style={{ marginTop: 6 }}>
              {state.blockers.map((blocker) => (
                <li key={blocker}>
                  <Text variant="small" tone="ink2" as="span" raw>
                    · {blocker}
                  </Text>
                </li>
              ))}
            </ul>
            <Text variant="small" tone="ink3" as="p" raw style={{ marginTop: 8 }}>
              Closing now would strand money that belongs to somebody. Settle these first.
            </Text>
          </div>
        </div>
      ) : (
        <Text variant="small" tone="ink2" as="p" raw>
          Nothing outstanding. The record stays in the list, marked closed, so the audit log
          still points at something.
        </Text>
      )}

      <div style={{ marginTop: 'var(--space-lg)' }}>
        <Button
          label="Close This Account"
          variant="danger"
          size="md"
          disabled={state === null || blocked}
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
        reasonPlaceholder="e.g. Customer asked in writing for their account to be closed. No open bookings and no deposit held at the time of closure."
        change={{
          subjectLabel,
          field: 'Account',
          before: currentState,
          after: 'Closed',
        }}
        onConfirm={onClose}
      />
    </>
  );
}

export default CloseAccount;
