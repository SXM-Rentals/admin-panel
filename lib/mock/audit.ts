// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The audit log — eighty made-up past entries, plus the
// list that new ones get added to while somebody is using the panel.
//
// THIS IS THE DEFINING FEATURE OF THE WHOLE PANEL, so it is worth being clear
// about what it is for. The admin doc puts it plainly: the core purpose is
// tracking account-level changes made by staff. Who deleted an account, what was
// changed on a user or business, and when. Everything else in this panel is
// somebody doing their job; this is the record that they did it.
//
// WHY THE SEEDED ENTRIES ARE NOT RANDOM NOISE: an audit log full of
// "field_3 changed from 7 to 9" proves the screen renders and nothing else. The
// entries below are the changes a real support team actually makes — points
// adjusted after a complaint, a licence rejected as unreadable, a deposit kept
// against damage — because the test of this screen is whether somebody can read
// a row a year later and understand what happened.
//
// THE LIVE HALF: append() below is what lib/audit.ts calls whenever a staff
// member does something in the panel. It is an in-memory list, so it empties on
// a page refresh — which is honest about what this is. Once the backend exists
// this becomes POST /admin/audit and the entries outlive the tab.

import type { AuditAction, AuditEntry } from '@/types';
import { between, daysAgo, pick, seeded } from './seed';
import { mockStaff } from './staff';
import { mockUsers, userDisplayName } from './users';
import { mockProviders } from './providers';
import { mockVehicles, vehicleLabel } from './vehicles';

const rng = seeded(6650);

// The kinds of change that actually happen, each with the wording that goes with
// it. Written as templates so eighty entries can be generated without eighty
// paragraphs, while still reading like real work.
type Template = {
  action: AuditAction;
  subjectType: AuditEntry['subjectType'];
  field: string;
  reasons: string[];
  values: () => { before: string; after: string };
};

const TEMPLATES: Template[] = [
  {
    action: 'points_adjusted',
    subjectType: 'customer',
    field: 'Rewards points',
    reasons: [
      'Goodwill after the vehicle was delivered two hours late.',
      'Points from a referral had not credited automatically.',
      'Correcting a double credit on the same booking.',
      'Compensation agreed on a support call about a faulty air conditioner.',
    ],
    values: () => {
      const before = between(rng, 200, 9_000);
      return { before: before.toLocaleString(), after: (before + between(rng, 100, 800)).toLocaleString() };
    },
  },
  {
    action: 'account_updated',
    subjectType: 'customer',
    field: 'Email address',
    reasons: [
      'Customer could not receive booking confirmations; new address confirmed by phone.',
      'Typo in the address given at sign-up.',
    ],
    values: () => ({ before: 'old.address@example.com', after: 'new.address@example.com' }),
  },
  {
    action: 'account_updated',
    subjectType: 'customer',
    field: 'Account type',
    reasons: [
      'Resident produced a Sint Maarten residency card; switched from Tourist to Local.',
      'Signed up as Local in error and could not supply a residency document.',
    ],
    values: () => ({ before: 'Tourist', after: 'Local' }),
  },
  {
    action: 'verification_approved',
    subjectType: 'customer',
    field: 'Identity verification',
    reasons: [
      'Passport and licence both clear, selfie matches.',
      'Resubmitted licence is legible; approved on second review.',
    ],
    values: () => ({ before: 'Pending', after: 'Approved' }),
  },
  {
    action: 'verification_rejected',
    subjectType: 'customer',
    field: 'Identity verification',
    reasons: [
      'Photograph of the driving licence was too blurred to read the expiry date.',
      'The selfie did not match the photograph on the submitted passport.',
      'Document supplied was a residence permit rather than a driving licence.',
    ],
    values: () => ({ before: 'Pending', after: 'Rejected' }),
  },
  {
    action: 'verification_approved',
    subjectType: 'vehicle',
    field: 'Insurance document',
    reasons: [
      'Policy is current and covers rental use.',
      'Renewal certificate received and checked.',
    ],
    values: () => ({ before: 'Pending', after: 'Approved' }),
  },
  {
    action: 'verification_rejected',
    subjectType: 'vehicle',
    field: 'Roadworthiness certificate',
    reasons: [
      'Inspection certificate is more than 24 months old and is no longer valid.',
      'Certificate is for a different registration number.',
    ],
    values: () => ({ before: 'Pending', after: 'Rejected' }),
  },
  {
    action: 'refund_approved',
    subjectType: 'payment',
    field: 'Refund request',
    reasons: [
      'Provider confirmed the vehicle was unavailable at pickup.',
      'Duplicate charge on the same card, confirmed in Stripe.',
      'Rental cut short by a documented family emergency; unused days refunded.',
    ],
    values: () => ({ before: 'Pending', after: 'Approved' }),
  },
  {
    action: 'refund_denied',
    subjectType: 'payment',
    field: 'Refund request',
    reasons: [
      'Rental ran to completion with no fault reported at the time.',
      'Cancellation was made inside the 24-hour window set out in the policy.',
    ],
    values: () => ({ before: 'Pending', after: 'Denied' }),
  },
  {
    action: 'deposit_claimed',
    subjectType: 'booking',
    field: 'Security deposit',
    reasons: [
      'Kerbed alloy wheel photographed at return and agreed with the renter; repair quote on file.',
      'Returned with a quarter tank against a full-to-full agreement.',
    ],
    values: () => ({ before: 'Held', after: 'Claimed' }),
  },
  {
    action: 'deposit_released',
    subjectType: 'booking',
    field: 'Security deposit',
    reasons: [
      'Vehicle returned on time and undamaged.',
      'Released manually after the automatic release failed.',
    ],
    values: () => ({ before: 'Held', after: 'Released' }),
  },
  {
    action: 'account_updated',
    subjectType: 'provider',
    field: 'Payout account status',
    reasons: [
      'Stripe onboarding completed; payouts enabled.',
      'Restricted pending a director identity document.',
    ],
    values: () => ({ before: 'Pending', after: 'Active' }),
  },
];

