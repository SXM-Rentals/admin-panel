'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Closing a business over the top of the rentals that are still to
// come — cancelling every one that has not started, each refunded in full, and closing
// anyway.
//
// WHY IT IS ITS OWN DIALOG AND NOT A TICK-BOX ON CLOSING. Plain closing refuses while a
// rental is booked, because closing over the top of one strands a renter. That refusal
// is the safety rail, and a tick-box that switches it off invites somebody to tick it
// without reading. This is a separate, plainly named action that says what it will do
// to real customers, with a count of them where the panel can work one out.
//
// WHAT THE SERVER DOES WITH IT, said in the dialog:
//   · every rental not yet started is cancelled, each refunded in full, each deposit
//     hold released;
//   · a payout still owed no longer stops the closure — it is sent afterwards;
//   · it STILL refuses while a car is out with a renter, or while a deposit is held on
//     a finished rental, and it checks both BEFORE cancelling anything, so a refusal
//     never leaves the business half closed. Cancel the rental under way first, if that
//     is what is meant.
//
// THE COUNT IS HONEST ABOUT WHAT IT CANNOT SEE. The bookings list is the most recent
// few hundred, not every one. If it came back full the dialog says "at least", because
// a business with rentals the panel was never sent must not be described as having none.
//
// OWNER ACCESS AND ABOVE, WITH THE CODE.

import React from 'react';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money } from '@/lib/format';
import { ReasonDialog } from '@/components/admin/ReasonDialog';

// How many the server sends in one go. When the list comes back this long, it has
// probably been cut off.
const LIST_CEILING = 200;

export function CloseAndCancel({
  open,
  onClose,
  provider,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  provider: { id: string; businessName: string };
  onDone: () => void;
}) {
  // Only fetched once the dialog is opened: it is a list of every booking, and
  // most visits to a business never need it.
  const { data: bookings } = useAsyncData(
    () => (open ? apiClient.listBookings() : Promise.resolve(undefined)),
    [open],
  );

  const upcoming = (bookings ?? []).filter(
    (booking) => booking.providerId === provider.id && booking.status === 'upcoming',
  );
  const worth = upcoming.reduce((sum, booking) => sum + booking.gross, 0);
  const cutOff = (bookings?.length ?? 0) >= LIST_CEILING;

  const counted = !bookings
    ? ''
    : upcoming.length === 0
      ? cutOff
        ? ' None are among the most recent bookings the panel was sent, but it cannot see all of them.'
        : ' None are booked that the panel can see.'
      : ` ${cutOff ? 'At least ' : ''}${upcoming.length} ${upcoming.length === 1 ? 'rental' : 'rentals'}, ${cutOff ? 'at least ' : ''}${money(worth)} in all, will be cancelled and refunded.`;

  return (
    <ReasonDialog
      open={open}
      onClose={onClose}
      title={`Close ${provider.businessName} and cancel their upcoming rentals`}
      description={`Every rental that has not started is cancelled, each refunded in full and each deposit hold let go, and then the business is closed.${counted} A payout still owed no longer stops this; it is sent afterwards. It is still refused while a car is out with a renter, or while a deposit is held on a finished rental — checked before anything is cancelled, so a refusal never leaves the business half closed.`}
      confirmLabel="Cancel their rentals and close"
      destructive
      confirmWithCode
      reasonPlaceholder="e.g. Licence withdrawn on 2 October — closing now, renters refunded."
      change={{
        subjectLabel: provider.businessName,
        field: 'Status',
        before: upcoming.length > 0 ? `Open · ${upcoming.length} upcoming` : 'Open',
        after: 'Closed · rentals cancelled and refunded',
      }}
      onConfirm={async (reason, { code }) => {
        await apiClient.closeProvider(provider.id, reason, code ?? '', true);
        onClose();
        onDone();
      }}
    />
  );
}

export default CloseAndCancel;
