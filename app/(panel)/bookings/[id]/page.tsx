'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: One booking in full — the dates, both parties, the money
// split three ways, the deposit and the signed agreement.
//
// THE MONEY BREAKDOWN IS THE POINT OF THIS SCREEN. Three figures that must
// always agree: what the customer paid, what the business gets, and what the
// platform kept. They are shown as a sum that visibly adds up, because a support
// call about "why did I only get $70" is answered by showing the arithmetic
// rather than by asserting it.
//
// AND THEN THE DEPOSIT, DELIBERATELY BELOW THE TOTAL, in its own amber box with
// its own explanation. It is not part of that sum and it must never be added to
// it: it is the customer's money, held against damage and given back. Every
// screen in this panel that shows both keeps them apart, and this is the screen
// where somebody would most likely be tempted to total them together.

import React from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money, longDate, daysBetween, capitalise } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import {
  BOOKING_STYLE,
  DEPOSIT_STYLE,
  DepositNotRevenueNote,
  InfoRow,
  InfoRows,
  Note,
  YesNo,
} from '@/components/admin/shared';
import { Button, Skeleton, StatusPill, Text } from '@/components/ui';
import styles from '@/components/admin/admin.module.css';

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const { data: booking, loading, error, refresh } = useAsyncData(() => apiClient.getBooking(id), [id]);

  // Could not be fetched is not the same as "no such booking". See LoadFailed.
  if (error) return <LoadFailed title="Booking" what="This booking" error={error} onRetry={refresh} />;

  if (loading) return <Skeleton height={420} />;

  if (!booking) {
    return (
      <>
        <PageHead title="Booking not found" description="No booking with that reference." />
        <Button label="Back to Bookings" href="/bookings" variant="secondary" size="md" />
      </>
    );
  }

  const status = BOOKING_STYLE[booking.status];
  const deposit = DEPOSIT_STYLE[booking.depositStatus];
  const days = daysBetween(booking.startDate, booking.endDate);

  return (
    <>
      <PageHead
        title={booking.reference}
        description={`${booking.vehicleLabel} · ${booking.customerName} from ${booking.providerName}`}
        actions={<Button label="Back to Bookings" href="/bookings" variant="ghost" size="md" />}
      />

      <div className={styles.detailGrid}>
        <div className={styles.detailStack}>
          <PageCard title="The Rental">
            <InfoRows>
              <InfoRow label="Status" value={<StatusPill label={status.label} tone={status.tone} />} />
              <InfoRow label="Vehicle" value={booking.vehicleLabel} />
              <InfoRow label="Picked up" value={longDate(booking.startDate)} />
              <InfoRow label="Returned" value={longDate(booking.endDate)} />
              <InfoRow label="Length" value={`${days} ${days === 1 ? 'day' : 'days'}`} />
              <InfoRow label="Booked" value={longDate(booking.createdAt)} />
              <InfoRow
                label="Rental agreement"
                value={<YesNo done={booking.agreementSigned} yes="Signed" no="Not signed" />}
              />
            </InfoRows>
          </PageCard>

          {/* ---- THE MONEY ---- */}
          <PageCard title="Money">
            <div>
              <div className={styles.moneyRow}>
                <Text variant="body" tone="ink2" as="span" raw>
                  What the customer paid
                </Text>
                <Text variant="label" as="span" raw className="tabular">
                  {money(booking.gross)}
                </Text>
              </div>

              <div className={styles.moneyRow}>
                <Text variant="body" tone="ink2" as="span" raw>
                  Paid on to {booking.providerName}
                </Text>
                <Text variant="label" as="span" raw className="tabular">
                  {money(booking.payout)}
                </Text>
              </div>

              <div className={styles.moneyRow}>
                <Text variant="body" tone="ink2" as="span" raw>
                  Kept by SXM Rentals
                </Text>
                <Text variant="label" as="span" raw className="tabular">
                  {money(booking.commission)}
                </Text>
              </div>

              {/* Shown as a sum that visibly adds up. */}
              <div className={`${styles.moneyRow} ${styles.moneyTotal}`}>
                <Text variant="label" as="span" raw>
                  {money(booking.payout)} + {money(booking.commission)}
                </Text>
                <Text variant="label" as="span" raw className="tabular">
                  {money(booking.payout + booking.commission)}
                </Text>
              </div>
            </div>

            {/* Below the total, apart from it, and labelled. */}
            <div className={styles.moneyRow} style={{ marginTop: 'var(--space-lg)' }}>
              <Text variant="body" tone="ink2" as="span" raw>
                Security deposit ({deposit.label.toLowerCase()})
              </Text>
              <Text variant="label" tone="warning" as="span" raw className="tabular">
                {booking.depositAmount > 0 ? money(booking.depositAmount) : 'None taken'}
              </Text>
            </div>

            <DepositNotRevenueNote />
          </PageCard>

          {/* ---- THE CONVERSATION ----
              Not connected yet, and said so rather than left out. The server
              does not let staff read the messages between a customer and a
              business, and it always reports the message count as nothing —
              so saying "no messages on this booking" would be a guess dressed
              up as a fact. Reading a conversation is often the first thing a
              dispute needs, which is why the card stays and says what is
              missing. */}
          <PageCard title="Messages" subtitle="Not connected yet">
            <Note>
              Staff cannot read the conversation between the customer and the business yet — the
              SXM Rentals server does not offer it. Until it does, this panel cannot say whether
              any messages were sent on this booking.
            </Note>
          </PageCard>
        </div>

        <div className={styles.detailStack}>
          <PageCard title="Customer">
            <InfoRows>
              <InfoRow label="Name" value={booking.customerName} />
              <InfoRow label="Payment" value={capitalise(booking.paymentStatus)} />
            </InfoRows>
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Button
                label="Open Customer"
                href={`/users/${booking.customerId}`}
                variant="secondary"
                size="sm"
              />
            </div>
          </PageCard>

          <PageCard title="Business">
            <InfoRows>
              <InfoRow label="Name" value={booking.providerName} />
              <InfoRow label="Their share" value={money(booking.payout)} />
            </InfoRows>
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Button
                label="Open Business"
                href={`/providers/${booking.providerId}`}
                variant="secondary"
                size="sm"
              />
            </div>
          </PageCard>

          <PageCard title="Deposit">
            <InfoRows>
              <InfoRow label="Status" value={<StatusPill label={deposit.label} tone={deposit.tone} />} />
              <InfoRow
                label="Amount"
                value={booking.depositAmount > 0 ? money(booking.depositAmount) : 'None taken'}
              />
            </InfoRows>
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Button
                label="Deposit Ledger"
                href="/payments/deposits"
                variant="secondary"
                size="sm"
              />
            </div>
          </PageCard>
        </div>
      </div>
    </>
  );
}
