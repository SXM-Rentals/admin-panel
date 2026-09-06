// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: This is the single doorway between the panel's screens
// and its information. Right now every function below hands back MOCK (made-up)
// data from the lib/mock folder — there is no server, no database, and nothing
// being changed for real.
//
// WHY IT MATTERS: because all the screens ask this file for data instead of
// reaching for the mock files directly, connecting the real backend later means
// changing only this one file. No screen has to be rewritten. That rule is worth
// defending — if one screen imports from lib/mock, the swap stops being a
// one-file job and becomes a hunt.
//
// Each function is marked with a TODO naming the real address it will eventually
// call on the SXM Rentals backend. The same list appears on the Playbook screen.

import type {
  AdminBooking,
  AdminProvider,
  AdminUser,
  AdminVehicle,
  AuditEntry,
  DateRangeKey,
  DepositLedgerEntry,
  DisputeCase,
  LedgerEntry,
  PlatformSettings,
  PlatformSummary,
  PromoCode,
  QueueItem,
  RefundRequest,
  RewardsConfig,
} from '@/types';

import { mockUsers, findUser } from './mock/users';
import { mockProviders, findProvider } from './mock/providers';
import { mockVehicles, findVehicle, vehiclesAwaitingReview } from './mock/vehicles';
import { mockBookings, findBooking, findBookingByRef, messagesFor } from './mock/bookings';
import { mockLedger, mockRefunds, mockDeposits, findRefund } from './mock/payments';
import { mockDisputes, findDispute } from './mock/disputes';
import { mockPromotions } from './mock/promotions';
import { mockRewardsConfig } from './mock/rewards';
import { mockSettings } from './mock/settings';
import { allAuditEntries } from './mock/audit';
import { buildSummary, buildQueue, buildMonthlySeries, buildSeries } from './mock/summary';
import { mockStaff } from './mock/staff';

