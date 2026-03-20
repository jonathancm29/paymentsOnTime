import { useState } from 'react';

export default function PaymentConfirmForm({ initialAmount, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(initialAmount || '');

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    onConfirm(parseFloat(amount));
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: '0 2rem 2rem' }}>
      <div className="form-group">
        <label>¿Cuánto pagaste exactamente?</label>
        <input
          type="number"
          className="form-control"
          required
          min="0"
          step="1"
          value={amount}
          onChange={e => setAmount(e.target.value)}
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
