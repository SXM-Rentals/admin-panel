// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: This is the single doorway between the panel's screens
// and SXM Rentals' records. Every screen asks this file for what it needs, and
// this file asks the SXM Rentals server. Nothing here is made up any more: what
// a screen shows is what the server holds.
//
// WHY IT MATTERS THAT IT IS ONE FILE: because every screen asks here rather
// than reaching for the server itself, the server's addresses, their quirks and
// any difference between what the server sends and what a screen draws are all
// dealt with in one place. That rule is worth defending — a screen that talked
// to the server directly would be the one place a change to the server did not
// get noticed.
//
// WHAT IS NOT HERE, ON PURPOSE. The server does not yet have promotions,
// rewards settings, platform settings, booking conversations, or a way to edit
// or close a rental business. There is no function for any of them, so no
// screen can appear to save something that goes nowhere. Those screens say
// plainly that they are not connected yet.
//
// THREE THINGS THAT HOLD FOR EVERY FUNCTION BELOW:
//
//   - Every change sends the reason typed into the reason dialog. The server
//     refuses a change without one and writes the audit entry itself.
//
//   - Asking for one record that does not exist gives back `undefined`, so a
//     screen can say "not found". Failing to FIND OUT gives an error instead —
//     a server that is asleep has not said the customer does not exist, and a
//     screen must not claim it has.
//
//   - Lists ask for the most the server will send in one go: two hundred. The
//     screens page through them themselves. Past two hundred of anything, the
//     lists will need to ask page by page instead — a job for when there are
//     that many.

import { api } from '@/lib/api/http';
import { ApiError } from '@/lib/api/errors';
import type {
  AdminBooking,
  AdminTier,
  FleetRequest,
  AdminPayout,
  AdminProvider,
  AdminStaff,
  AdminUser,
  AdminVehicle,
  AdminVehicleDetail,
  AuditEntry,
  DepositLedgerEntry,
  DisputeCase,
  LedgerEntry,
  PlatformSummary,
  ProviderField,
  QueueItem,
  RefundRequest,
  SeriesPoint,
  StaffAccount,
} from '@/types';

// The most the server sends in one go.
const LIST_LIMIT = 200;

// ---- WHERE ONE OF A BUSINESS'S OWN FILES COMES FROM ----
// A link rather than a fetch, on purpose: the browser downloads it, with the
// session cookie it already has, and nothing lands in the panel's memory. The
// server sends it as an attachment and never inline, so a spreadsheet somebody
// sent us can never be opened as a page inside the panel.
//
// It is here, beside the calls, because this file is the one place that knows the
// shape of the server's addresses.
export function fleetFileHref(requestId: string, fileId: string): string {
  return `/api/v1/admin/fleet-requests/${encodeURIComponent(requestId)}/files/${encodeURIComponent(fileId)}`;
}

// ---- "NOT FOUND" AS AN ANSWER, NOT A FAULT ----
// Turns the server's "there is no such record" into `undefined`, and lets
// every other failure through. See the note at the top of this file.
async function orNotFound<T>(request: Promise<T>): Promise<T | undefined> {
  try {
    return await request;
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) return undefined;
    throw caught;
  }
}

// The fields of a customer the server lets staff change, one at a time.
export type EditableUserField = 'firstName' | 'lastName' | 'email' | 'phone' | 'accountType' | 'isIslander';