// A short made-up wait, so loading skeletons behave the way they will once there
// is a real server to wait for. Without this everything would appear instantly
// and we would never see those states during development — and then they would
// appear for the first time in front of a real user on a bad connection.
function fakeNetworkDelay<T>(value: T, ms = 280): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const apiClient = {
  // ---- THE DASHBOARD ----

  // MOCK. TODO: replace with GET /admin/summary?range=
  async getSummary(range: DateRangeKey = 'quarter'): Promise<PlatformSummary> {
    return fakeNetworkDelay(buildSummary(range));
  },

  // MOCK. TODO: replace with GET /admin/queue
  async getActionQueue(): Promise<QueueItem[]> {
    return fakeNetworkDelay(buildQueue());
  },

  // ---- CUSTOMERS ----

  // MOCK. TODO: replace with GET /admin/users
  async listUsers(): Promise<AdminUser[]> {
    return fakeNetworkDelay(mockUsers);
  },

  // MOCK. TODO: replace with GET /admin/users/:id
  async getUser(id: string): Promise<AdminUser | undefined> {
    return fakeNetworkDelay(findUser(id));
  },

  // MOCK. TODO: replace with PATCH /admin/users/:id/points
  // Nothing is saved. The panel updates what is on screen and writes an audit
  // entry, which is enough to build and check the flow end to end.
  async adjustUserPoints(id: string, newTotal: number): Promise<AdminUser | undefined> {
    const user = findUser(id);
    if (user) user.points = newTotal;
    return fakeNetworkDelay(user, 400);
  },

  // MOCK. TODO: replace with PATCH /admin/users/:id
  //
  // ONE FIELD AT A TIME, ON PURPOSE. An audit entry records a single field with a
  // before and an after. A screen that changed six things at once would either
  // write six entries nobody asked for, or one entry nobody can read.
  async updateUser(
    id: string,
    field: 'email' | 'phone' | 'firstName' | 'lastName' | 'accountType',
    value: string,
  ): Promise<AdminUser | undefined> {
    const user = findUser(id);
    if (user) {
      if (field === 'accountType') {
        user.accountType = value === 'local' ? 'local' : 'tourist';
        // Islander is a residency flag, so it cannot survive a move to Tourist.
        // Leaving it set would show somebody as a resident of an island they are
        // no longer registered on.
        if (user.accountType === 'tourist') user.isIslander = false;
      } else {
        (user as unknown as Record<string, string>)[field] = value;
      }
    }
    return fakeNetworkDelay(user, 400);
  },

  // Whether an account can be closed at all, and what is in the way if not.
  //
  // THIS IS A SAFETY RULE RATHER THAN A FORMALITY. Closing an account with a
  // rental still running, or a deposit still held, strands money that belongs to
  // somebody: the customer cannot be paid back and nobody can be chased. The
  // panel works that out and says which it is, rather than letting a member of
  // staff discover it afterwards.
  async canCloseUser(id: string): Promise<{ allowed: boolean; blockers: string[] }> {
    const user = findUser(id);
    const blockers: string[] = [];
    if (!user) return fakeNetworkDelay({ allowed: false, blockers: ['No such account'] }, 120);

    const theirs = mockBookings.filter((b) => b.customerId === id);
    const live = theirs.filter((b) => b.status === 'active' || b.status === 'upcoming');
    const held = theirs.filter((b) => b.depositStatus === 'held');

    if (live.length > 0) {
      blockers.push(
        live.length + ' booking' + (live.length === 1 ? '' : 's') + ' still running or due to start',
      );
    }
    if (held.length > 0) {
      blockers.push(
        held.length + ' security deposit' + (held.length === 1 ? '' : 's') + ' still being held',
      );
    }

    return fakeNetworkDelay({ allowed: blockers.length === 0, blockers }, 120);
  },

  // MOCK. TODO: replace with DELETE /admin/users/:id
  //
  // The record is MARKED closed rather than removed. The audit log points at it,
  // and an entry reading "closed the account of Noelia Vlaun" is unreadable if
  // there is no Noelia Vlaun left to look at.
  async closeUser(id: string): Promise<AdminUser | undefined> {
    const user = findUser(id);
    if (user) user.deletedAt = new Date().toISOString();
    return fakeNetworkDelay(user, 400);
  },

  // ---- RENTAL BUSINESSES ----

  // MOCK. TODO: replace with GET /admin/providers
  async listProviders(): Promise<AdminProvider[]> {
    return fakeNetworkDelay(mockProviders);
  },

  // MOCK. TODO: replace with GET /admin/providers/:id
  async getProvider(id: string): Promise<AdminProvider | undefined> {
    return fakeNetworkDelay(findProvider(id));
  },

  // MOCK. TODO: replace with PATCH /admin/providers/:id
  async updateProvider(
    id: string,
    field:
      | 'businessName'
      | 'legalName'
      | 'contactEmail'
      | 'phone'
      | 'website'
      | 'ownerName'
      | 'ownerPhone',
    value: string,
  ): Promise<AdminProvider | undefined> {
    const provider = findProvider(id);
    if (provider) (provider as unknown as Record<string, string>)[field] = value;
    return fakeNetworkDelay(provider, 400);
  },

  // MOCK. TODO: replace with POST /admin/providers/:id/documents/:kind
  //
  // THE BUSINESS STATUS FOLLOWS FROM ITS DOCUMENTS, the same way a vehicle
  // listing does. That was missing: approving both documents changed the
  // documents and left the business sitting at Pending for ever, so working the
  // verification queue never actually emptied it.
  async reviewProviderDocument(
    providerId: string,
    kind: string,
    decision: 'approved' | 'rejected',
    reason: string,
    reviewer: string,
  ): Promise<AdminProvider | undefined> {
    const provider = findProvider(providerId);
    const doc = provider ? provider.documents.find((d) => d.kind === kind) : undefined;
    if (provider && doc) {
      doc.status = decision;
      doc.reason = decision === 'rejected' ? reason : undefined;
      doc.reviewedBy = reviewer;
      doc.reviewedAt = new Date().toISOString();

      const anyPending = provider.documents.some((d) => d.status === 'pending');
      const anyRejected = provider.documents.some((d) => d.status === 'rejected');
      provider.verificationStatus = anyRejected ? 'rejected' : anyPending ? 'pending' : 'approved';
      // The public SXM Verified badge is the same decision, so it moves with it.
      provider.isVerified = provider.verificationStatus === 'approved';
    }
    return fakeNetworkDelay(provider, 400);
  },

  // Same rule as a customer account, and for the same reason — plus the vehicles,
  // which would otherwise be left listed with nobody behind them.
  async canCloseProvider(id: string): Promise<{ allowed: boolean; blockers: string[] }> {
    const provider = findProvider(id);
    const blockers: string[] = [];
    if (!provider) return fakeNetworkDelay({ allowed: false, blockers: ['No such business'] }, 120);

    const theirs = mockBookings.filter((b) => b.providerId === id);
    const live = theirs.filter((b) => b.status === 'active' || b.status === 'upcoming');
    const held = theirs.filter((b) => b.depositStatus === 'held');
    const listed = mockVehicles.filter((v) => v.providerId === id && v.listingStatus === 'live');

    if (live.length > 0) {
      blockers.push(
        live.length + ' booking' + (live.length === 1 ? '' : 's') + ' still running or due to start',
      );
    }
    if (held.length > 0) {
      blockers.push(
        held.length + ' security deposit' + (held.length === 1 ? '' : 's') + ' still being held',
      );
    }
    if (listed.length > 0) {
      blockers.push(
        listed.length + ' vehicle' + (listed.length === 1 ? '' : 's') + ' still listed and bookable',
      );
    }

    return fakeNetworkDelay({ allowed: blockers.length === 0, blockers }, 120);
  },

  // MOCK. TODO: replace with DELETE /admin/providers/:id
  async closeProvider(id: string): Promise<AdminProvider | undefined> {
    const provider = findProvider(id);
    if (provider) {
      provider.verificationStatus = 'rejected';
      provider.isVerified = false;
    }
    return fakeNetworkDelay(provider, 400);
  },

  // ---- VEHICLES ----

  // MOCK. TODO: replace with GET /admin/vehicles
  async listVehicles(): Promise<AdminVehicle[]> {
    return fakeNetworkDelay(mockVehicles);
  },

  // MOCK. TODO: replace with GET /admin/vehicles/:id
  async getVehicle(id: string): Promise<AdminVehicle | undefined> {
    return fakeNetworkDelay(findVehicle(id));
  },

  // MOCK. TODO: replace with GET /admin/vehicles?documents=pending
  async listVehiclesAwaitingReview(): Promise<AdminVehicle[]> {
    return fakeNetworkDelay(vehiclesAwaitingReview());
  },

  // MOCK. TODO: replace with POST /admin/vehicles/:id/documents/:kind
  // The reason is not optional in the real call either — a rejected document
  // without one is unanswerable when the provider rings up about it.
  async reviewVehicleDocument(
    vehicleId: string,
    kind: string,
    decision: 'approved' | 'rejected',
    reason: string,
    reviewer: string,
  ): Promise<AdminVehicle | undefined> {
    const vehicle = findVehicle(vehicleId);
    const doc = vehicle?.documents.find((d) => d.kind === kind);
    if (vehicle && doc) {
      doc.status = decision;
      doc.reason = decision === 'rejected' ? reason : undefined;
      doc.reviewedBy = reviewer;
      doc.reviewedAt = new Date().toISOString();
      // A vehicle goes live once nothing is pending and nothing was rejected.
      const anyPending = vehicle.documents.some((d) => d.status === 'pending');
      const anyRejected = vehicle.documents.some((d) => d.status === 'rejected');
      vehicle.listingStatus = anyRejected ? 'suspended' : anyPending ? 'pending_review' : 'live';
    }
    return fakeNetworkDelay(vehicle, 400);
  },

  // ---- BOOKINGS ----

  // MOCK. TODO: replace with GET /admin/bookings
  async listBookings(): Promise<AdminBooking[]> {
    return fakeNetworkDelay(mockBookings);
  },

  // MOCK. TODO: replace with GET /admin/bookings/:id
  async getBooking(id: string): Promise<AdminBooking | undefined> {
    return fakeNetworkDelay(findBooking(id));
  },

  // MOCK. TODO: replace with GET /admin/bookings?reference=
  // A dispute knows the booking REFERENCE rather than its id, and "open the
  // booking this is about" is the first thing anybody investigating one wants.
  async getBookingByRef(reference: string): Promise<AdminBooking | undefined> {
    return fakeNetworkDelay(findBookingByRef(reference), 120);
  },

  // MOCK. TODO: replace with GET /admin/bookings/:id/messages
  async getBookingMessages(id: string) {
    const booking = findBooking(id);
    return fakeNetworkDelay(booking ? messagesFor(booking) : []);
  },

  // ---- MONEY ----

  // MOCK. TODO: replace with GET /admin/payments
  async getLedger(): Promise<LedgerEntry[]> {
    return fakeNetworkDelay(mockLedger);
  },

  // MOCK. TODO: replace with GET /admin/refunds
  async listRefunds(): Promise<RefundRequest[]> {
    return fakeNetworkDelay(mockRefunds);
  },

  // MOCK. TODO: replace with POST /admin/refunds/:id
  async decideRefund(
    id: string,
    decision: 'approved' | 'denied',
    reason: string,
    decidedBy: string,
  ): Promise<RefundRequest | undefined> {
    const refund = findRefund(id);
    if (refund) {
      refund.status = decision;
      refund.decisionReason = reason;
      refund.decidedBy = decidedBy;
      refund.decidedAt = new Date().toISOString();
    }
    return fakeNetworkDelay(refund, 400);
  },

  // MOCK. TODO: replace with GET /admin/deposits
  // Deliberately a separate call from getLedger above. A deposit is not a
  // payment and the two lists must never be merged — see the note at the top of
  // lib/mock/payments.ts.
  async getDeposits(): Promise<DepositLedgerEntry[]> {
    return fakeNetworkDelay(mockDeposits);
  },

  // MOCK. TODO: replace with POST /admin/deposits/:id/claim
  async claimDeposit(id: string, reason: string): Promise<DepositLedgerEntry | undefined> {
    const deposit = mockDeposits.find((d) => d.id === id);
    if (deposit) {
      deposit.status = 'claimed';
      deposit.claimReason = reason;
      deposit.claimedAt = new Date().toISOString();
    }
    return fakeNetworkDelay(deposit, 400);
  },

  // MOCK. TODO: replace with POST /admin/deposits/:id/release
  async releaseDeposit(id: string): Promise<DepositLedgerEntry | undefined> {
    const deposit = mockDeposits.find((d) => d.id === id);
    if (deposit) {
      deposit.status = 'released';
      deposit.releasedAt = new Date().toISOString();
    }
    return fakeNetworkDelay(deposit, 400);
  },

  // ---- DISPUTES ----

  // MOCK. TODO: replace with GET /admin/disputes
  async listDisputes(): Promise<DisputeCase[]> {
    return fakeNetworkDelay(mockDisputes);
  },

  // MOCK. TODO: replace with GET /admin/disputes/:id
  async getDispute(id: string): Promise<DisputeCase | undefined> {
    return fakeNetworkDelay(findDispute(id));
  },

  // MOCK. TODO: replace with POST /admin/disputes/:id/assign
  async assignDispute(id: string, staffId: string): Promise<DisputeCase | undefined> {
    const dispute = findDispute(id);
    const staff = mockStaff.find((s) => s.id === staffId);
    if (dispute && staff) {
      dispute.assignedToId = staff.id;
      dispute.assignedToName = staff.name;
      if (dispute.status === 'open') dispute.status = 'investigating';
    }
    return fakeNetworkDelay(dispute, 400);
  },

  // MOCK. TODO: replace with POST /admin/disputes/:id/resolve
  async resolveDispute(id: string, notes: string): Promise<DisputeCase | undefined> {
    const dispute = findDispute(id);
    if (dispute) {
      dispute.status = 'resolved';
      dispute.resolutionNotes = notes;
      dispute.resolvedAt = new Date().toISOString();
    }
    return fakeNetworkDelay(dispute, 400);
  },

  // ---- PROMOTIONS ----

  // MOCK. TODO: replace with GET /admin/promotions
  async listPromotions(): Promise<PromoCode[]> {
    return fakeNetworkDelay(mockPromotions);
  },

  // MOCK. TODO: replace with POST /admin/promotions
  async createPromotion(draft: Omit<PromoCode, 'id' | 'usedCount'>): Promise<PromoCode> {
    const created: PromoCode = { ...draft, id: 'pr-' + Date.now(), usedCount: 0 };
    mockPromotions.unshift(created);
    return fakeNetworkDelay(created, 400);
  },

  // MOCK. TODO: replace with PATCH /admin/promotions/:id
  async setPromotionStatus(id: string, status: PromoCode['status']): Promise<PromoCode | undefined> {
    const promo = mockPromotions.find((p) => p.id === id);
    if (promo) promo.status = status;
    return fakeNetworkDelay(promo, 300);
  },

  // ---- REWARDS ----

  // MOCK. TODO: replace with GET /admin/rewards
  async getRewardsConfig(): Promise<RewardsConfig> {
    return fakeNetworkDelay(mockRewardsConfig);
  },

  // MOCK. TODO: replace with PUT /admin/rewards
  async saveRewardsConfig(config: RewardsConfig): Promise<RewardsConfig> {
    mockRewardsConfig.tiers = config.tiers;
    mockRewardsConfig.earning = config.earning;
    return fakeNetworkDelay(mockRewardsConfig, 400);
  },

  // ---- ANALYTICS ----

  // MOCK. TODO: replace with GET /admin/analytics?months=
  async getMonthlySeries(months: number) {
    return fakeNetworkDelay(buildMonthlySeries(months));
  },

  // MOCK. TODO: replace with GET /admin/analytics?from=&to=
  // Any two dates. The bucket size (day, week or month) is worked out from the
  // span — see the note in lib/mock/summary.ts.
  async getSeries(startISO: string, endISO: string) {
    return fakeNetworkDelay(buildSeries(startISO, endISO));
  },

  // ---- PLATFORM SETTINGS ----

  // MOCK. TODO: replace with GET /admin/settings
  async getSettings(): Promise<PlatformSettings> {
    return fakeNetworkDelay(mockSettings);
  },

  // MOCK. TODO: replace with PUT /admin/settings
  async saveSettings(next: Partial<PlatformSettings>): Promise<PlatformSettings> {
    Object.assign(mockSettings, next);
    return fakeNetworkDelay(mockSettings, 400);
  },

  // ---- STAFF ----

  // MOCK. TODO: replace with GET /admin/staff
  // Used by the dispute assignment picker and the audit log filter.
  async listStaff() {
    return fakeNetworkDelay(mockStaff, 120);
  },

  // ---- THE AUDIT LOG ----

  // MOCK. TODO: replace with GET /admin/audit
  async getAuditLog(): Promise<AuditEntry[]> {
    return fakeNetworkDelay(allAuditEntries());
  },
};
