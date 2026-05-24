import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useProjectAccounts } from './useProjectAccounts';

// Mock Supabase globally
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  }
}));

import { supabase } from '../lib/supabase';

describe('useProjectAccounts Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('initializes with default loading state', () => {
    const { result } = renderHook(() => useProjectAccounts(null));
    expect(result.current.loading).toBe(true);
    expect(result.current.projects).toEqual([]);
    expect(result.current.transactions).toEqual([]);
  });

  it('calculates project metrics correctly from transaction values', async () => {
    // 1. Mock local storage to run synchronously and easily test calculations
    localStorage.setItem('pot_use_local_projects', 'true');
    const localProjects = [{ id: 'proj-1', name: 'Viaje a Mexico', budget: 1000000 }];
    const localTransactions = [
      { id: 'tx-1', project_id: 'proj-1', amount: -200000, category: 'hospedaje', description: 'Hotel' }, // Gasto
      { id: 'tx-2', project_id: 'proj-1', amount: 500000, category: 'aporte', description: 'Aporte' },    // Ingreso
      { id: 'tx-3', project_id: 'proj-1', amount: -150000, category: 'comida', description: 'Restaurante' } // Gasto
    ];
    localStorage.setItem('pot_local_project_accounts', JSON.stringify(localProjects));
    localStorage.setItem('pot_local_project_transactions', JSON.stringify(localTransactions));

    const { result } = renderHook(() => useProjectAccounts(null));

    // Wait for the hook to parse localStorage
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const project = result.current.projects[0];
    expect(project).toBeDefined();
    
    // Balance Neto: 500k (ingreso) - 200k (gasto) - 150k (gasto) = 150k
    expect(project.balance).toBe(150000);
    
    // Total Ingresos: 500k
    expect(project.totalIngresos).toBe(500000);
    
    // Total Gastos: 350k (absolute value of negative transactions)
    expect(project.totalGastos).toBe(350000);
    
    // Budget progress pct: (350k / 1M) * 100 = 35%
    expect(project.budgetProgressPct).toBe(35);
  });

  it('triggers tablesMissing on Supabase code 42P01', async () => {
    // Mock Supabase throwing table not found error
    const mockOrder = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'relation project_accounts does not exist' }
    });
    const mockSelect = vi.fn().mockImplementation(() => ({
      order: mockOrder
    }));
    supabase.from.mockImplementation(() => ({
      select: mockSelect
    }));

    const mockSession = { user: { id: 'test-user-id' } };
    const { result } = renderHook(() => useProjectAccounts(mockSession));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.tablesMissing).toBe(true);
    expect(result.current.usingLocalStorage).toBe(false); // Does not force it by default, awaits user interaction
  });

  it('supports localStorage mode operations when enabled', async () => {
    const { result } = renderHook(() => useProjectAccounts(null));

    // Enable local storage mode
    act(() => {
      result.current.enableLocalStorageMode(true);
    });

    expect(result.current.usingLocalStorage).toBe(true);

    // Create a project
    let project;
    await act(async () => {
      project = await result.current.createProject('Test Local Project', 'Description', 50000);
    });

    expect(project).toBeDefined();
    expect(project.name).toBe('Test Local Project');
    expect(result.current.projects.length).toBe(1);

    // Add transaction to it
    await act(async () => {
      await result.current.addTransaction(project.id, 'Spent something', -10000, 'otro', '2026-05-24');
    });

    expect(result.current.projects[0].balance).toBe(-10000);
    expect(result.current.projects[0].totalGastos).toBe(10000);
  });
});
