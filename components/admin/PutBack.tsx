'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The button — and the confirmation behind it — that puts
// records back from a saved version. One component for all three sizes of the job:
// everything that was deleted, one kind of it, or chosen records.
//
// ONE COMPONENT BECAUSE IT IS ONE ACTION. The three differ only in what they send:
// nothing (everything), a kind, or a list of the saved records' own ids. Writing them
// three times would mean three confirmation dialogs that could drift into saying three
// slightly different things about what restoring does, which is the one thing here
// that must be said the same way every time.
//
// WHAT RESTORING DOES, which every dialog says: it puts back what is MISSING and
// nothing else. A record that is on the platform now is left exactly as it is, even if
// it has been edited since, so putting a version back can never undo a change made
// after it. That is also why it is safe to press twice.
//
// "EVERYTHING" IS THE ONE THAT UNDOES A CLEAR EVERYTHING, and its help text says so:
// the server puts customers back first, then businesses, cars, payouts, bookings and
// the rest, so a single press restores the lot. A single car or booking, on the other
// hand, cannot go back while the business or customer it belongs to is still deleted —
// the server says so for each one that fails, and the result panel offers this button.
//
// THE AUTHENTICATOR CODE, ALWAYS. Putting records back is not destructive, but it is
// not nothing either: it can bring back hundreds of records, customers among them. The
// reason is asked for because the panel's dialog always asks; the server records
// nothing.

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { Button } from '@/components/ui';
import type { RestoreResult } from '@/types';

export type PutBackWhat = { kind?: undefined; recordIds?: undefined } | { kind: string; recordIds?: undefined } | { kind?: undefined; recordIds: string[] };

export function PutBack({
  versionId,
  versionLabel,
  what,
  label,
  // What the dialog calls the thing being put back: "everything that was deleted",
  // "the deleted bookings", "this booking".
  subject,
  // How many of them are missing from the platform right now, when that is known.
  // Zero greys the button, saying why; undefined means it is not known.
  missing,
  variant = 'secondary',
  size = 'sm',
  onResult,
}: {
  versionId: string;
  // "the version saved 12 Oct" — for the dialog's heading, so it says which one.
  versionLabel: string;
  what: PutBackWhat;
  label: string;
  subject: string;
  missing?: number;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
  onResult: (result: RestoreResult) => void;
}) {
  const [asking, setAsking] = useState(false);

  const nothingToDo = missing === 0;
  const everything = !what.kind && !what.recordIds;

  return (
    <>
      <Button
        label={label}
        variant={variant}
        size={size}
        disabled={nothingToDo}
        title={nothingToDo ? 'All of this is already on the platform.' : undefined}
        onClick={() => setAsking(true)}
      />

      <ReasonDialog
        open={asking}
        onClose={() => setAsking(false)}
        title={`Put back ${subject}`}
        description={`This puts back only what is missing from ${versionLabel}${
          missing !== undefined ? ` — ${missing} ${missing === 1 ? 'record' : 'records'} right now` : ''
        }. Anything that is on the platform now is left exactly as it is, even if it has been changed since, so this cannot undo anything done after the version was saved.${
          everything
            ? ' Everything goes back in the order the database needs — customers first, then businesses, cars, payouts, bookings and the rest — so after a Clear Everything this restores the lot in one go.'
            : ' Anything whose business, customer or car is still deleted cannot go back on its own; the result says which, and offers to put everything back instead.'
        }`}
        confirmLabel={label}
        confirmWithCode
        reasonPlaceholder="e.g. Cleared the wrong kind while testing — putting the bookings back."
        change={{
          subjectLabel: versionLabel,
          field: subject,
          before: 'Deleted',
          after: 'Put back',
        }}
        onConfirm={async (reason, { code }) => {
          const result = await apiClient.restoreVersion(versionId, what, reason, code ?? '');
          setAsking(false);
          onResult(result);
        }}
      />
    </>
  );
}

export default PutBack;
