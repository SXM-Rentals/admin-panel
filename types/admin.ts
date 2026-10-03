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
  RespondsIn,
  RewardTier,
  User,
  VehicleClass,
  VerificationStatus,
} from './index';

// ---- STAFF ----
// FOUR LEVELS, IN THIS ORDER, highest first. The order is the hierarchy, so it is
// not cosmetic — see lib/tiers.ts, which mirrors the server's rules about who may
// act on whom. There used to be one flat level, and the trade behind that was
// accountability rather than restriction: everybody could do anything, and
// everything anybody did was on the record with a reason. Tiers add restriction
// on top of that record; the audit log is unchanged for every tier.
export type AdminTier = 'godfather' | 'owner' | 'administrator' | 'viewer';

export type AdminStaff = {
  id: string;
  name: string;
  email: string;
  // Shown beside their name in the top bar and against their entries in the
  // audit log, so "who did this" is a face as well as a name.
  avatarInitials: string;
  // What this account may do. OPTIONAL BECAUSE A SERVER FROM BEFORE TIERS DOES
  // NOT SAY — and there every account could do everything, so the panel treats
  // "not said" as "no restriction it knows about" and lets the server refuse.
  // Guessing the other way would grey out controls that work.
  tier?: AdminTier;
};

// ---- A STAFF ACCOUNT, AS THE STAFF SCREEN SEES IT ----
// Everything needed to look after somebody's access, and nothing that could be
// used to get in: no password, no authenticator secret, no lockout counter.
export type StaffAccount = AdminStaff & {
  // Whether they have set up an authenticator app. Until they have, they can
  // sign in only far enough to do so.
  mfaEnrolled: boolean;
  // True for an account created or reset from this panel, until its owner sets
  // a password of their own. The temporary one is somebody else's knowledge.
  mustChangePassword: boolean;
  // Left out or empty until they have signed in once. The server leaves most
  // optional fields out of its answer rather than sending them as nothing, so
  // both are accepted here and neither is relied on.
  lastSignInAt?: string | null;
  createdAt: string;
  // Set when their access has been taken away. The account is kept so the
  // audit log still has somebody to point at.
  disabledAt?: string | null;
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
  | 'dispute_resolved'
  // Staff accounts, managed from the Staff screen.
  | 'staff_created'
  | 'staff_reset'
  | 'staff_disabled'
  | 'staff_enabled'
  | 'password_changed';

export type AuditEntry = {
  id: string;
  at: string; // ISO timestamp
  staffId: string;
  staffName: string;
  action: AuditAction;
  // What was acted on, in words: "Customer · Aria Duncan", "Vehicle · SXM-V-118".
  subjectType: 'customer' | 'provider' | 'vehicle' | 'booking' | 'payment' | 'platform' | 'staff';
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
  // The document's own id. A review is sent against this, not against the
  // vehicle and the kind of document — a car can have had two insurance
  // certificates, and "the insurance one" does not say which was read.
  id: string;
  kind: VehicleDocumentKind;
  status: 'pending' | 'approved' | 'rejected';
  fileName: string;
  uploadedAt: string;
  // A plain date, "2027-03-31", where the document has one.
  expiresAt?: string;
  // Filled in only when rejected, and always required at that point.
  reason?: string;
  // When it was read. The server does not say who by — that is in the audit log.
  reviewedAt?: string;
};

// The provider record as STAFF see it — the public profile, plus everything a
// customer never sees.
// ---- THE DETAILS STAFF MAY CORRECT ON A BUSINESS ----
// Exactly what the server accepts, and in the same words. Not here, on purpose:
// the verification status and the rating. Verification has its own decision and
// its own audit entry, and two ways to set the same thing is how an audit log
// stops being worth reading; a rating is the sum of what customers said, and a
// staff-editable rating is not a rating.
export type ProviderField =
  | 'businessName'
  | 'town'
  | 'description'
  | 'phone'
  | 'legalName'
  | 'contactEmail'
  | 'website'
  | 'registrationNumber'
  | 'ownerName'
  | 'ownerPhone'
  | 'side'
  | 'respondsIn'
  | 'deliversVehicles'
  | 'airportPickup';

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
  // NOT HERE, ON PURPOSE: the business's own paperwork and its Stripe payout
  // account. The panel used to show both. The server does not send either — it
  // has no table for a business's documents, and while it does keep the payout
  // account's status, it does not hand that to the admin panel yet. Both are
  // backend jobs; until then the screens say so rather than showing something
  // made up.
  // WHEN THE BUSINESS CLOSED, or null while it is open. Always sent, either way.
  //
  // A business can close itself from its own account, and before the server sent
  // this the panel had no way of knowing: one that closed last week appeared as
  // an ordinary open business, badge intact, with a fleet of cars all suspended
  // and no reason anywhere for why. Somebody would have rung them about it.
  //
  // Closed, not deleted: the row stays so past bookings and payouts still point
  // at something, and a closed business stays in the list the way a closed
  // customer account does.
  closedAt: string | null;
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

// The vehicle record as STAFF see it: the listing and who owns it.
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
};

