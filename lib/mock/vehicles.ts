// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Forty made-up vehicles spread across the twelve rental
// businesses, each with the three documents that have to be checked before it
// can be listed: registration, insurance, and roadworthiness.
//
// WHY THE DOCUMENTS MATTER MORE THAN THE CARS: the Overview doc is explicit that
// vehicle paperwork is reviewed by a person rather than run through the
// automated ID-check service used for customers. An insurance certificate needs
// somebody to read the dates on it. So this file is really a queue of things to
// read, dressed as a list of cars — which is why eight of them are left pending
// and two are rejected with a written reason.

import type { AdminVehicle, VehicleClass, VehicleDocument } from '@/types';
import { CAR_MODELS, between, daysAgo, seeded } from './seed';
import { mockProviders } from './providers';

const rng = seeded(5540);

// Only businesses that have themselves been approved can have live listings. A
// vehicle belonging to a provider still in the queue is pending too, however
// good its paperwork — which is the rule the queue counts on.
const listableProviders = mockProviders.filter((p) => p.verificationStatus !== 'rejected');

function doc(
  kind: VehicleDocument['kind'],
  status: VehicleDocument['status'],
  reason?: string,
): VehicleDocument {
  // A document still waiting to be read was filed RECENTLY. This used to draw
  // from the same 2-to-500-day range as everything else, which put documents in
  // the action queue that had supposedly been sitting unread for sixteen months
  // — a queue that says "unread since May last year" is not a queue anybody
  // believes, and it made the whole screen read as broken rather than busy.
  // Anything already dealt with can be as old as it likes.
  const uploaded =
    status === 'pending' ? daysAgo(between(rng, 1, 24)) : daysAgo(between(rng, 30, 500));
  return {
    kind,
    status,
    fileName: `${kind}-certificate.pdf`,
    uploadedAt: uploaded,
    // Insurance and roadworthiness both expire; a registration does not, in the
    // way that matters here.
    expiresAt: kind === 'registration' ? undefined : daysAgo(-between(rng, 20, 600)),
    reason: status === 'rejected' ? reason : undefined,
    reviewedBy: status === 'pending' ? undefined : 'Kayla Brooks',
    reviewedAt: status === 'pending' ? undefined : daysAgo(between(rng, 1, 400)),
  };
}

// The rows that are deliberately not straightforward, by index. Everything else
// is a live listing with all three documents approved.
const PENDING_INDEXES = new Set([3, 7, 12, 18, 24, 29, 33, 38]);
const REJECTED: Record<number, { kind: VehicleDocument['kind']; reason: string }> = {
  9: {
    kind: 'insurance',
    reason: 'The policy expired on 14 June and no renewal certificate has been supplied.',
  },
  21: {
    kind: 'roadworthiness',
    reason: 'Inspection certificate is dated more than 24 months ago and is no longer valid.',
  },
};
const SUSPENDED_INDEXES = new Set([15, 31]);

export const mockVehicles: AdminVehicle[] = Array.from({ length: 40 }, (_, i) => {
  const spec = CAR_MODELS[i % CAR_MODELS.length];
  const provider = listableProviders[i % listableProviders.length];
  const providerPending = provider.verificationStatus === 'pending';

  const rejection = REJECTED[i];
  const isPending = PENDING_INDEXES.has(i) || providerPending;
  const isSuspended = SUSPENDED_INDEXES.has(i);

  let documents: VehicleDocument[];
  if (rejection) {
    documents = [
      doc('registration', 'approved'),
      doc('insurance', rejection.kind === 'insurance' ? 'rejected' : 'approved', rejection.reason),
      doc(
        'roadworthiness',
        rejection.kind === 'roadworthiness' ? 'rejected' : 'approved',
        rejection.reason,
      ),
    ];
  } else if (isPending) {
    documents = [
      doc('registration', 'approved'),
      doc('insurance', 'pending'),
      doc('roadworthiness', 'pending'),
    ];
  } else {
    documents = [
      doc('registration', 'approved'),
      doc('insurance', 'approved'),
      doc('roadworthiness', 'approved'),
    ];
  }

  return {
    id: `v${i + 1}`,
    reference: `SXM-V-${String(101 + i)}`,
    providerId: provider.id,
    providerName: provider.businessName,
    make: spec.make,
    model: spec.model,
    year: between(rng, 2019, 2026),
    vehicleClass: spec.vehicleClass as VehicleClass,
    // A little either side of the class rate, so the money column is not a
    // column of identical numbers.
    dailyRate: spec.rate + between(rng, -6, 12),
    side: provider.side,
    listingStatus: rejection || isSuspended ? 'suspended' : isPending ? 'pending_review' : 'live',
    documents,
  } satisfies AdminVehicle;
});

export function findVehicle(id: string): AdminVehicle | undefined {
  return mockVehicles.find((v) => v.id === id);
}

// The vehicles actually waiting on somebody in the office. This is what feeds
// the verification count in the sidebar badge and on the dashboard, so it is
// worked out here once rather than counted differently on each screen.
export function vehiclesAwaitingReview(): AdminVehicle[] {
  return mockVehicles.filter((v) => v.documents.some((d) => d.status === 'pending'));
}

export function vehicleLabel(v: AdminVehicle): string {
  return `${v.make} ${v.model} ${v.year}`;
}
