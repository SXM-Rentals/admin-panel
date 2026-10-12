'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Cancelling a rental as SXM Rentals itself — for when the
// platform has to step in: a business closing, a car that cannot be rented, a booking
// that should never have been made.
//
// TWO BUTTONS, NOT ONE DIALOG WITH A CHOICE IN IT. Whether the renter gets their money
// back is the whole decision, and putting it behind a drop-down or a tick-box invites
// somebody to confirm the default without having looked. "Cancel And Refund In Full"
// and "Cancel With No Refund" are different things, labelled as different things, and
// the dialog that opens says in its own words which one it is.
//
//   FULL: everything the renter paid, and has not already had back, goes back at once.
//   It goes through the same path as an approved refund, so it appears in the audit log
//   as one as well as a cancellation.
//
//   NONE: nothing comes back. For fraud, say. It is the harder of the two to undo and
//   is drawn as the more serious button.
//
// THE DEPOSIT IS LET GO EITHER WAY. It was never the platform's money, so cancelling
// never keeps it and the dialog says so — otherwise "no refund" reads as though it did.
//
// OWNER ACCESS AND ABOVE, WITH THE CODE, the same as the server. An Administrator sees
// the card greyed with the sentence saying why, rather than a card that is missing.

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAdminSession } from '@/lib/auth';
import { money } from '@/lib/format';
import { whyNeedsTier } from '@/lib/tiers';
import { PageCard } from '@/components/layout/PageCard';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { Note } from '@/components/admin/shared';
import { Button } from '@/components/ui';
import type { AdminBooking } from '@/types';

export function CancelRental({ booking, onDone }: { booking: AdminBooking; onDone: () => void }) {
  const { staff: me } = useAdminSession();
  const [asking, setAsking] = useState<'full' | 'none' | null>(null);

  // Only a rental that has not finished or been called off can be cancelled.
  if (booking.status !== 'upcoming' && booking.status !== 'active') return null;

  const why = whyNeedsTier(me?.tier, 'owner');
  const underWay = booking.status === 'active';
  const holding = booking.depositAmount > 0 && booking.depositStatus === 'held';

  return (
    <>
      <PageCard title="Cancel This Rental" subtitle={underWay ? 'Under way now' : 'Not started yet'}>
        <Note icon="warning-outline" tone="ink2">
          Cancelling as SXM Rentals is for when the platform has to step in. Choose whether the
          renter gets their money back: that is the whole decision, so there is no default.
          {holding ? ` The ${money(booking.depositAmount)} deposit hold is let go either way — it was never the platform’s money.` : ''}
          {underWay ? ' This rental is under way, which means a car is out with the renter.' : ''}
        </Note>

        <div style={{ marginTop: 'var(--space-lg)', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <Button
            label="Cancel And Refund In Full"
            variant="danger"
            size="md"
            disabled={why !== undefined}
            title={why}
            onClick={() => setAsking('full')}
          />
          <Button
            label="Cancel With No Refund"
            variant="danger"
            size="md"
            disabled={why !== undefined}
            title={why}
            onClick={() => setAsking('none')}
          />
        </div>

        {why ? (
          <div style={{ marginTop: 'var(--space-md)' }}>
            <Note icon="lock-closed-outline" tone="ink2">
              {why}
            </Note>
          </div>
        ) : null}
      </PageCard>

      <ReasonDialog
        open={asking !== null}
        onClose={() => setAsking(null)}
        title={asking === 'none' ? `Cancel ${booking.reference} with no refund` : `Cancel ${booking.reference} and refund in full`}
        description={
          asking === 'none'
            ? `${booking.customerName} gets nothing back. Use this for fraud and the like, not for a rental that simply has to be cancelled — that is a full refund.${holding ? ` Their ${money(booking.depositAmount)} deposit hold is still let go.` : ''}`
            : `${booking.customerName} gets back everything they paid that has not already been refunded, up to ${money(booking.gross)}, at once. It goes through the same path as an approved refund, so it is recorded as one too.${holding ? ` Their ${money(booking.depositAmount)} deposit hold is let go as well.` : ''}`
        }
        confirmLabel={asking === 'none' ? 'Cancel with no refund' : 'Cancel and refund in full'}
        destructive
        confirmWithCode
        reasonPlaceholder={
          asking === 'none'
            ? 'e.g. Booked with a stolen card — the bank has confirmed it.'
            : 'e.g. The car was written off and the business cannot supply another.'
        }
        change={{
          subjectLabel: `${booking.reference} · ${booking.customerName}`,
          field: 'Rental',
          before: booking.status === 'active' ? 'Under way' : 'Booked',
          after: asking === 'none' ? 'Cancelled · no refund' : 'Cancelled · full refund',
        }}
        onConfirm={async (reason, { code }) => {
          await apiClient.cancelBooking(booking.id, asking === 'none' ? 'none' : 'full', reason, code ?? '');
          setAsking(null);
          onDone();
        }}
      />
    </>
  );
}

export default CancelRental;