function subjectFor(t: Template): { id: string; label: string } {
  if (t.subjectType === 'customer') {
    const u = pick(rng, mockUsers);
    return { id: u.id, label: userDisplayName(u) };
  }
  if (t.subjectType === 'provider') {
    const p = pick(rng, mockProviders);
    return { id: p.id, label: p.businessName };
  }
  if (t.subjectType === 'vehicle') {
    const v = pick(rng, mockVehicles);
    return { id: v.id, label: `${vehicleLabel(v)} · ${v.reference}` };
  }
  if (t.subjectType === 'booking' || t.subjectType === 'payment') {
    return { id: `b${between(rng, 1, 50)}`, label: `Booking SXM-${between(rng, 4200, 4550)}` };
  }
  return { id: 'platform', label: 'Platform' };
}

// The eighty seeded entries, newest first.
const seededEntries: AuditEntry[] = Array.from({ length: 80 }, (_, i) => {
  const template = TEMPLATES[i % TEMPLATES.length];
  const staff = mockStaff[i % mockStaff.length];
  const subject = subjectFor(template);
  const { before, after } = template.values();

  return {
    id: `au${800 - i}`,
    // Spread back over roughly four months, newest first, and across a working
    // day rather than all at the same hour.
    at: daysAgo(Math.floor(i * 1.6) + between(rng, 0, 1), between(rng, 8, 18)),
    staffId: staff.id,
    staffName: staff.name,
    action: template.action,
    subjectType: template.subjectType,
    subjectId: subject.id,
    subjectLabel: subject.label,
    field: template.field,
    before,
    after,
    reason: pick(rng, template.reasons),
  } satisfies AuditEntry;
});

// Two entries written by hand at the top, because the two most serious things
// this log records — a deleted account, and a deposit kept — deserve to be the
// first thing anybody opening the screen actually reads.
const headlineEntries: AuditEntry[] = [
  {
    id: 'au900',
    at: daysAgo(12, 11),
    staffId: mockStaff[0].id,
    staffName: mockStaff[0].name,
    action: 'account_deleted',
    subjectType: 'customer',
    subjectId: mockUsers[25].id,
    subjectLabel: userDisplayName(mockUsers[25]),
    field: 'Account',
    before: 'Active · Traveler · 2,180 points',
    after: 'Closed',
    reason:
      'Customer asked in writing for their account to be closed and their data removed. No open bookings and no deposit held at the time of closure.',
  },
  {
    id: 'au899',
    at: daysAgo(3, 15),
    staffId: mockStaff[1].id,
    staffName: mockStaff[1].name,
    action: 'deposit_claimed',
    subjectType: 'booking',
    subjectId: 'b5',
    subjectLabel: 'Booking SXM-4228',
    field: 'Security deposit',
    before: 'Held · $500',
    after: 'Claimed · $240 retained, $260 returned',
    reason:
      'Kerbed alloy wheel on the front nearside, photographed at return and agreed with the renter. Retained against the repair quote on file; the balance went back the same day.',
  },
];

// ---- THE LIVE LIST ----
// New entries written during this session. Kept separate from the seeded ones so
// it is obvious which is which, and so a test can clear it between runs.
let liveEntries: AuditEntry[] = [];

export function appendAuditEntry(entry: AuditEntry): void {
  liveEntries = [entry, ...liveEntries];
}

export function clearLiveAuditEntries(): void {
  liveEntries = [];
}

// Everything, newest first. This is what the audit screen reads.
export function allAuditEntries(): AuditEntry[] {
  return [...liveEntries, ...headlineEntries, ...seededEntries].sort((a, b) =>
    a.at < b.at ? 1 : -1,
  );
}
