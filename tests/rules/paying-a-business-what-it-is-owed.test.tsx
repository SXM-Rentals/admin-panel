// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks the one screen in the panel that moves money out —
// paying a rental business what it is owed, either by asking Stripe to send it or
// by recording a bank transfer somebody already made.
//
// WHY THIS IS THE MOST GUARDED THING HERE. Everywhere else in this panel a mistake
// can be put right by somebody: a listing goes back up, an account is restored, a
// business is reopened. Money that has left cannot be called back from this screen.
// So: Owner access, a written reason, and the authenticator code — all three, every
// time, and the panel says which is missing rather than letting the server refuse
// after somebody has typed the other two.
//
// AND WHY ONLY ONE OF THE TWO BUTTONS IS EVER OFFERED. A business is paid through
// Stripe or by bank transfer, never both, and the server refuses the wrong one with
// `paid_by_bank_transfer`. That refusal exists to stop the same money going out
// twice by two routes — so the screen offers the route that business is actually
// on, and the refusal stays a backstop rather than a thing people meet daily.
//
// THE BANK REFERENCE IS REQUIRED FOR THE SAME REASON. Recording a transfer moves
// nothing: it writes down that money moved. A written-down payment nobody can match
// to a bank statement looks like proof and is not.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../render';
import { reply, sentTo, serve } from '../fake-server';
import PayoutsPage from '@/app/(panel)/payments/payouts/page';
import type { AdminPayout, AdminTier } from '@/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/payments/payouts',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const me = (tier: AdminTier) => ({
  id: 'st-me',
  name: 'Gio Bertin-Maurice',
  email: 'gio@sxmrentals.app',
  avatarInitials: 'GB',
  tier,
});

function payout(overrides: Partial<AdminPayout> & { id: string }): AdminPayout {
  return {
    reference: `PO-${overrides.id.toUpperCase()}`,
    providerName: 'Bay Road Rentals',
    amount: 2720,
    grossAmount: 3200,
    commission: 480,
    bookingCount: 9,
    periodStart: '2026-09-01',
    periodEnd: '2026-09-30',
    status: 'pending',
    method: 'stripe',
    bankReference: null,
    ...overrides,
  };
}

const BY_STRIPE = payout({ id: 'po-1' });
const BY_BANK = payout({ id: 'po-2', providerName: 'Cole Bay Cars', method: 'bank_transfer' });

describe('paying a business', () => {
  it('asks Stripe to send it, with a reason and your authenticator code', async () => {
    const user = userEvent.setup();
    const server = serve({
      '/admin/me': me('owner'),
      'GET /admin/payouts': [BY_STRIPE],
      'POST /admin/payouts/po-1/send': { ...BY_STRIPE, status: 'processing' },
    });
    render(<PayoutsPage />);

    await user.click(await screen.findByRole('button', { name: /send it/i }));
    const dialog = await screen.findByRole('dialog');
    // The screen says what pressing it does before it is pressed.
    expect(dialog).toHaveTextContent(/money leaves when you confirm/i);

    await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));
    await user.click(screen.getByLabelText(/reason/i));
    await user.paste('September payout run, figures checked against the bookings.');

    const confirm = within(dialog).getByRole('button', { name: /send the money/i });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText(/authenticator code/i), '246810');
    await user.click(confirm);

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/payouts/po-1/send')).toEqual({
        reason: 'September payout run, figures checked against the bookings.',
        code: '246810',
      }),
    );
  });

  it('records a bank transfer only with the bank’s own reference', async () => {
    const user = userEvent.setup();
    const server = serve({
      '/admin/me': me('owner'),
      'GET /admin/payouts': [BY_BANK],
      'POST /admin/payouts/po-2/mark-paid': { ...BY_BANK, status: 'paid', bankReference: 'TRF-99812' },
    });
    render(<PayoutsPage />);

    await user.click(await screen.findByRole('button', { name: /record transfer/i }));
    const dialog = await screen.findByRole('dialog');
    // It must be clear this writes down a payment rather than making one.
    expect(dialog).toHaveTextContent(/moves no money/i);

    await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));
    await user.click(screen.getByLabelText(/reason/i));
    await user.paste('Transferred from the business account on 3 October.');
    await user.type(screen.getByLabelText(/authenticator code/i), '135791');

    // Reason and code are not enough: without the reference our record cannot be
    // matched to the bank's.
    const confirm = within(dialog).getByRole('button', { name: /record it as paid/i });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText(/bank reference/i), 'TRF-99812');
    await user.click(confirm);

    await waitFor(() =>
      expect(sentTo(server, 'POST', '/admin/payouts/po-2/mark-paid')).toEqual({
        reason: 'Transferred from the business account on 3 October.',
        code: '135791',
        bankReference: 'TRF-99812',
      }),
    );
  });

  it('offers each business only the route it is actually paid by', async () => {
    serve({ '/admin/me': me('owner'), 'GET /admin/payouts': [BY_STRIPE, BY_BANK] });
    render(<PayoutsPage />);

    await screen.findByText('Cole Bay Cars');
    // One of each, not two of both — the server refuses the wrong route, and that
    // refusal should not be something people meet by pressing a button.
    expect(screen.getAllByRole('button', { name: /send it/i })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /record transfer/i })).toHaveLength(1);
  });

  it('shows the server’s own refusal if a route is wrong after all', async () => {
    const user = userEvent.setup();
    // A business whose method changed since the list was fetched.
    serve({
      '/admin/me': me('owner'),
      'GET /admin/payouts': [BY_STRIPE],
      'POST /admin/payouts/po-1/send': reply(409, {
        error: {
          code: 'paid_by_bank_transfer',
          message: 'This business is paid by bank transfer. Record the transfer instead.',
          requestId: 'r1',
        },
      }),
    });
    render(<PayoutsPage />);

    await user.click(await screen.findByRole('button', { name: /send it/i }));
    await waitFor(() => expect(document.activeElement?.tagName).toMatch(/^(INPUT|TEXTAREA)$/));
    await user.click(screen.getByLabelText(/reason/i));
    await user.paste('September payout run, figures checked.');
    await user.type(screen.getByLabelText(/authenticator code/i), '246810');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /send the money/i }));

    expect(
      await screen.findByText(/This business is paid by bank transfer\. Record the transfer instead\./),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nothing was changed/i)).toBeInTheDocument();
  });
});

describe('who may pay anybody', () => {
  it('shows an Administrator every figure and no way to send money', async () => {
    serve({ '/admin/me': me('administrator'), 'GET /admin/payouts': [BY_STRIPE, BY_BANK] });
    render(<PayoutsPage />);

    // The numbers are all readable.
    expect(await screen.findByText('Bay Road Rentals')).toBeInTheDocument();
    expect(screen.getByText(/needs Owner access or higher/i)).toBeInTheDocument();

    // And both buttons are there, greyed, rather than quietly missing.
    await waitFor(() => expect(screen.getByRole('button', { name: /send it/i })).toBeDisabled());
    expect(screen.getByRole('button', { name: /record transfer/i })).toBeDisabled();
  });
});
