import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CATEGORIES } from '../utils/categories';
import { getTodayDate } from '../utils/dateHelpers';
import { format } from 'date-fns';

export default function ExpenseForm({ onClose, onSuccess, initialData }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData ? initialData.name : '',
    category: initialData ? initialData.category : 'tarjetas',
    amount: initialData ? initialData.amount : '',
    due_day: initialData ? initialData.due_day : '15'
  });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);

    try {
      if (initialData) {
        // Edit Existing Expense
        const { error } = await supabase
          .from('expenses')
          .update({
            name: formData.name,
            category: formData.category,
            amount: parseFloat(formData.amount),
            due_day: parseInt(formData.due_day)
          })
          .eq('id', initialData.id);

        if (error) throw error;
      } else {
        // Insert New Template
        const { data: expense, error } = await supabase
          .from('expenses')
          .insert([{
            name: formData.name,
            category: formData.category,
            amount: parseFloat(formData.amount),
            due_day: parseInt(formData.due_day)
          }])
          .select()
          .single();

        if (error) throw error;

        // Insert First Monthly Instance
        const currentMonth = format(getTodayDate(), 'yyyy-MM');
        const { error: paymentError } = await supabase
          .from('payments')
          .insert([{
            expense_id: expense.id,
            month_year: currentMonth,
            completed: false
          }]);

        if (paymentError) throw paymentError;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Insert/Update error:", err);
      alert("Error guardando el gasto. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: '0 2rem 2rem' }}>
      <div className="form-group">
        <label>Nombre del Compromiso (Ej. Tarjeta de Crédito Nu)</label>
        <input
          type="text"
          className="form-control"
          required
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>Categoría</label>
        <select
          className="form-control"
          value={formData.category}
          onChange={e => setFormData({ ...formData, category: e.target.value })}
        >
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <option key={key} value={key}>{cat.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Monto Estimado</label>
          <input
            type="number"
            className="form-control"
            required
            min="0"
            step="100"
            value={formData.amount}
            onChange={e => setFormData({ ...formData, amount: e.target.value })}
          />
        </div>

        <div className="form-group" style={{ width: '120px' }}>
          <label>Día (1-31)</label>
          <input
            type="number"
            className="form-control"
            required
            min="1"
            max="31"
            value={formData.due_day}
            onChange={e => setFormData({ ...formData, due_day: e.target.value })}
          />
        </div>
      </div>

      <button
        type="submit"
        className="glass-button primary"
        style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
        disabled={loading}
      >
        {loading ? 'Guardando...' : (initialData ? 'Actualizar Gasto' : 'Guardar Gasto')}
      </button>
    </form>
  );
}
