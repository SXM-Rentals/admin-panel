'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: One rental business in full — who they legally are, who is
// behind them, what they offer, the vehicles they have listed — and everything
// staff can do about them: correct a detail, stop them trading, close them, open
// them again.
//
// WHAT IS STILL NOT HERE, AND WHY. The SXM Rentals server does not send a
// business's own paperwork or its Stripe payout account. The screen used to show
// both, filled in with sample data. Rather than quietly dropping them — which
// leaves somebody hunting — the payout card says in one line that it is not
// connected yet.
//
// TURNING A BUSINESS DOWN DOES NOT TAKE ITS VEHICLES OFF THE SITE. That is how
// the server works: whether a customer can find and book a car depends on that
// car's own listing, and nothing else. So the fleet below links straight to each
// vehicle's listing decision, because that is where a car is actually taken down.
//
// STOPPING THEM TRADING AND CLOSING THEM ARE DIFFERENT THINGS, and the card that
// holds both says so. Taking the fleet down leaves the business open: it can put
// a car back tomorrow. Closing takes the business itself off the site, in one
// transaction on the server, and is refused while money is in the air.
//
// AND EDITING IS NOT A BUTTON — IT IS THE ROWS. Each detail the server will
// accept is editable on its own, one field with one reason, because that is the
// shape an audit entry has: this person changed this field from this to that, for
// this reason. See the note at the top of EditableRow. Once a business is closed
// the rows stop being editable: it is a record then, not a live business, the
// same as a closed customer account.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money, longDate } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { PartialChange, presentError } from '@/lib/api/errors';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { EditableRow } from '@/components/admin/EditableRow';
import {
  InfoRow,
  InfoRows,
  LISTING_STYLE,
  Note,
  RESPONDS_IN_LABELS,
  VerificationPill,
  YesNo,
} from '@/components/admin/shared';
import { ActionMenu, Button, Icon, Skeleton, StatusPill, Text } from '@/components/ui';
import type { ProviderField } from '@/types';
import styles from '@/components/admin/admin.module.css';

// ---- ONE DETAIL OF THE BUSINESS ----
// Editable while the business is open, plain once it is closed. Written once here
// rather than as a ternary on each of the fourteen rows.
function Detail({
  editable,
  label,
  field,
  value,
  businessId,
  businessName,
  onSaved,
  options,
  inputType,
  emptyText = 'Not supplied',
  hint,
  valueNode,
  // Booleans are shown and chosen as Yes and No, so what the row carries and
  // what the server wants are not the same thing.
  asBoolean = false,
}: {
  editable: boolean;
  label: string;
  field: ProviderField;
  value: string;
  businessId: string;
  businessName: string;
  onSaved: () => void;
  options?: { value: string; label: string }[];
  inputType?: 'text' | 'email' | 'tel' | 'url';
  emptyText?: string;
  hint?: string;
  valueNode?: React.ReactNode;
  asBoolean?: boolean;
}) {
  if (!editable) {
    const shown = options?.find((option) => option.value === value)?.label ?? value;
    return <InfoRow label={label} value={valueNode ?? (shown || emptyText)} />;
  }

  return (
    <EditableRow
      label={label}
      value={value}
      subjectLabel={businessName}
      options={options}
      inputType={inputType}
      emptyText={emptyText}
      hint={hint}
      valueNode={valueNode}
      onSave={async (next, reason) => {
        await apiClient.updateProviderField(businessId, field, asBoolean ? next === 'yes' : next, reason);
        onSaved();
      }}
    />
  );
}

