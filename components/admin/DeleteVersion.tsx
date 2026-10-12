'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The button that throws away a saved version, and the
// confirmation behind it.
//
// THROWING A VERSION AWAY IS THE ONE THING HERE THAT CANNOT BE PUT BACK. Putting
// records back from a version is safe to repeat and never overwrites anything; this
// destroys the copy itself, and with it the only way back to every record it held. So
// it asks for the authenticator code like the restore does, and says plainly what is
// being given up.
//
// IT IS ALSO HOW ROOM IS MADE. The server keeps at most a fixed number of versions so
// copies cannot quietly fill the database, and refuses to save one more when the
// shelf is full. Deleting an old one is the only way to save a new one.

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { Button } from '@/components/ui';

export function DeleteVersion({
  versionId,
  versionLabel,
  onDone,
  size = 'sm',
}: {
  versionId: string;
  versionLabel: string;
  onDone: () => void;
  size?: 'sm' | 'md';
}) {
  const [asking, setAsking] = useState(false);

  return (
    <>
      <Button label="Delete" variant="ghost" size={size} onClick={() => setAsking(true)} />

      <ReasonDialog
        open={asking}
        onClose={() => setAsking(false)}
        title={`Delete ${versionLabel}`}
        description="This throws away the saved copy itself. Nothing on the platform changes, but anything that was deleted since this version was saved can no longer be put back from it. It cannot be undone."
        confirmLabel="Delete this version"
        destructive
        confirmWithCode
        reasonPlaceholder="e.g. Superseded by a newer version — making room."
        change={{
          subjectLabel: versionLabel,
          field: 'Saved version',
          before: 'Kept',
          after: 'Deleted',
        }}
        onConfirm={async (reason, { code }) => {
          await apiClient.deleteVersion(versionId, reason, code ?? '');
          setAsking(false);
          onDone();
        }}
      />
    </>
  );
}

export default DeleteVersion;
