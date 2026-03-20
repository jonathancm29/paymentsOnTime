import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign } from 'lucide-react';
import { CATEGORIES } from '../utils/categories';
import { getTodayDate } from '../utils/dateHelpers';

export default function ExpenseHormigaForm({ onClose, onSuccess, session, currentMonth }) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('compras');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Insert an impromptu expense
      const { data: newExpense, error: expError } = await supabase
        .from('expenses')
        .insert({
          user_id: session.user.id,
          name: name,
          amount: parseFloat(amount),
          due_day: getTodayDate().getDate(),
          category: category,
          is_spontaneous: true
        })
        .select('*')
        .single();

      if (expError) throw expError;

      // 2. Immediately insert its single completed payment for the current month
      const { error: payError } = await supabase
        .from('payments')
        .insert({
          expense_id: newExpense.id,
          month_year: currentMonth,
          completed: true,
          completed_at: getTodayDate().toISOString(),
          amount_paid: parseFloat(amount)
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
    <form onSubmit={handleSubmit} style={{ padding: '0 2rem 2rem' }}>
      <p style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
        Los Gastos Hormiga se marcan como completamente pagados al instante. No generarán cuotas en meses futuros, solo sirven para que tengas registro en lo que gastaste este mes.
      </p>
      <div className="form-group">
        <label>¿Qué acabas de pagar al contado?</label>
        <input type="text" className="form-control" required value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Café con empanada" />
      </div>

      <div className="form-group">
        <label>Valor Monetario</label>
        <div style={{ position: 'relative' }}>
          <DollarSign size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
          <input type="number" className="form-control" style={{ paddingLeft: '2.5rem' }} required min="0" step="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ej: 5000" />
        </div>
      </div>

      <div className="form-group">
        <label>Categoría</label>
        <select className="form-control" value={category} onChange={e => setCategory(e.target.value)}>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <option key={key} value={key}>{cat.label}</option>
          ))}
        </select>
      </div>

      <button type="submit" className="glass-button primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }} disabled={loading}>
        {loading ? 'Registrando...' : 'Registrar Gasto Hormiga'}
      </button>
    </form>
  );
}
