import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { usePaymentsData } from './usePaymentsData';

// Mock Supabase globally
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  }
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
    const { result, waitForNextUpdate } = renderHook(() => usePaymentsData(mockSession));
    
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
});
