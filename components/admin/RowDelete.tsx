'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The "Delete" button at the end of a row, for the Godfather,
// that removes that one record — one booking, one payment line, one audit entry —
// and nothing else.
//
// THE OTHER HALF OF THE TEST-DATA CLEARING. The Clear buttons take a whole kind of
// record at a time, which is right before a launch and wrong the rest of the time:
// somebody who made one test booking too many should not have to wipe every booking
// to be rid of it. This is the same capability one row wide, on the same terms —
// the Godfather alone, a written reason, the authenticator code, and only while the
// window for clearing test records is open.
//
// IT LIGHTS UP ONLY WHEN THE SERVER SAYS IT CAN. The test-data status names each
// kind it can clear and, for each, whether it can delete a single one. Until a kind
// says so the button is drawn greyed with the reason, rather than being offered and
// then failing after somebody has typed a reason and a six-digit code. When the
// server learns a kind, the button works with no change here.
//
// NOTHING IS LEFT BEHIND, AND THAT IS DELIBERATE. Not a note, not a log entry, and
// that goes for the audit log's own entries as much as for a booking: the Godfather
// can delete any of them, including the entry that records an earlier clearing. It
// is the owner's decision and the reason the account exists — it is the one account
// that answers to nobody for what it does to test data.

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAdminSession } from '@/lib/auth';
import { whyNeedsTier } from '@/lib/tiers';
import { forgetTestDataStatus, testDataStatus } from '@/lib/test-data';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { Button } from '@/components/ui';

export function RowDelete({
  what,
  id,
  label,
  onDone,
  unavailable,
}: {
  // The kind of record, exactly as the server names it.
  what: string;
  // Which one. The row's own id.
  id: string;
  // What it is called to a person: "BK-1002", "Dana Illidge". Shown in the dialog,
  // because "delete this" is not something anybody should confirm without seeing
  // what "this" is.
  label: string;
  // Reload the list once it has gone.
  onDone: () => void;
  // A reason this particular row cannot be deleted, when the rest of its kind can.
  unavailable?: string;
}) {
  const { staff: me } = useAdminSession();
  const mine = whyNeedsTier(me?.tier, 'godfather') === undefined;

  // Asked once for the whole panel; see lib/test-data.ts.
  const { data: status } = useAsyncData(
    () => (mine ? testDataStatus() : Promise.resolve(undefined)),
    [mine],
  );

  const [asking, setAsking] = useState(false);

  // Not yours to see: nothing is drawn, as with the Clear buttons.
  if (!mine) return null;

  const offered = status?.kinds?.find((kind) => kind.what === what)?.single === true;

  const why =
    unavailable ??
    (status && !status.open
      ? 'Clearing test records is closed for good on this platform.'
      : status && !offered
        ? 'SXM Rentals does not offer deleting a single one of these yet.'
        : undefined);

  return (
    <>
      <Button
        label="Delete"
        variant="ghost"
        size="sm"
        disabled={why !== undefined || status === undefined}
        title={why}
        onClick={() => setAsking(true)}
      />

      <ReasonDialog
        open={asking}
        onClose={() => setAsking(false)}
        title={`Delete ${label}`}
        description={`This removes ${label} and nothing else. It is destroyed rather than hidden, and nobody can undo it from the panel.`}
        confirmLabel="Delete it"
        destructive
        confirmWithCode
        reasonPlaceholder="e.g. A test booking made while checking the checkout flow."
        change={{
          subjectLabel: label,
          field: 'Record',
          before: 'On the platform',
          after: 'Deleted',
        }}
        onConfirm={async (reason, { code }) => {
          try {
            await apiClient.deleteRecord(what, id, reason, code ?? '');
            setAsking(false);
            onDone();
          } catch (caught) {
            // A refusal may be the window having shut since this screen opened.
            forgetTestDataStatus();
            throw caught;
          }
        }}
      />
    </>
  );
}

export default RowDelete;
