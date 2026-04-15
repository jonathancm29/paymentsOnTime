import { useState } from 'react';
import { digitsOnly, formatCopFromDigits, parseCopDigitsToNumber } from '../utils/money';

export default function PaymentConfirmForm({ initialAmount, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [amountDigits, setAmountDigits] = useState(initialAmount !== null && initialAmount !== undefined ? digitsOnly(Math.round(Number(initialAmount))) : '');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm(parseCopDigitsToNumber(amountDigits));
      alert('¡Pago confirmado con éxito!');
      onCancel(); // This closes the modal
    } catch (error) {
      console.error(error);
      alert('Hubo un error al confirmar el pago.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="loader"></div>
        <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Procesando tu pago...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: '0 2rem 2rem' }}>
      <div className="form-group">
        <label>¿Cuánto pagaste exactamente?</label>
        <input
          type="text"
          className="form-control"
          required
          inputMode="numeric"
          value={formatCopFromDigits(amountDigits)}
          onChange={e => setAmountDigits(digitsOnly(e.target.value))}
          placeholder="Ej: 120.000"
        />
        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          Por defecto se muestra el valor planeado del gasto. Puedes modificarlo si el monto que pagaste hoy fue diferente.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <button
          type="button"
          className="glass-button"
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="glass-button primary"
          style={{ flex: 1, justifyContent: 'center' }}
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Confirmar Pago'}
        </button>
      </div>
    </form>
  );
}
