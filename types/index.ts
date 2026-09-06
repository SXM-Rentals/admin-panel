// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Describes the shape of the information the app works
// with — what a car looks like, what a booking looks like, what a customer
// looks like. It doesn't hold any real data; it's the blueprint that keeps
// every screen agreeing on the same wording. When the real backend is built,
// it should return data in exactly these shapes.

// ---- PEOPLE ----

// SXM Rentals treats residents and visitors differently: they prove who they
// are with different documents, and residents can earn "Islander" status.
export type AccountType = 'local' | 'tourist';

// Where someone is in the identity-check process.
export type VerificationStatus = 'unstarted' | 'pending' | 'approved' | 'rejected' | 'resubmit';

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  accountType: AccountType;
  verification: {
    status: VerificationStatus;
    selfieDone: boolean;
    licenseDone: boolean;
    identityDocDone: boolean; // passport for a tourist, local ID for a resident
    reason?: string; // filled in only when the status is 'rejected'
    submittedAt?: string;
  };
  isIslander: boolean; // a confirmed Sint Maarten / Saint-Martin resident
  memberSince: string;
};

// ---- RENTAL BUSINESSES ----

// PUBLIC information about a rental business — the things any customer is
// allowed to see. Everything on this type appears on the business's public page.
// Nothing private (earnings, payouts, booking counts) belongs here.
export type Provider = {
  id: string;
  businessName: string;
  side: 'dutch' | 'french'; // which side of the island they operate from
  town: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean; // has passed the SXM Verified checks
  respondsIn: string; // e.g. "usually replies within an hour"
  phone: string;

  // Shown on the public business page.
  description: string;
  deliversVehicles: boolean;
  airportPickup: boolean;
  memberSince: string;
};

// ---- VEHICLES ----

// Only cars can be booked at launch. The other three appear in the app but are
// marked "Coming Soon" so people can see what's planned.
export type VehicleType = 'car' | 'atv' | 'boat' | 'bike';

export type VehicleClass = 'economy' | 'compact' | 'suv' | 'van' | 'fourByFour' | 'luxury';

export type Transmission = 'automatic' | 'manual';
export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric';

// A damage or accident record the rental business declared when listing the
// car. SXM Rentals does not independently verify these — the app always says so.
export type AccidentRecord = {
  date: string;
  description: string;
  repaired: boolean;
};

export type Vehicle = {
  id: string;
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  trim?: string;
  vehicleClass: VehicleClass;
  transmission: Transmission;
  fuel: FuelType;
  seats: number;
  doors: number;
  airConditioning: boolean;
  photos: string[]; // file names inside assets/images/vehicles
  providerId: string;

  // Pricing
  dailyRate: number;
  weeklyRate?: number; // some businesses offer a cheaper weekly price
  minimumDays: number;
  maximumDays: number;

  // The security deposit is held separately from the rental payment and is
  // released after the car comes back. Some cars have their own deposit amount.
  depositAmount: number;
  depositIsVehicleSpecific: boolean;

  // Where and how it can be collected
  pickupTown: string;
  side: 'dutch' | 'french';
  deliveryAvailable: boolean;
  deliveryFee?: number;
  latitude: number;
  longitude: number;

  rating: number;
  reviewCount: number;
  accidentHistory: AccidentRecord[]; // empty array means "none reported"
  unavailableDates: string[]; // days already booked, as YYYY-MM-DD
  description: string;
};

// ---- REVIEWS ----

export type Review = {
  id: string;
  vehicleId: string;
  authorName: string;
  rating: number;
  date: string;
  body: string;
};

// ---- BOOKINGS ----

export type BookingStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

// The security deposit has its own life cycle, separate from the rental money.
export type DepositStatus = 'not_taken' | 'held' | 'released' | 'claimed';

export type PriceLine = {
  label: string;
  amount: number;
  note?: string;
};

export type Booking = {
  id: string;
  reference: string; // the short code shown to the customer, e.g. SXM-4821
  vehicleId: string;
  providerId: string;
  status: BookingStatus;

  startDate: string;
  endDate: string;
  pickupTime: string;
  returnTime: string;

  collection: 'pickup' | 'delivery';
  location: string;

  // Money. The deposit is deliberately kept out of the rental total so it is
  // never mistaken for something the customer is being charged.
  lines: PriceLine[]; // rental subtotal, fees, add-ons
  depositAmount: number;
  depositStatus: DepositStatus;
  totalDueToday: number;

  agreementSigned: boolean;
  createdAt: string;
};

// ---- MESSAGES ----

export type ChatMessage = {
  id: string;
  from: 'customer' | 'provider';
  body: string;
  sentAt: string;
  read: boolean;

  // A car attached to the message. Either side can send one: a customer asking
  // "is this one free?", or a business answering "this one is cheaper and
  // available those dates". It shows as a small car card inside the message
  // that opens the full page when tapped.
  //
  // The words and the car are separate, so a message can be one, the other, or
  // both.
  vehicleId?: string;
};

export type ChatThread = {
  id: string;
  providerId: string;
  bookingRef?: string;
  messages: ChatMessage[];
  unreadCount: number;
};

// ---- NOTIFICATIONS ----

