'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: What each rental business is owed and whether it has been
// paid — and the two buttons that pay them.
//
// THIS IS THE ONLY SCREEN IN THE PANEL THAT MOVES MONEY OUT, and it is built like
// it. Both actions need Owner access, a written reason and your authenticator
// code, because the server requires all three; the screen greys them with the
// reason rather than offering a button that fails. Everywhere else in this panel a
// mistake can be put right by somebody. Money that has left cannot be.
//
// THE TWO BUTTONS ARE NOT TWO WAYS OF DOING THE SAME THING, which is the thing to
// understand before using either:
//
//   SEND asks Stripe to pay the business. Nobody touches a bank: the money moves
//   because this was pressed.
//
//   RECORD A TRANSFER writes down a payment somebody already made by hand, at the
//   bank, outside this panel. It moves nothing. It needs the bank's own reference,
//   because a recorded payment that cannot be matched to a bank statement looks
//   like proof and is not.
//
// A business is paid one way or the other, and the server knows which. Asking
// Stripe to send to a business paid by transfer is refused with
// `paid_by_bank_transfer` — that refusal is a safety rail, not an inconvenience:
// it is what stops the same money going out twice by two routes. So the screen
// only offers the route that business is actually on.

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAdminSession } from '@/lib/auth';
import { dateRange, longDate, money } from '@/lib/format';
import { whyNeedsTier } from '@/lib/tiers';
import { ResetControl, ResetNote } from '@/components/admin/ResetControl';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { CellStack, DataTable, type Column } from '@/components/tables/DataTable';
import { FilterBar, FilterChips } from '@/components/admin/FilterBar';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { Note } from '@/components/admin/shared';
import { Button, StatusPill, Text } from '@/components/ui';
import type { AdminPayout } from '@/types';

// What is about to be done, while its reason and code are asked for.
type Action = { kind: 'send' | 'mark-paid'; payout: AdminPayout };

type Which = 'owed' | 'paid' | 'all';

const STATUS: Record<AdminPayout['status'], { label: string; tone: 'warning' | 'brand' | 'success' }> = {
  pending: { label: 'Owed', tone: 'warning' },
  processing: { label: 'On Its Way', tone: 'brand' },
  paid: { label: 'Paid', tone: 'success' },
};

