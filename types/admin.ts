// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Describes the shape of the information that exists only
// inside the staff admin panel — audit entries, refund requests, disputes, promo
// codes, platform settings. None of it is reachable from a customer screen or a
// provider dashboard.
//
// ITS COMPANION IS types/index.ts, which is a byte-for-byte copy of the customer
// website's file of the same name. That copy is deliberate and should stay a
// copy: when the real backend is built it returns one shape for a booking, and
// both products already agree on what that shape is. New admin-only shapes go
// here instead, so the shared file never drifts.

import type {
  BookingStatus,
  DepositStatus,
  Provider,
  RewardTier,
  User,
  VehicleClass,
  VerificationStatus,
} from './index';

// ---- STAFF ----
// One flat access level at MVP. There is deliberately no "role" field: the admin
// doc says every admin account can see and do everything, and inventing a role
// that nothing reads would suggest permissions exist when they do not. Adding
// tiers later means adding the field and the checks that go with it, together.
export type AdminStaff = {
  id: string;
  name: string;
  email: string;
  // Shown beside their name in the top bar and against their entries in the
  // audit log, so "who did this" is a face as well as a name.
  avatarInitials: string;
};

// ---- THE AUDIT LOG ----
// The defining requirement of this panel. Every account deletion and account
// update is written here: which admin, what changed, the value before and the
// value after, and when.
//
// WHY "before" AND "after" ARE PLAIN STRINGS: the log has to be readable a year
// later by somebody who was not there, possibly an accountant who does not know
// the database. "Explorer" becoming "VIP" tells that story. { tier: 2 } does not.
export type AuditAction =
  | 'account_updated'
  | 'account_deleted'
  | 'points_adjusted'
  | 'verification_approved'
  | 'verification_rejected'
  | 'refund_approved'
  | 'refund_denied'
  | 'deposit_claimed'
  | 'deposit_released'
  | 'promotion_changed'
  | 'settings_changed'
  | 'dispute_assigned'
  | 'dispute_resolved';

export type AuditEntry = {
  id: string;
  at: string; // ISO timestamp
  staffId: string;
  staffName: string;
  action: AuditAction;
  // What was acted on, in words: "Customer · Aria Duncan", "Vehicle · SXM-V-118".
  subjectType: 'customer' | 'provider' | 'vehicle' | 'booking' | 'payment' | 'platform';
  subjectId: string;
  subjectLabel: string;
  field: string; // "Rewards points", "Insurance document", "Commission rate"
  before: string; // "1,240"
  after: string; // "1,740"
  // Required on every action that changes something. The dialog will not submit
  // without one — see components/admin/ReasonDialog.tsx.
  reason: string;
};

// ---- VERIFICATION, PROVIDER SIDE ----
// Vehicle documents are reviewed by hand rather than run through the automated
// ID-check API used for customers. They are lower-volume and higher-context: an
// insurance certificate needs a person to read the dates on it.
export type VehicleDocumentKind = 'registration' | 'insurance' | 'roadworthiness';

export type VehicleDocument = {
  kind: VehicleDocumentKind;
  status: 'pending' | 'approved' | 'rejected';
  fileName: string;
  uploadedAt: string;
  expiresAt?: string;
  // Filled in only when rejected, and always required at that point.
  reason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
};

// Where a rental business has got to in being able to receive money. Stripe
// Connect will not send anything anywhere until this reads "active".
export type ProviderPayoutAccount = {
  stripeAccountId?: string;
  status: 'not_started' | 'pending' | 'active' | 'restricted';
  // What Stripe is still waiting for, in plain words.
  outstanding: string[];
  payoutsEnabled: boolean;
  country: string;
};