export const apiClient = {
  // ---- THE DASHBOARD ----

  // The headline figures. ALWAYS ALL-TIME: the server does not yet take a date
  // range for these, so the dashboard offers no range to choose. The figures
  // hold one rule the dashboard relies on — gross equals what businesses are
  // paid plus what SXM Rentals keeps — and deposits held are reported apart
  // from all three.
  async getSummary(): Promise<PlatformSummary> {
    const summary = await api.get<PlatformSummary>('/admin/summary');
    return {
      ...summary,
      // The server labels the trend months "2026-09". Everywhere else in the
      // panel a month reads "Sep 26", so it is put the same way here.
      bookingTrend: summary.bookingTrend.map((point) => ({ ...point, label: monthLabel(point.label) })),
    };
  },

  // Everything waiting on somebody, oldest first.
  async getActionQueue(): Promise<QueueItem[]> {
    return api.get<QueueItem[]>('/admin/queue');
  },

  // ---- CUSTOMERS ----

  // The server searches by name and email. The customer screen filters the
  // same list again as somebody types, for anything else.
  async listUsers(search?: string): Promise<AdminUser[]> {
    return api.get<AdminUser[]>('/admin/users', { query: { search, limit: LIST_LIMIT } });
  },

  async getUser(id: string): Promise<AdminUser | undefined> {
    return orNotFound(api.get<AdminUser>(`/admin/users/${encodeURIComponent(id)}`));
  },

  // ONE FIELD AT A TIME, ON PURPOSE. An audit entry records a single field with a
  // before and an after. A screen that changed six things at once would either
  // write six entries nobody asked for, or one entry nobody can read.
  async updateUser(
    id: string,
    field: EditableUserField,
    value: string | boolean,
    reason: string,
  ): Promise<AdminUser> {
    return api.patch<AdminUser>(`/admin/users/${encodeURIComponent(id)}`, {
      body: { field, value, reason },
    });
  },

  // THE SERVER TAKES THE CHANGE, NOT THE NEW TOTAL. Points are a ledger — a list
  // of additions and deductions — rather than a number overwritten in place, so
  // "make it 1,740" is sent as "add 500". The subtraction happens here, in one
  // place, so no screen can get it the wrong way round.
  async adjustUserPoints(
    id: string,
    currentPoints: number,
    newTotal: number,
    reason: string,
  ): Promise<AdminUser> {
    return api.patch<AdminUser>(`/admin/users/${encodeURIComponent(id)}/points`, {
      body: { points: newTotal - currentPoints, reason },
    });
  },

  // The record is MARKED closed rather than removed: the audit log points at it,
  // and an entry reading "closed the account of Noelia Vlaun" is unreadable if
  // there is no Noelia Vlaun left to look at.
  //
  // THE SERVER DECIDES WHETHER IT CAN BE CLOSED. It refuses while a rental is
  // running or a deposit is held, and says which — "This account has a rental
  // that is active (SXM-4228)". That refusal is the check; the panel no longer
  // tries to predict it.
  async closeUser(id: string, reason: string): Promise<void> {
    await api.del<void>(`/admin/users/${encodeURIComponent(id)}`, { body: { reason } });
  },

  // ---- RENTAL BUSINESSES ----

  async listProviders(): Promise<AdminProvider[]> {
    return api.get<AdminProvider[]>('/admin/providers', { query: { limit: LIST_LIMIT } });
  },

  async getProvider(id: string): Promise<AdminProvider | undefined> {
    return orNotFound(api.get<AdminProvider>(`/admin/providers/${encodeURIComponent(id)}`));
  },

  // The "SXM Verified" decision, made once for the whole business. There is no
  // document-by-document review of a business on the server: this is the one
  // decision, and it is what the public badge follows.
  async decideProviderVerification(id: string, approve: boolean, reason: string): Promise<AdminProvider> {
    return api.post<AdminProvider>(`/admin/providers/${encodeURIComponent(id)}/verification`, {
      body: { approve, reason },
    });
  },

  // ---- CORRECTING A BUSINESS'S DETAILS ----
  // One field at a time, with a reason, exactly like a customer's record. The
  // server types each field separately — `side` and `respondsIn` are codes,
  // delivery and airport pickup are yes or no — so this takes the value as it
  // will be sent rather than as text.
  //
  // A business's details are its own to change from its own account. This is for
  // the narrow job of fixing something it cannot or will not fix itself: a legal
  // name misspelled on a payout, an email that bounces.
  async updateProviderField(
    id: string,
    field: ProviderField,
    value: string | boolean,
    reason: string,
  ): Promise<AdminProvider> {
    return api.patch<AdminProvider>(`/admin/providers/${encodeURIComponent(id)}`, {
      body: { field, value, reason },
    });
  },

  // ---- CLOSING A BUSINESS, AND OPENING IT AGAIN ----
  // Both ask for the authenticator code as well as a reason, as the server does:
  // this takes a whole fleet off the site and a business's page down, so a
  // session left open on a desk is not enough on its own.
  //
  // The server refuses while money is in the air — a rental running, a deposit
  // held, a payout on its way — and names what is in the way. Those sentences
  // reach the person unchanged.
  async closeProvider(id: string, reason: string, code: string): Promise<AdminProvider> {
    return api.post<AdminProvider>(`/admin/providers/${encodeURIComponent(id)}/close`, {
      body: { reason, code },
    });
  },

  // NOTE WHAT THIS DOES NOT DO: the cars stay suspended. The business may trade
  // again, and each car goes back on the site as its own decision. The screen
  // says so before anybody presses the button.
  async reopenProvider(id: string, reason: string, code: string): Promise<AdminProvider> {
    return api.post<AdminProvider>(`/admin/providers/${encodeURIComponent(id)}/reopen`, {
      body: { reason, code },
    });
  },

  // ---- VEHICLES ----

  async listVehicles(): Promise<AdminVehicle[]> {
    return api.get<AdminVehicle[]>('/admin/vehicles', { query: { limit: LIST_LIMIT } });
  },

  // One vehicle, with its paperwork. The list above does not carry documents.
  async getVehicle(id: string): Promise<AdminVehicleDetail | undefined> {
    return orNotFound(api.get<AdminVehicleDetail>(`/admin/vehicles/${encodeURIComponent(id)}`));
  },

  // Whether customers can see and book it. A DIFFERENT DECISION FROM THE
  // PAPERWORK: approving every document does not put a car live on its own.
  // Somebody decides that, here, and gives a reason.
  async decideVehicleListing(id: string, approve: boolean, reason: string): Promise<AdminVehicleDetail> {
    return api.post<AdminVehicleDetail>(`/admin/vehicles/${encodeURIComponent(id)}/listing`, {
      body: { approve, reason },
    });
  },

  // Keyed by the document's own id rather than "the vehicle's insurance one":
  // a car can have had more than one insurance certificate.
  async reviewVehicleDocument(documentId: string, approve: boolean, reason: string): Promise<void> {
    await api.post<void>(`/admin/vehicles/documents/${encodeURIComponent(documentId)}/review`, {
      body: { approve, reason },
    });
  },

  // ---- BOOKINGS ----

  async listBookings(): Promise<AdminBooking[]> {
    return api.get<AdminBooking[]>('/admin/bookings', { query: { limit: LIST_LIMIT } });
  },

  async getBooking(id: string): Promise<AdminBooking | undefined> {
    return orNotFound(api.get<AdminBooking>(`/admin/bookings/${encodeURIComponent(id)}`));
  },

  // A dispute knows the booking REFERENCE rather than its id, and "open the
  // booking this is about" is the first thing anybody investigating one wants.
  // The server answers with a list of none or one.
  async getBookingByRef(reference: string): Promise<AdminBooking | undefined> {
    const found = await api.get<AdminBooking[]>('/admin/bookings', { query: { reference, limit: 1 } });
    return found[0];
  },

  // ---- MONEY ----

  // Charges, refunds, payouts and commission. Deposits are never in here — the
  // server has no such thing as a deposit line in the ledger, which is the
  // strongest possible version of "a deposit is not revenue".
  async getLedger(): Promise<LedgerEntry[]> {
    return api.get<LedgerEntry[]>('/admin/payments', { query: { limit: LIST_LIMIT } });
  },

  // Money sent on to rental businesses. Read only: Stripe sends it.
  async listPayouts(): Promise<AdminPayout[]> {
    return api.get<AdminPayout[]>('/admin/payouts', { query: { limit: LIST_LIMIT } });
  },

  async listRefunds(): Promise<RefundRequest[]> {
    return api.get<RefundRequest[]>('/admin/refunds');
  },

  // Approving sends the money back through Stripe. The server refuses if the
  // refund has already been decided, and cannot approve one at all until
  // Stripe is connected — both come back as a sentence the dialog shows.
  async decideRefund(id: string, approve: boolean, reason: string): Promise<void> {
    await api.post<void>(`/admin/refunds/${encodeURIComponent(id)}/decision`, {
      body: { approve, reason },
    });
  },

  // Deliberately separate from the ledger above. A deposit is not a payment and
  // the two lists must never be merged.
  async getDeposits(): Promise<DepositLedgerEntry[]> {
    return api.get<DepositLedgerEntry[]>('/admin/deposits');
  },

  async releaseDeposit(id: string, reason: string): Promise<void> {
    await api.post<void>(`/admin/deposits/${encodeURIComponent(id)}/release`, {
      body: { reason },
    });
  },

  // Keeping part or all of a deposit. The amount is in dollars, can be part of
  // what was held, and can never be more — the server refuses both "more than
  // was held" and a deposit that is no longer being held.
  async claimDeposit(id: string, amount: number, reason: string): Promise<void> {
    await api.post<void>(`/admin/deposits/${encodeURIComponent(id)}/claim`, {
      body: { amount, reason },
    });
  },

  // ---- DISPUTES ----

  async listDisputes(): Promise<DisputeCase[]> {
    return api.get<DisputeCase[]>('/admin/disputes');
  },

  async getDispute(id: string): Promise<DisputeCase | undefined> {
    return orNotFound(api.get<DisputeCase>(`/admin/disputes/${encodeURIComponent(id)}`));
  },

  // Assigning is a recorded change like any other: an unowned dispute is the
  // thing most likely to be forgotten, and who took it on — and why them — is
  // worth being able to look up.
  async assignDispute(id: string, staffId: string, reason: string): Promise<DisputeCase> {
    return api.post<DisputeCase>(`/admin/disputes/${encodeURIComponent(id)}/assign`, {
      body: { staffId, reason },
    });
  },

  // Two separate pieces of writing, on purpose. The NOTES are the outcome — what
  // was found and what was done, shown on the dispute for anybody who opens it.
  // The REASON is why this person closed it, and goes into the audit log.
  async resolveDispute(id: string, notes: string, reason: string): Promise<DisputeCase> {
    return api.post<DisputeCase>(`/admin/disputes/${encodeURIComponent(id)}/resolve`, {
      body: { notes, reason },
    });
  },

  // ---- BUSINESSES ASKING US TO SET THEIR FLEET UP ----
  // Waiting ones first, oldest first — the order they should be answered in,
  // which the server already sorts them into.
  async listFleetRequests(status?: 'waiting' | 'done'): Promise<FleetRequest[]> {
    return api.get<FleetRequest[]>('/admin/fleet-requests', {
      query: status ? { status } : undefined,
    });
  },

  async getFleetRequest(id: string): Promise<FleetRequest | undefined> {
    return orNotFound(api.get<FleetRequest>(`/admin/fleet-requests/${encodeURIComponent(id)}`));
  },

  // NO REASON ON THIS ONE, AND THAT IS NOT AN OVERSIGHT. The audit log records
  // changes to records — money, access, somebody's account. This is a job being
  // ticked off a list of work: the server keeps who did it and when, and there is
  // no "before" for a reason to explain.
  async markFleetRequestDone(id: string): Promise<FleetRequest> {
    return api.post<FleetRequest>(`/admin/fleet-requests/${encodeURIComponent(id)}/done`);
  },

  // ---- ANALYTICS ----

  // Any two dates, as "2026-09-01". The server groups the bars to suit the span;
  // see lib/analytics.ts for how the panel says which grouping it used.
  async getSeries(startISO: string, endISO: string): Promise<SeriesPoint[]> {
    return api.get<SeriesPoint[]>('/admin/analytics', {
      query: { from: startISO.slice(0, 10), to: endISO.slice(0, 10) },
    });
  },

  // ---- STAFF ----

  // Staff who can currently sign in. Used by the dispute assignment picker and
  // the audit log filter — somebody whose access has been taken away should not
  // be offered a dispute.
  async listStaff(): Promise<AdminStaff[]> {
    return api.get<AdminStaff[]>('/admin/staff');
  },

  // ---- STAFF ACCOUNTS ----
  // Adding, resetting and removing the people who can use this panel.
  //
  // EVERY ONE OF THESE NEEDS YOUR AUTHENTICATOR CODE AS WELL AS A REASON. These
  // are the only changes that decide who can get in at all. A session left open
  // on somebody's desk is enough to approve a refund; it is deliberately not
  // enough to create a new administrator, reset a colleague's sign-in, or lock
  // everybody else out. The code proves the person at the keyboard is the person
  // who signed in.
  //
  // A new or reset account gets a TEMPORARY password, which its owner must
  // replace at their next sign-in. The person who set it knows it, and if it
  // stayed the working password, two people could act as one account — and the
  // audit log's "who did this" would stop meaning anything.

  // Everybody, including those whose access has been taken away — they stay in
  // the list so their past entries in the audit log still have a name to point
  // at.
  async listStaffAccounts(): Promise<StaffAccount[]> {
    return api.get<StaffAccount[]>('/admin/staff', { query: { status: 'all' } });
  },

  // The tier goes with it: what this account may do, decided when it is created
  // rather than granted afterwards. The server refuses a tier at or above the
  // asker's own, so this can fail on the tier alone.
  async createStaff(
    account: { name: string; email: string; password: string; tier: AdminTier },
    reason: string,
    code: string,
  ): Promise<StaffAccount> {
    return api.post<StaffAccount>('/admin/staff', { body: { ...account, reason, code } });
  },

  // For a forgotten password or a lost phone. They are signed out everywhere,
  // get the temporary password, and — if their phone is gone — set up their
  // authenticator app again at their next sign-in.
  async resetStaff(
    id: string,
    reset: { password: string; resetAuthenticator: boolean },
    reason: string,
    code: string,
  ): Promise<StaffAccount> {
    return api.post<StaffAccount>(`/admin/staff/${encodeURIComponent(id)}/reset`, {
      body: { ...reset, reason, code },
    });
  },

  // Taking somebody's access away — somebody who has left, or a lost laptop.
  // They are signed out everywhere at once. Nobody can do this to themselves.
  async disableStaff(id: string, reason: string, code: string): Promise<StaffAccount> {
    return api.post<StaffAccount>(`/admin/staff/${encodeURIComponent(id)}/disable`, {
      body: { reason, code },
    });
  },

  // ---- PROMOTING, DEMOTING, OR MOVING SOMEBODY TO READ-ONLY ----
  // Refused on your own account whoever you are, on anybody at your own level or
  // above, and for any level at or above your own. Godfather cannot be granted
  // here at all. The panel says all four in advance — see lib/tiers.ts — and the
  // server says them again.
  async changeStaffTier(id: string, tier: AdminTier, reason: string, code: string): Promise<StaffAccount> {
    return api.post<StaffAccount>(`/admin/staff/${encodeURIComponent(id)}/tier`, {
      body: { tier, reason, code },
    });
  },

  // Giving it back. Their password is unchanged; if they need a new one, that is
  // a reset.
  async enableStaff(id: string, reason: string, code: string): Promise<StaffAccount> {
    return api.post<StaffAccount>(`/admin/staff/${encodeURIComponent(id)}/enable`, {
      body: { reason, code },
    });
  },

  // ---- THE AUDIT LOG ----

  // Newest first, written by the server as each change is made.
  async getAuditLog(): Promise<AuditEntry[]> {
    return api.get<AuditEntry[]>('/admin/audit', { query: { limit: LIST_LIMIT } });
  },
};

// "2026-09" → "Sep 26", the way every other month in the panel reads.
function monthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (!year || !month) return yearMonth;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
}
