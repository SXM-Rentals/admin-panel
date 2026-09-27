'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Who can sign in to this panel — adding a member of staff,
// resetting the sign-in of one who is locked out, and taking away the access of
// one who has left.
//
// THESE ARE THE ONLY CHANGES THAT DECIDE WHO CAN GET IN AT ALL, so each one asks
// for two things: a reason, like every change in the panel, and the six digits
// your authenticator app shows right now. A session left open on somebody's
// desk is enough to approve a refund; it is deliberately not enough to create a
// new administrator, reset a colleague, or lock everybody else out.
//
// A NEW OR RESET PERSON GETS A TEMPORARY PASSWORD, which they must replace the
// first time they sign in. Whoever set it knows it; if it stayed their working
// password, two people could act as one account and the audit log's "who did
// this" would stop meaning anything. The panel shows the temporary password
// exactly once, straight after the server accepts it, for passing on privately.
//
// NOBODY CAN RESET OR REMOVE THEMSELVES FROM HERE. It keeps the panel from ever
// locking out the last person able to fix things — your own password is changed
// on Your Account instead. The server enforces the same rule.
//
// PEOPLE WHOSE ACCESS HAS BEEN REMOVED STAY IN THE LIST. Their past entries in
// the audit log still need a name to point at, and restoring access is one
// click, not a new account.

import React, { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAdminSession } from '@/lib/auth';
import { relativeDay } from '@/lib/format';
import { passwordProblem, temporaryPassword } from '@/lib/passwords';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { DataTable, CellStack, type Column } from '@/components/tables/DataTable';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { Note } from '@/components/admin/shared';
import { Button, Checkbox, Input, StatusPill, Text, useToast } from '@/components/ui';
import type { StaffAccount } from '@/types';
import styles from '@/components/admin/admin.module.css';

// What is about to be done, while its reason and code are asked for.
type Action =
  | { kind: 'create' }
  | { kind: 'reset'; account: StaffAccount }
  | { kind: 'disable'; account: StaffAccount }
  | { kind: 'enable'; account: StaffAccount };

