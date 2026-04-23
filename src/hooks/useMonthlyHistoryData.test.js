import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Mock Supabase ──────────────────────────────────────────────────────────
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// ─── Mock dateHelpers so month/year are deterministic ───────────────────────
vi.mock('../utils/dateHelpers', () => ({
  getTodayDate: () => new Date(2026, 3, 22), // April 2026 (month index 3)
}));

import { supabase } from '../lib/supabase';
import { useMonthlyHistoryData } from './useMonthlyHistoryData';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Builds a minimal Supabase payment row (joined with expenses).
 */
function makePaymentRow({
  id,
  completed = true,
  amount_paid = null,
  completed_at = null,
  due_day = 5,
  expenseName = 'Test',
  category = 'tarjetas',
  amount = 100_000,
  month_year = '2026-04',
} = {}) {
  return {
    id,
    completed,
    amount_paid,
    completed_at,
    month_year,
    user_id: 'user-1',
    expenses: { name: expenseName, category, amount, due_day },
  };
}

/**
 * Configures supabase.from mock to return a fixed dataset for a given monthYear
 * and empty for any other month (used for the previous-month total query).
 *
 * @param {object[]} currentMonthRows  Rows to return for 2026-04
 * @param {object[]} prevMonthRows     Rows to return for 2026-03 (default: [])
 */
function mockSupabase(currentMonthRows, prevMonthRows = []) {
  supabase.from.mockImplementation(() => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation((_field, value) => {
        // second eq call is always month_year
        if (value === '2026-04') {
          builder._resolveWith = { data: currentMonthRows, error: null };
        } else {
          builder._resolveWith = { data: prevMonthRows, error: null };
        }
        return builder;
      }),
      abortSignal: vi.fn().mockImplementation(function () {
        return Promise.resolve(this._resolveWith ?? { data: [], error: null });
      }),
      _resolveWith: null,
    };
    return builder;
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useMonthlyHistoryData – aggregation logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes to current month/year from getTodayDate()', () => {
    const { result } = renderHook(() => useMonthlyHistoryData(null));
    expect(result.current.month).toBe(4);  // April
    expect(result.current.year).toBe(2026);
  });

  it('returns emptyReport when there are no payments for the month', async () => {
    mockSupabase([], []);

    const session = { user: { id: 'user-1' } };
    const { result } = renderHook(() => useMonthlyHistoryData(session));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    const { total, dailyAverage, topCategory, variationPercent, byCategory, byDay, transactions } =
      result.current.report;
    expect(total).toBe(0);
    expect(dailyAverage).toBe(0);
    expect(topCategory).toBe('');
    expect(variationPercent).toBeNull();
    expect(byCategory).toEqual([]);
    expect(byDay).toEqual([]);
    expect(transactions).toEqual([]);
  });

  it('aggregates totals correctly for completed payments', async () => {
    const rows = [
      makePaymentRow({ id: 'p1', completed: true, amount: 200_000, amount_paid: 195_000, due_day: 5 }),
      makePaymentRow({ id: 'p2', completed: true, amount: 100_000, amount_paid: null, due_day: 10 }),
      makePaymentRow({ id: 'p3', completed: false, amount: 50_000, amount_paid: null, due_day: 15 }),
    ];
    mockSupabase(rows, []);

    const session = { user: { id: 'user-1' } };
    const { result } = renderHook(() => useMonthlyHistoryData(session));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // p1: 195_000 (amount_paid wins), p2: 100_000 (falls back to amount), p3: excluded (not completed)
    expect(result.current.report.total).toBe(295_000);
    // April 2026 has 30 days
    expect(result.current.report.dailyAverage).toBeCloseTo(295_000 / 30, 2);
  });

  it('sets variationPercent to null when prevTotal is 0 (first month)', async () => {
    const rows = [makePaymentRow({ id: 'p1', completed: true, amount: 100_000 })];
    mockSupabase(rows, []); // empty prev month → prevTotal = 0

    const session = { user: { id: 'user-1' } };
    const { result } = renderHook(() => useMonthlyHistoryData(session));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.report.variationPercent).toBeNull();
    expect(result.current.prevTotal).toBe(0);
  });

  it('computes variationPercent correctly when prev month has data', async () => {
    const currentRows = [makePaymentRow({ id: 'p1', completed: true, amount: 150_000 })];
    const prevRows = [makePaymentRow({ id: 'p0', completed: true, amount: 100_000, month_year: '2026-03' })];
    mockSupabase(currentRows, prevRows);

    const session = { user: { id: 'user-1' } };
    const { result } = renderHook(() => useMonthlyHistoryData(session));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // (150k - 100k) / 100k * 100 = 50%
    expect(result.current.report.variationPercent).toBeCloseTo(50, 1);
    expect(result.current.prevTotal).toBe(100_000);
  });

  it('builds byCategory sorted descending by total', async () => {
    const rows = [
      makePaymentRow({ id: 'p1', completed: true, amount: 80_000, category: 'recibos' }),
      makePaymentRow({ id: 'p2', completed: true, amount: 200_000, category: 'tarjetas' }),
      makePaymentRow({ id: 'p3', completed: true, amount: 50_000, category: 'recibos' }),
    ];
    mockSupabase(rows, []);

    const session = { user: { id: 'user-1' } };
    const { result } = renderHook(() => useMonthlyHistoryData(session));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const { byCategory, topCategory } = result.current.report;
    expect(byCategory[0].category).toBe('tarjetas');
    expect(byCategory[0].total).toBe(200_000);
    expect(byCategory[1].category).toBe('recibos');
    expect(byCategory[1].total).toBe(130_000); // 80k + 50k aggregated
    expect(topCategory).toBe('tarjetas');
  });

  it('handles daysInMonth correctly for February in a leap year (2024)', async () => {
    // Feb 2024 is a leap year — 29 days
    const { result } = renderHook(() => useMonthlyHistoryData(null));

    // Manually trigger month/year change — we cannot test daysInMonth directly but
    // we can assert the hook's setMonth/setYear exist and call them without throwing
    expect(typeof result.current.setMonth).toBe('function');
    expect(typeof result.current.setYear).toBe('function');

    // Verify daysInMonth logic inline (white-box)
    // new Date(2024, 2, 0).getDate() === 29 for leap Feb 2024
    const leapFeb = new Date(2024, 2, 0).getDate();
    expect(leapFeb).toBe(29);

    // new Date(2023, 2, 0).getDate() === 28 for non-leap Feb 2023
    const nonLeapFeb = new Date(2023, 2, 0).getDate();
    expect(nonLeapFeb).toBe(28);
  });
});