export default function PayoutsPage() {
  const { staff: me } = useAdminSession();
  const [which, setWhich] = useState<Which>('owed');
  const [action, setAction] = useState<Action | null>(null);

  const { data: payouts, loading, error, refresh } = useAsyncData(() => apiClient.listPayouts(), []);

  const all = payouts ?? [];
  const rows = all.filter((payout) =>
    which === 'all' ? true : which === 'paid' ? payout.status === 'paid' : payout.status !== 'paid',
  );

  // Paying a business needs Owner access. Said once here and again on each button
  // it stops, in the server's own words — see lib/tiers.ts.
  const whyNot = whyNeedsTier(me?.tier, 'owner');

  const owed = all.filter((payout) => payout.status === 'pending');
  const owedTotal = owed.reduce((sum, payout) => sum + payout.amount, 0);

  const columns: Column<AdminPayout>[] = [
    {
      id: 'provider',
      header: 'Business',
      sortValue: (p) => p.providerName,
      cell: (p) => <CellStack title={p.providerName} detail={p.reference} />,
    },
    {
      id: 'period',
      header: 'For',
      sortValue: (p) => p.periodEnd,
      cell: (p) => (
        <CellStack
          title={dateRange(p.periodStart, p.periodEnd)}
          detail={`${p.bookingCount} ${p.bookingCount === 1 ? 'booking' : 'bookings'}`}
        />
      ),
    },
    {
      id: 'method',
      header: 'Paid by',
      sortValue: (p) => p.method ?? '',
      cell: (p) =>
        p.method === 'bank_transfer' ? (
          <CellStack title="Bank transfer" detail={p.bankReference ?? 'No reference yet'} />
        ) : p.method === 'stripe' ? (
          <CellStack title="Stripe" detail="Sent by us" />
        ) : (
          // The server does not always say, and a guess here would be a guess
          // about how somebody gets paid.
          <Text variant="small" tone="ink3" as="span" raw>
            Not said
          </Text>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (p) => p.status,
      cell: (p) => {
        const style = STATUS[p.status];
        return (
          <CellStack
            title={<StatusPill label={style.label} tone={style.tone} />}
            detail={p.paidOn ? longDate(p.paidOn) : undefined}
          />
        );
      },
    },
    {
      id: 'amount',
      header: 'To them',
      sortValue: (p) => p.amount,
      numeric: true,
      // Their money first, our commission under it: the figure being sent is the
      // one that has to be right.
      cell: (p) => <CellStack title={money(p.amount)} detail={`${money(p.commission)} commission`} />,
    },
  ];

  if (error) return <LoadFailed title="Payouts" what="What businesses are owed" error={error} onRetry={refresh} />;

  return (
    <>
      <PageHead
        title="Payouts"
        description="What each business is owed, and what has been sent. Paying one needs Owner access, a reason and your authenticator code."
      />

      {whyNot ? (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <Note icon="lock-closed-outline" tone="ink2">
            {whyNot} You can see every figure here.
          </Note>
        </div>
      ) : null}

      <PageCard
        title="Payouts"
        subtitle={
          loading
            ? undefined
            : `${money(owedTotal)} owed across ${owed.length} ${owed.length === 1 ? 'business' : 'businesses'}`
        }
        flush
      >
        <FilterBar>
          <FilterChips
            label="Show"
            value={which}
            onChange={setWhich}
            options={[
              { value: 'owed', label: 'Not paid yet', count: all.filter((p) => p.status !== 'paid').length },
              { value: 'paid', label: 'Paid', count: all.filter((p) => p.status === 'paid').length },
              { value: 'all', label: 'All', count: all.length },
            ]}
          />
        </FilterBar>

        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(p) => p.id}
          rowMuted={(p) => p.status === 'paid'}
          loading={loading}
          initialSort={{ columnId: 'period', direction: 'desc' }}
          emptyTitle={which === 'paid' ? 'Nothing paid yet' : 'Nobody is owed anything'}
          emptyMessage="Payouts appear here as bookings are completed."
          // ONLY THE ROUTE THAT BUSINESS IS ON. Offering both would be offering
          // one that the server refuses, and on this screen a refusal arrives
          // after somebody has typed a reason and their code.
          rowActions={(p) =>
            p.status === 'paid' ? (
              <Text variant="small" tone="ink3" as="span" raw>
                {p.paidOn ? `Paid ${longDate(p.paidOn)}` : 'Paid'}
              </Text>
            ) : p.method === 'bank_transfer' ? (
              <Button
                label="Record Transfer"
                variant="secondary"
                size="sm"
                disabled={whyNot !== undefined}
                title={whyNot}
                onClick={() => setAction({ kind: 'mark-paid', payout: p })}
              />
            ) : (
              <Button
                label="Send It"
                variant="primary"
                size="sm"
                disabled={whyNot !== undefined}
                title={whyNot}
                onClick={() => setAction({ kind: 'send', payout: p })}
              />
            )
          }
        />
      </PageCard>

      <div style={{ marginTop: 'var(--space-lg)' }}>
        <Note icon="warning-outline" tone="ink2">
          <strong>Send It</strong> asks Stripe to pay the business — the money moves because you
          pressed it. <strong>Record Transfer</strong> writes down a payment somebody already made at
          the bank and moves nothing. Each business is on one route or the other, and only that one
          is offered.
        </Note>
      </div>

      {action ? (
        <ReasonDialog
          open
          onClose={() => setAction(null)}
          title={
            action.kind === 'send'
              ? `Send ${action.payout.providerName} ${money(action.payout.amount)}`
              : `Record a transfer to ${action.payout.providerName}`
          }
          description={
            action.kind === 'send'
              ? `Stripe sends ${money(action.payout.amount)} to ${action.payout.providerName} for ${dateRange(action.payout.periodStart, action.payout.periodEnd)}. The money leaves when you confirm this, and it cannot be called back from here.`
              : `This records ${money(action.payout.amount)} as already sent to ${action.payout.providerName} by bank transfer. It moves no money — it writes down that money moved, so only use it once the transfer has actually gone.`
          }
          confirmLabel={action.kind === 'send' ? 'Send the money' : 'Record it as paid'}
          destructive={action.kind === 'send'}
          confirmWithCode
          reasonPlaceholder={
            action.kind === 'send'
              ? 'e.g. September payout run, figures checked against the bookings.'
              : 'e.g. Transferred from the business account on 3 October, confirmed by the bank.'
          }
          change={{
            subjectLabel: `${action.payout.providerName} · ${action.payout.reference}`,
            field: action.kind === 'send' ? 'Payout' : 'Payout record',
            before: STATUS[action.payout.status].label,
            after: action.kind === 'send' ? 'On its way' : 'Paid by transfer',
          }}
          reference={
            action.kind === 'mark-paid'
              ? {
                  label: 'Bank reference',
                  placeholder: 'As it appears on the statement',
                  hint: 'The only thing tying our record to the bank’s. Copy it exactly.',
                }
              : undefined
          }
          onConfirm={async (reason, { code, reference }) => {
            if (action.kind === 'send') {
              await apiClient.sendPayout(action.payout.id, reason, code ?? '');
            } else {
              await apiClient.markPayoutPaid(action.payout.id, reference ?? '', reason, code ?? '');
            }
            setAction(null);
            refresh();
          }}
        />
      ) : null}

      <div style={{ marginTop: 'var(--space-lg)' }}>
        <PageCard title="Test Records">
          <ResetControl
            what="the payouts"
            detail="What businesses were owed and what was sent. The bookings behind them stay."
          />
          <ResetNote />
        </PageCard>
      </div>
    </>
  );
}
