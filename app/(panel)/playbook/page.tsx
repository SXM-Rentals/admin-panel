'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The Playbook — what SXM Rentals is built out of, laid out
// the way the system is actually shaped: frontend, backend, the APIs between
// them, and the infrastructure underneath.
//
// WHY IT IS GROUPED BY LAYER. "What are we using for X" is nearly always asked
// about a layer — what runs in the browser, what runs on the server, what we
// call out to, where it is hosted. A flat alphabetical list answers a question
// nobody asks and makes everybody scan the whole page. Grouped this way somebody
// jumps to the heading they want and stops reading.
//
// THE COMPONENT LIST SHOWS THE REAL THING, NOT A PICTURE OF IT. Each row renders
// the actual component beside its description, so the list cannot drift out of
// date the way a screenshot would — if a button changes, this page changes with
// it. It is also the place to look before building a new screen: this is what
// there is, so use it rather than making another one.

import React from 'react';
import { PageCard, PageHead } from '@/components/layout/PageCard';
import { InfoRow, InfoRows, Note } from '@/components/admin/shared';
import {
  backendRoutes,
  infrastructure,
  layers,
  repos,
  serviceCategoryLabels,
  services,
  stack,
  type Layer,
} from '@/lib/playbook';
import { Button, Chip, Icon, Input, StatusPill, Text, Toggle } from '@/components/ui';
import type { IconName } from '@/components/ui';
import packageJson from '@/package.json';
import type { PlaybookService } from '@/types';
import styles from '@/components/admin/admin.module.css';

// Read straight out of package.json, so this page cannot claim a version that is
// not installed. Anything without an entry here simply shows no version.
const VERSIONS: Record<string, string> = {
  typescript: packageJson.devDependencies.typescript,
  next: packageJson.dependencies.next,
  react: packageJson.dependencies.react,
  vitest: packageJson.devDependencies.vitest,
};

// The shared pieces this panel is built from, each with a live example.
const COMPONENTS: { name: string; what: string; demo: React.ReactNode }[] = [
  {
    name: 'Button',
    what: 'Every action in the panel. Five looks, three sizes.',
    demo: (
      <>
        <Button label="Primary" variant="primary" size="sm" />
        <Button label="Secondary" variant="secondary" size="sm" />
        <Button label="Danger" variant="danger" size="sm" />
      </>
    ),
  },
  {
    name: 'StatusPill',
    what: 'A state, said in a word and a colour. Never the colour alone.',
    demo: (
      <>
        <StatusPill label="Verified" tone="success" />
        <StatusPill label="Pending" tone="warning" />
        <StatusPill label="Rejected" tone="danger" />
      </>
    ),
  },
  {
    name: 'Chip',
    what: 'A filter you can see the state of without opening it.',
    demo: (
      <>
        <Chip label="All" selected />
        <Chip label="Local" />
      </>
    ),
  },
  {
    name: 'Input',
    what: 'A labelled box, with an optional icon and an error line.',
    demo: <Input placeholder="Search" iconLeft="search" />,
  },
  {
    name: 'Toggle',
    what: 'An on/off switch. Used for the feature flags.',
    demo: <Toggle label="Example switch" value onChange={() => {}} />,
  },
  {
    name: 'DataTable',
    what: 'The sortable, paged list that nine screens are built from.',
    demo: (
      <Text variant="small" tone="ink3" as="span" raw>
        Users · Bookings · Payments · Audit
      </Text>
    ),
  },
  {
    name: 'ReasonDialog',
    what: 'The pop-up every change goes through. Will not submit without a reason, and writes the audit entry itself.',
    demo: (
      <Text variant="small" tone="ink3" as="span" raw>
        Approvals · Refunds · Deposits
      </Text>
    ),
  },
  {
    name: 'Chart',
    what: 'Bars and lines drawn as shapes in the page. No charting library.',
    demo: (
      <Text variant="small" tone="ink3" as="span" raw>
        Dashboard · Analytics
      </Text>
    ),
  },
];

