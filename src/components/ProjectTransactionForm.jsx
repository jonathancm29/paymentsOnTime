import { useState, useEffect } from 'react';
import { digitsOnly, formatCopFromDigits, parseCopDigitsToNumber } from '../utils/money';
import { PROJECT_CATEGORIES } from '../utils/projectCategories';
import { getTodayDate } from '../utils/dateHelpers';
import { Edit2, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function ProjectTransactionForm({ onClose, onSuccess, initialData, addTransaction, updateTransaction, projectId }) {
  const [loading, setLoading] = useState(false);
  const [txType, setTxType] = useState(initialData ? (Number(initialData.amount) >= 0 ? 'income' : 'expense') : 'expense');
  const [formData, setFormData] = useState({
    description: initialData ? initialData.description : '',
    amount: initialData ? digitsOnly(Math.round(Math.abs(Number(initialData.amount)))) : '',
    category: initialData ? initialData.category : 'otro',
    date: initialData ? initialData.transaction_date : new Date().toISOString().split('T')[0]
  });

  // Filter categories dynamically based on selected type
  const availableCategories = Object.values(PROJECT_CATEGORIES).filter(cat => {
    return cat.kind === 'both' || cat.kind === txType;
  });

  // Automatically adjust category if it's not valid for the current transaction type
  useEffect(() => {
    const isCategoryValid = availableCategories.some(cat => cat.id === formData.category);
    if (!isCategoryValid && availableCategories.length > 0) {
      setFormData(prev => ({ ...prev, category: availableCategories[0].id }));
    }
  }, [txType, availableCategories, formData.category]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.description.trim() || !formData.amount) return;
    setLoading(true);

    try {
      const rawAmount = parseCopDigitsToNumber(formData.amount);
      const signedAmount = txType === 'expense' ? -rawAmount : rawAmount;

      if (initialData) {
        await updateTransaction(initialData.id, formData.description, signedAmount, formData.category, formData.date);
      } else {
        await addTransaction(projectId, formData.description, signedAmount, formData.category, formData.date);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving transaction:", err);
      alert("Error al guardar la transacción. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <div className="expense-form__header">
        <div className="expense-form__icon" style={{ background: txType === 'expense' ? 'var(--color-danger)' : 'var(--color-success)' }}>
          {initialData ? <Edit2 size={20} color="white" /> : <Plus size={20} color="white" />}
        </div>
        <div>
          <h2 className="expense-form__title">
            {initialData ? 'Editar Transacción' : 'Registrar Transacción'}
          </h2>
          <p className="expense-form__subtitle">
            {initialData ? 'Actualiza los datos del movimiento' : 'Agrega un gasto o un ingreso/aporte a esta cuenta'}
          </p>
        </div>
      </div>

      <div className="expense-form__fields">
        {/* Toggle between Expense and Income */}
        <div className="form-group">
          <label>Tipo de Transacción</label>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button
              type="button"
              type-id="tx-type-expense"
              onClick={() => setTxType('expense')}
              className={`glass-button ${txType === 'expense' ? 'active-expense' : ''}`}
              style={{
                flex: 1,
                justifyContent: 'center',
                borderColor: txType === 'expense' ? 'var(--color-danger)' : 'var(--color-glass-border)',
                background: txType === 'expense' ? 'rgba(239, 68, 68, 0.15)' : 'var(--color-glass)',
                color: txType === 'expense' ? 'var(--color-danger)' : 'var(--color-text-muted)',
              }}
            >
              <ArrowDownLeft size={16} /> Gasto / Egreso
            </button>
            <button
              type="button"
              type-id="tx-type-income"
              onClick={() => setTxType('income')}
              className={`glass-button ${txType === 'income' ? 'active-income' : ''}`}
              style={{
                flex: 1,
                justifyContent: 'center',
                borderColor: txType === 'income' ? 'var(--color-success)' : 'var(--color-glass-border)',
                background: txType === 'income' ? 'rgba(16, 181, 129, 0.15)' : 'var(--color-glass)',
                color: txType === 'income' ? 'var(--color-success)' : 'var(--color-text-muted)',
              }}
            >
              <ArrowUpRight size={16} /> Ingreso / Aporte
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Descripción *</label>
          <input
            type="text"
            className="form-control"
            required
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder={txType === 'expense' ? "Ej: Hotel en CDMX, Souvenirs..." : "Ej: Ahorro inicial, Reembolso vuelo..."}
            autoFocus
          />
        </div>

        <div className="expense-form__row">
          <div className="form-group">
            <label>Monto *</label>
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
            <label>Fecha</label>
            <input
              type="date"
              className="form-control"
              required
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Categoría</label>
          <select
            className="form-control"
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
          >
            {availableCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
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
          disabled={loading || !formData.description.trim() || !formData.amount}
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
