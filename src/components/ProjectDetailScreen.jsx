import { useState } from 'react';
import {
  ChevronLeft, Plus, Edit2, Trash2, Search, ArrowUpRight, ArrowDownLeft,
  Calendar, HelpCircle, Inbox, TrendingUp, TrendingDown, Wallet, X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { PROJECT_CATEGORIES } from '../utils/projectCategories';
import ProjectTransactionForm from './ProjectTransactionForm';

export default function ProjectDetailScreen({
  projectId,
  projectsHook,
  onBack
}) {
  const {
    projects,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refetch
  } = projectsHook;

  const project = projects.find(p => p.id === projectId);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'expense' | 'income'
  const [filterCategory, setFilterCategory] = useState('all');
  
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  if (!project) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Proyecto no encontrado.</p>
        <button className="glass-button" onClick={onBack} style={{ margin: '1rem auto' }}>
          Volver a Proyectos
        </button>
      </div>
    );
  }

  // Filter transactions
  const filteredTxs = project.transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isExpense = Number(tx.amount) < 0;
    const matchesType = filterType === 'all' || 
      (filterType === 'expense' && isExpense) || 
      (filterType === 'income' && !isExpense);
      
    const matchesCategory = filterCategory === 'all' || tx.category === filterCategory;

    return matchesSearch && matchesType && matchesCategory;
  });

  const hasBudget = project.budget !== null && Number(project.budget) > 0;
  const progress = project.budgetProgressPct;
  const isOverBudget = hasBudget && project.totalGastos > Number(project.budget);

  // Budget status variables
  let progressColor = 'var(--color-primary)';
  if (progress !== null) {
    if (progress > 100) progressColor = 'var(--color-danger)';
    else if (progress > 80) progressColor = '#f59e0b'; // Amber
    else if (progress > 50) progressColor = '#3b82f6'; // Blue
    else progressColor = 'var(--color-success)';
  }

  function handleEditTx(e, tx) {
    e.stopPropagation();
    setEditingTx(tx);
    setTxModalOpen(true);
  }

  async function handleDeleteTx(e, txId) {
    e.stopPropagation();
    if (window.confirm("¿Estás seguro de que deseas eliminar este movimiento?")) {
      try {
        await deleteTransaction(txId);
      } catch (err) {
        alert("Error al eliminar la transacción.");
      }
    }
  }

  function handleCloseModal() {
    setTxModalOpen(false);
    setEditingTx(null);
  }

  const formatDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy', { locale: es });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div style={{ animation: 'slideDown 0.3s ease', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* NAVIGATION BACK */}
      <div>
        <button
          className="glass-button"
          onClick={onBack}
          style={{ padding: '0.5rem 1rem' }}
        >
          <ChevronLeft size={18} /> Volver a Proyectos
        </button>
      </div>

      {/* PROJECT SUMMARY PANEL */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
              {project.name}
            </h2>
            {project.description && (
              <p style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', lineHeight: '1.4', maxWidth: '600px' }}>
                {project.description}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Balance Neto</span>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: project.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {project.balance >= 0 ? '+' : ''}${project.balance.toLocaleString('es-CO')}
            </div>
          </div>
        </div>

        {/* BUDGET STATUS */}
        {hasBudget && (
          <div style={{ borderTop: '1px solid var(--color-glass-border)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '500', color: isOverBudget ? 'var(--color-danger)' : 'var(--color-text-main)' }}>
                Presupuesto Consumido: {progress}% {isOverBudget && "⚠️ (Presupuesto Excedido)"}
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                ${project.totalGastos.toLocaleString('es-CO')} de ${Number(project.budget).toLocaleString('es-CO')}
              </span>
            </div>
            <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  height: '100%',
                  background: progressColor,
                  borderRadius: '5px',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI ROW */}
      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel stat-item" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-success)' }}>
            <TrendingUp size={16} />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Aportes / Ingresos</span>
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-success)' }}>
            ${project.totalIngresos.toLocaleString('es-CO')}
          </span>
        </div>

        <div className="glass-panel stat-item" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)' }}>
            <TrendingDown size={16} />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Gastos / Egresos</span>
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-danger)' }}>
            ${project.totalGastos.toLocaleString('es-CO')}
          </span>
        </div>

        {hasBudget && (
          <div className="glass-panel stat-item" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isOverBudget ? 'var(--color-danger)' : 'var(--color-primary)' }}>
              <Wallet size={16} />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Presupuesto Restante</span>
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isOverBudget ? 'var(--color-danger)' : 'var(--color-text-main)' }}>
              {isOverBudget ? '-' : ''}${Math.abs(Number(project.budget) - project.totalGastos).toLocaleString('es-CO')}
            </span>
          </div>
        )}
      </div>

      {/* FILTER BAR AND ADD BUTTON */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Movimientos registrados
          </h3>
          <button
            className="glass-button primary"
            onClick={() => { setEditingTx(null); setTxModalOpen(true); }}
            style={{ padding: '0.6rem 1.25rem' }}
          >
            <Plus size={18} /> Registrar Movimiento
          </button>
        </div>

        {/* FILTERS TOOLBAR */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Text Search */}
          <div className="search-input-wrapper" style={{ flex: 1, minWidth: '200px' }}>
            <Search size={18} />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar movimiento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Type Filters (Tabs) */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.15)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--color-glass-border)' }}>
            <button
              onClick={() => setFilterType('all')}
              style={{
                background: filterType === 'all' ? 'var(--color-glass-hover)' : 'transparent',
                border: 'none',
                color: filterType === 'all' ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                padding: '0.4rem 0.85rem',
                fontSize: '0.85rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('expense')}
              style={{
                background: filterType === 'expense' ? 'var(--color-glass-hover)' : 'transparent',
                border: 'none',
                color: filterType === 'expense' ? 'var(--color-danger)' : 'var(--color-text-muted)',
                padding: '0.4rem 0.85rem',
                fontSize: '0.85rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              Gastos
            </button>
            <button
              onClick={() => setFilterType('income')}
              style={{
                background: filterType === 'income' ? 'var(--color-glass-hover)' : 'transparent',
                border: 'none',
                color: filterType === 'income' ? 'var(--color-success)' : 'var(--color-text-muted)',
                padding: '0.4rem 0.85rem',
                fontSize: '0.85rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              Ingresos
            </button>
          </div>

          {/* Category Dropdown */}
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '150px' }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">Todas las Categorías</option>
            {Object.values(PROJECT_CATEGORIES).map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TRANSACTIONS LIST */}
      <div className="payment-list">
        {filteredTxs.length === 0 ? (
          <div className="empty-state glass-panel" style={{ padding: '3rem' }}>
            <Inbox size={40} style={{ color: 'var(--color-text-muted)', marginBottom: '0.75rem' }} />
            <h4 style={{ color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>Sin movimientos</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {searchQuery || filterType !== 'all' || filterCategory !== 'all'
                ? 'No se encontraron movimientos con los filtros activos.'
                : 'Registra un gasto o ingreso para comenzar el balance.'}
            </p>
          </div>
        ) : (
          filteredTxs.map(tx => {
            const isExpense = Number(tx.amount) < 0;
            const CatIcon = PROJECT_CATEGORIES[tx.category]?.icon || HelpCircle;
            const CatLabel = PROJECT_CATEGORIES[tx.category]?.label || 'General';

            return (
              <div key={tx.id} className="payment-card-wrap">
                <div className={`glass-panel payment-card`} style={{ borderLeft: `3px solid ${isExpense ? 'var(--color-danger)' : 'var(--color-success)'}` }}>
                  <div className="payment-details">
                    <div
                      className="category-icon"
                      style={{
                        background: isExpense ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: isExpense ? 'var(--color-danger)' : 'var(--color-success)',
                        borderRadius: '50%',
                        padding: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <CatIcon size={20} />
                    </div>

                    <div className="payment-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>{tx.description}</h3>
                        <div className="card-top-actions">
                          <button className="glass-icon-btn" title="Editar" onClick={(e) => handleEditTx(e, tx)}>
                            <Edit2 size={13} />
                          </button>
                          <button className="glass-icon-btn danger" title="Eliminar" onClick={(e) => handleDeleteTx(e, tx.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="payment-meta" style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                          <Calendar size={12} /> {formatDate(tx.transaction_date)}
                        </span>
                        <span>• {CatLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="payment-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      className="amount"
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: isExpense ? 'var(--color-danger)' : 'var(--color-success)'
                      }}
                    >
                      {isExpense ? '-' : '+'}${Math.abs(Number(tx.amount)).toLocaleString('es-CO')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* NEW/EDIT TRANSACTION MODAL */}
      <div className={`modal-overlay ${txModalOpen ? 'open' : ''}`}>
        <div className="glass-panel modal-content">
          <button className="close-button modal-close--absolute" onClick={handleCloseModal}>
            <X size={20} />
          </button>

          {txModalOpen && (
            <ProjectTransactionForm
              initialData={editingTx}
              onClose={handleCloseModal}
              onSuccess={refetch}
              addTransaction={addTransaction}
              updateTransaction={updateTransaction}
              projectId={project.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