// ONE vehicle, opened on its own, also carries its paperwork. The list of all
// vehicles does not — sending every document for every car, just to draw a list,
// would be most of the answer and none of the point.
export type AdminVehicleDetail = AdminVehicle & {
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
  // Empty for a deposit that has never been taken — there is no moment of
  // authorising to point at yet.
  authorizedAt: string | null;
  releasedAt?: string;
  claimedAt?: string;
  // Required whenever a deposit is claimed rather than returned. Keeping a
  // deposit without a written reason is the single most disputable thing this
  // platform can do, so the shape makes the reason impossible to forget.
  claimReason?: string;
  // How much of it was kept. Keeping part of a deposit is allowed — $240
  // against a kerbed wheel, the rest returned — so the amount held and the
  // amount kept are two different numbers.
  claimedAmount?: number;
};

// ---- PAYOUTS ----
// Money sent on to a rental business for a period of trading: what their
// bookings took, less SXM Rentals' commission. Read only — the panel shows
// them, Stripe sends them.
export type AdminPayout = {
  id: string;
  reference: string;
  providerName: string;
  // What the business actually received: grossAmount less commission.
  amount: number;
  grossAmount: number;
  commission: number;
  bookingCount: number;
  // Plain dates, "2026-09-01".
  periodStart: string;
  periodEnd: string;
  status: 'paid' | 'pending' | 'processing';
  paidOn?: string;
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

// ---- PLATFORM SETTINGS: THE TWO CHOICES THE SERVER KNOWS ABOUT ----
// The server keeps platform settings but does not yet let the panel read or
// change them. These two lists are its own — the identity-check companies and
// the legal entities Stripe can pay out from, exactly as the server spells them
// — so the wording for them in lib/labels.ts is ready for when it does.
export type KycProvider = 'stripe_identity' | 'persona' | 'veriff' | 'didit';
export type PayoutEntity = 'us_llc' | 'french_side' | 'dutch_side';

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
  // THE NAME SAYS "IN RANGE", AND IT IS ALWAYS ALL-TIME. The server sends this
  // field by this name but does not yet take a range: every figure in this
  // summary covers the whole of SXM Rentals to date. The name is the server's,
  // so it is kept; the dashboard labels it truthfully instead.
  bookingsInRange: number;
  // Held right now across all live rentals. Shown on its own, deliberately apart
  // from the revenue figures, and labelled as not being ours.
  depositsCurrentlyHeld: number;
  // The three action queues, which also feed the sidebar badge.
  verificationsWaiting: number;
  disputesOpen: number;
  refundsPending: number;
  // For the trend chart on the dashboard: the last six months.
  bookingTrend: { label: string; bookings: number; gmv: number }[];
};

// One bar on the analytics charts: a day, a week, a month, a quarter or a year,
// whichever the server chose for the span asked about. See lib/analytics.ts.
export type SeriesPoint = {
  label: string;
  gmv: number;
  bookings: number;
  newUsers: number;
};

// One row in the Action Queue — the three separate queues flattened into a
// single list, so a staff member can work top to bottom rather than checking
// three screens in turn and forgetting the third.
export type QueueItem = {
  id: string;
  // FOUR KINDS, AND THE SCREEN MUST COPE WITH A FIFTH. The server decides what
  // goes in the queue, and it has added a kind before now — a fleet request —
  // which the queue screen then drew with an undefined icon. A list of kinds in
  // the panel is a list the server can get ahead of, so the screen falls back
  // rather than trusting this to be complete.
  kind: 'verification' | 'dispute' | 'refund' | 'fleet_request';
  title: string;
  detail: string;
  waitingSince: string;
  href: string;
  // How long it has been sitting there. Sorts the oldest to the top.
  urgency: 'normal' | 'aging' | 'overdue';
};

// ---- A BUSINESS ASKING US TO SET ITS FLEET UP ----
// Not every rental business on this island keeps its cars in a spreadsheet, let
// alone in software. One can send us whatever it has — a spreadsheet, a photo of
// a ledger, a list in an email — and ask us to put its fleet on SXM Rentals for
// it. This is that request, as the person doing the work sees it.
export type FleetRequest = {
  id: string;
  providerId: string;
  businessName: string;
  // How many vehicles they say they have, which is what the work is sized on.
  fleetSize: number;
  // What they sent, in their words: a spreadsheet, photos, a booking system.
  recordFormat: string;
  // THEIR OWN CONTACT DETAIL FOR THIS JOB, given for staff to use. Treat it the
  // way the owner's personal number on a business is treated.
  contact: string;
  notes: string;
  status: 'waiting' | 'done';
  createdAt: string;
  handledAt: string | null;
  // Listed by name here. The files themselves are handed over one at a time, as
  // downloads, and never shown inside the panel — see FLEET_FILE_HREF.
  files: FleetRequestFile[];
};

export type FleetRequestFile = {
  id: string;
  fileName: string;
  contentType: string;
  // In bytes, as the server counted them.
  size: number;
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
