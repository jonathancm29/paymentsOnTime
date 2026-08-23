import { useState } from 'react';
import { CATEGORIES } from '../utils/categories';
import {
  Search, Plus, Edit2, Trash2, History, Droplet,
  ListChecks, TrendingUp, CalendarClock, X, Filter
} from 'lucide-react';
import ExpenseForm from './ExpenseForm';

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function ExpensesManagerScreen({
  expenses,
  onDeleteExpense,
  onViewDetail,
  onRefresh,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [recurrenceFilter, setRecurrenceFilter] = useState('all');
  const [editingExpense, setEditingExpense] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // ---- Filtering ----
  const filtered = expenses.filter(exp => {
    const matchesSearch = exp.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
    const matchesRecurrence =
      recurrenceFilter === 'all' ||
      (recurrenceFilter === 'hormiga'
        ? exp.is_spontaneous
        : exp.recurrence === recurrenceFilter && !exp.is_spontaneous);
    return matchesSearch && matchesCategory && matchesRecurrence;
  });

  // ---- KPIs ----
  const regularExpenses = expenses.filter(e => !e.is_spontaneous);
  const monthlyExpenses = regularExpenses.filter(e => e.recurrence !== 'yearly');
  const yearlyExpenses = regularExpenses.filter(e => e.recurrence === 'yearly');
  const spontaneousExpenses = expenses.filter(e => e.is_spontaneous);
  const totalMonthly = monthlyExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const totalYearly = yearlyExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const annualProjection = totalMonthly * 12 + totalYearly;

  const usedCategories = [...new Set(expenses.map(e => e.category))];

  function handleOpenNew() { setEditingExpense(null); setShowForm(true); }
  function handleOpenEdit(expense) { setEditingExpense(expense); setShowForm(true); }
  function handleCloseForm() { setShowForm(false); setEditingExpense(null); }
  function handleFormSuccess() { onRefresh(); handleCloseForm(); }

  return (
    <div style={{ animation: 'slideDown 0.3s ease' }}>

      {/* ---- KPI HEADER — mismo padding/layout que progress-header ---- */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div className="stats-row" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none', justifyContent: 'flex-start', gap: '2.5rem' }}>

          <div className="stat-item">
            <span className="label">Total Gastos</span>
            <span className="value">{regularExpenses.length}</span>
            {spontaneousExpenses.length > 0 && (
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                + {spontaneousExpenses.length} hormiga
              </span>
            )}
          </div>

          <div className="stat-item">
            <span className="label">Gasto Mensual Est.</span>
            <span className="value" style={{ color: 'var(--color-primary)' }}>
              ${totalMonthly.toLocaleString('es-CO')}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
              {monthlyExpenses.length} compromisos
            </span>
          </div>

          <div className="stat-item">
            <span className="label">Proyección Anual</span>
            <span className="value">${annualProjection.toLocaleString('es-CO')}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
              incl. {yearlyExpenses.length} anuales
            </span>
          </div>

        </div>
      </div>

      {/* ---- FILTERS & ACTIONS — mismo layout que búsqueda en tab mensual ---- */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>

        <div className="search-input-wrapper" style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
          <Search size={18} />
          <input
            type="text"
            className="form-control"
            placeholder="Buscar gasto..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem', paddingRight: searchQuery ? '2.5rem' : undefined }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-muted)', display: 'flex', padding: 0
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <Filter size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '150px' }}
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="all">Todas las categorías</option>
            {usedCategories.map(catId => (
              <option key={catId} value={catId}>
                {CATEGORIES[catId]?.label || catId}
              </option>
            ))}
          </select>
        </div>

        <select
          className="form-control"
          style={{ width: 'auto', minWidth: '110px', flexShrink: 0 }}
          value={recurrenceFilter}
          onChange={e => setRecurrenceFilter(e.target.value)}
        >
          <option value="all">Todos</option>
          <option value="monthly">Mensual</option>
          <option value="yearly">Anual</option>
          <option value="hormiga">Hormiga</option>
        </select>

        <button
          className="glass-button primary"
          style={{ flexShrink: 0 }}
          onClick={handleOpenNew}
        >
          <Plus size={18} /> Nuevo Gasto
        </button>
      </div>

      {/* ---- EXPENSES LIST ---- */}
      {filtered.length === 0 ? (
        <div className="empty-state glass-panel" style={{ marginTop: '1.5rem' }}>
          <Search size={48} />
          <h3>Sin resultados</h3>
          <p>{expenses.length === 0
            ? 'Aún no tienes gastos. ¡Agrega tu primer compromiso!'
            : 'Prueba con otros filtros o términos de búsqueda.'
          }</p>
        </div>
      ) : (
        <div className="payment-list" style={{ marginTop: '1.5rem' }}>
          {filtered
            .slice()
            .sort((a, b) => {
              if (a.is_spontaneous && !b.is_spontaneous) return 1;
              if (!a.is_spontaneous && b.is_spontaneous) return -1;
              if (a.recurrence === 'yearly' && b.recurrence !== 'yearly') return 1;
              if (a.recurrence !== 'yearly' && b.recurrence === 'yearly') return -1;
              return (a.due_day || 0) - (b.due_day || 0);
            })
            .map(expense => {
              const IconComponent = CATEGORIES[expense.category]?.icon || Droplet;
              const cat = CATEGORIES[expense.category];

              const recurrenceBadgeStyle = expense.is_spontaneous
                ? { background: 'rgba(255,255,255,0.1)', color: 'white' }
                : expense.recurrence === 'yearly'
                  ? { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }
                  : { background: 'var(--color-primary-glow)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)' };

              const recurrenceLabel = expense.is_spontaneous
                ? 'Hormiga'
                : expense.recurrence === 'yearly' ? 'Anual' : 'Mensual';

              const dueDateText = expense.is_spontaneous
                ? 'Gasto espontáneo'
                : expense.recurrence === 'yearly'
                  ? `${MONTH_NAMES[(expense.due_month || 1) - 1]} · Día ${expense.due_day}`
                  : `Día ${expense.due_day}`;

              return (
                <div key={expense.id} className="payment-card-wrap">
                  <div className="glass-panel payment-card">
                    <div className="payment-details">
                      <div className="category-icon">
                        <IconComponent size={24} />
                      </div>
                      <div className="payment-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h3>{expense.name}</h3>
                          <div className="card-top-actions">
                            <button className="glass-icon-btn" title="Editar" onClick={() => handleOpenEdit(expense)}>
                              <Edit2 size={14} />
                            </button>
                            <button className="glass-icon-btn danger" title="Eliminar" onClick={() => onDeleteExpense(expense.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="payment-meta">
                          <span>{dueDateText}</span>
                          <span>• {cat?.label || 'General'}</span>
                          <span className="badge" style={{ ...recurrenceBadgeStyle, borderRadius: '4px', padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>
                            {recurrenceLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="payment-actions">
                      <div className="amount">${Number(expense.amount).toLocaleString('es-CO')}</div>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button
                          className="glass-icon-btn"
                          title="Ver historial de pagos"
                          onClick={() => onViewDetail(expense.id)}
                        >
                          <History size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ---- EDIT / CREATE MODAL ---- */}
      <div className={`modal-overlay ${showForm ? 'open' : ''}`}>
        <div className="glass-panel modal-content">
          <button className="close-button modal-close--absolute" onClick={handleCloseForm}>
            <X size={20} />
          </button>
          {showForm && (
            <ExpenseForm
              initialData={editingExpense}
              onClose={handleCloseForm}
              onSuccess={handleFormSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}