// The provider record as STAFF see it — the public profile, plus everything a
// customer never sees.
export type AdminProvider = Provider & {
  legalName: string;
  contactEmail: string;
  registrationNumber?: string;

  // The business's own site, where it has one. Plenty of small island operators
  // trade on a phone number and a Facebook page, so this is optional and its
  // absence is not a problem to flag.
  website?: string;

  // ---- THE PERSON BEHIND THE BUSINESS ----
  // Who actually answers when something goes wrong. A rental company on this
  // island is often one or two people, and the name on the registration is the
  // person a staff member ends up ringing about a disputed deposit.
  ownerName: string;

  // THE OWNER'S OWN MOBILE, as opposed to the business line on `phone` above.
  // Kept as a separate field rather than folded into the contact details on
  // purpose: it is a personal number, it belongs to a named individual rather
  // than to the company, and the screen showing it says so. Anything that later
  // exports or shares provider records should think twice about this one field.
  ownerPhone: string;
  verificationStatus: VerificationStatus;
  documents: VehicleDocument[];
  payoutAccount: ProviderPayoutAccount;
  vehicleCount: number;
  // Lifetime figures, so a name in the list carries some weight behind it.
  bookingCount: number;
  grossVolume: number;
};

// The customer record as STAFF see it. Unlike the provider-facing types on the
// website, this one does carry contact details: handling a support call is
// exactly the job this panel exists for.
export type AdminUser = User & {
  points: number;
  tier: RewardTier;
  bookingCount: number;
  lifetimeSpend: number;
  lastActiveAt: string;
  // Set when an account has been closed. The row stays in the list, greyed out,
  // so the audit trail still points at something that exists.
  deletedAt?: string;
};

// The vehicle record as STAFF see it: the listing, who owns it, and whether its
// paperwork is in order.
export type AdminVehicle = {
  id: string;
  reference: string;
  providerId: string;
  providerName: string;
  make: string;
  model: string;
  year: number;
  vehicleClass: VehicleClass;
  dailyRate: number;
  side: 'dutch' | 'french';
  listingStatus: 'live' | 'pending_review' | 'suspended';
  documents: VehicleDocument[];
};

// A booking as STAFF see it — the customer AND the provider on one row, which is
// the whole reason this view exists separately from the other two products.
export type AdminBooking = {
  id: string;
  reference: string;
  status: BookingStatus;
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  vehicleLabel: string;
  startDate: string;
  endDate: string;
  // The money, split three ways. gross === payout + commission, always.
  gross: number;
  commission: number;
  payout: number;
  // Held against the customer's card. Never part of gross — see the note on
  // PlatformSummary at the bottom of this file.
  depositAmount: number;
  depositStatus: DepositStatus;
  paymentStatus: 'paid' | 'authorized' | 'refunded' | 'failed';
  agreementSigned: boolean;
  messageCount: number;
  createdAt: string;
};

// ---- MONEY ----

// One line in the payment ledger.
export type LedgerEntry = {
  id: string;
  at: string;
  bookingRef: string;
  customerName: string;
  providerName: string;
  kind: 'charge' | 'refund' | 'payout' | 'commission';
  amount: number;
  status: 'succeeded' | 'pending' | 'failed';
  stripeRef: string;
};

export type RefundRequest = {
  id: string;
  bookingRef: string;
  customerName: string;
  providerName: string;
  amount: number;
  requestedAt: string;
  reasonGiven: string; // what the customer said when they asked
  status: 'pending' | 'approved' | 'denied';
  // Filled in by the admin who decided, and required either way.
  decidedBy?: string;
  decidedAt?: string;
  decisionReason?: string;
};

// A security deposit through its life. Ring-fenced from revenue at every step:
// it is the customer's money being held, not the platform's being earned.
export type DepositLedgerEntry = {
  id: string;
  bookingRef: string;
  customerName: string;
  providerName: string;
  amount: number;
  status: DepositStatus;
  authorizedAt: string;
  releasedAt?: string;
  claimedAt?: string;
  // Required whenever a deposit is claimed rather than returned. Keeping a
  // deposit without a written reason is the single most disputable thing this
  // platform can do, so the shape makes the reason impossible to forget.
  claimReason?: string;
};

// ---- DISPUTES ----
export type DisputeCase = {
  id: string;
  reference: string;
  bookingRef: string;
  openedAt: string;
  openedBy: 'customer' | 'provider';
  customerName: string;
  providerName: string;
  subject: string;
  detail: string;
  amountAtStake: number;
  status: 'open' | 'investigating' | 'resolved';
  // Unassigned is a real state and looks like one in the list. An unowned
  // dispute is the thing most likely to be forgotten about.
  assignedToId?: string;
  assignedToName?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
};

