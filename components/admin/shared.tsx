'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The small pieces that more than one screen needs — the
// label-and-value row every detail screen is built from, the tick-or-cross, and
// the tables of wording that turn a stored value like 'pending_review' into
// something a person reads.
//
// WHY THE WORDING TABLES LIVE HERE RATHER THAN ON EACH SCREEN: the same customer
// appears on the users list, on their own detail screen, in the action queue and
// in the audit log. If each of those decides for itself what to call
// 'resubmit', one of them will end up saying "Pending" — and a customer
// described one way on one screen and another way on the next is a support call
// that starts with somebody being told two different things.

import React from 'react';
import { Icon, StatusPill, Text } from '@/components/ui';
import type { IconName, StatusTone } from '@/components/ui';
import type {
  AdminVehicle,
  BookingStatus,
  DisputeCase,
  DepositStatus,
  VerificationStatus,
} from '@/types';
import styles from './admin.module.css';

// ---- HOW EACH STATE IS SHOWN ----

export const VERIFICATION_STYLE: Record<VerificationStatus, { label: string; tone: StatusTone }> = {
  approved: { label: 'Verified', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  rejected: { label: 'Rejected', tone: 'danger' },
  resubmit: { label: 'Resubmit', tone: 'warning' },
  unstarted: { label: 'Not Started', tone: 'neutral' },
};

export const BOOKING_STYLE: Record<BookingStatus, { label: string; tone: StatusTone }> = {
  upcoming: { label: 'Upcoming', tone: 'brand' },
  active: { label: 'Out Now', tone: 'success' },
  completed: { label: 'Completed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

// The four states a security deposit passes through. Worth reading as a
// sentence: nothing taken, being held, given back, or kept against damage.
export const DEPOSIT_STYLE: Record<DepositStatus, { label: string; tone: StatusTone }> = {
  not_taken: { label: 'Not Taken', tone: 'neutral' },
  held: { label: 'Held', tone: 'warning' },
  released: { label: 'Released', tone: 'success' },
  claimed: { label: 'Claimed', tone: 'danger' },
};

export const DISPUTE_STYLE: Record<DisputeCase['status'], { label: string; tone: StatusTone }> = {
  open: { label: 'Open', tone: 'danger' },
  investigating: { label: 'Investigating', tone: 'warning' },
  resolved: { label: 'Resolved', tone: 'success' },
};

export const DOCUMENT_STYLE: Record<'pending' | 'approved' | 'rejected', { label: string; tone: StatusTone }> = {
  pending: { label: 'Waiting to Be Read', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

// Whether a vehicle is on the site. This is never set by hand — it follows from
// the state of the vehicle's three documents, which is what stops a car with
// expired insurance staying listed because somebody recorded the rejection and
// forgot the listing.
export const LISTING_STYLE: Record<
  AdminVehicle['listingStatus'],
  { label: string; tone: StatusTone }
> = {
  live: { label: 'Live', tone: 'success' },
  pending_review: { label: 'Awaiting Review', tone: 'warning' },
  suspended: { label: 'Suspended', tone: 'danger' },
};

export const DOCUMENT_KIND_LABELS: Record<string, string> = {
  registration: 'Vehicle Registration',
  insurance: 'Insurance Certificate',
  roadworthiness: 'Roadworthiness Certificate',
};

// ---- THE PIECES ----

// A label on the left, a value on the right. Every detail screen in the panel is
// a stack of these.
export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.infoRow}>
      <Text variant="small" tone="ink3" as="span" raw>
        {label}
      </Text>
      <span className={styles.infoValue}>
        {typeof value === 'string' || typeof value === 'number' ? (
          <Text variant="label" as="span" raw>
            {value}
          </Text>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

export function InfoRows({ children }: { children: React.ReactNode }) {
  return <div className={styles.infoRows}>{children}</div>;
}

// A tick or a cross WITH the word beside it. Never the colour on its own, which
// says nothing at all to somebody who cannot distinguish it.
export function YesNo({ done, yes = 'Done', no = 'Not done' }: { done: boolean; yes?: string; no?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Icon
        name={done ? 'checkmark-circle-outline' : 'close'}
        size={15}
        color={done ? 'var(--success)' : 'var(--ink3)'}
      />
      <Text variant="label" tone={done ? 'ink' : 'ink3'} as="span" raw>
        {done ? yes : no}
      </Text>
    </span>
  );
}

// A short quoted passage — what a customer said when asking for a refund, the
// detail of a dispute. Set apart so it reads as somebody else's words.
export function Quote({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.quote}>
      <Text variant="body" tone="ink2" as="p" raw>
        {children}
      </Text>
    </div>
  );
}

// A short explanatory line with an icon, used wherever a screen needs to say why
// something is the way it is.
export function Note({
  children,
  tone = 'ink3',
  icon = 'information-circle-outline',
}: {
  children: React.ReactNode;
  tone?: 'ink3' | 'ink2';
  icon?: IconName;
}) {
  return (
    <div className={styles.inlineNote}>
      <Icon name={icon} size={15} color={`var(--${tone})`} />
      <Text variant="small" tone={tone} as="p" raw>
        {children}
      </Text>
    </div>
  );
}

// ---- THE DEPOSIT WARNING ----
// Used on every screen that shows a deposit next to money the platform has
// actually earned. It exists because the two are easy to confuse and expensive
// to confuse: one is revenue, the other is somebody else's money we are holding.
export function DepositNotRevenueNote({ children }: { children?: React.ReactNode }) {
  return (
    <div className={styles.depositNote}>
      <Icon name="wallet-outline" size={16} color="var(--warning)" />
      <Text variant="small" as="p" raw>
        {children ??
          'A security deposit is the customer’s money, authorised against their card and given back when the vehicle returns. It is never revenue, never commissionable, and is not counted in any total above.'}
      </Text>
    </div>
  );
}

// A pill for a verification state, so no screen has to look the table up itself.
export function VerificationPill({ status }: { status: VerificationStatus }) {
  const style = VERIFICATION_STYLE[status];
  return <StatusPill label={style.label} tone={style.tone} />;
}
