'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: One rental business in full — who they legally are, who is
// behind them, what they offer, and the vehicles they have listed.
//
// SEVERAL THINGS THIS SCREEN USED TO SHOW ARE NOT SHOWN, ON PURPOSE. The SXM
// Rentals server does not yet send a business's own paperwork, its Stripe
// payout account, or any way to edit a business's details or close it. The
// screen used to show all of those, filled in with sample data. Rather than
// quietly dropping them — which would leave somebody hunting for them — each
// says in one line that it is not connected yet.
//
// TURNING A BUSINESS DOWN DOES NOT TAKE ITS VEHICLES OFF THE SITE. That is how
// the server works today: whether a customer can find and book a car depends
// on that car's own listing, and nothing else. So the fleet below links straight
// to each vehicle's listing decision, because that is where a car is actually
// taken down.
//
// WHICH IS ALSO WHY "STOP THIS BUSINESS TRADING" IS BUILT OUT OF THOSE SAME
// DECISIONS. There is no close-the-account address on the server, and a button
// that only looked like one would be worse than no button at all. Taking every
// one of a business's live vehicles down is the real thing the panel can do —
// nobody can book them from that moment on — so the screen does exactly that,
// as one decision with one reason, and says plainly that the account stays open.

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money, longDate } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { PartialChange, presentError } from '@/lib/api/errors';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { InfoRow, InfoRows, LISTING_STYLE, Note, VerificationPill, YesNo } from '@/components/admin/shared';
import { Button, Icon, Skeleton, StatusPill, Text } from '@/components/ui';
import styles from '@/components/admin/admin.module.css';

