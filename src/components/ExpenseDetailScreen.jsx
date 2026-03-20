import { Droplet, History, ChevronLeft, Check } from 'lucide-react';
import { CATEGORIES } from '../utils/categories';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ExpenseDetailScreen({ expense, allPayments, onBack, onTogglePayment, currentMonth }) {
  if (!expense) return <div className="loader"></div>;

  const IconComponent = CATEGORIES[expense.category]?.icon || Droplet;
  const expensePayments = allPayments.filter(p => p.expense_id === expense.id).sort((a, b) => {
    if (a.month_year > b.month_year) return -1;
    if (a.month_year < b.month_year) return 1;
    return 0;
  });

  return (
    <div style={{ animation: 'slideDown 0.3s ease' }}>
      <button
        className="glass-button"
        onClick={onBack}
        style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem' }}
      >
        <ChevronLeft size={18} /> Volver al Inicio
      </button>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="category-icon" style={{ width: '64px', height: '64px', fontSize: '2rem' }}>
            <IconComponent size={32} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{expense.name}</h2>
            <div className="payment-meta" style={{ fontSize: '1rem' }}>
              <span>Día de corte: {expense.due_day}</span>
              <span>• Categoría: {CATEGORIES[expense.category]?.label || 'General'}</span>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-glass-border)' }}>
          <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>Monto Previsto Mensual</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>${Number(expense.amount).toLocaleString('es-CO')}</div>
        </div>
      </div>

      <h3 className="section-title">
        <History size={20} /> Historial Completo de Pagos
      </h3>

      <div className="payment-list">
        {expensePayments.map(payment => {
          const isOverdue = payment.month_year < currentMonth && !payment.completed;
          const isCurrentMonth = payment.month_year === currentMonth;

          return (
            <div key={payment.id} className={`glass-panel payment-card ${payment.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`}>
              <div className="payment-details">
                <div className="payment-info">
                  <h3 style={{ textTransform: 'capitalize' }}>
                    {format(parseISO(payment.month_year + '-01'), 'MMMM yyyy', { locale: es })}
                    {isCurrentMonth && <span className="badge" style={{ marginLeft: '1rem' }}>Mes Actual</span>}
                  </h3>
                  <div className="payment-meta">
                    {payment.completed ? (
                      <span style={{ color: 'var(--color-success)' }}>
                        Pagado el {format(parseISO(payment.completed_at), 'dd MMM yyyy', { locale: es })}
                      </span>
                    ) : (
                      <span>
                        Vencimiento: Día {expense.due_day}
                        {isOverdue && <span className="overdue-badge">Atrasado</span>}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="payment-actions">
                <div className="amount">
                  ${payment.completed ? Number(payment.amount_paid || expense.amount).toLocaleString('es-CO') : Number(expense.amount).toLocaleString('es-CO')}
                </div>
                <div>
                  <button
                    className={`check-button ${payment.completed ? 'checked' : ''}`}
                    onClick={() => onTogglePayment(payment.id, payment.completed, expense.amount)}
                  >
                    <Check size={20} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {expensePayments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            No hay registros de pago para este compromiso.
          </div>
        )}
      </div>
    </div>
  );
}
