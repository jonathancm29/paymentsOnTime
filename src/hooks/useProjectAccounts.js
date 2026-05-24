import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export function useProjectAccounts(session) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tablesMissing, setTablesMissing] = useState(false);
  const [usingLocalStorage, setUsingLocalStorage] = useState(() => {
    return localStorage.getItem('pot_use_local_projects') === 'true';
  });

  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Enable/disable local storage mode explicitly
  const enableLocalStorageMode = useCallback((enable) => {
    setUsingLocalStorage(enable);
    if (enable) {
      localStorage.setItem('pot_use_local_projects', 'true');
    } else {
      localStorage.removeItem('pot_use_local_projects');
    }
  }, []);

  const fetchData = useCallback(async (abortSignal) => {
    if (usingLocalStorage) {
      const localAcc = localStorage.getItem('pot_local_project_accounts');
      const localTx = localStorage.getItem('pot_local_project_transactions');
      setProjects(localAcc ? JSON.parse(localAcc) : []);
      setTransactions(localTx ? JSON.parse(localTx) : []);
      setLoading(false);
      return;
    }

    if (!supabase || !session) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Accounts
      const { data: accountsData, error: accError } = await supabase
        .from('project_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (accError) {
        if (accError.code === '42P01') {
          setTablesMissing(true);
          // Auto fallback if user saved this preference
          if (localStorage.getItem('pot_use_local_projects') === 'true') {
            setUsingLocalStorage(true);
            const localAcc = localStorage.getItem('pot_local_project_accounts');
            const localTx = localStorage.getItem('pot_local_project_transactions');
            setProjects(localAcc ? JSON.parse(localAcc) : []);
            setTransactions(localTx ? JSON.parse(localTx) : []);
          }
          throw accError;
        }
        throw accError;
      }

      if (abortSignal?.aborted) return;

      // 2. Fetch Transactions
      const { data: transactionsData, error: txError } = await supabase
        .from('project_transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      if (abortSignal?.aborted) return;

      setProjects(accountsData || []);
      setTransactions(transactionsData || []);
      setTablesMissing(false);
    } catch (err) {
      console.error('Error in useProjectAccounts fetchData:', err);
      setError(err.message || 'Error cargando datos');
    } finally {
      if (!abortSignal?.aborted) {
        setLoading(false);
      }
    }
  }, [usingLocalStorage, session]);

  useEffect(() => {
    const controller = new AbortController();
    if (session || usingLocalStorage) {
      fetchData(controller.signal);
    } else {
      setLoading(false);
    }
    return () => controller.abort();
  }, [session, fetchData, usingLocalStorage]);

  // --- Project Operations ---

  const createProject = async (name, description, budget) => {
    const parsedBudget = budget ? parseFloat(budget) : null;
    const newProj = {
      name,
      description: description || null,
      budget: parsedBudget,
      archived: false,
    };

    if (usingLocalStorage) {
      const tempId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now();
      const projectWithId = {
        ...newProj,
        id: tempId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: session?.user?.id || 'local-user'
      };
      const updated = [projectWithId, ...projects];
      setProjects(updated);
      localStorage.setItem('pot_local_project_accounts', JSON.stringify(updated));
      return projectWithId;
    }

    try {
      const { data, error } = await supabase
        .from('project_accounts')
        .insert([newProj])
        .select()
        .single();

      if (error) throw error;
      setProjects(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error creating project:', err);
      throw err;
    }
  };

  const updateProject = async (projectId, name, description, budget) => {
    const parsedBudget = budget ? parseFloat(budget) : null;
    const updateData = {
      name,
      description: description || null,
      budget: parsedBudget,
      updated_at: new Date().toISOString()
    };

    if (usingLocalStorage) {
      const updated = projects.map(p => p.id === projectId ? { ...p, ...updateData } : p);
      setProjects(updated);
      localStorage.setItem('pot_local_project_accounts', JSON.stringify(updated));
      return;
    }

    try {
      const { error } = await supabase
        .from('project_accounts')
        .update(updateData)
        .eq('id', projectId);

      if (error) throw error;
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updateData } : p));
    } catch (err) {
      console.error('Error updating project:', err);
      throw err;
    }
  };

  const archiveProject = async (projectId, archivedStatus) => {
    if (usingLocalStorage) {
      const updated = projects.map(p => p.id === projectId ? { ...p, archived: archivedStatus, updated_at: new Date().toISOString() } : p);
      setProjects(updated);
      localStorage.setItem('pot_local_project_accounts', JSON.stringify(updated));
      return;
    }

    try {
      const { error } = await supabase
        .from('project_accounts')
        .update({ archived: archivedStatus, updated_at: new Date().toISOString() })
        .eq('id', projectId);

      if (error) throw error;
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, archived: archivedStatus } : p));
    } catch (err) {
      console.error('Error archiving project:', err);
      throw err;
    }
  };

  const deleteProject = async (projectId) => {
    if (usingLocalStorage) {
      const updatedProjects = projects.filter(p => p.id !== projectId);
      const updatedTransactions = transactions.filter(t => t.project_id !== projectId);
      setProjects(updatedProjects);
      setTransactions(updatedTransactions);
      localStorage.setItem('pot_local_project_accounts', JSON.stringify(updatedProjects));
      localStorage.setItem('pot_local_project_transactions', JSON.stringify(updatedTransactions));
      return;
    }

    try {
      const { error } = await supabase
        .from('project_accounts')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setTransactions(prev => prev.filter(t => t.project_id !== projectId));
    } catch (err) {
      console.error('Error deleting project:', err);
      throw err;
    }
  };

  // --- Transaction Operations ---

  const addTransaction = async (projectId, description, amount, category, date) => {
    const parsedAmount = parseFloat(amount); // This should be signed (+ for income, - for expense)
    const newTx = {
      project_id: projectId,
      description,
      amount: parsedAmount,
      category: category || 'otro',
      transaction_date: date || new Date().toISOString().split('T')[0]
    };

    if (usingLocalStorage) {
      const tempId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now();
      const txWithId = {
        ...newTx,
        id: tempId,
        created_at: new Date().toISOString(),
        user_id: session?.user?.id || 'local-user'
      };
      const updated = [txWithId, ...transactions];
      setTransactions(updated);
      localStorage.setItem('pot_local_project_transactions', JSON.stringify(updated));
      return txWithId;
    }

    try {
      const { data, error } = await supabase
        .from('project_transactions')
        .insert([newTx])
        .select()
        .single();

      if (error) throw error;
      setTransactions(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error adding transaction:', err);
      throw err;
    }
  };

  const updateTransaction = async (transactionId, description, amount, category, date) => {
    const parsedAmount = parseFloat(amount);
    const updateData = {
      description,
      amount: parsedAmount,
      category,
      transaction_date: date
    };

    if (usingLocalStorage) {
      const updated = transactions.map(t => t.id === transactionId ? { ...t, ...updateData } : t);
      setTransactions(updated);
      localStorage.setItem('pot_local_project_transactions', JSON.stringify(updated));
      return;
    }

    try {
      const { error } = await supabase
        .from('project_transactions')
        .update(updateData)
        .eq('id', transactionId);

      if (error) throw error;
      setTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, ...updateData } : t));
    } catch (err) {
      console.error('Error updating transaction:', err);
      throw err;
    }
  };

  const deleteTransaction = async (transactionId) => {
    if (usingLocalStorage) {
      const updated = transactions.filter(t => t.id !== transactionId);
      setTransactions(updated);
      localStorage.setItem('pot_local_project_transactions', JSON.stringify(updated));
      return;
    }

    try {
      const { error } = await supabase
        .from('project_transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
    } catch (err) {
      console.error('Error deleting transaction:', err);
      throw err;
    }
  };

  // --- Derived Calculations ---

  const projectsWithCalculations = useMemo(() => {
    return projects.map(project => {
      const projectTxs = transactions.filter(t => t.project_id === project.id);
      
      const balance = projectTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const totalIngresos = projectTxs.filter(t => Number(t.amount) > 0).reduce((sum, t) => sum + Number(t.amount), 0);
      const totalGastos = projectTxs.filter(t => Number(t.amount) < 0).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
      
      const budgetProgressPct = project.budget && Number(project.budget) > 0 
        ? Math.round((totalGastos / Number(project.budget)) * 100)
        : null;

      return {
        ...project,
        transactions: projectTxs,
        balance,
        totalIngresos,
        totalGastos,
        budgetProgressPct
      };
    });
  }, [projects, transactions]);

  // Overall summary metrics across all non-archived projects
  const consolidatedMetrics = useMemo(() => {
    const activeProjs = projectsWithCalculations.filter(p => !p.archived);
    const balance = activeProjs.reduce((sum, p) => sum + p.balance, 0);
    const totalIngresos = activeProjs.reduce((sum, p) => sum + p.totalIngresos, 0);
    const totalGastos = activeProjs.reduce((sum, p) => sum + p.totalGastos, 0);

    return {
      activeProjectsCount: activeProjs.length,
      balance,
      totalIngresos,
      totalGastos
    };
  }, [projectsWithCalculations]);

  return {
    loading,
    error,
    tablesMissing,
    usingLocalStorage,
    enableLocalStorageMode,
    projects: projectsWithCalculations,
    transactions,
    createProject,
    updateProject,
    archiveProject,
    deleteProject,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refetch: fetchData
  };
}