// What to pass on, shown once the server has accepted an add or a reset.
type Handover = {
  name: string;
  email: string;
  password: string;
  newAuthenticator: boolean;
  isNew: boolean;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function StaffPage() {
  const { staff: me } = useAdminSession();
  const { showToast } = useToast();
  const { data: accounts, loading, error, refresh } = useAsyncData(() => apiClient.listStaffAccounts(), []);

  // ---- ADDING SOMEBODY ----
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  // A strong one is suggested, and can be typed over.
  const [password, setPassword] = useState(() => temporaryPassword());
  const [touched, setTouched] = useState(false);

  // ---- A RESET BEING PREPARED ----
  const [resetting, setResetting] = useState<StaffAccount | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [newAuthenticator, setNewAuthenticator] = useState(false);

  const [action, setAction] = useState<Action | null>(null);
  const [handover, setHandover] = useState<Handover | null>(null);

  const all = accounts ?? [];

  // A SERVER FROM BEFORE STAFF ACCOUNTS answers with names and emails and
  // nothing else — no way to know who has set up an authenticator, and no
  // addresses to add or reset anybody. Said plainly, and nothing offered that
  // would only fail.
  const serverReady = all.length === 0 || all.every((account) => typeof account.createdAt === 'string');

  // Could not be fetched is not the same as nobody. See LoadFailed.
  if (error) return <LoadFailed title="Staff" what="The staff list" error={error} onRetry={refresh} />;

  const nameProblem = name.trim() === '' ? 'Their full name, as it should appear in the audit log.' : undefined;
  const emailProblem = EMAIL.test(email.trim()) ? undefined : 'The email address they will sign in with.';
  const addProblem = nameProblem ?? emailProblem ?? passwordProblem(password);
  const resetProblem = passwordProblem(resetPassword);

  const startReset = (account: StaffAccount) => {
    setResetting(account);
    setResetPassword(temporaryPassword());
    setNewAuthenticator(false);
    setHandover(null);
  };

  const columns: Column<StaffAccount>[] = [
    {
      id: 'name',
      header: 'Name',
      sortValue: (a) => a.name,
      cell: (a) => <CellStack title={a.id === me?.id ? `${a.name} (you)` : a.name} detail={a.email} />,
    },
    ...(serverReady
      ? [
          {
            id: 'authenticator',
            header: 'Authenticator',
            sortValue: (a: StaffAccount) => (a.mfaEnrolled ? 1 : 0),
            cell: (a: StaffAccount) =>
              a.mfaEnrolled ? (
                <StatusPill label="Set Up" tone="success" />
              ) : (
                <StatusPill label="Not Yet" tone="warning" />
              ),
          },
          {
            id: 'lastSignIn',
            header: 'Last signed in',
            sortValue: (a: StaffAccount) => a.lastSignInAt ?? '',
            cell: (a: StaffAccount) => (a.lastSignInAt ? relativeDay(a.lastSignInAt) : 'Never'),
          },
          {
            id: 'status',
            header: 'Access',
            sortValue: (a: StaffAccount) => (a.disabledAt ? 2 : a.mustChangePassword ? 1 : 0),
            cell: (a: StaffAccount) =>
              a.disabledAt ? (
                <StatusPill label="Access Removed" tone="danger" />
              ) : a.mustChangePassword ? (
                <StatusPill label="Must Set Own Password" tone="warning" />
              ) : (
                <StatusPill label="Active" tone="success" />
              ),
          },
        ]
      : []),
  ];

  const active = all.filter((account) => !account.disabledAt).length;

  return (
    <>
      <PageHead
        title="Staff"
        description="Who can sign in to this panel. Adding somebody, resetting their sign-in or removing their access needs a reason and your authenticator code."
      />

      {!serverReady ? (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <Note icon="warning-outline" tone="ink2">
            The SXM Rentals server has not been updated for staff accounts yet, so this list only
            shows who can sign in, and nothing here can be changed. The update is written up for the
            backend in ADMIN_STAFF_ACCOUNTS_HANDOFF.md.
          </Note>
        </div>
      ) : null}

      {/* ---- WHAT TO PASS ON ----
          Straight after an add or a reset, and only then. Dismissing it takes
          the password off the screen for good. */}
      {handover ? (
        <PageCard
          title={`Pass These On To ${handover.name.split(' ')[0]}`}
          subtitle="Privately — in person or by phone. This is the only time the panel shows this password."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <Text variant="small" tone="ink2" as="p" raw>
              Sign in at {typeof window !== 'undefined' ? window.location.origin : 'the admin panel'} as{' '}
              {handover.email}, with this temporary password:
            </Text>
            <div className={styles.handoverSecret}>{handover.password}</div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
              <Button
                label="Copy Password"
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard
                    .writeText(handover.password)
                    .then(() => showToast('Copied.'))
                    .catch(() => showToast('Could not copy — select it and copy it by hand.'));
                }}
              />
              <Button
                label="Done — Hide the Password"
                variant="ghost"
                size="sm"
                onClick={() => setHandover(null)}
              />
            </div>
            <Note>
              They must choose their own password the first time they sign in, and this one stops
              working when they do.
              {handover.newAuthenticator
                ? ' They will set up an authenticator app as part of signing in.'
                : ''}
            </Note>
            {/* WORDED FOR EITHER SETTING, because the panel cannot tell which
                is in force. Vercel can be set to keep its own login in front of
                this address, or to leave it to the panel's sign-in alone. If the
                wall is up, a new person needs their own way past it; if it has
                been taken down, the line below simply does not apply. The way to
                tell is to open the panel in a private window. */}
            {handover.isNew ? (
              <Note icon="warning-outline" tone="ink2">
                If Vercel&rsquo;s own login still stands in front of the panel, they need their own way
                past it too: they sign in with their own Vercel account, press Request access, and you
                approve it under Settings → Deployment Protection → Requests.
              </Note>
            ) : null}
          </div>
        </PageCard>
      ) : null}

      <PageCard
        title="Staff Accounts"
        subtitle={
          serverReady
            ? `${active} can sign in${all.length > active ? ` · ${all.length - active} with access removed` : ''}`
            : `${all.length} can sign in`
        }
        flush
      >
        <DataTable
          rows={all}
          columns={columns}
          rowKey={(a) => a.id}
          rowMuted={(a) => Boolean(a.disabledAt)}
          loading={loading}
          initialSort={{ columnId: 'name', direction: 'asc' }}
          emptyTitle="Nobody yet"
          emptyMessage="Staff accounts appear here once they exist."
          rowActions={(a) =>
            !serverReady ? null : a.id === me?.id ? (
              <Link href="/account">
                <Text variant="small" tone="brand" as="span" raw>
                  Your account →
                </Text>
              </Link>
            ) : a.disabledAt ? (
              <Button
                label="Restore Access"
                variant="secondary"
                size="sm"
                onClick={() => setAction({ kind: 'enable', account: a })}
              />
            ) : (
              <>
                <Button label="Reset Sign-in" variant="secondary" size="sm" onClick={() => startReset(a)} />
                <Button
                  label="Remove Access"
                  variant="outline"
                  size="sm"
                  onClick={() => setAction({ kind: 'disable', account: a })}
                />
              </>
            )
          }
        />
      </PageCard>

      {/* ---- PREPARING A RESET ----
          The temporary password and whether their phone is gone are settled
          here; the reason and your code are asked for when it is sent. */}
      {resetting && serverReady ? (
        <PageCard
          title={`Reset ${resetting.name}’s Sign-in`}
          subtitle="For a forgotten password or a lost phone. They are signed out everywhere at once."
        >
          <div className={styles.passwordForm}>
            <Input
              label="Temporary password"
              iconLeft="key-outline"
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
              error={resetProblem}
              hint="A strong one is suggested. They replace it the first time they sign in."
            />
            <div>
              <Button
                label="Suggest Another"
                variant="ghost"
                size="sm"
                onClick={() => setResetPassword(temporaryPassword())}
              />
            </div>
            <Checkbox
              checked={newAuthenticator}
              onChange={setNewAuthenticator}
              label="Their phone is lost or new"
              hint="They will set up their authenticator app again when they next sign in."
            />
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <Button
                label="Reset Sign-in"
                variant="primary"
                size="md"
                disabled={resetProblem !== undefined}
                onClick={() => setAction({ kind: 'reset', account: resetting })}
              />
              <Button label="Cancel" variant="ghost" size="md" onClick={() => setResetting(null)} />
            </div>
          </div>
        </PageCard>
      ) : null}

      {/* ---- ADDING SOMEBODY ---- */}
      {serverReady ? (
        <PageCard
          title="Add a Staff Member"
          subtitle="They get full access, like everybody else. Every change they make is on the record under their name."
        >
          <div className={styles.passwordForm}>
            <Input
              label="Full name"
              iconLeft="person-outline"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => setTouched(true)}
              error={touched ? nameProblem : undefined}
              placeholder="Carla Ruiz"
            />
            <Input
              label="Email"
              type="email"
              iconLeft="mail-outline"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched(true)}
              error={touched && email !== '' ? emailProblem : undefined}
              placeholder="carla@sxmrentals.app"
            />
            <Input
              label="Temporary password"
              iconLeft="key-outline"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={passwordProblem(password)}
              hint="A strong one is suggested. They replace it the first time they sign in."
            />
            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
              <Button
                label="Add Staff Member"
                variant="primary"
                size="md"
                disabled={addProblem !== undefined}
                onClick={() => {
                  setTouched(true);
                  if (addProblem === undefined) setAction({ kind: 'create' });
                }}
              />
              <Button
                label="Suggest Another Password"
                variant="ghost"
                size="md"
                onClick={() => setPassword(temporaryPassword())}
              />
            </div>
          </div>
        </PageCard>
      ) : null}

      {action ? (
        <ReasonDialog
          open
          onClose={() => setAction(null)}
          confirmWithCode
          {...dialogFor(action, { name: name.trim(), email: email.trim().toLowerCase(), newAuthenticator })}
          onConfirm={async (reason, { code = '' }) => {
            if (action.kind === 'create') {
              const created = await apiClient.createStaff(
                { name: name.trim(), email: email.trim().toLowerCase(), password },
                reason,
                code,
              );
              setHandover({
                name: created.name,
                email: created.email,
                password,
                newAuthenticator: true,
                isNew: true,
              });
              setName('');
              setEmail('');
              setPassword(temporaryPassword());
              setTouched(false);
            } else if (action.kind === 'reset') {
              await apiClient.resetStaff(
                action.account.id,
                { password: resetPassword, resetAuthenticator: newAuthenticator },
                reason,
                code,
              );
              setHandover({
                name: action.account.name,
                email: action.account.email,
                password: resetPassword,
                newAuthenticator,
                isNew: false,
              });
              setResetting(null);
            } else if (action.kind === 'disable') {
              await apiClient.disableStaff(action.account.id, reason, code);
            } else {
              await apiClient.enableStaff(action.account.id, reason, code);
            }
            refresh();
          }}
        />
      ) : null}
    </>
  );
}

