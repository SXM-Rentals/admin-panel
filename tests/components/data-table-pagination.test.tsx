// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks the paging on the shared table — the part nine
// screens depend on and the part most likely to break quietly.
//
// THE CASE THAT MATTERS MOST IS THE LAST ONE IN THIS FILE. Somebody on page
// three of thirty rows types into the search box, the list drops to four rows,
// and page three of a four-row list does not exist. The naive version shows an
// empty table, which reads as "nothing matched" — so the person retypes their
// search, gets the same nothing, and concludes the customer is not on the
// platform. That is a support call caused entirely by a paging bug.

import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../render';
import { DataTable, type Column } from '@/components/tables/DataTable';

type Row = { id: string; name: string; amount: number };

const rows: Row[] = Array.from({ length: 30 }, (_, i) => ({
  id: `r${i + 1}`,
  name: `Row ${i + 1}`,
  amount: (i + 1) * 10,
}));

const columns: Column<Row>[] = [
  { id: 'name', header: 'Name', cell: (r) => r.name, sortValue: (r) => r.name },
  { id: 'amount', header: 'Amount', cell: (r) => r.amount, sortValue: (r) => r.amount, numeric: true },
];

function renderTable(data: Row[] = rows) {
  return render(<DataTable rows={data} columns={columns} rowKey={(r) => r.id} />);
}

describe('the shared table pages through a list', () => {
  it('shows ten rows at a time and says which ten', () => {
    renderTable();

    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(screen.getByText('Row 10')).toBeInTheDocument();
    expect(screen.queryByText('Row 11')).not.toBeInTheDocument();

    // "1-10 of 30" rather than "page 1 of 3" — how many are left is the useful
    // number when you are working through a queue.
    expect(screen.getByText(/1–10 of 30/)).toBeInTheDocument();
  });

  it('moves forward and back', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByLabelText('Next page'));
    expect(screen.getByText('Row 11')).toBeInTheDocument();
    expect(screen.queryByText('Row 1')).not.toBeInTheDocument();
    expect(screen.getByText(/11–20 of 30/)).toBeInTheDocument();

    await user.click(screen.getByLabelText('Previous page'));
    expect(screen.getByText('Row 1')).toBeInTheDocument();
  });

  it('greys the arrows at each end rather than hiding them', async () => {
    const user = userEvent.setup();
    renderTable();

    // Disabled at the start, so the row of controls does not shift as you use it.
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).toBeEnabled();

    await user.click(screen.getByLabelText('Next page'));
    await user.click(screen.getByLabelText('Next page'));

    expect(screen.getByText(/21–30 of 30/)).toBeInTheDocument();
    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });

  it('changes how many are shown at a time', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.selectOptions(screen.getByLabelText(/items per page/i), '25');

    expect(screen.getByText('Row 25')).toBeInTheDocument();
    expect(screen.queryByText('Row 26')).not.toBeInTheDocument();
    expect(screen.getByText(/1–25 of 30/)).toBeInTheDocument();
  });

  it('says so plainly when a filter leaves nothing', () => {
    render(
      <DataTable
        rows={[]}
        columns={columns}
        rowKey={(r) => r.id}
        emptyTitle="No customers match"
        emptyMessage="Try a shorter search."
      />,
    );

    expect(screen.getByText('No customers match')).toBeInTheDocument();
    expect(screen.getByText('Try a shorter search.')).toBeInTheDocument();
  });

  // ---- THE ONE THAT MATTERS ----
  // See the note at the top of this file.
  it('does not strand you on a page that no longer exists when the list shrinks', async () => {
    const user = userEvent.setup();
    const { rerender } = renderTable();

    // Go to the last page of thirty rows.
    await user.click(screen.getByLabelText('Next page'));
    await user.click(screen.getByLabelText('Next page'));
    expect(screen.getByText(/21–30 of 30/)).toBeInTheDocument();

    // Now a search cuts the list to four. Page three of a four-row list does not
    // exist — and the four rows must still be visible rather than an empty
    // table that reads as "nothing matched".
    rerender(<DataTable rows={rows.slice(0, 4)} columns={columns} rowKey={(r) => r.id} />);

    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(screen.getByText('Row 4')).toBeInTheDocument();
    expect(screen.getByText(/1–4 of 4/)).toBeInTheDocument();
  });
});
