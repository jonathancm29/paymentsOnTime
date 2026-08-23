import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CATEGORIES } from '../utils/categories';
import { getTodayDate } from '../utils/dateHelpers';
import { format } from 'date-fns';
import { digitsOnly, formatCopFromDigits, parseCopDigitsToNumber } from '../utils/money';
import { Edit2, Plus } from 'lucide-react';

export default function ExpenseForm({ onClose, onSuccess, initialData }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData ? initialData.name : '',
    category: initialData ? initialData.category : 'tarjetas',
    amount: initialData ? digitsOnly(Math.round(Number(initialData.amount || 0))) : '',
    due_day: initialData ? initialData.due_day : '15',
    recurrence: initialData && initialData.recurrence ? initialData.recurrence : 'monthly',
    due_month: initialData && initialData.due_month ? String(initialData.due_month) : '1'
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
            amount: parseCopDigitsToNumber(formData.amount),
            due_day: parseInt(formData.due_day),
            recurrence: formData.recurrence,
            due_month: formData.recurrence === 'yearly' ? parseInt(formData.due_month) : null
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
            amount: parseCopDigitsToNumber(formData.amount),
            due_day: parseInt(formData.due_day),
            recurrence: formData.recurrence,
            due_month: formData.recurrence === 'yearly' ? parseInt(formData.due_month) : null
          }])
          .select()
          .single();

        if (error) throw error;

        // Insert First Monthly Instance if applicable
        const currentMonth = format(getTodayDate(), 'yyyy-MM');
        const currentMonthNumber = parseInt(format(getTodayDate(), 'M')); // 1 to 12
        const isYearly = formData.recurrence === 'yearly';
        const dueMonthNum = parseInt(formData.due_month);

        if (!isYearly || (isYearly && dueMonthNum === currentMonthNumber)) {
          const { error: paymentError } = await supabase
            .from('payments')
            .insert([{
              expense_id: expense.id,
              month_year: currentMonth,
              completed: false
            }]);

          if (paymentError) throw paymentError;
        }
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
    <form onSubmit={handleSubmit} className="expense-form">
      <div className="expense-form__header">
        <div className="expense-form__icon">
          {initialData ? <Edit2 size={20} /> : <Plus size={20} />}
        </div>
        <div>
          <h2 className="expense-form__title">
            {initialData ? 'Editar Gasto' : 'Nuevo Gasto'}
          </h2>
          <p className="expense-form__subtitle">
            {initialData ? 'Actualiza los datos del compromiso' : 'Agrega un compromiso mensual a tu lista'}
          </p>
        </div>
      </div>

      <div className="expense-form__fields">
        <div className="form-group">
          <label>Nombre</label>
          <input
            type="text"
            className="form-control"
            required
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej: Tarjeta de Crédito Nu"
            autoFocus
          />
        </div>

        <div className="expense-form__row">
          <div className="form-group">
            <label>Monto estimado</label>
            <input
              type="text"
              className="form-control"
              required
              inputMode="numeric"
              value={formatCopFromDigits(formData.amount)}
              onChange={e => setFormData({ ...formData, amount: digitsOnly(e.target.value) })}
              placeholder="$ 0"
            />
          </div>

          <div className="form-group expense-form__day">
            <label>Día de pago</label>
            <input
              type="number"
              className="form-control"
              required
              min="1"
              max="31"
              value={formData.due_day}
              onChange={e => setFormData({ ...formData, due_day: e.target.value })}
              placeholder="15"
            />
          </div>
        </div>

        <div className="expense-form__row">
          <div className="form-group">
            <label>Recurrencia</label>
            <select
              className="form-control"
              value={formData.recurrence}
              onChange={e => setFormData({ 
                ...formData, 
                recurrence: e.target.value,
                due_month: e.target.value === 'yearly' ? (formData.due_month || '1') : null
              })}
            >
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </select>
          </div>

          {formData.recurrence === 'yearly' && (
            <div className="form-group" style={{ width: '130px', flexShrink: 0 }}>
              <label>Mes de pago</label>
              <select
                className="form-control"
                value={formData.due_month || '1'}
                onChange={e => setFormData({ ...formData, due_month: e.target.value })}
              >
                <option value="1">Enero</option>
                <option value="2">Febrero</option>
                <option value="3">Marzo</option>
                <option value="4">Abril</option>
                <option value="5">Mayo</option>
                <option value="6">Junio</option>
                <option value="7">Julio</option>
                <option value="8">Agosto</option>
                <option value="9">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
            </div>
          )}
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
      </div>

      <div className="expense-form__actions">
        <button
          type="button"
          className="glass-button"
          onClick={onClose}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="glass-button primary"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="expense-form__spinner" />
              Guardando...
            </>
          ) : (
            initialData ? 'Actualizar' : 'Guardar'
          )}
        </button>
      </div>
    </form>
  );
}
