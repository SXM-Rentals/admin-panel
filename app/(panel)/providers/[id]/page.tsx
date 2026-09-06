'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: One rental business in full — who they legally are, what
// they have filed, whether Stripe can pay them, and how big their fleet is.
//
// THE OUTSTANDING LIST IS SPELLED OUT rather than summarised as a status. "Stripe
// is waiting for a photo of the director's passport and proof of the business
// bank account" is something a member of staff can ring up and say. "Restricted"
// is not.

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money, longDate } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import {
  DOCUMENT_KIND_LABELS,
  DOCUMENT_STYLE,
  InfoRow,
  InfoRows,
  Note,
  PAYOUT_STYLE,
  VerificationPill,
  YesNo,
} from '@/components/admin/shared';
import { EditableRow } from '@/components/admin/EditableRow';
import { CloseAccount } from '@/components/admin/CloseAccount';
import { Button, Icon, MockBanner, Skeleton, StatusPill, Text } from '@/components/ui';
import styles from '@/components/admin/admin.module.css';

export default function ProviderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const { data: provider, loading, refresh } = useAsyncData(() => apiClient.getProvider(id), [id]);
  const { data: vehicles } = useAsyncData(() => apiClient.listVehicles(), []);

  if (loading) return <Skeleton height={420} />;

  if (!provider) {
    return (
      <>
        <PageHead title="Business not found" description="No rental business with that reference." />
        <Button label="Back to Providers" href="/providers" variant="secondary" size="md" />
      </>
    );
  }

  const payoutStyle = PAYOUT_STYLE[provider.payoutAccount.status];
  const theirVehicles = (vehicles ?? []).filter((v) => v.providerId === provider.id);

  return (
    <>
      <PageHead
        title={provider.businessName}
        description={`${provider.town} · ${provider.side === 'dutch' ? 'Dutch side' : 'French side'} · with SXM Rentals since ${longDate(provider.memberSince)}`}
        actions={
          <>
            <Button
              label="Review Documents"
              href={`/providers/${provider.id}/verification`}
              variant="secondary"
              size="md"
            />
            <Button label="Back to Providers" href="/providers" variant="ghost" size="md" />
          </>
        }
      />

      <MockBanner />

      <div className={styles.detailGrid}>
        <div className={styles.detailStack}>
          <PageCard title="Business">
            <InfoRows>
              {/* Edited one field at a time, each with its own reason and its own
                  audit entry — see the note at the top of EditableRow. */}
              <EditableRow
                label="Trading name"
                value={provider.businessName}
                subjectType="provider"
                subjectId={provider.id}
                subjectLabel={provider.businessName}
                onSave={async (next) => {
                  await apiClient.updateProvider(provider.id, 'businessName', next);
                  refresh();
                }}
              />
              <EditableRow
                label="Legal name"
                value={provider.legalName}
                subjectType="provider"
                subjectId={provider.id}
                subjectLabel={provider.businessName}
                onSave={async (next) => {
                  await apiClient.updateProvider(provider.id, 'legalName', next);
                  refresh();
                }}
              />
              <InfoRow label="Registration number" value={provider.registrationNumber ?? 'Not supplied'} />
              <EditableRow
                label="Contact email"
                value={provider.contactEmail}
                inputType="email"
                subjectType="provider"
                subjectId={provider.id}
                subjectLabel={provider.businessName}
                onSave={async (next) => {
                  await apiClient.updateProvider(provider.id, 'contactEmail', next);
                  refresh();
                }}
              />
              <EditableRow
                label="Business phone"
                value={provider.phone}
                inputType="tel"
                subjectType="provider"
                subjectId={provider.id}
                subjectLabel={provider.businessName}
                onSave={async (next) => {
                  await apiClient.updateProvider(provider.id, 'phone', next);
                  refresh();
                }}
              />
              <InfoRow
                label="Website"
                value={
                  provider.website ? (
                    // Opens in a new tab and carries noreferrer: this is a link
                    // to somebody else's site, typed in by them, and it should
                    // not be able to reach back into the admin panel.
                    <a
                      href={`https://${provider.website.replace(/^https?:\/\//, '')}`}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <Text variant="label" tone="brand" as="span" raw>
                        {provider.website}
                      </Text>
                    </a>
                  ) : (
                    <Text variant="label" tone="ink3" as="span" raw>
                      None on file
                    </Text>
                  )
                }
              />
              <InfoRow
                label="Verification"
                value={<VerificationPill status={provider.verificationStatus} />}
              />
            </InfoRows>
          </PageCard>

          <PageCard title="What They Offer">
            <InfoRows>
              <InfoRow label="Delivers vehicles" value={<YesNo done={provider.deliversVehicles} yes="Yes" no="No" />} />
              <InfoRow label="Airport pickup" value={<YesNo done={provider.airportPickup} yes="Yes" no="No" />} />
              <InfoRow label="Responds in" value={provider.respondsIn} />
              <InfoRow
                label="Rating"
                value={
                  provider.reviewCount === 0
                    ? 'No reviews yet'
                    : `${provider.rating.toFixed(1)} from ${provider.reviewCount} reviews`
                }
              />
            </InfoRows>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Text variant="small" tone="ink2" as="p" raw>
                {provider.description}
              </Text>
            </div>
          </PageCard>

          <PageCard
            title="Fleet"
            subtitle={`${theirVehicles.length} ${theirVehicles.length === 1 ? 'vehicle' : 'vehicles'} listed`}
          >
            {theirVehicles.length === 0 ? (
              <Note>This business has no vehicles listed yet.</Note>
            ) : (
              <div className={styles.linkList}>
                {theirVehicles.map((vehicle) => {
                  const pending = vehicle.documents.filter((d) => d.status === 'pending').length;
                  return (
                    <Link
                      key={vehicle.id}
                      href={`/vehicles/${vehicle.id}/verification`}
                      className={styles.linkRow}
                    >
                      <Icon name="car-outline" size={17} color="var(--ink3)" />
                      <span className={styles.linkRowText}>
                        <Text variant="label" as="span" raw>
                          {vehicle.make} {vehicle.model} {vehicle.year}
                        </Text>
                        <Text variant="small" tone="ink3" as="p" raw>
                          {vehicle.reference} · {money(vehicle.dailyRate)} a day
                        </Text>
                      </span>
                      {pending > 0 ? (
                        <StatusPill label={`${pending} to read`} tone="warning" />
                      ) : (
                        <StatusPill label="Documents clear" tone="success" />
                      )}
                      <Icon name="chevron-forward" size={16} color="var(--ink3)" />
                    </Link>
                  );
                })}
              </div>
            )}
          </PageCard>

          {/* ---- CLOSING THE BUSINESS ----
              Last, and behind the same safety check as a customer account, plus
              one of its own: a business with vehicles still listed cannot be
              closed, or the site would keep taking bookings for cars nobody is
              behind. */}
          <PageCard title="Close Business Account">
            <CloseAccount
              subjectType="provider"
              subjectId={provider.id}
              subjectLabel={provider.businessName}
              currentState={`${provider.verificationStatus === 'approved' ? 'Verified' : 'Pending'} · ${provider.vehicleCount} vehicles · ${provider.bookingCount} lifetime bookings`}
              check={() => apiClient.canCloseProvider(provider.id)}
              onClose={async () => {
                await apiClient.closeProvider(provider.id);
                refresh();
              }}
            />
          </PageCard>
        </div>

        <div className={styles.detailStack}>
          {/* ---- THE PERSON BEHIND THE BUSINESS ----
              Sits above the payout account on purpose: when a payout is stuck or
              a deposit is disputed, the next thing anybody needs is the name and
              number of whoever can actually do something about it. */}
          <PageCard title="Owner">
            <InfoRows>
              <EditableRow
                label="Name"
                value={provider.ownerName}
                auditField="Owner name"
                subjectType="provider"
                subjectId={provider.id}
                subjectLabel={provider.businessName}
                onSave={async (next) => {
                  await apiClient.updateProvider(provider.id, 'ownerName', next);
                  refresh();
                }}
              />
            </InfoRows>

            {/* The number gets its own block rather than a label-and-value row.
                In this narrow right-hand column a phone number and a pill do not
                fit on one line beside a label, and it was breaking mid-number —
                which is the one piece of text on the screen somebody is going to
                read out loud or copy. */}
            <div className={styles.ownerNumber}>
              <Text variant="caption" tone="ink3" as="p" raw>
                PERSONAL NUMBER
              </Text>
              <div className={styles.pillRow}>
                <Text variant="label" as="span" raw>
                  {provider.ownerPhone}
                </Text>
                <StatusPill label="Personal" tone="warning" dot={false} />
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Note icon="warning-outline" tone="ink2">
                This is {provider.ownerName.split(' ')[0]}’s own mobile, not the business line.
                Use it when something actually needs sorting out — a stuck payout, a disputed
                deposit — and keep it inside this panel.
              </Note>
            </div>
          </PageCard>

          {/* ---- GETTING PAID ---- */}
          <PageCard title="Payout Account">
            <InfoRows>
              <InfoRow label="Status" value={<StatusPill label={payoutStyle.label} tone={payoutStyle.tone} />} />
              <InfoRow label="Payouts enabled" value={<YesNo done={provider.payoutAccount.payoutsEnabled} yes="Yes" no="No" />} />
              <InfoRow label="Stripe account" value={provider.payoutAccount.stripeAccountId ?? 'None yet'} />
              <InfoRow label="Country" value={provider.payoutAccount.country} />
            </InfoRows>

            {provider.payoutAccount.outstanding.length > 0 ? (
              <div className={styles.openQuestion} style={{ marginTop: 'var(--space-lg)' }}>
                <Icon name="warning-outline" size={16} color="var(--warning)" />
                <div>
                  <Text variant="label" as="p" raw>
                    Stripe is still waiting for
                  </Text>
                  <ul style={{ marginTop: 6 }}>
                    {provider.payoutAccount.outstanding.map((item) => (
                      <li key={item}>
                        <Text variant="small" tone="ink2" as="span" raw>
                          · {item}
                        </Text>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </PageCard>

          <PageCard title="Trading">
            <InfoRows>
              <InfoRow label="Lifetime bookings" value={provider.bookingCount.toLocaleString()} />
              <InfoRow label="Lifetime gross volume" value={money(provider.grossVolume)} />
              <InfoRow label="Vehicles listed" value={String(provider.vehicleCount)} />
            </InfoRows>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Link href={`/bookings?provider=${encodeURIComponent(provider.businessName)}`}>
                <Text variant="small" tone="brand" as="span" raw>
                  See this business’s bookings →
                </Text>
              </Link>
            </div>
          </PageCard>

          <PageCard title="Filed Documents">
            <div className={styles.docList}>
              {provider.documents.map((doc) => {
                const style = DOCUMENT_STYLE[doc.status];
                return (
                  <div key={doc.kind} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div className={styles.pillRow}>
                      <Text variant="label" as="span" raw>
                        {DOCUMENT_KIND_LABELS[doc.kind] ?? doc.kind}
                      </Text>
                      <StatusPill label={style.label} tone={style.tone} />
                    </div>
                    <Text variant="small" tone="ink3" as="p" raw>
                      {doc.fileName} · filed {longDate(doc.uploadedAt)}
                    </Text>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Button
                label="Review Documents"
                href={`/providers/${provider.id}/verification`}
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