export default function PlaybookPage() {
  const byLayer = (layer: Layer) => stack.filter((item) => item.layer === layer);
  const reposIn = (layer: Layer) => repos.filter((r) => r.layer === layer);

  return (
    <>
      <PageHead
        title="Playbook"
        description="What SXM Rentals is built out of — frontend, backend, the APIs between them, and the infrastructure underneath."
      />

      <Note icon="warning-outline" tone="ink2">
        This is a second copy of information that lives in the Developer Guide first. When the
        guide changes, change this too — a copy that has drifted is worse than no copy, because
        people trust it.
      </Note>

      {/* ---- THE FOUR LAYERS, AS A MAP ---- */}
      <PageCard title="How It Fits Together" subtitle="Four layers, in the order the data travels">
        <div className={styles.layerMap}>
          {layers.map((layer, i) => (
            <React.Fragment key={layer.id}>
              <div className={styles.layerCard}>
                <Icon name={layer.icon as IconName} size={20} color="var(--brand)" />
                <Text variant="label" as="p" raw>
                  {layer.title}
                </Text>
                <Text variant="small" tone="ink3" as="p" raw>
                  {layer.blurb}
                </Text>
              </div>
              {i < layers.length - 1 ? (
                <Icon name="chevron-forward" size={16} color="var(--ink3)" />
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </PageCard>

      {/* ---- 1. FRONTEND ---- */}
      <PageCard
        title="Frontend"
        subtitle="What a person actually looks at — the website, the phone app, and this panel"
      >
        <StackList items={byLayer('frontend')} />

        <div style={{ marginTop: 'var(--space-2xl)' }}>
          <Text variant="caption" tone="ink3" as="p" raw>
            CODEBASES
          </Text>
          <div className={styles.playbookGrid} style={{ marginTop: 'var(--space-md)' }}>
            {reposIn('frontend').map((repo) => (
              <div key={repo.name} className={styles.playbookItem}>
                <span className={styles.mono}>{repo.name}</span>
                <Text variant="small" tone="ink2" as="p" raw>
                  {repo.purpose}
                </Text>
                <Text variant="caption" tone="ink3" as="p" raw>
                  {repo.stack}
                </Text>
              </div>
            ))}
          </div>
        </div>
      </PageCard>

      {/* ---- 2. BACKEND ---- */}
      <PageCard
        title="Backend"
        subtitle="The engine — booking, availability, payment splitting, verification, notifications"
      >
        <StackList items={byLayer('backend')} />

        <div style={{ marginTop: 'var(--space-2xl)' }}>
          <Text variant="caption" tone="ink3" as="p" raw>
            CODEBASE
          </Text>
          <div className={styles.playbookGrid} style={{ marginTop: 'var(--space-md)' }}>
            {reposIn('backend').map((repo) => (
              <div key={repo.name} className={styles.playbookItem}>
                <span className={styles.mono}>{repo.name}</span>
                <Text variant="small" tone="ink2" as="p" raw>
                  {repo.purpose}
                </Text>
                <Text variant="caption" tone="ink3" as="p" raw>
                  {repo.stack}
                </Text>
              </div>
            ))}
          </div>
        </div>
      </PageCard>

      {/* ---- 3. APIs ---- */}
      <PageCard
        title="APIs & Integrations"
        subtitle="The outside companies the platform calls, and the API it offers to rental businesses"
      >
        <ServiceList items={services} />
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Note>
            Costs are planning-baseline figures from the Overview doc, not quotes. Confirm
            current pricing with each vendor before committing a budget.
          </Note>
        </div>
      </PageCard>

      {/* ---- 4. INFRASTRUCTURE ---- */}
      <PageCard
        title="Infrastructure"
        subtitle="Where all of it runs, and where the files and the database live"
      >
        <ServiceList items={infrastructure} />
      </PageCard>

      {/* ---- WHAT THIS PANEL CALLS ---- */}
      <div className={styles.detailGrid}>
        <div className={styles.detailStack}>
          <PageCard
            title="What This Panel Will Call"
            subtitle="Every screen here runs on sample data today. These are the addresses it will use."
          >
            <InfoRows>
              {backendRoutes.map((route) => (
                <InfoRow
                  key={route.group}
                  label={route.purpose}
                  value={<span className={styles.mono}>{route.group}</span>}
                />
              ))}
            </InfoRows>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <Note>
                Every screen asks lib/api-client.ts for its data, and nothing else. That is what
                makes connecting the real backend a change to one file rather than a hunt
                through sixteen screens.
              </Note>
            </div>
          </PageCard>
        </div>

        <div className={styles.detailStack}>
          <PageCard title="How This Panel Looks">
            <Text variant="small" tone="ink2" as="p" raw>
              Dark only, on purpose. The colours are the customer website’s dark palette, lifted
              whole so the two products look like one company. There is no light mode and no
              toggle — see the note at the top of app/globals.css before adding one.
            </Text>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <Text variant="small" tone="ink2" as="p" raw>
                It is also desktop only. Staff use it on a Windows desktop or a MacBook, and the
                admin brief is explicit that there is no mobile requirement.
              </Text>
            </div>
          </PageCard>

          <PageCard title="Where The Money Rules Live">
            <Text variant="small" tone="ink2" as="p" raw>
              Two sentences hold across every screen, and there are tests that fail the build if
              either stops being true: gross equals payout plus commission, and a security
              deposit is never counted as revenue.
            </Text>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <span className={styles.mono}>tests/rules/</span>
            </div>
          </PageCard>
        </div>
      </div>

      {/* ---- THE SHARED PIECES ---- */}
      <PageCard
        title="Components In Use"
        subtitle="The building blocks this panel is assembled from — each one shown as the real thing"
      >
        {COMPONENTS.map((component) => (
          <div key={component.name} className={styles.componentRow}>
            <div>
              <Text variant="label" as="p" raw>
                {component.name}
              </Text>
            </div>
            <Text variant="small" tone="ink2" as="p" raw>
              {component.what}
            </Text>
            <div className={styles.componentDemo}>{component.demo}</div>
          </div>
        ))}

        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Note>
            These are the real components, rendered here rather than pictured, so this list
            cannot fall out of date. Before building something new for a screen, look here
            first — it is probably already made.
          </Note>
        </div>
      </PageCard>
    </>
  );
}

// One layer's worth of languages, frameworks and tools.
function StackList({
  items,
}: {
  items: { name: string; role: string; note: string; versionKey?: string }[];
}) {
  return (
    <div className={styles.playbookGrid}>
      {items.map((item) => (
        <div key={item.name} className={styles.playbookItem}>
          <div className={styles.pillRow}>
            <Text variant="label" as="span" raw>
              {item.name}
            </Text>
            {item.versionKey && VERSIONS[item.versionKey] ? (
              <span className={styles.mono}>{VERSIONS[item.versionKey]}</span>
            ) : null}
          </div>
          <Text variant="small" tone="ink2" as="p" raw>
            {item.role}
          </Text>
          <Text variant="small" tone="ink3" as="p" raw>
            {item.note}
          </Text>
        </div>
      ))}
    </div>
  );
}

// One layer's worth of outside services, grouped by what they do.
function ServiceList({ items }: { items: PlaybookService[] }) {
  const byCategory = items.reduce<Record<string, PlaybookService[]>>((groups, service) => {
    (groups[service.category] ??= []).push(service);
    return groups;
  }, {});

  return (
    <>
      {Object.entries(byCategory).map(([category, group]) => (
        <div key={category} style={{ marginBottom: 'var(--space-2xl)' }}>
          <Text variant="caption" tone="ink3" as="p" raw style={{ marginBottom: 'var(--space-md)' }}>
            {serviceCategoryLabels[category as PlaybookService['category']].toUpperCase()}
          </Text>

          <div className={styles.sectionStack}>
            {group.map((service) => (
              <div key={service.name} className={styles.playbookItem}>
                <div className={styles.pillRow}>
                  <Text variant="label" as="span" raw>
                    {service.name}
                  </Text>
                  <StatusPill label={service.cost} tone="neutral" dot={false} />
                </div>
                <Text variant="small" tone="ink2" as="p" raw>
                  {service.purpose}
                </Text>
                <Text variant="caption" tone="ink3" as="p" raw>
                  USED IN: {service.usedIn}
                </Text>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