export default function ProviderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const { data: provider, loading, error, refresh } = useAsyncData(() => apiClient.getProvider(id), [id]);
  const { data: vehicles, refresh: refreshVehicles } = useAsyncData(() => apiClient.listVehicles(), []);

  // Whether the "stop trading" dialog is open.
  const [stopping, setStopping] = useState(false);

  // Could not be fetched is not the same as "no such business". See LoadFailed.
  if (error) return <LoadFailed title="Business" what="This business" error={error} onRetry={refresh} />;

  if (loading) return <Skeleton height={420} />;

  if (!provider) {
    return (
      <>
        <PageHead title="Business not found" description="No rental business with that reference." />
        <Button label="Back to Providers" href="/providers" variant="secondary" size="md" />
      </>
    );
  }

  const theirVehicles = (vehicles ?? []).filter((v) => v.providerId === provider.id);

  // The cars a customer can book right now — the only ones there is anything to
  // do about. A car already down, or still waiting on its paperwork, cannot be
  // booked, and sending a decision for it would put a pointless line in the
  // audit log.
  const bookable = theirVehicles.filter((v) => v.listingStatus === 'live');

  // AND WHETHER THE PANEL IS LOOKING AT THE WHOLE FLEET. The vehicles list is
  // the most recent few hundred, not everything, so a large business may have
  // cars that are not in it. "Stopped trading" that quietly missed three of them
  // is the worst outcome of the lot, so the button is not offered in that case.
  const wholeFleetVisible = theirVehicles.length >= provider.vehicleCount;

  return (
    <>
      <PageHead
        title={provider.businessName}
        description={`${provider.town} · ${provider.side === 'dutch' ? 'Dutch side' : 'French side'} · with SXM Rentals since ${longDate(provider.memberSince)}`}
        actions={
          <>
            <Button
              label="Verification Decision"
              href={`/providers/${provider.id}/verification`}
              variant="secondary"
              size="md"
            />
            <Button label="Back to Providers" href="/providers" variant="ghost" size="md" />
          </>
        }
      />

      <div className={styles.detailGrid}>
        <div className={styles.detailStack}>
          <PageCard title="Business">
            <InfoRows>
              <InfoRow label="Trading name" value={provider.businessName} />
              <InfoRow label="Legal name" value={provider.legalName || 'Not supplied'} />
              <InfoRow label="Registration number" value={provider.registrationNumber ?? 'Not supplied'} />
              <InfoRow label="Contact email" value={provider.contactEmail || 'Not supplied'} />
              <InfoRow label="Business phone" value={provider.phone} />
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

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Note>
                These details cannot be edited from the panel yet — the SXM Rentals server does not
                offer it. A business changes them itself, from its own account.
              </Note>
            </div>
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

            {provider.description ? (
              <div style={{ marginTop: 'var(--space-lg)' }}>
                <Text variant="small" tone="ink2" as="p" raw>
                  {provider.description}
                </Text>
              </div>
            ) : null}
          </PageCard>

          <PageCard
            title="Fleet"
            subtitle={
              theirVehicles.length < provider.vehicleCount
                ? `Showing ${theirVehicles.length} of ${provider.vehicleCount} vehicles`
                : `${provider.vehicleCount} ${provider.vehicleCount === 1 ? 'vehicle' : 'vehicles'}`
            }
          >
            {theirVehicles.length === 0 ? (
              <Note>
                {provider.vehicleCount === 0
                  ? 'This business has no vehicles listed yet.'
                  : 'Their vehicles are not among the most recent the server sent. Search for them on the Vehicles screen.'}
              </Note>
            ) : (
              <div className={styles.linkList}>
                {theirVehicles.map((vehicle) => {
                  const listing = LISTING_STYLE[vehicle.listingStatus];
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
                      <StatusPill label={listing.label} tone={listing.tone} />
                      <Icon name="chevron-forward" size={16} color="var(--ink3)" />
                    </Link>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Note icon="warning-outline" tone="ink2">
                Whether customers can book a car depends on that car&rsquo;s own listing, not on this
                business being verified. To take a car off the site, open it and take its listing
                down.
              </Note>
            </div>
          </PageCard>

          <PageCard
            title="Stop This Business Trading"
            subtitle={
              bookable.length === 0
                ? 'Nothing of theirs is bookable'
                : `${bookable.length} ${bookable.length === 1 ? 'vehicle' : 'vehicles'} bookable now`
            }
          >
            {bookable.length === 0 ? (
              <Note>
                No vehicle of theirs is live, so there is nothing for a customer to book — and
                nothing here to take down.
              </Note>
            ) : !wholeFleetVisible ? (
              <Note icon="warning-outline" tone="ink2">
                This business has {provider.vehicleCount} vehicles and the panel can only see{' '}
                {theirVehicles.length} of them, so it cannot promise to take them all down. Do it
                from the Vehicles screen, where the rest can be searched for.
              </Note>
            ) : (
              <>
                <Note icon="warning-outline" tone="ink2">
                  This takes{' '}
                  {bookable.length === 1
                    ? 'their one live vehicle'
                    : `all ${bookable.length} of their live vehicles`}{' '}
                  down, so customers can no longer find or book any of them. Bookings already made
                  are not cancelled, and the business keeps its account and can still sign in — the
                  server offers no way to close an account, and this is not one.
                </Note>

                <div style={{ marginTop: 'var(--space-lg)' }}>
                  <Button
                    label="Stop Them Trading"
                    variant="danger"
                    size="md"
                    onClick={() => setStopping(true)}
                  />
                </div>
              </>
            )}
          </PageCard>
        </div>

        <div className={styles.detailStack}>
          {/* ---- THE PERSON BEHIND THE BUSINESS ----
              Near the top on purpose: when a payout is stuck or a deposit is
              disputed, the next thing anybody needs is the name and number of
              whoever can actually do something about it. */}
          <PageCard title="Owner">
            <InfoRows>
              <InfoRow label="Name" value={provider.ownerName || 'Not supplied'} />
            </InfoRows>

            {provider.ownerPhone ? (
              <>
                {/* The number gets its own block rather than a label-and-value
                    row. In this narrow right-hand column a phone number and a
                    pill do not fit on one line beside a label, and it was
                    breaking mid-number — which is the one piece of text on the
                    screen somebody is going to read out loud or copy. */}
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
                    This is {provider.ownerName ? `${provider.ownerName.split(' ')[0]}’s` : 'the owner’s'}{' '}
                    own mobile, not the business line. Use it when something actually needs sorting
                    out — a stuck payout, a disputed deposit — and keep it inside this panel.
                  </Note>
                </div>
              </>
            ) : null}
          </PageCard>

          {/* ---- GETTING PAID ----
              Kept as a card rather than left out, because it is the first thing
              anybody looks for when a business rings about money. */}
          <PageCard title="Payout Account" subtitle="Not connected yet">
            <Note>
              The server keeps whether this business&rsquo;s Stripe account can receive money, but it
              does not send it to the admin panel yet. Money already sent to them shows as payout
              lines in the ledger on the Payments screen.
            </Note>
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
        </div>
      </div>

      <ReasonDialog
        open={stopping}
        onClose={() => setStopping(false)}
        title="Stop this business trading"
        description={`Every one of their ${bookable.length} live ${bookable.length === 1 ? 'vehicle comes' : 'vehicles come'} off the site straight away, and the reason you give is recorded against each of them. Bookings already made are not cancelled, and the account itself stays open.`}
        confirmLabel="Take their vehicles down"
        destructive
        reasonPlaceholder="e.g. Trading licence expired — down until the renewal is on file."
        change={{
          subjectLabel: provider.businessName,
          field: 'Vehicles customers can book',
          before: `${bookable.length} live`,
          after: 'None',
        }}
        onConfirm={async (reason) => {
          // ONE AT A TIME, NOT ALL AT ONCE. These are changes, so nothing is
          // retried automatically, and firing a dozen at a server that may be
          // waking up is how some of them get lost.
          const notDone: string[] = [];
          let firstFault: unknown;
          let done = 0;

          for (const vehicle of bookable) {
            try {
              await apiClient.decideVehicleListing(vehicle.id, false, reason);
              done += 1;
            } catch (caught) {
              if (firstFault === undefined) firstFault = caught;
              notDone.push(`${vehicle.make} ${vehicle.model} (${vehicle.reference})`);
            }
          }

          // So the fleet above, and the count on this card, tell the truth
          // whatever happened. It also means pressing the button again after a
          // partial failure only tries the ones still live.
          await refreshVehicles();

          if (notDone.length === 0) return;

          // Nothing went through at all: that is an ordinary failure, and the
          // dialog can say "nothing was changed" in the server's own words.
          if (done === 0) throw firstFault;

          throw new PartialChange(
            `${done} of ${bookable.length} vehicles were taken down. ${notDone.join(', ')} ${notDone.length === 1 ? 'was' : 'were'} not. ${presentError(firstFault)} The fleet above has been reloaded, so it shows where this stands.`,
          );
        }}
      />
    </>
  );
}