export type NotificationKind =
  | 'booking_confirmed'
  | 'payment'
  | 'pickup_reminder'
  | 'return_reminder'
  | 'late_return'
  | 'cancellation'
  | 'verification'
  | 'promotion';

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  sentAt: string;
  read: boolean;
};

// ---- REWARDS ----
// Points and status are deliberately separate. Islander is about living on the
// island; tiers are about how much someone has rented.

export type RewardTier = 'explorer' | 'traveler' | 'vip' | 'elite';

export type RewardsProfile = {
  points: number;
  tier: RewardTier;
  pointsToNextTier: number;
  nextTier: RewardTier | null;
  isIslander: boolean;
  history: { id: string; label: string; points: number; date: string }[];
};

// ---- LEGAL DOCUMENTS ----

export type LegalTier = 'platform' | 'rental' | 'provider';

export type LegalDocument = {
  slug: string;
  title: string;
  tier: LegalTier;
  updated: string;
  sections: { heading: string; body: string }[];
};

// ---- THE BUSINESS SIDE ----
// Everything below is what a rental business sees about ITSELF. None of it is
// ever shown to a customer.

// The private half of a business's record: how it is registered, and what it
// has switched on. The public half lives on Provider above.
export type BusinessProfile = {
  providerId: string;
  legalName: string;
  website?: string;
  registrationStatus: 'registered' | 'not_registered' | 'pending';
  registeredIn?: string;
  registrationNumber?: string;
  fleetSizeBand: string;
  locations: string[];
  operatingSide: 'dutch' | 'french' | 'both';
  deliversVehicles: boolean;
  airportPickup: boolean;
  // Whether the business has connected its own booking software to ours.
  apiConnected: boolean;
  apiLastSyncedAt?: string;
};

// One payment from SXM Rentals to the business.
//
// IMPORTANT: a payout only ever covers RENTAL money, and only the business's
// own share of it. Security deposits are never part of a payout — they are held
// and given back to the customer, and no commission is taken from them.
export type PayoutRecord = {
  id: string;
  reference: string;
  // What actually landed in the business's account: their share, after
  // SXM Rentals' commission has been taken off.
  amount: number;
  // What customers paid in total across the bookings in this payout, before
  // commission. Shown so the deduction is visible rather than hidden.
  grossAmount: number;
  commission: number;
  bookingCount: number;
  periodStart: string;
  periodEnd: string;
  paidOn?: string;
  status: 'paid' | 'pending' | 'processing';
};

// How one vehicle is doing. Every money figure here is the business's own
// share, after commission.
export type VehiclePerformance = {
  vehicleId: string;
  revenue: number;
  bookings: number;
  // What share of the days in the period the car was actually out, 0 to 1.
  occupancyRate: number;
  // How many people asked about this car, and how many of those booked.
  // Counts only — never the people themselves. See ProviderBooking below.
  inquiries: number;
  conversions: number;
};

// A booking as the RENTAL BUSINESS sees it.
//
// READ THIS BEFORE ADDING A FIELD: there is deliberately no phone number and no
// email address on this type, and there must never be one. A business sees who
// is collecting the car and when — enough to hand it over to the right person —
// and talks to them through the app's own messaging. Customer contact details
// stay with SXM Rentals staff.
//
// Keeping the fields off the type is what makes that rule hold: a screen cannot
// display a phone number that was never given to it.
export type ProviderBooking = {
  id: string;
  reference: string;
  vehicleId: string;
  status: BookingStatus;

  // "Benjamin J." — enough to greet the right person at the counter.
  renterDisplayName: string;
  // Whether SXM Rentals has checked their licence and ID. This is the
  // reassurance a business actually needs, rather than personal details.
  renterVerified: boolean;
  // The conversation to open when the business wants to say something.
  threadId?: string;

  startDate: string;
  endDate: string;
  pickupTime: string;
  returnTime: string;
  collection: 'pickup' | 'delivery';
  location: string;

  // What the customer paid, what SXM Rentals took, and what the business gets.
  grossAmount: number;
  commission: number;
  netAmount: number;

  // Held against the customer's card and returned to them. Never the business's
  // money, and never part of what they are paid.
  depositAmount: number;
  depositStatus: DepositStatus;
};

// One row read out of an uploaded spreadsheet, before anything is saved.
// A row that has something wrong with it is kept along with the reason, so the
// person uploading can see exactly what needs fixing rather than being told
// only that "the file failed".
export type ImportRow = {
  rowNumber: number;
  make: string;
  model: string;
  year?: number;
  registration?: string;
  dailyRate?: number;
  seats?: number;
  // Empty when the row is fine. Otherwise, what is wrong with it in plain words.
  problems: string[];
};

// A conversation as the RENTAL BUSINESS sees it.
//
// Same privacy rule as ProviderBooking: a display name and nothing else. The
// business talks to the renter here, inside SXM Rentals, and never gets their
// phone number or email address.
export type BusinessChatThread = {
  id: string;
  renterDisplayName: string;
  renterVerified: boolean;
  bookingRef?: string;
  vehicleId?: string;
  messages: ChatMessage[];
  unreadCount: number;
};

// ---- THE ADMIN-ONLY SHAPES ----
// Everything above is a copy of the customer website types, kept identical on
// purpose. The panel imports both from one place: @/types
export * from './admin';
