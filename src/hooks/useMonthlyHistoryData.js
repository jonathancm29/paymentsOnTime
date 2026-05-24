import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getTodayDate } from '../utils/dateHelpers';

/**
 * Formats a month and year into the "YYYY-MM" string used by the payments table.
 * @param {number} year
 * @param {number} month  1-based (January = 1)
 * @returns {string}
 */
function toMonthYear(year, month) {
  const mm = String(month).padStart(2, '0');
  return `${year}-${mm}`;
}

/**
 * Returns the number of days in a given month/year.
 * @param {number} year
 * @param {number} month  1-based
 * @returns {number}
 */
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Shifts a month by `delta` months and returns { year, month }.
 * @param {number} year
 * @param {number} month  1-based
 * @param {number} delta  e.g. -1 for previous month
 * @returns {{ year: number, month: number }}
 */
function shiftMonth(year, month, delta) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/**
 * Builds a flat payment+expense row from the joined Supabase record.
 * @param {object} p  Raw row from payments join
 * @returns {object}
 */
function toTransaction(p) {
  return {
    id: p.id,
    name: p.expenses?.name ?? '',
    category: p.expenses?.category ?? '',
    amount: p.expenses?.amount ?? 0,
    amount_paid: p.amount_paid ?? null,
    completed: p.completed ?? false,
    completed_at: p.completed_at ?? null,
    month_year: p.month_year,
    due_day: p.expenses?.due_day ?? null,
    is_spontaneous: p.expenses?.is_spontaneous ?? false,
  };
}

/**
 * Computes the financial total for a list of flat transaction rows.
 * Only completed payments are included.
 * Uses amount_paid when available, falls back to expense base amount.
 * @param {Array<object>} transactions
 * @returns {number}
 */
function computeTotal(transactions) {
  return transactions.reduce((sum, t) => {
    if (!t.completed) return sum;
    const value = t.amount_paid != null ? t.amount_paid : t.amount;
    return sum + value;
  }, 0);
}

/**
 * Builds the full report object from a list of flat transaction rows.
 * @param {Array<object>} transactions
 * @param {number} prevTotal
 * @param {number} year
 * @param {number} month  1-based
 * @returns {object}
 */
function buildReport(transactions, prevTotal, year, month) {
  const total = computeTotal(transactions);
  const spontaneousTotal = transactions.reduce((sum, t) => {
    if (!t.completed || !t.is_spontaneous) return sum;
    const value = t.amount_paid != null ? t.amount_paid : t.amount;
    return sum + value;
  }, 0);
  const days = daysInMonth(year, month);
  const dailyAverage = days > 0 ? total / days : 0;

  // Variation percent — null when previous total is 0 to avoid division by zero
  const variationPercent =
    prevTotal !== 0 ? ((total - prevTotal) / prevTotal) * 100 : null;

  // Aggregate completed payments by category
  /** @type {Map<string, number>} */
  const categoryMap = new Map();
  for (const t of transactions) {
    if (!t.completed) continue;
    const value = t.amount_paid != null ? t.amount_paid : t.amount;
    categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + value);
  }

  const byCategory = Array.from(categoryMap.entries())
    .map(([category, categoryTotal]) => ({ category, total: categoryTotal }))
    .sort((a, b) => b.total - a.total);

  const topCategory = byCategory.length > 0 ? byCategory[0].category : '';

  // Aggregate completed payments by day
  /** @type {Map<number, number>} */
  const dayMap = new Map();
  for (const t of transactions) {
    if (!t.completed) continue;
    let day = null;
    if (t.completed_at) {
      day = new Date(t.completed_at).getDate();
    } else if (t.due_day != null) {
      day = t.due_day;
    }
    if (day == null) continue;
    const value = t.amount_paid != null ? t.amount_paid : t.amount;
    dayMap.set(day, (dayMap.get(day) ?? 0) + value);
  }

  const byDay = Array.from(dayMap.entries())
    .map(([day, dayTotal]) => ({ day, total: dayTotal }))
    .sort((a, b) => a.day - b.day);

  return {
    total,
    spontaneousTotal,
    dailyAverage,
    topCategory,
    variationPercent,
    byCategory,
    byDay,
    transactions,
  };
}

/**
 * Empty / zero-value report returned when there are no payments for a period.
 * @returns {object}
 */
function emptyReport() {
  return {
    total: 0,
    spontaneousTotal: 0,
    dailyAverage: 0,
    topCategory: '',
    variationPercent: null,
    byCategory: [],
    byDay: [],
    transactions: [],
  };
}

/**
 * Queries the payments table (joined with expenses) for a given month_year and
 * returns the sum of completed payment amounts (amount_paid ?? expense.amount).
 *
 * @param {string} userId
 * @param {string} monthYear  "YYYY-MM"
 * @param {AbortSignal} signal
 * @returns {Promise<number>}
 */
async function fetchMonthTotal(userId, monthYear, signal) {
  const { data, error } = await supabase
    .from('payments')
    .select('*, expenses(name, category, amount, due_day)')
    .eq('user_id', userId)
    .eq('month_year', monthYear)
    .abortSignal(signal);

  if (error) throw error;

  const transactions = (data || []).map(toTransaction);
  return computeTotal(transactions);
}

/**
 * Custom hook that loads monthly payment history for the authenticated user.
 *
 * @param {object|null} session  Supabase session object
 * @returns {{
 *   loading: boolean,
 *   error: Error|null,
 *   report: object,
 *   prevTotal: number,
 *   month: number,
 *   year: number,
 *   setMonth: function,
 *   setYear: function
 * }}
 */
export function useMonthlyHistoryData(session) {
  const today = getTodayDate();

  const [month, setMonth] = useState(today.getMonth() + 1); // 1-based
  const [year, setYear] = useState(today.getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(emptyReport());
  const [prevTotal, setPrevTotal] = useState(0);

  const fetchData = useCallback(async (currentYear, currentMonth, userId, signal) => {
    setLoading(true);
    setError(null);

    try {
      const monthYear = toMonthYear(currentYear, currentMonth);
      const { year: prevYear, month: prevMonth } = shiftMonth(currentYear, currentMonth, -1);
      const prevMonthYear = toMonthYear(prevYear, prevMonth);

      // Fetch current month payments (joined with expenses)
      const { data, error: fetchError } = await supabase
        .from('payments')
        .select('*, expenses(name, category, amount, due_day)')
        .eq('user_id', userId)
        .eq('month_year', monthYear)
        .abortSignal(signal);

      if (fetchError) throw fetchError;

      // Fetch previous month total for variation calculation
      const previousTotal = await fetchMonthTotal(userId, prevMonthYear, signal);

      const transactions = (data || []).map(toTransaction);
      const builtReport = transactions.length > 0
        ? buildReport(transactions, previousTotal, currentYear, currentMonth)
        : emptyReport();

      setPrevTotal(previousTotal);
      setReport(builtReport);
    } catch (err) {
      // Supabase wraps the abort error in various ways; checking signal.aborted
      // is the most reliable guard regardless of how the client formats it.
      if (err.name === 'AbortError' || signal.aborted) return;
      console.error('useMonthlyHistoryData: error fetching data:', err.message);
      setError(err);
    } finally {
      // Don't touch loading state if this fetch was superseded by a newer one.
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;

    const controller = new AbortController();
    fetchData(year, month, session.user.id, controller.signal);

    return () => {
      controller.abort();
    };
  }, [session, year, month, fetchData]);

  return {
    loading,
    error,
    report,
    prevTotal,
    month,
    year,
    setMonth,
    setYear,
  };
}
