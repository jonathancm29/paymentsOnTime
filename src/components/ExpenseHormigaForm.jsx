import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Coffee } from 'lucide-react';
import { CATEGORIES } from '../utils/categories';
import { getTodayDate } from '../utils/dateHelpers';
import { digitsOnly, formatCopFromDigits, parseCopDigitsToNumber } from '../utils/money';

export default function ExpenseHormigaForm({ onClose, onSuccess, session, currentMonth }) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [amountDigits, setAmountDigits] = useState('');
  const [category, setCategory] = useState('compras');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: newExpense, error: expError } = await supabase
        .from('expenses')
        .insert({
          user_id: session.user.id,
          name: name,
          amount: parseCopDigitsToNumber(amountDigits),
          due_day: getTodayDate().getDate(),
          category: category,
          is_spontaneous: true
        })
        .select('*')
        .single();

      if (expError) throw expError;

      const { error: payError } = await supabase
        .from('payments')
        .insert({
          expense_id: newExpense.id,
          month_year: currentMonth,
          completed: true,
          completed_at: getTodayDate().toISOString(),
          amount_paid: parseCopDigitsToNumber(amountDigits)
        });

      if (payError) throw payError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error insertando Gasto Hormiga:', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <div className="expense-form__header">
        <div className="expense-form__icon expense-form__icon--hormiga">
          <Coffee size={20} />
        </div>
        <div>
          <h2 className="expense-form__title">Gasto Hormiga</h2>
          <p className="expense-form__subtitle">
            Registra gastos pequeños pagados al contado
          </p>
        </div>
      </div>

      <div className="expense-form__note">
        Se marcará como pagado al instante. No generará cuotas en meses futuros.
      </div>

      <div className="expense-form__fields">
        <div className="form-group">
          <label>¿Qué acabas de pagar?</label>
          <input
            type="text"
            className="form-control"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Café con empanada"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Valor</label>
          <input
            type="text"
            className="form-control"
            required
            inputMode="numeric"
            value={formatCopFromDigits(amountDigits)}
            onChange={e => setAmountDigits(digitsOnly(e.target.value))}
            placeholder="$ 0"
          />
        </div>

        <div className="form-group">
          <label>Categoría</label>
          <select
            className="form-control"
            value={category}
            onChange={e => setCategory(e.target.value)}
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
              Registrando...
            </>
          ) : (
            'Registrar'
          )}
        </button>
      </div>
    </form>
  );
}
