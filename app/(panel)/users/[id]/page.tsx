'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: One customer in full — their details, how their identity
// check went, what they have spent, and their rewards balance. It is also where
// a member of staff can adjust that balance.
//
// THE POINTS ADJUSTMENT IS THE WHOLE REASON THIS SCREEN EXISTS as something more
// than a read-only record. It is the most common goodwill gesture on a support
// call: a customer whose car turned up two hours late gets a few hundred points
// and goes away happy. It is also, for exactly that reason, the easiest thing in
// the panel to abuse — points are worth money.
//
// So it cannot be done in one click. It goes through the reason dialog, like
// every other change in this panel, which means the adjustment, the person who
// made it, the before and after figures and the reason all land in the audit log
// together. That is not friction for its own sake: it is the difference between
// a goodwill gesture and an unexplained transfer of value.

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { money, longDate, relativeDay } from '@/lib/format';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { InfoRow, InfoRows, Note, VerificationPill, YesNo } from '@/components/admin/shared';
import { EditableRow } from '@/components/admin/EditableRow';
import { CloseAccount } from '@/components/admin/CloseAccount';
import { Button, MockBanner, Skeleton, StatusPill, Text } from '@/components/ui';
import styles from '@/components/admin/admin.module.css';

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const { data: user, loading, refresh } = useAsyncData(() => apiClient.getUser(id), [id]);

  // The number typed into the box, and whether the dialog is open.
  const [newPoints, setNewPoints] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);

  if (loading) return <Skeleton height={420} />;

  if (!user) {
    return (
      <>
        <PageHead title="Customer not found" description="No account with that reference." />
        <Button label="Back to Users" href="/users" variant="secondary" size="md" />
      </>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`;
  const parsedPoints = Number(newPoints);
  const pointsValid = newPoints !== '' && Number.isFinite(parsedPoints) && parsedPoints >= 0;

  return (
    <>
      <PageHead
        title={`${user.firstName} ${user.lastName}`}
        description={user.deletedAt
          ? `This account was closed on ${longDate(user.deletedAt)}. It is kept so the audit log has something to point at.`
          : `Customer since ${longDate(user.memberSince)} · last active ${relativeDay(user.lastActiveAt)}`}
        actions={<Button label="Back to Users" href="/users" variant="ghost" size="md" />}
      />

      <MockBanner />

      <div className={styles.detailGrid}>
        {/* ---- THE RECORD ---- */}
        <div className={styles.detailStack}>
          <PageCard title="Account">
            <InfoRows>
              {/* Each of these is edited on its own and logged on its own — see
                  the note at the top of EditableRow. A closed account is a
                  record rather than a live one, so nothing on it is editable. */}
              <EditableRow
                label="First name"
                value={user.firstName}
                subjectType="customer"
                subjectId={user.id}
                subjectLabel={fullName}
                onSave={async (next) => {
                  await apiClient.updateUser(user.id, 'firstName', next);
                  refresh();
                }}
              />
              <EditableRow
                label="Last name"
                value={user.lastName}
                subjectType="customer"
                subjectId={user.id}
                subjectLabel={fullName}
                onSave={async (next) => {
                  await apiClient.updateUser(user.id, 'lastName', next);
                  refresh();
                }}
              />
              <EditableRow
                label="Email"
                value={user.email}
                inputType="email"
                subjectType="customer"
                subjectId={user.id}
                subjectLabel={fullName}
                onSave={async (next) => {
                  await apiClient.updateUser(user.id, 'email', next);
                  refresh();
                }}
              />
              <EditableRow
                label="Phone"
                value={user.phone}
                inputType="tel"
                subjectType="customer"
                subjectId={user.id}
                subjectLabel={fullName}
                onSave={async (next) => {
                  await apiClient.updateUser(user.id, 'phone', next);
                  refresh();
                }}
              />
              <EditableRow
                label="Account type"
                value={user.accountType}
                auditField="Account type"
                options={[
                  { value: 'local', label: 'Local Resident' },
                  { value: 'tourist', label: 'Tourist' },
                ]}
                subjectType="customer"
                subjectId={user.id}
                subjectLabel={fullName}
                hint="Moving somebody to Tourist also removes their Islander status, because Islander is a residency flag and they would no longer be registered as a resident."
                onSave={async (next) => {
                  await apiClient.updateUser(user.id, 'accountType', next);
                  refresh();
                }}
              />
              <InfoRow
                label="Islander status"
                value={
                  user.isIslander ? (
                    <StatusPill label="Islander" tone="success" dot={false} />
                  ) : (
                    'Not an Islander'
                  )
                }
              />
              <InfoRow label="Member since" value={longDate(user.memberSince)} />
            </InfoRows>

            {/* Said here rather than assumed, because the two look alike on a
                list and mean completely different things. */}
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Note>
                Islander is a residency flag, granted once residency has been proved. It is not
                earned by spending and is separate from the rewards tier below.
              </Note>
            </div>
          </PageCard>

          <PageCard title="Identity Verification">
            <InfoRows>
              <InfoRow label="Status" value={<VerificationPill status={user.verification.status} />} />
              <InfoRow
                label="Selfie / liveness check"
                value={<YesNo done={user.verification.selfieDone} />}
              />
              <InfoRow
                label="Driving licence"
                value={<YesNo done={user.verification.licenseDone} />}
              />
              <InfoRow
                label={user.accountType === 'local' ? 'Residency document' : 'Passport'}
                value={<YesNo done={user.verification.identityDocDone} />}
              />
              {user.verification.submittedAt ? (
                <InfoRow label="Submitted" value={longDate(user.verification.submittedAt)} />
              ) : null}
            </InfoRows>

            {user.verification.reason ? (
              <div className={styles.rejectionNote} style={{ marginTop: 'var(--space-lg)' }}>
                <Text variant="caption" tone="danger" as="p" raw>
                  WHY THIS WAS TURNED DOWN
                </Text>
                <Text variant="small" as="p" raw>
                  {user.verification.reason}
                </Text>
              </div>
            ) : null}
          </PageCard>

          {/* ---- CLOSING THE ACCOUNT ----
              Last on the screen, because it is the last thing anybody should be
              doing here, and because putting it near the top invites a mis-click
              on a record somebody opened to read. */}
          <PageCard title="Close Account">
            <CloseAccount
              subjectType="customer"
              subjectId={user.id}
              subjectLabel={fullName}
              currentState={`Active · ${user.tier.charAt(0).toUpperCase() + user.tier.slice(1)} · ${user.points.toLocaleString()} points`}
              alreadyClosed={Boolean(user.deletedAt)}
              closedOn={user.deletedAt ? longDate(user.deletedAt) : undefined}
              check={() => apiClient.canCloseUser(user.id)}
              onClose={async () => {
                await apiClient.closeUser(user.id);
                refresh();
              }}
            />
          </PageCard>
        </div>

        {/* ---- THE SMALLER FACTS, AND THE ONE THING THAT CAN BE CHANGED ---- */}
        <div className={styles.detailStack}>
          <PageCard title="Rewards">
            <InfoRows>
              <InfoRow label="Points balance" value={user.points.toLocaleString()} />
              <InfoRow
                label="Tier"
                value={user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
              />
            </InfoRows>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Text variant="caption" tone="ink3" as="p" raw>
                ADJUST THE BALANCE
              </Text>
              <div className={styles.settingControl} style={{ marginTop: 'var(--space-sm)' }}>
                <input
                  className={styles.numberInput}
                  type="number"
                  min={0}
                  value={newPoints}
                  onChange={(event) => setNewPoints(event.target.value)}
                  placeholder={String(user.points)}
                  aria-label="New points balance"
                />
                <Button
                  label="Adjust"
                  variant="secondary"
                  size="sm"
                  disabled={!pointsValid || parsedPoints === user.points}
                  onClick={() => setDialogOpen(true)}
                />
              </div>
              <Text variant="small" tone="ink3" as="p" raw style={{ marginTop: 8 }}>
                A reason is required, and the change is written to the audit log against your
                name.
              </Text>
            </div>
          </PageCard>

          <PageCard title="Activity">
            <InfoRows>
              <InfoRow label="Bookings" value={String(user.bookingCount)} />
              <InfoRow label="Lifetime spend" value={money(user.lifetimeSpend)} />
              <InfoRow label="Last active" value={relativeDay(user.lastActiveAt)} />
            </InfoRows>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Link href={`/bookings?customer=${encodeURIComponent(`${user.firstName} ${user.lastName}`)}`}>
                <Text variant="small" tone="brand" as="span" raw>
                  See this customer’s bookings →
                </Text>
              </Link>
            </div>
          </PageCard>
        </div>
      </div>

      <ReasonDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Adjust rewards points"
        description="Points are worth money, so this change is recorded in full."
        confirmLabel="Adjust points"
        reasonPlaceholder="e.g. Goodwill after the vehicle was delivered two hours late."
        audit={{
          action: 'points_adjusted',
          subjectType: 'customer',
          subjectId: user.id,
          subjectLabel: `${user.firstName} ${user.lastName}`,
          field: 'Rewards points',
          before: user.points.toLocaleString(),
          after: pointsValid ? parsedPoints.toLocaleString() : '—',
        }}
        onConfirm={async () => {
          await apiClient.adjustUserPoints(user.id, parsedPoints);
          setNewPoints('');
          refresh();
        }}
      />
    </>
  );
}
