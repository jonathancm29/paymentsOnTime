import { useState, useEffect, useRef } from 'react';
import { Check, ArrowLeft, Wallet, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { digitsOnly, formatCopFromDigits, parseCopDigitsToNumber } from '../utils/money';

export default function PaymentConfirmForm({ paymentName, categoryIcon, categoryLabel, dueDay, expectedAmount, onConfirm, onCancel }) {
  const [state, setState] = useState('form');
  const [amountDigits, setAmountDigits] = useState(expectedAmount != null ? digitsOnly(Math.round(Number(expectedAmount))) : '');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current && state === 'form') {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [state]);

  const handleAmountChange = (e) => {
    setAmountDigits(digitsOnly(e.target.value));
    if (error) setError('');
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const parsedAmount = parseCopDigitsToNumber(amountDigits);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Ingresa un monto válido');
      return;
    }
    setState('processing');
    try {
      await onConfirm(parsedAmount);
      setState('success');
    } catch (err) {
      console.error(err);
      setError('No se pudo confirmar el pago. Intenta de nuevo.');
      setState('form');
    }
  }

  function handleClose() {
    if (state === 'success') {
      onCancel();
    } else {
      onCancel();
    }
  }

  const IconComponent = categoryIcon || Wallet;

  if (state === 'processing') {
    return (
      <div className="payment-confirm processing">
        <div className="payment-confirm__loader-ring">
          <Loader2 className="payment-confirm__spinner" size={48} />
        </div>
        <p className="payment-confirm__loader-text">Confirmando pago</p>
        <p className="payment-confirm__loader-sub">Esto solo tomará un momento...</p>
      </div>
    );
  }

  if (state === 'success') {
    const paidAmount = parseCopDigitsToNumber(amountDigits);
    const diff = paidAmount - Number(expectedAmount);

    return (
      <div className="payment-confirm success">
        <div className="payment-confirm__success-icon">
          <div className="payment-confirm__success-circle">
            <Check size={48} strokeWidth={2.5} />
          </div>
        </div>
        <h2 className="payment-confirm__success-title">¡Pago confirmado!</h2>
        <p className="payment-confirm__success-sub">Tu compromiso ha sido registrado</p>

        <div className="payment-confirm__receipt">
          <div className="payment-confirm__receipt-row">
            <span className="payment-confirm__receipt-label">Monto pagado</span>
            <span className="payment-confirm__receipt-value">${paidAmount.toLocaleString('es-CO')}</span>
          </div>
          {diff !== 0 && (
            <div className={`payment-confirm__receipt-row payment-confirm__receipt-row--diff ${diff > 0 ? 'payment-confirm__receipt-row--diff-up' : 'payment-confirm__receipt-row--diff-down'}`}>
              <span className="payment-confirm__receipt-label">
                <AlertCircle size={12} />
                {diff > 0 ? 'Por encima' : 'Por debajo'} del esperado
              </span>
              <span className="payment-confirm__receipt-value">{diff > 0 ? '+' : ''}${Math.abs(diff).toLocaleString('es-CO')}</span>
            </div>
          )}
        </div>

        <button className="payment-confirm__btn payment-confirm__btn--success" onClick={handleClose}>
          <Sparkles size={18} />
          Listo
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="payment-confirm form">
      <div className="payment-confirm__header">
        <div className="payment-confirm__icon-wrap">
          <IconComponent size={24} />
        </div>
        <div className="payment-confirm__header-info">
          <h3 className="payment-confirm__title">{paymentName || 'Pago'}</h3>
          <p className="payment-confirm__meta">
            {categoryLabel && <span>{categoryLabel}</span>}
            {dueDay && <span>Día {dueDay}</span>}
          </p>
        </div>
      </div>

      <div className="payment-confirm__expected">
        <span className="payment-confirm__expected-label">Monto esperado</span>
        <span className="payment-confirm__expected-value">
          ${Number(expectedAmount).toLocaleString('es-CO')}
        </span>
      </div>

      <div className="payment-confirm__input-group">
        <label className="payment-confirm__label">¿Cuánto pagaste?</label>
        <div className={`payment-confirm__amount-input ${error ? 'payment-confirm__amount-input--error' : ''}`}>
          <span className="payment-confirm__currency-prefix">COP</span>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            className="payment-confirm__input"
            value={formatCopFromDigits(amountDigits)}
            onChange={handleAmountChange}
            placeholder="0"
          />
        </div>
        {error && (
          <p className="payment-confirm__error">
            <AlertCircle size={14} />
            {error}
          </p>
        )}
        <p className="payment-confirm__hint">
          Puedes ajustar el monto si difiere del valor planeado
        </p>
      </div>

      <div className="payment-confirm__actions">
        <button
          type="button"
          className="payment-confirm__btn payment-confirm__btn--ghost"
          onClick={onCancel}
        >
          <ArrowLeft size={16} />
          Volver
        </button>
        <button
          type="submit"
          className="payment-confirm__btn payment-confirm__btn--primary"
          disabled={!amountDigits || parseCopDigitsToNumber(amountDigits) <= 0}
        >
          <Check size={18} />
          Confirmar Pago
        </button>
      </div>
    </form>
  );
}
