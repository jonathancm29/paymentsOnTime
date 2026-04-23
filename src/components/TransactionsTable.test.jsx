import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import TransactionsTable from './TransactionsTable';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Creates a minimal transaction object. */
function makeTransaction(n, overrides = {}) {
  return {
    id: `t-${n}`,
    name: `Gasto ${n}`,
    category: 'tarjetas',
    amount: 10_000 * n,
    amount_paid: null,
    completed: false,
    completed_at: null,
    month_year: '2026-04',
    due_day: n,
    ...overrides,
  };
}

/**
 * Generates an array of N transactions with sequential ids/names.
 * Categories alternate between 'tarjetas' and 'recibos' to give the
 * filter dropdown at least 2 options.
 */
function makeTransactions(n) {
  return Array.from({ length: n }, (_, i) => {
    const num = i + 1;
    const category = num % 2 === 0 ? 'recibos' : 'tarjetas';
    return makeTransaction(num, { category });
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TransactionsTable – pagination', () => {
  const PAGE_SIZE = 10;

  it('renders a skeleton when loading is true', () => {
    const { container } = render(<TransactionsTable transactions={[]} loading={true} />);
    // TableSkeleton renders 5 placeholder divs
    const skeletonRows = container.querySelectorAll('div[style*="44px"]');
    expect(skeletonRows.length).toBe(5);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows empty-state message when there are no transactions', () => {
    render(<TransactionsTable transactions={[]} loading={false} />);
    expect(screen.getByText('No hay transacciones en este período')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('renders the table with correct column headers', () => {
    render(<TransactionsTable transactions={makeTransactions(3)} loading={false} />);
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    const headerTexts = headers.map((h) => h.textContent.trim());
    expect(headerTexts).toContain('Nombre');
    expect(headerTexts).toContain('Categoría');
    expect(headerTexts).toContain('Monto esperado');
    expect(headerTexts).toContain('Monto pagado');
    expect(headerTexts).toContain('Estado');
    expect(headerTexts).toContain('Día');
  });

  it('shows all items on a single page when count <= PAGE_SIZE', () => {
    const txs = makeTransactions(PAGE_SIZE);
    render(<TransactionsTable transactions={txs} loading={false} />);

    // All 10 row names should appear
    txs.forEach((t) => {
      expect(screen.getByText(t.name)).toBeInTheDocument();
    });

    // No pagination controls — totalPages === 1
    expect(screen.queryByRole('button', { name: /anterior/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /siguiente/i })).toBeNull();
  });

  it('shows exactly PAGE_SIZE rows on first page when count > PAGE_SIZE', () => {
    const txs = makeTransactions(PAGE_SIZE + 3); // 13 items
    render(<TransactionsTable transactions={txs} loading={false} />);

    // First page should show items 1–10
    for (let i = 1; i <= PAGE_SIZE; i++) {
      expect(screen.getByText(`Gasto ${i}`)).toBeInTheDocument();
    }
    // Items 11–13 should NOT be visible
    for (let i = PAGE_SIZE + 1; i <= PAGE_SIZE + 3; i++) {
      expect(screen.queryByText(`Gasto ${i}`)).toBeNull();
    }
  });

  it('shows pagination counter and correct button states on page 1', () => {
    render(<TransactionsTable transactions={makeTransactions(PAGE_SIZE + 1)} loading={false} />);

    // "1 / 2" counter
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    const prevBtn = screen.getByRole('button', { name: /anterior/i });
    const nextBtn = screen.getByRole('button', { name: /siguiente/i });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();
  });

  it('navigates to the next page when Next is clicked', async () => {
    const user = userEvent.setup();
    const txs = makeTransactions(PAGE_SIZE + 3); // 13 items, 2 pages
    render(<TransactionsTable transactions={txs} loading={false} />);

    const nextBtn = screen.getByRole('button', { name: /siguiente/i });
    await user.click(nextBtn);

    // Now page 2 — items 11–13 visible
    for (let i = PAGE_SIZE + 1; i <= PAGE_SIZE + 3; i++) {
      expect(screen.getByText(`Gasto ${i}`)).toBeInTheDocument();
    }
    // Items from page 1 should be gone
    expect(screen.queryByText('Gasto 1')).toBeNull();

    // Counter updates
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    // Next is now disabled; Prev is enabled
    expect(nextBtn).toBeDisabled();
    expect(screen.getByRole('button', { name: /anterior/i })).not.toBeDisabled();
  });

  it('navigates back to page 1 when Prev is clicked from page 2', async () => {
    const user = userEvent.setup();
    render(<TransactionsTable transactions={makeTransactions(PAGE_SIZE + 2)} loading={false} />);

    // Go to page 2
    await user.click(screen.getByRole('button', { name: /siguiente/i }));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    // Go back
    await user.click(screen.getByRole('button', { name: /anterior/i }));
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('Gasto 1')).toBeInTheDocument();
  });

  it('resets to page 1 when category filter changes', async () => {
    const user = userEvent.setup();
    // Create 12 items all in 'tarjetas' so page 2 exists when unfiltered
    const txs = makeTransactions(12).map((t) => ({ ...t, category: 'tarjetas' }));
    render(<TransactionsTable transactions={txs} loading={false} />);

    // Navigate to page 2
    await user.click(screen.getByRole('button', { name: /siguiente/i }));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    // Change filter to 'Todas' (same — should reset to page 1)
    const select = screen.getByRole('combobox', { name: /filtrar por categoría/i });
    await user.selectOptions(select, '');

    // Page should be back to 1
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('handles exactly PAGE_SIZE items without showing pagination', () => {
    render(<TransactionsTable transactions={makeTransactions(PAGE_SIZE)} loading={false} />);

    // totalPages = ceil(10/10) = 1 → pagination hidden
    expect(screen.queryByText(/\/ 1/)).toBeNull(); // no "X / 1" counter
    expect(screen.queryByRole('button', { name: /anterior/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /siguiente/i })).toBeNull();
  });
});
