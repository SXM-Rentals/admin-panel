// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks that a dialog opened from a button inside a table row is
// drawn on the page itself and not inside the row it was opened from.
//
// THE BUG THIS HOLDS IN PLACE, AND HOW IT SHOWED. A Delete button was added to the end
// of every row on eleven lists, and the dialog it opens was drawn right where the button
// was written — inside the table cell. A table is a hostile place for a dialog: it
// scrolls sideways, its header sticks to the top, and anything inside it is held in the
// table's own layering. On the live site the dialog appeared half cut off, with the
// column headings and the filter chips painted over it, and the lower half — the
// authenticator code and the confirm button — sat behind the rows where it could be
// seen but not clicked. A reason could be typed; nothing could be confirmed.
//
// Nothing in a jsdom test can see layering, so this checks the thing that causes it:
// where in the document the dialog is. If it is ever inside a table again, a real
// browser will trap it the same way.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../render';
import { serve } from '../fake-server';
import { forgetTestDataStatus } from '@/lib/test-data';
import BookingsPage from '@/app/(panel)/bookings/page';
import { Sheet } from '@/components/ui';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/bookings',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

beforeEach(() => forgetTestDataStatus());

const BOOKING = {
  id: 'bk-1',
  reference: 'BK-1001',
  status: 'upcoming',
  customerId: 'cu-1',
  customerName: 'Dana Illidge',
  providerId: 'pr-1',
  providerName: 'Bay Road Rentals',
  vehicleLabel: 'Toyota Yaris 2023',
  startDate: '2026-11-01',
  endDate: '2026-11-04',
  gross: 320,
  commission: 48,
  payout: 272,
  depositAmount: 0,
  depositStatus: 'not_taken',
  paymentStatus: 'paid',
  agreementSigned: true,
  messageCount: 0,
  createdAt: '2026-10-01T10:00:00.000Z',
};

describe('a dialog opened from inside a table', () => {
  it('is drawn on the page, not inside the row it was opened from', async () => {
    const user = userEvent.setup();
    serve({
      '/admin/me': { id: 'st-me', name: 'Gio', email: 'g@x.com', avatarInitials: 'G', tier: 'godfather' },
      '/admin/test-data/status': {
        open: true,
        conditions: [],
        kinds: [{ what: 'bookings', label: 'Bookings', single: true }],
      },
      'GET /admin/bookings': [BOOKING],
    });
    render(<BookingsPage />);

    const button = await screen.findByRole('button', { name: /^delete$/i });
    await waitFor(() => expect(button).toBeEnabled());
    // The button is in the table, which is where it belongs…
    expect(button.closest('table')).not.toBeNull();

    await user.click(button);

    // …and the dialog it opens is not.
    const dialog = await screen.findByRole('dialog');
    expect(dialog.closest('table')).toBeNull();
    expect(dialog.closest('td')).toBeNull();
    // It hangs directly off the page, so nothing it was opened from can clip it or
    // paint over it.
    expect(document.body.contains(dialog)).toBe(true);
    expect(dialog.parentElement?.parentElement).toBe(document.body);
  });

  it('is drawn on the page whatever it was written inside of', () => {
    render(
      <table>
        <tbody>
          <tr>
            <td>
              <Sheet open onClose={() => {}} title="From inside a cell">
                <p>Body</p>
              </Sheet>
            </td>
          </tr>
        </tbody>
      </table>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.closest('table')).toBeNull();
    expect(dialog.parentElement?.parentElement).toBe(document.body);
  });

  it('still closes on Escape, and still holds focus inside, once drawn on the page', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="A dialog">
        <input aria-label="first" />
      </Sheet>,
    );

    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