// ---- WHAT EACH DIALOG SAYS ----
// Kept apart from the screen above so the four read side by side.
function dialogFor(
  action: Action,
  draft: { name: string; email: string; newAuthenticator: boolean },
): {
  title: string;
  description: string;
  confirmLabel: string;
  destructive: boolean;
  reasonPlaceholder: string;
  change: { subjectLabel: string; field: string; before: string; after: string };
} {
  switch (action.kind) {
    case 'create':
      return {
        title: 'Add a member of staff',
        description:
          'They will be able to see and change everything in this panel. Say who they are and why they need access.',
        confirmLabel: 'Add staff member',
        destructive: false,
        reasonPlaceholder: 'e.g. Carla joins the support team on Monday and will handle disputes.',
        change: {
          subjectLabel: `${draft.name} · ${draft.email}`,
          field: 'Staff account',
          before: 'Did not exist',
          after: 'Can sign in',
        },
      };
    case 'reset':
      return {
        title: `Reset ${action.account.name}’s sign-in`,
        description:
          'They are signed out everywhere, and must use the temporary password to sign in and then choose their own.',
        confirmLabel: 'Reset sign-in',
        destructive: true,
        reasonPlaceholder: 'e.g. Carla forgot her password — confirmed it was her by phone.',
        change: {
          subjectLabel: `${action.account.name} · ${action.account.email}`,
          field: 'Sign-in',
          before: 'Working',
          after: draft.newAuthenticator ? 'Temporary password, new authenticator' : 'Temporary password',
        },
      };
    case 'disable':
      return {
        title: `Remove ${action.account.name}’s access`,
        description:
          'They are signed out everywhere at once and cannot sign in again until access is restored. Their past changes stay in the audit log under their name.',
        confirmLabel: 'Remove access',
        destructive: true,
        reasonPlaceholder: 'e.g. Carla left SXM Rentals on 30 September.',
        change: {
          subjectLabel: `${action.account.name} · ${action.account.email}`,
          field: 'Access',
          before: 'Can sign in',
          after: 'Access removed',
        },
      };
    case 'enable':
      return {
        title: `Restore ${action.account.name}’s access`,
        description:
          'They can sign in again with the password they had. If they need a new one, reset their sign-in afterwards.',
        confirmLabel: 'Restore access',
        destructive: false,
        reasonPlaceholder: 'e.g. Carla is back from leave and needs the panel again.',
        change: {
          subjectLabel: `${action.account.name} · ${action.account.email}`,
          field: 'Access',
          before: 'Access removed',
          after: 'Can sign in',
        },
      };
  }
}
