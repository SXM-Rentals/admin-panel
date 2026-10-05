'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The control that clears one kind of test record — the
// bookings, the payouts, somebody's lifetime spend — so the platform can be tried
// out properly before it carries real customers, and started again afterwards.
//
// THE GODFATHER AND NOBODY ELSE. Not Owners, who can do everything else including
// paying businesses. This is the one capability in the panel kept to a single
// account, because it is the only one that destroys records rather than changing
// them: every other mistake here leaves something behind to read, and this leaves
// nothing. The server will check it again — the panel is not what keeps anybody
// out — but a button nobody else can even see is the right starting point.
//
// EACH CARD ON ITS OWN, WHICH IS THE WHOLE DESIGN. Clearing the bookings must not
// touch the takings, and clearing the takings must not touch who signed up. One
// "reset everything" button is a different and much more dangerous thing, and it
// is deliberately not what this is.
//
// WHAT IT DOES TODAY: nothing, and it says so. The SXM Rentals server has no
// address for clearing records, so the control is drawn, greyed, naming what it
// would clear and where the backend work is written down. That is the same way
// this panel has treated every not-yet-built capability, and it beats both hiding
// it and shipping a button that quietly 404s.
//
// WHEN IT IS BUILT it needs the full ceremony: a written reason, the
// authenticator code, and the server refusing it outright once real customers
// exist. See SXM_RENTALS_TEST_RESET_HANDOFF.md.

import React from 'react';
import { useAdminSession } from '@/lib/auth';
import { whyNeedsTier } from '@/lib/tiers';
import { Note } from '@/components/admin/shared';
import { Button, Text } from '@/components/ui';
import styles from './admin.module.css';

export function ResetControl({
  what,
  detail,
}: {
  // What would be cleared, in the words somebody would use for it: "the
  // bookings", "this month's takings".
  what: string;
  // The consequence, in one line. Written for somebody about to press it.
  detail: string;
}) {
  const { staff: me } = useAdminSession();

  // Not yours to see, not yours to know about: for everybody else this is simply
  // not part of the screen. Unlike the tier rules elsewhere in the panel, which
  // grey an action and say why, there is nothing useful to tell an Owner here —
  // "ask the Godfather to wipe the bookings" is not a workflow.
  if (whyNeedsTier(me?.tier, 'godfather') !== undefined) return null;

  return (
    <div className={styles.resetRow}>
      <span className={styles.resetText}>
        <Text variant="small" tone="ink2" as="span" raw>
          Clear {what}
        </Text>
        <Text variant="caption" tone="ink3" as="p" raw>
          {detail}
        </Text>
      </span>

      {/* Drawn and dead, on purpose. See the note at the top of this file. */}
      <Button
        label="Clear"
        variant="danger"
        size="sm"
        disabled
        title="The SXM Rentals server does not offer this yet."
      />
    </div>
  );
}

// The line that explains the row above, for a card that has one. Kept apart so a
// screen with four reset rows does not repeat it four times.
export function ResetNote() {
  const { staff: me } = useAdminSession();
  if (whyNeedsTier(me?.tier, 'godfather') !== undefined) return null;

  return (
    <div style={{ marginTop: 'var(--space-md)' }}>
      <Note icon="warning-outline" tone="ink2">
        Clearing test records is not something the server offers yet, so these do nothing. When it
        does, each one will take a written reason and your authenticator code, and will be refused
        outright once real customers are on the platform — see SXM_RENTALS_TEST_RESET_HANDOFF.md.
      </Note>
    </div>
  );
}

export default ResetControl;
