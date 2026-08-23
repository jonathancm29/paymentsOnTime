import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { usePaymentsData } from './usePaymentsData';

// Mock Supabase globally
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  }
}));

// Mock dateHelpers
vi.mock('../utils/dateHelpers', () => ({
  getTodayDate: () => new Date(2026, 3, 22), // April (month 4)
}));

import { supabase } from '../lib/supabase';

describe('usePaymentsData Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default loading state', () => {
    const { result } = renderHook(() => usePaymentsData(null));
    expect(result.current.loading).toBe(true);
    expect(result.current.expenses).toEqual([]);
    expect(result.current.payments).toEqual([]);
  });

  it('fetches data if session is provided', async () => {
    // Mock the chain for both expenses and payments selection
    const mockSelect = vi.fn().mockImplementation(() => ({
      order: vi.fn().mockResolvedValue({ data: [], error: null })
    }));
    
    supabase.from.mockImplementation(() => ({
      select: mockSelect
    }));

    const mockSession = { user: { id: 'test-id' } };
    const { result } = renderHook(() => usePaymentsData(mockSession));
    
    // Act is required for the async state updates inside useEffect
    await act(async () => {
      // The hook runs fetchData automatically due to useEffect tracking session
      // just wait for microtasks
      await new Promise(resolve => setTimeout(resolve, 50)); 
    });

    expect(supabase.from).toHaveBeenCalledWith('expenses');
    expect(supabase.from).toHaveBeenCalledWith('payments');
    expect(result.current.loading).toBe(false); // loading finishes after catch/finally block
  });

  it('generates payment for yearly expense only if due_month matches current month', async () => {
    const mockExpenses = [
      { id: 'exp-yearly-matching', name: 'Yearly matching', recurrence: 'yearly', due_month: 4, due_day: 15, is_spontaneous: false },
      { id: 'exp-yearly-nonmatching', name: 'Yearly nonmatching', recurrence: 'yearly', due_month: 5, due_day: 15, is_spontaneous: false },
      { id: 'exp-monthly', name: 'Monthly', recurrence: 'monthly', due_month: null, due_day: 15, is_spontaneous: false }
    ];

    const mockPayments = [];

    const mockInsert = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockResolvedValue([])
    }));

    supabase.from.mockImplementation((table) => {
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockExpenses, error: null })
          })
        };
      }
      if (table === 'payments') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockPayments, error: null })
          }),
          insert: mockInsert
        };
      }
    });

    const mockSession = { user: { id: 'test-id' } };
    renderHook(() => usePaymentsData(mockSession));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(mockInsert).toHaveBeenCalled();
    const insertedArgs = mockInsert.mock.calls[0][0];
    
    expect(insertedArgs.length).toBe(2);
    expect(insertedArgs.some(p => p.expense_id === 'exp-yearly-matching')).toBe(true);
    expect(insertedArgs.some(p => p.expense_id === 'exp-monthly')).toBe(true);
    expect(insertedArgs.some(p => p.expense_id === 'exp-yearly-nonmatching')).toBe(false);
  });
});
