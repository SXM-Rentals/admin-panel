'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The control that clears one kind of test record — the
// bookings, the payouts, what customers have spent — so the platform can be tried
// out properly before it carries real customers.
//
// THE GODFATHER AND NOBODY ELSE, and hidden rather than greyed for everybody else.
// Not Owners, who can do everything else in this panel including paying businesses.
// This is the only capability here that destroys records rather than changing them:
// every other mistake leaves something behind to read, and this leaves nothing.
// Elsewhere the panel greys an action somebody may not take and says why, because
// knowing it exists is useful. "Ask the Godfather to wipe the bookings" is not a
// workflow, so there is nothing useful to say and the row simply is not there.
//
// EACH ONE ON ITS OWN, WHICH IS THE WHOLE DESIGN. Clearing the bookings must not
// take the takings with it. Where the server cannot honour that it refuses with
// `would_take_more` and names what to clear first — and that sentence reaches the
// person word for word, because it is the one that tells them what to do next.
//
// IT CLOSES FOR GOOD, AND THE SCREEN SAYS WHEN. The server only allows any of this
// while it is switched on AND Stripe has never run live; the moment live keys are
// used it is shut permanently. The conditions come back from the server in its own
// sentences and are printed as written on the Test Data screen, so nobody has to
// guess what is keeping the window open.

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAdminSession } from '@/lib/auth';
import { whyNeedsTier } from '@/lib/tiers';
import { forgetTestDataStatus, testDataStatus } from '@/lib/test-data';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { Note } from '@/components/admin/shared';
import { Button, Text } from '@/components/ui';
import type { TestDataWhat } from '@/types';
import styles from './admin.module.css';

export function ResetControl({
  what,
  label,
  detail,
  typeToConfirm,
}: {
  // What the server will be asked to clear. A plain string, not a union: the
  // Test Data screen builds its buttons from the kinds the SERVER says it can
  // clear, so a kind added there works here without the panel being changed.
  // The screens that name a kind themselves still get it checked, because they
  // pass one of TestDataWhat.
  what: TestDataWhat | string;
  // What it is called in this office: "the bookings", "what customers have spent".
  label: string;
  // The consequence, in one line, written for somebody about to press it.
  detail: string;
  // A word that has to be typed out before the button works. Kept for the one
  // button that takes everything; see ReasonDialog.
  typeToConfirm?: string;
}) {
  const { staff: me } = useAdminSession();
  const mine = whyNeedsTier(me?.tier, 'godfather') === undefined;

  // Asked once for the whole panel; see lib/test-data.ts.
  const { data: status, refresh } = useAsyncData(
    () => (mine ? testDataStatus() : Promise.resolve(undefined)),
    [mine],
  );

  const [asking, setAsking] = useState(false);
  // What the server said it did, kept until the screen is left. "Cleared 412
  // bookings" is the only confirmation there will ever be.
  const [done, setDone] = useState<string | undefined>(undefined);

  if (!mine) return null;

  const shut = status !== undefined && !status.open;

  return (
    <>
      <div className={styles.resetRow}>
        <span className={styles.resetText}>
          <Text variant="small" tone="ink2" as="span" raw>
            Clear {label}
          </Text>
          <Text variant="caption" tone="ink3" as="p" raw>
            {done ?? detail}
          </Text>
        </span>

        <Button
          label="Clear"
          variant="danger"
          size="sm"
          disabled={shut}
          title={shut ? 'Clearing test records is closed for good on this platform.' : undefined}
          onClick={() => setAsking(true)}
        />
      </div>

      <ReasonDialog
        open={asking}
        onClose={() => setAsking(false)}
        title={`Clear ${label}`}
        description={`${detail} This destroys those records rather than hiding them, and there is no undoing it from the panel. ${
          what === 'audit_log' || what === 'everything'
            ? 'The audit log goes with it — all but one entry, which says that you cleared it, when, how many went and why.'
            : 'Everything else stays, including the audit log, where this clearance appears under your name.'
        }`}
        confirmLabel={`Clear ${label}`}
        destructive
        confirmWithCode
        typeToConfirm={typeToConfirm}
        reasonPlaceholder="e.g. Finished testing the booking flow end to end; starting the pre-launch run clean."
        change={{
          subjectLabel: 'SXM Rentals · test records',
          field: label,
          before: 'On the platform',
          after: 'Gone',
        }}
        onConfirm={async (reason, { code }) => {
          try {
            const result = await apiClient.clearTestData(what, reason, code ?? '');
            // The server's own sentence about what it did, shown as written —
            // and, where it took several kinds at once, how many of each, so the
            // one button that takes the lot still accounts for itself.
            const breakdown = result.breakdown
              ? Object.entries(result.breakdown)
                  .filter(([, count]) => count > 0)
                  .map(([kind, count]) => `${kind.replace(/_/g, ' ')} ${count}`)
                  .join(' · ')
              : '';
            setDone(breakdown ? `${result.detail} (${breakdown})` : result.detail);
            setAsking(false);
          } finally {
            // Whether it went through or was refused, what is possible next may
            // have changed — and a refusal may be the window having shut since
            // this screen was opened.
            forgetTestDataStatus();
            refresh();
          }
        }}
      />
    </>
  );
}

// The line that explains a card of these. Kept apart so a card with four rows does
// not repeat it four times.
export function ResetNote() {
  const { staff: me } = useAdminSession();
  const mine = whyNeedsTier(me?.tier, 'godfather') === undefined;
  const { data: status } = useAsyncData(
    () => (mine ? testDataStatus() : Promise.resolve(undefined)),
    [mine],
  );

  if (!mine) return null;

  return (
    <div style={{ marginTop: 'var(--space-md)' }}>
      <Note icon="warning-outline" tone="ink2">
        {status && !status.open
          ? 'Clearing test records is closed for good on this platform — see Test Data for which condition shut it.'
          : 'Each one takes a written reason and your authenticator code, and clears only what it names. Some have to go in a certain order; the server will say so — or point you at Everything — rather than taking more than you asked for. See Test Data.'}
      </Note>
    </div>
  );
}

export default ResetControl;
