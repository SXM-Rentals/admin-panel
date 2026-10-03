'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: One business's request to have its fleet put on for it —
// what they told us, the files they sent, and the one button that says the work is
// finished.
//
// THE FILES ARE LINKS, NOT FETCHES, AND THAT IS DELIBERATE. Each one is a plain
// download the browser performs with the session cookie it already has. Nothing
// lands in the panel's memory, and the server sends every one of them as an
// attachment with nosniff — so a file a stranger uploaded can never be opened as a
// page inside this panel. A spreadsheet is somebody else's document and is treated
// like one.
//
// MARKING IT DONE DOES NOT ASK FOR A REASON, which is the one place on this screen
// somebody might expect the usual dialog. The audit log records changes to records:
// money, access, somebody's account. This is a job being ticked off a list of work
// — the server keeps who did it and when, and there is no "before" for a reason to
// explain. Said on screen, so the absence reads as a decision rather than a gap.

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient, fleetFileHref } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAdminSession } from '@/lib/auth';
import { fileSize, longDate, relativeDay } from '@/lib/format';
import { presentError } from '@/lib/api/errors';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { LoadFailed } from '@/components/layout/LoadFailed';
import { InfoRow, InfoRows, Note } from '@/components/admin/shared';
import { Button, Icon, Skeleton, StatusPill, Text, useToast } from '@/components/ui';
import styles from '@/components/admin/admin.module.css';

export default function FleetRequestPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { showToast } = useToast();
  // A viewer can read all of this and finish none of it.
  const { whyNoChanges } = useAdminSession();

  const { data: request, loading, error, refresh } = useAsyncData(() => apiClient.getFleetRequest(id), [id]);

  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | undefined>(undefined);

  // Could not be fetched is not the same as "no such request". See LoadFailed.
  if (error) return <LoadFailed title="Fleet Set-up" what="This request" error={error} onRetry={refresh} />;

  if (loading) return <Skeleton height={380} />;

  if (!request) {
    return (
      <>
        <PageHead title="Request not found" description="No fleet set-up request with that reference." />
        <Button label="Back to Fleet Set-up" href="/fleet-requests" variant="secondary" size="md" />
      </>
    );
  }

  const done = request.status === 'done';

  const markDone = async () => {
    setWorking(true);
    setProblem(undefined);
    try {
      await apiClient.markFleetRequestDone(request.id);
      refresh();
      showToast('Marked done.', `${request.businessName}’s cars still need their own listing decisions.`);
    } catch (caught) {
      setProblem(presentError(caught));
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <PageHead
        title={request.businessName}
        description={
          done
            ? `Their fleet was set up ${request.handledAt ? relativeDay(request.handledAt) : 'at some point'}.`
            : `Asked ${relativeDay(request.createdAt)} · ${request.fleetSize} ${request.fleetSize === 1 ? 'vehicle' : 'vehicles'} to add`
        }
        actions={<Button label="Back to Fleet Set-up" href="/fleet-requests" variant="ghost" size="md" />}
      />

      <div className={styles.detailGrid}>
        <div className={styles.detailStack}>
          <PageCard title="What They Asked For">
            <InfoRows>
              <InfoRow
                label="Business"
                value={
                  <Link href={`/providers/${request.providerId}`}>
                    <Text variant="label" tone="brand" as="span" raw>
                      {request.businessName} →
                    </Text>
                  </Link>
                }
              />
              <InfoRow label="Cars to add" value={String(request.fleetSize)} />
              <InfoRow label="What they have" value={request.recordFormat || 'Not said'} />
              <InfoRow label="Asked on" value={longDate(request.createdAt)} />
              <InfoRow
                label="Status"
                value={
                  done ? <StatusPill label="Done" tone="success" /> : <StatusPill label="Waiting" tone="warning" />
                }
              />
            </InfoRows>

            {request.notes ? (
              <div style={{ marginTop: 'var(--space-lg)' }}>
                <Text variant="caption" tone="ink3" as="p" raw>
                  WHAT THEY TOLD US
                </Text>
                <div style={{ marginTop: 'var(--space-xs)' }}>
                  <Text variant="small" tone="ink2" as="p" raw>
                    {request.notes}
                  </Text>
                </div>
              </div>
            ) : null}
          </PageCard>

          <PageCard
            title="Files They Sent"
            subtitle={
              request.files.length === 0
                ? 'None attached'
                : `${request.files.length} ${request.files.length === 1 ? 'file' : 'files'}`
            }
          >
            {request.files.length === 0 ? (
              <Note>
                They sent no files with this. Whatever they have is either in the note above or still
                to come — their contact detail is on the right.
              </Note>
            ) : (
              <div className={styles.linkList}>
                {request.files.map((file) => (
                  // A real link, so middle-clicking and "save as" work, and the
                  // browser does the downloading with the cookie it already has.
                  <a
                    key={file.id}
                    href={fleetFileHref(request.id, file.id)}
                    download={file.fileName}
                    className={styles.linkRow}
                  >
                    <Icon name="document-attach-outline" size={17} color="var(--ink3)" />
                    <span className={styles.linkRowText}>
                      <Text variant="label" as="span" raw>
                        {file.fileName}
                      </Text>
                      <Text variant="small" tone="ink3" as="p" raw>
                        {fileSize(file.size)} · {file.contentType}
                      </Text>
                    </span>
                    <Icon name="download-outline" size={16} color="var(--ink3)" />
                  </a>
                ))}
              </div>
            )}

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Note icon="warning-outline" tone="ink2">
                These are the business&rsquo;s own documents. Each one downloads rather than opening in
                the panel, on purpose. Keep them where the rest of your work keeps paperwork, and not
                in a personal folder.
              </Note>
            </div>
          </PageCard>
        </div>

        <div className={styles.detailStack}>
          <PageCard title="Who To Speak To">
            <InfoRows>
              <InfoRow label="For this job" value={request.contact || 'Nothing given'} />
            </InfoRows>
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Note icon="warning-outline" tone="ink2">
                Given for setting their fleet up. It is not a general contact for the business —
                that is on their business screen.
              </Note>
            </div>
          </PageCard>

          <PageCard title="Finishing It" subtitle={done ? 'Already done' : undefined}>
            {done ? (
              <Note>
                Marked done{request.handledAt ? ` on ${longDate(request.handledAt)}` : ''}. Their cars
                are on SXM Rentals — each one still needs its own listing decision before customers
                can book it.
              </Note>
            ) : (
              <>
                <Note>
                  Tick this once their cars are actually on. It takes no reason: nothing about a
                  record changes, and the server keeps who finished it and when. What each car then
                  needs is its own listing decision, on the Vehicles screen.
                </Note>

                {problem ? (
                  <div style={{ marginTop: 'var(--space-md)' }} className={styles.dialogProblem} role="alert">
                    <Icon name="alert-circle-outline" size={16} color="var(--danger)" />
                    <Text variant="small" as="p" raw>
                      {problem}
                    </Text>
                  </div>
                ) : null}

                <div style={{ marginTop: 'var(--space-lg)' }}>
                  <Button
                    label="Mark Fleet Set Up"
                    variant="primary"
                    size="md"
                    loading={working}
                    disabled={working || whyNoChanges !== undefined}
                    title={whyNoChanges}
                    onClick={markDone}
                  />
                </div>

                {whyNoChanges ? (
                  <div style={{ marginTop: 'var(--space-md)' }}>
                    <Note icon="lock-closed-outline" tone="ink2">
                      {whyNoChanges}
                    </Note>
                  </div>
                ) : null}
              </>
            )}
          </PageCard>
        </div>
      </div>
    </>
  );
}