const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export default function ProviderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: provider, loading, error, refresh } = useAsyncData(() => apiClient.getProvider(id), [id]);
  const {
    data: vehicles,
    loading: fleetLoading,
    refresh: refreshVehicles,
  } = useAsyncData(() => apiClient.listVehicles(), []);

  // Which of the three decisions is being confirmed, if any.
  const [stopping, setStopping] = useState(false);
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);

  // ---- WHAT CAN BE DONE ABOUT THIS BUSINESS ----
  // Worked out here, above the "still loading" and "could not load" branches,
  // because the effect below needs it: somebody arriving from the businesses
  // list has already chosen an action there, and whether it applies is only
  // knowable once the business and its fleet are in.
  const closedOn = provider?.closedAt ?? null;
  const isClosed = closedOn !== null;

  const theirVehicles = provider ? (vehicles ?? []).filter((v) => v.providerId === provider.id) : [];

  // The cars a customer can book right now — the only ones there is anything to
  // do about. A car already down, or still waiting on its paperwork, cannot be
  // booked, and sending a decision for it would put a pointless line in the
  // audit log.
  const bookable = theirVehicles.filter((v) => v.listingStatus === 'live');

  // AND WHETHER THE PANEL IS LOOKING AT THE WHOLE FLEET. The vehicles list is
  // the most recent few hundred, not everything, so a large business may have
  // cars that are not in it. "Stopped trading" that quietly missed three of them
  // is the worst outcome of the lot, so it is not offered in that case.
  const wholeFleetVisible = provider ? theirVehicles.length >= provider.vehicleCount : false;
  const canStopTrading = !isClosed && bookable.length > 0 && wholeFleetVisible;

  // Why "stop them trading" is not on offer, when it is not. Closed comes first:
  // on a closed business every car is already down, so "none are live" would be
  // true and useless.
  const noStopBecause = isClosed
    ? 'This business is closed — its cars are already off the site.'
    : fleetLoading
      ? 'Still loading their fleet.'
      : bookable.length === 0
        ? 'None of their vehicles are live.'
        : 'The panel cannot see their whole fleet — use the Vehicles screen.';

  // ---- ARRIVING WITH THE ACTION ALREADY CHOSEN ----
  // Each of these decisions is offered on the businesses list as well, and
  // chosen there it sends you here — because a decision that takes a whole fleet
  // off the site should be made where you can see the fleet. If it turns out not
  // to apply, no dialog opens and the card below says why. Either way the
  // instruction comes out of the address bar, so a refresh or a press of Back
  // does not raise it again.
  const asked = searchParams?.get('stop') === '1'
    ? 'stop'
    : searchParams?.get('close') === '1'
      ? 'close'
      : searchParams?.get('reopen') === '1'
        ? 'reopen'
        : null;

  useEffect(() => {
    if (!asked || !provider || fleetLoading) return;
    if (asked === 'stop' && canStopTrading) setStopping(true);
    if (asked === 'close' && !isClosed) setClosing(true);
    if (asked === 'reopen' && isClosed) setReopening(true);
    router.replace(`/providers/${provider.id}`);
  }, [asked, provider, fleetLoading, canStopTrading, isClosed, router]);

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

  const where = `${provider.town} · ${provider.side === 'dutch' ? 'Dutch side' : 'French side'}`;

  // Every detail row needs the same four things.
  const rowProps = {
    editable: !isClosed,
    businessId: provider.id,
    businessName: provider.businessName,
    onSaved: refresh,
  };

  return (
    <>
      <PageHead
        title={provider.businessName}
        description={
          isClosed
            ? `Closed on ${longDate(closedOn)}. ${where}. Nothing is deleted — past bookings and payouts still point at it.`
            : `${where} · with SXM Rentals since ${longDate(provider.memberSince)}`
        }
        actions={
          <>
            {/* THE SAME ACTIONS AS THE ROW THIS SCREEN WAS OPENED FROM, in the
                same order and the same words — with one difference. "Edit their
                details" is not here, because on this screen it is not an action
                somewhere else: every detail below has its own pencil. The menu
                also says more here than it can on a row, because the fleet is
                loaded: "stop them trading" knows whether there is anything to
                stop, and closing knows whether it has already happened. */}
            <ActionMenu
              label="Modify"
              size="md"
              items={[
                {
                  label:
                    provider.verificationStatus === 'pending' ? 'Decide verification' : 'Verification decision',
                  icon: 'shield-checkmark-outline',
                  onSelect: () => router.push(`/providers/${provider.id}/verification`),
                },
                {
                  label: 'Stop them trading',
                  icon: 'pause-outline',
                  destructive: true,
                  ...(canStopTrading ? { onSelect: () => setStopping(true) } : { unavailable: noStopBecause }),
                },
                isClosed
                  ? {
                      label: 'Open the business again',
                      icon: 'refresh',
                      onSelect: () => setReopening(true),
                    }
                  : {
                      label: 'Close the business',
                      icon: 'trash-outline',
                      destructive: true,
                      onSelect: () => setClosing(true),
                    },
              ]}
            />
            <Button label="Back to Providers" href="/providers" variant="ghost" size="md" />
          </>
        }
      />

      <div className={styles.detailGrid}>
        <div className={styles.detailStack}>
          <PageCard title="Business">
            <InfoRows>
              <Detail {...rowProps} label="Trading name" field="businessName" value={provider.businessName} />
              <Detail {...rowProps} label="Legal name" field="legalName" value={provider.legalName} />
              <Detail
                {...rowProps}
                label="Registration number"
                field="registrationNumber"
                value={provider.registrationNumber ?? ''}
              />
              <Detail
                {...rowProps}
                label="Contact email"
                field="contactEmail"
                value={provider.contactEmail}
                inputType="email"
              />
              <Detail {...rowProps} label="Business phone" field="phone" value={provider.phone} inputType="tel" />
              <Detail
                {...rowProps}
                label="Website"
                field="website"
                value={provider.website ?? ''}
                inputType="url"
                emptyText="None on file"
                valueNode={
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
                  ) : undefined
                }
              />
              <Detail {...rowProps} label="Town" field="town" value={provider.town} />
              <Detail
                {...rowProps}
                label="Island side"
                field="side"
                value={provider.side}
                options={[
                  { value: 'dutch', label: 'Dutch side' },
                  { value: 'french', label: 'French side' },
                ]}
                hint="Which side of the island they trade from. Customers filter on this, so it is not cosmetic."
              />
              <InfoRow label="Verification" value={<VerificationPill status={provider.verificationStatus} />} />
            </InfoRows>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Note>
                {isClosed
                  ? 'A closed business is a record rather than a live one, so nothing here can be changed. Open it again first.'
                  : 'A business normally changes these itself, from its own account. Correcting one here is for when it cannot — a name misspelled on a payout, an email that bounces. One field at a time, each with its own reason.'}
              </Note>
            </div>
          </PageCard>

          <PageCard title="What They Offer">
            <InfoRows>
              <Detail
                {...rowProps}
                label="Delivers vehicles"
                field="deliversVehicles"
                value={provider.deliversVehicles ? 'yes' : 'no'}
                options={YES_NO}
                asBoolean
                valueNode={<YesNo done={provider.deliversVehicles} yes="Yes" no="No" />}
              />
              <Detail
                {...rowProps}
                label="Airport pickup"
                field="airportPickup"
                value={provider.airportPickup ? 'yes' : 'no'}
                options={YES_NO}
                asBoolean
                valueNode={<YesNo done={provider.airportPickup} yes="Yes" no="No" />}
              />
              <Detail
                {...rowProps}
                label="Replies within"
                field="respondsIn"
                value={provider.respondsIn}
                options={[
                  { value: 'within_hour', label: RESPONDS_IN_LABELS.within_hour },
                  { value: 'within_hours', label: RESPONDS_IN_LABELS.within_hours },
                  { value: 'within_day', label: RESPONDS_IN_LABELS.within_day },
                ]}
                emptyText={RESPONDS_IN_LABELS['']}
                hint="Shown on their public page, so it is a promise to customers rather than a note."
              />
              <Detail
                {...rowProps}
                label="Description"
                field="description"
                value={provider.description}
                emptyText="None written"
                hint="This is what customers read on their page."
              />
              {/* NOT EDITABLE, AND THE SERVER REFUSES IT TOO: a rating is the sum
                  of what customers said. A staff-editable rating is not a
                  rating. */}
              <InfoRow
                label="Rating"
                value={
                  provider.reviewCount === 0
                    ? 'No reviews yet'
                    : `${provider.rating.toFixed(1)} from ${provider.reviewCount} reviews`
                }
              />
            </InfoRows>
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
                {isClosed
                  ? 'Every car came off the site when the business closed, and they stay off. Opening the business again does not put them back — each one goes live as its own decision.'
                  : 'Whether customers can book a car depends on that car’s own listing, not on this business being verified. To take a car off the site, open it and take its listing down.'}
              </Note>
            </div>
          </PageCard>

          {/* ---- THE TWO WAYS A BUSINESS STOPS ----
              Together in one card because the difference between them is the
              thing to get right, and it is only clear side by side. */}
          <PageCard
            title="Trading Status"
            subtitle={isClosed ? `Closed on ${longDate(closedOn)}` : undefined}
          >
            {isClosed ? (
              <>
                <div className={styles.pillRow}>
                  <StatusPill label="Closed" tone="danger" />
                  <Text variant="small" tone="ink3" as="span" raw>
                    Their page is off the site, and their cars are off with it.
                  </Text>
                </div>

                <div style={{ marginTop: 'var(--space-lg)' }}>
                  <Note icon="warning-outline" tone="ink2">
                    Opening it again lets the business trade and sign in — but its cars stay off the
                    site until each one is put back, one decision at a time. Nothing goes live the
                    moment you press this.
                  </Note>
                </div>

                <div style={{ marginTop: 'var(--space-lg)' }}>
                  <Button
                    label="Open It Again"
                    variant="secondary"
                    size="md"
                    onClick={() => setReopening(true)}
                  />
                </div>
              </>
            ) : (
              <>
                <Note>
                  Two different things, and the difference matters. Taking their fleet down leaves the
                  business open: it keeps its page, can sign in, and can put a car back tomorrow.
                  Closing takes the business itself off the site.
                </Note>

                <div style={{ marginTop: 'var(--space-lg)' }}>
                  <Text variant="label" as="p" raw>
                    Stop them trading
                  </Text>
                  <div style={{ marginTop: 'var(--space-sm)' }}>
                    {canStopTrading ? (
                      <>
                        <Note icon="warning-outline" tone="ink2">
                          Takes{' '}
                          {bookable.length === 1
                            ? 'their one live vehicle'
                            : `all ${bookable.length} of their live vehicles`}{' '}
                          down, so customers can no longer find or book any of them. Bookings already
                          made are not cancelled, and the business keeps its account.
                        </Note>
                        <div style={{ marginTop: 'var(--space-md)' }}>
                          <Button
                            label="Stop Them Trading"
                            variant="danger"
                            size="md"
                            onClick={() => setStopping(true)}
                          />
                        </div>
                      </>
                    ) : (
                      <Note icon="warning-outline" tone="ink2">
                        {noStopBecause}
                        {wholeFleetVisible || fleetLoading
                          ? ''
                          : ` This business has ${provider.vehicleCount} vehicles and the panel can only see ${theirVehicles.length} of them, so it cannot promise to take them all down.`}
                      </Note>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 'var(--space-xl)' }}>
                  <Text variant="label" as="p" raw>
                    Close the business
                  </Text>
                  <div style={{ marginTop: 'var(--space-sm)' }}>
                    <Note icon="warning-outline" tone="ink2">
                      Takes their page off the site and every car down with it, in one go. Nothing is
                      deleted and it can be opened again. SXM Rentals refuses while a rental is
                      running, a deposit is held on a customer’s card, or a payment to them is on its
                      way — it will say which.
                    </Note>
                    <div style={{ marginTop: 'var(--space-md)' }}>
                      <Button
                        label="Close The Business"
                        variant="danger"
                        size="md"
                        onClick={() => setClosing(true)}
                      />
                    </div>
                  </div>
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
              <Detail {...rowProps} label="Name" field="ownerName" value={provider.ownerName} />
              {/* THE OWNER'S OWN MOBILE, not the business line above. One row, and
                  the number inside it is held together: in this narrow right-hand
                  column it was breaking mid-number, which is the one piece of text
                  on the screen somebody is going to read out loud or copy. The
                  pill drops below it instead when there is no room. */}
              <Detail
                {...rowProps}
                label="Personal number"
                field="ownerPhone"
                value={provider.ownerPhone}
                inputType="tel"
                hint="The owner’s own mobile. Change it only once you have confirmed the new number with them."
                valueNode={
                  provider.ownerPhone ? (
                    <>
                      <Text variant="label" as="span" raw style={{ whiteSpace: 'nowrap' }}>
                        {provider.ownerPhone}
                      </Text>
                      <StatusPill label="Personal" tone="warning" dot={false} />
                    </>
                  ) : undefined
                }
              />
            </InfoRows>

            {provider.ownerPhone ? (
              <div style={{ marginTop: 'var(--space-lg)' }}>
                <Note icon="warning-outline" tone="ink2">
                  This is {provider.ownerName ? `${provider.ownerName.split(' ')[0]}’s` : 'the owner’s'} own
                  mobile, not the business line. Use it when something actually needs sorting out — a
                  stuck payout, a disputed deposit — and keep it inside this panel.
                </Note>
              </div>
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
          //
          // CLOSING A BUSINESS DOES THE SAME THING IN ONE TRANSACTION on the
          // server, which is better; this stays because stopping them trading is
          // deliberately the lighter of the two — the business keeps its page.
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

      {/* ---- CLOSING, AND OPENING AGAIN ----
          Both ask for the authenticator code as well as a reason, as the server
          does: a session left open on a desk is enough to approve a refund, and
          deliberately not enough to take a business off the site. */}
      <ReasonDialog
        open={closing}
        onClose={() => setClosing(false)}
        title="Close this business"
        description="Their page comes off the site and every one of their cars comes down with it, in one go. Nothing is deleted — past bookings and payouts still point at them — and it can be opened again. SXM Rentals refuses this while a rental is running, a deposit is held on a customer’s card, or a payment to them is on its way, and will say which."
        confirmLabel="Close the business"
        destructive
        confirmWithCode
        reasonPlaceholder="e.g. Owner is retiring and asked us to take the business down on 30 September."
        change={{
          subjectLabel: provider.businessName,
          field: 'Status',
          before: 'Open',
          after: 'Closed',
        }}
        onConfirm={async (reason, { code }) => {
          await apiClient.closeProvider(provider.id, reason, code ?? '');
          // Both, because closing takes the fleet down too — the fleet above
          // would otherwise still show their cars as live.
          refresh();
          refreshVehicles();
        }}
      />

      <ReasonDialog
        open={reopening}
        onClose={() => setReopening(false)}
        title="Open this business again"
        description="They can trade and sign in again. THEIR CARS STAY OFF THE SITE — each one goes back as its own decision, so nothing becomes bookable the moment you press this. SXM Rentals refuses if the owner has since closed their own account, because then nobody could act for the business."
        confirmLabel="Open it again"
        confirmWithCode
        reasonPlaceholder="e.g. Closed by mistake — the owner rang to say it was the wrong business."
        change={{
          subjectLabel: provider.businessName,
          field: 'Status',
          before: 'Closed',
          after: 'Open · cars still down',
        }}
        onConfirm={async (reason, { code }) => {
          await apiClient.reopenProvider(provider.id, reason, code ?? '');
          refresh();
          refreshVehicles();
        }}
      />
    </>
  );
}
