// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks the Modify menu that sits at the end of a table
// row — that what it offers can be chosen, that what it cannot do says why, and
// that a greyed item cannot be fired by clicking it anyway.
//
// WHY THE GREYED ITEMS ARE THE POINT OF THE TEST. This panel is connected to a
// server that does not yet offer everything the screens are built around, and
// the rule here is that a screen says so rather than hiding it or pretending.
// A menu is the easiest place in the whole panel to quietly drop an action, and
// the next person to look for it would have no way of knowing whether it was
// never built or they simply could not find it.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../render';
import { ActionMenu } from '@/components/ui';

function menu(onEdit = vi.fn(), onStop = vi.fn()) {
  render(
    <ActionMenu
      label="Modify"
      items={[
        { label: 'Edit their details', icon: 'create-outline', onSelect: onEdit },
        { label: 'Stop them trading', icon: 'pause-outline', destructive: true, onSelect: onStop },
        { label: 'Close the business', icon: 'trash-outline', unavailable: 'The server does not offer this yet.' },
      ]}
    />,
  );
  return { onEdit, onStop };
}

describe('the Modify menu', () => {
  it('shows nothing until it is opened', async () => {
    menu();
    // Waited for rather than checked outright, so the session above this
    // component has finished settling before the test ends.
    await screen.findByRole('button', { name: /modify/i });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit their details')).not.toBeInTheDocument();
  });

  it('says why an action cannot be chosen, instead of leaving it out', async () => {
    const user = userEvent.setup();
    menu();

    await user.click(screen.getByRole('button', { name: /modify/i }));

    // All three are there, including the one that cannot be done.
    expect(screen.getByRole('menu')).toBeInTheDocument();
    const closeIt = screen.getByRole('menuitem', { name: /close the business/i });
    expect(closeIt).toHaveAttribute('aria-disabled', 'true');
    expect(closeIt).toHaveTextContent('The server does not offer this yet.');
  });

  it('runs the action that was chosen, and closes', async () => {
    const user = userEvent.setup();
    const { onStop, onEdit } = menu();

    await user.click(screen.getByRole('button', { name: /modify/i }));
    await user.click(screen.getByRole('menuitem', { name: /stop them trading/i }));

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
    // Closed, because several of these open a dialog and a menu left hanging
    // over one looks like a mistake.
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('cannot be made to fire an action that cannot be done', async () => {
    const user = userEvent.setup();
    const { onStop, onEdit } = menu();

    await user.click(screen.getByRole('button', { name: /modify/i }));
    await user.click(screen.getByRole('menuitem', { name: /close the business/i }));

    expect(onStop).not.toHaveBeenCalled();
    expect(onEdit).not.toHaveBeenCalled();
    // And it stays open, rather than looking as though something happened.
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('closes on Escape, and on a press anywhere else', async () => {
    const user = userEvent.setup();
    menu();

    await user.click(screen.getByRole('button', { name: /modify/i }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /modify/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
