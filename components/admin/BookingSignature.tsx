'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The rental agreement on a booking — whether it was signed,
// when, from what, and the signature the renter actually drew.
//
// IT DRAWS THE LINES FROM NUMBERS, AND NEVER PUTS THE STORED TEXT ON THE PAGE.
// Each stroke arrives as a string like "M12.0,40.5 L13.5,41.0". The obvious thing
// to do is hand that straight to an SVG path, which would mean text a stranger
// supplied becoming part of the mark-up of a staff screen. So every stroke is
// parsed into pairs of numbers here and the path is rebuilt from those; anything
// that is not a plain line is dropped, and a stroke with nothing readable in it is
// skipped rather than guessed at.
//
// The server is strict about what it stores for exactly this reason. This does not
// rely on that — two checks on a signature is the right number, given what it is
// for.
//
// WHY A SIGNATURE IS WORTH A CARD OF ITS OWN. "Agreement signed: yes" is the least
// useful true thing the panel could say. When a customer disputes a charge, what
// matters is what they agreed to, when, and from where — a version, a timestamp
// and an address are the difference between a record and a claim.

import React from 'react';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { clockTime, longDate } from '@/lib/format';
import { presentError } from '@/lib/api/errors';
import { PageCard } from '@/components/layout/PageCard';
import { InfoRow, InfoRows, Note } from '@/components/admin/shared';
import { Skeleton, Text } from '@/components/ui';
import styles from './admin.module.css';

// "M12.0,40.5 L13.5,41.0" → [[12, 40.5], [13.5, 41]]. Anything else gives
// nothing, and nothing is drawn.
function pointsOf(stroke: string): [number, number][] {
  const points: [number, number][] = [];
  for (const part of stroke.trim().split(/\s+/)) {
    const command = part[0];
    if (command !== 'M' && command !== 'L') return [];
    const [x, y] = part.slice(1).split(',').map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
    points.push([x, y]);
  }
  return points;
}

// The path rebuilt out of numbers. Never the original string.
function pathFrom(points: [number, number][]): string {
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
}

export function BookingSignature({
  bookingId,
  signedOnFile,
}: {
  bookingId: string;
  // What the booking itself said. Kept so a disagreement between the two is
  // visible rather than silently resolved in favour of one of them.
  signedOnFile: boolean;
}) {
  const { data: agreement, loading, error } = useAsyncData(() => apiClient.getBookingAgreement(bookingId), [bookingId]);

  if (loading) {
    return (
      <PageCard title="Rental Agreement">
        <Skeleton height={180} />
      </PageCard>
    );
  }

  // Not a reason to lose the rest of the booking screen — this is one card on it.
  if (error) {
    return (
      <PageCard title="Rental Agreement">
        <Note icon="warning-outline" tone="ink2">
          {presentError(error)}
        </Note>
      </PageCard>
    );
  }

  if (!agreement) {
    return (
      <PageCard title="Rental Agreement" subtitle="Nothing on file">
        <Note>
          The server has no agreement for this booking.
          {signedOnFile
            ? ' The booking says one was signed, which means the two disagree — worth raising before relying on either.'
            : ''}
        </Note>
      </PageCard>
    );
  }

  const strokes = (agreement.signature?.strokes ?? []).map(pointsOf).filter((points) => points.length > 1);

  return (
    <PageCard
      title="Rental Agreement"
      subtitle={agreement.signedAt ? `Signed ${longDate(agreement.signedAt)}` : 'Not signed'}
    >
      <InfoRows>
        <InfoRow
          label="Signed"
          value={
            agreement.signedAt
              ? `${longDate(agreement.signedAt)} at ${clockTime(agreement.signedAt)}`
              : 'Not yet'
          }
        />
        <InfoRow label="Agreement version" value={agreement.version || 'Not recorded'} />
        <InfoRow label="Signed from" value={agreement.platform || 'Not recorded'} />
        {/* Kept because a signature is evidence, and shown rather than hidden so
            nobody has to ask a developer for it during a dispute. */}
        <InfoRow label="Address it came from" value={agreement.ipAddress || 'Not recorded'} />
      </InfoRows>

      {agreement.signature && strokes.length > 0 ? (
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Text variant="caption" tone="ink3" as="p" raw>
            WHAT THEY DREW
          </Text>
          <div className={styles.signatureBox}>
            <svg
              viewBox={`0 0 ${agreement.signature.width} ${agreement.signature.height}`}
              className={styles.signatureInk}
              role="img"
              aria-label="The signature drawn by the renter"
            >
              {strokes.map((points, index) => (
                <path
                  key={index}
                  d={pathFrom(points)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Note>
            {agreement.signedAt
              ? 'The agreement was accepted, but no drawing was kept with it.'
              : 'Nothing drawn yet.'}
          </Note>
        </div>
      )}
    </PageCard>
  );
}

export default BookingSignature;