// ---- PROMOTIONS ----
export type PromoCode = {
  id: string;
  code: string;
  description: string;
  kind: 'percent' | 'fixed';
  value: number;
  startsAt: string;
  endsAt: string;
  status: 'active' | 'scheduled' | 'paused' | 'expired';
  usageLimit?: number;
  usedCount: number;
  // Who it applies to. "all" means everybody.
  appliesTo: 'all' | 'local' | 'tourist' | 'first_booking';
};

// ---- REWARDS CONFIGURATION ----
// The draft table from the Overview doc, held as data so it can be tuned here
// rather than living in the code. The doc is explicit that these numbers are a
// first pass and want modelling against the roughly 30% platform margin before
// anyone relies on them.
export type RewardsConfig = {
  tiers: { tier: RewardTier; label: string; threshold: number; benefits: string[] }[];
  earning: { id: string; activity: string; points: number | null; note?: string }[];
};

// ---- PLATFORM SETTINGS ----
export type PlatformSettings = {
  commissionRate: number; // 0.3 = the 30% the Overview doc works from
  kycProvider: 'stripe_identity' | 'persona' | 'veriff' | 'didit';
  kycCostPerCheck: number;
  // Whether a passport check and a licence check bill as one session or two. The
  // Overview doc flags this as the thing that doubles, or does not double, the
  // per-customer cost — so it is a setting to be confirmed, not an assumption
  // buried in a spreadsheet.
  kycBundledDocuments: boolean;
  payoutEntity: 'us_llc' | 'french_side' | 'dutch_side';
  featureFlags: { id: string; label: string; description: string; enabled: boolean }[];
};

// ---- THE DASHBOARD ----
// The headline figures, worked out once so that the dashboard, the payments
// screens and the analytics page cannot quietly disagree with each other.
//
// READ THIS BEFORE ADDING A FIELD: deposits are not revenue and never appear in
// any total here. A deposit is the customer's money, held against damage and
// given back; counting it as GMV would overstate the size of the platform and,
// worse, overstate what it is owed. Two sentences hold across this whole panel —
//
//   gmv === paidOutToProviders + commissionRetained
//   depositsCurrentlyHeld is never added to any of those three
//
// — and tests/rules enforces both of them.
export type PlatformSummary = {
  totalUsers: number;
  usersVerified: number;
  usersPending: number;
  totalProviders: number;
  providersVerified: number;
  providersPending: number;
  gmv: number;
  paidOutToProviders: number;
  commissionRetained: number;
  bookingsInRange: number;
  // Held right now across all live rentals. Shown on its own, deliberately apart
  // from the revenue figures, and labelled as not being ours.
  depositsCurrentlyHeld: number;
  // The three action queues, which also feed the sidebar badge.
  verificationsWaiting: number;
  disputesOpen: number;
  refundsPending: number;
  // For the trend chart on the dashboard.
  bookingTrend: { label: string; bookings: number; gmv: number }[];
};

// One row in the Action Queue — the three separate queues flattened into a
// single list, so a staff member can work top to bottom rather than checking
// three screens in turn and forgetting the third.
export type QueueItem = {
  id: string;
  kind: 'verification' | 'dispute' | 'refund';
  title: string;
  detail: string;
  waitingSince: string;
  href: string;
  // How long it has been sitting there. Sorts the oldest to the top.
  urgency: 'normal' | 'aging' | 'overdue';
};

// ---- THE PLAYBOOK ----
// What the platform is built out of, held as data so the page stays a list to
// maintain rather than becoming a wall of hand-written mark-up.
export type PlaybookService = {
  name: string;
  category:
    | 'payments'
    | 'identity'
    | 'messaging'
    | 'ai'
    // Ours rather than somebody else's — the API offered to rental businesses.
    | 'integration'
    | 'hosting'
    | 'storage'
    | 'mobile';
  purpose: string;
  usedIn: string;
  cost: string;
};

export type PlaybookRepo = {
  name: string;
  purpose: string;
  stack: string;
};

// The date range every money screen filters by. Defined once so the dashboard,
// the analytics page and the ledgers all offer the same choices.
export type DateRangeKey = 'month' | 'quarter' | 'year' | 'all';
