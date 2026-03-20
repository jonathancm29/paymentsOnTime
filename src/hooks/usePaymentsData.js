import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { getTodayDate } from '../utils/dateHelpers';

export function usePaymentsData(session) {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const currentMonth = format(getTodayDate(), 'yyyy-MM');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: expensesData, error: expError } = await supabase
        .from('expenses')
        .select('*')
        .order('due_day', { ascending: true });

      if (expError) throw expError;

      const { data: paymentsData, error: payError } = await supabase
        .from('payments')
        .select('*')
        .order('month_year', { ascending: false });

      if (payError) throw payError;

      const currentMonthPayments = paymentsData.filter(p => p.month_year === currentMonth);
      const newPaymentsToInsert = [];

      for (const expense of expensesData) {
        const hasPaymentThisMonth = currentMonthPayments.some(p => p.expense_id === expense.id);
        if (!hasPaymentThisMonth && !expense.is_spontaneous) {
          newPaymentsToInsert.push({
            expense_id: expense.id,
            month_year: currentMonth,
            completed: false
          });
        }
      }

      if (newPaymentsToInsert.length > 0) {
        const { data: inserted, error: insertErr } = await supabase
          .from('payments')
          .insert(newPaymentsToInsert)
          .select();

        if (insertErr) {
          console.error("Error inserting new month payments:", insertErr);
        } else if (inserted) {
          paymentsData.push(...inserted);
        }
      }

      setExpenses(expensesData || []);
      setPayments(paymentsData || []);

    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, fetchData]);

  async function executePaymentStatusUpdate(paymentId, newStatus, amountPaidVal) {
    const completedAt = newStatus ? getTodayDate().toISOString() : null;

    setPayments(prev => prev.map(p =>
      p.id === paymentId ? { ...p, completed: newStatus, completed_at: completedAt, amount_paid: amountPaidVal } : p
    ));

    const { error } = await supabase
      .from('payments')
      .update({
        completed: newStatus,
        completed_at: completedAt,
        amount_paid: amountPaidVal
      })
      .eq('id', paymentId);

    if (error) {
      console.error("Error updating payment", error);
      fetchData();
    }
  }

  async function deleteExpense(expenseId) {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este gasto de forma permanente (y todo su historial)?")) return;

    setExpenses(prev => prev.filter(e => e.id !== expenseId));

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) {
      console.error("Error deleting expense", error);
      alert("No se pudo eliminar el gasto.");
      fetchData();
    } else {
      fetchData();
    }
  }

  return {
    loading,
    expenses,
    payments,
    currentMonth,
    fetchData,
    executePaymentStatusUpdate,
    deleteExpense
  };
}
