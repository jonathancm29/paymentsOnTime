import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import {
  Heart, Plus, AlertCircle, X, Search, Edit2, Trash2, History, Check, Sparkles, Coffee, Droplet
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- Modules & Hooks ---
import { getTodayDate } from './utils/dateHelpers';
import { CATEGORIES } from './utils/categories';
import { usePaymentsData } from './hooks/usePaymentsData';

// --- Components ---
import LoginScreen from './components/LoginScreen';
import SetupScreen from './components/SetupScreen';
import ExpenseForm from './components/ExpenseForm';
import ExpenseHormigaForm from './components/ExpenseHormigaForm';
import PaymentConfirmForm from './components/PaymentConfirmForm';
import ExpenseDetailScreen from './components/ExpenseDetailScreen';

export default function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalHormigaOpen, setModalHormigaOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Magic AI State
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [editingExpense, setEditingExpense] = useState(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [paymentConfirmation, setPaymentConfirmation] = useState(null);
  const [viewingExpenseId, setViewingExpenseId] = useState(null);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const {
    loading,
    expenses,
    payments,
    currentMonth,
    fetchData,
    executePaymentStatusUpdate,
    deleteExpense
  } = usePaymentsData(session);

  async function togglePayment(paymentId, currentStatus, expenseAmount) {
    if (!supabase) return;

    if (!currentStatus) {
      setPaymentConfirmation({ paymentId, amount: expenseAmount });
      return;
    }

    await executePaymentStatusUpdate(paymentId, false, null);
  }

  function openEditModal(expense) {
    setEditingExpense(expense);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setEditingExpense(null);
  }

  async function handleMagicSubmit(e) {
    if (e) e.preventDefault();
    if (!aiText.trim()) return;
    setAiLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('magic-expense', {
        body: { text: aiText, currentMonth: currentMonth }
      });

      if (error) {
        throw new Error(error.message || 'Error del servidor de Supabase.');
      }

      if (data && data.error) {
        throw new Error(data.error);
      }

      setAiText('');
      fetchData(); // Reload data

      const isSpontaneous = data.data.is_spontaneous;
      const dueDay = data.data.due_day || getTodayDate().getDate();
      const isToday = dueDay === getTodayDate().getDate();
      const pagadoText = isToday ? '(Pagado hoy)' : `(Pagado el día ${dueDay})`;

      alert(`✨ ¡Guardado Mágicamente!\n${data.data.name} - $${Number(data.data.amount).toLocaleString('es-CO')}\n${isSpontaneous ? pagadoText : '(Agendado)'}`);
    } catch (error) {
      console.error(error);
      alert('Hubo un error interpretando tu gasto: ' + error.message);
    } finally {
      setAiLoading(false);
    }
  }

  if (!supabase) {
    return <SetupScreen />;
  }

  if (authLoading) {
    return <div className="loader"></div>;
  }

  if (!session) {
    return <LoginScreen />;
  }

  // --- Calculations ---
  let activePayments = payments.filter(p => p.month_year === currentMonth || (p.month_year < currentMonth && !p.completed));

  if (searchQuery.trim() !== '') {
    activePayments = activePayments.filter(p => {
      const exp = expenses.find(e => e.id === p.expense_id);
      return exp?.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }

  const totalActive = activePayments.length;
  const percentage = totalActive > 0 ? Math.round((activePayments.filter(p => p.completed).length / totalActive) * 100) : 100;

  const totalAmountToPay = activePayments.reduce((acc, p) => {
    const e = expenses.find(exp => exp.id === p.expense_id);
    return acc + (e ? Number(e.amount) : 0);
  }, 0);

  const totalCommitmentPaid = activePayments.filter(p => p.completed).reduce((acc, p) => {
    const e = expenses.find(exp => exp.id === p.expense_id);
    return acc + (e ? Number(e.amount) : 0);
  }, 0);

  const pendingAmount = totalAmountToPay - totalCommitmentPaid;

  const totalActualPaid = activePayments.filter(p => p.completed).reduce((acc, p) => {
    const e = expenses.find(exp => exp.id === p.expense_id);
    const paidVal = p.amount_paid !== null && p.amount_paid !== undefined ? p.amount_paid : (e ? e.amount : 0);
    return acc + Number(paidVal);
  }, 0);

  const displayMonth = format(getTodayDate(), 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase());

  return (
    <div className="app-container">
      {viewingExpenseId ? (
        <ExpenseDetailScreen
          expense={expenses.find(e => e.id === viewingExpenseId)}
          allPayments={payments}
          onBack={() => setViewingExpenseId(null)}
          onTogglePayment={togglePayment}
          currentMonth={currentMonth}
        />
      ) : (
        <>
          <header className="glass-panel progress-header">
            <div className="progress-info">
              <h1>{displayMonth}</h1>
              <p>
                {percentage === 100 && totalActive > 0 && "¡Excelente! Has pagado todo."}
                {percentage < 100 && `Has completado el ${percentage}% de tus compromisos activos.`}
                {totalActive === 0 && "No tienes pagos configurados todavía."}
              </p>

              <div className="stats-row">
                <div className="stat-item">
                  <span className="label">Total Mensual</span>
                  <span className="value">${totalAmountToPay.toLocaleString('es-CO')}</span>
                </div>
                <div className="stat-item">
                  <span className="label">Total Pagado</span>
                  <span className="value" style={{ color: 'var(--color-primary)' }}>
                    ${totalActualPaid.toLocaleString('es-CO')}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="label">Pendiente</span>
                  <span className="value" style={{ color: pendingAmount > 0 ? 'var(--color-text-main)' : 'var(--color-success)' }}>
                    ${pendingAmount.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>

              <div className="user-actions">
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session?.user?.email}
                </span>
                <button
                  className="glass-button"
                  style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}
                  onClick={() => supabase.auth.signOut()}
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>

            <div className={`progress-circle ${percentage === 100 ? 'success' : ''}`}>
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" />
                <circle
                  className="progress-value"
                  cx="50" cy="50" r="40"
                  style={{ strokeDasharray: 251.2, strokeDashoffset: 251.2 - (251.2 * percentage) / 100 }}
                />
              </svg>
              <div className="progress-text">
                {totalActive > 0 ? `${percentage}%` : '—'}
              </div>
            </div>
          </header>

          {loading && activePayments.length === 0 ? (
            <div className="loader"></div>
          ) : (
            <>
              {/* CATEGORIES SUMMARY SECTION */}
              <div className="categories-summary-container">
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--color-text-main)' }}>Resumen por Categoría</h3>
                <div className="categories-scroll">
                  {Object.values(CATEGORIES).map(cat => {
                    const catPayments = activePayments.filter(p => {
                      const exp = expenses.find(e => e.id === p.expense_id);
                      return exp?.category === cat.id;
                    });
                    if (catPayments.length === 0) return null;

                    const catTotal = catPayments.reduce((acc, p) => acc + Number(expenses.find(e => e.id === p.expense_id)?.amount || 0), 0);
                    const catPaid = catPayments.filter(p => p.completed).reduce((acc, p) => acc + Number(p.amount_paid || expenses.find(e => e.id === p.expense_id)?.amount || 0), 0);
                    const CatIcon = cat.icon;
                    const pct = catTotal > 0 ? (catPaid / catTotal) * 100 : 0;

                    return (
                      <div key={cat.id} className="glass-panel category-pill">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <CatIcon size={16} /> <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{cat.label}</span>
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>${catTotal.toLocaleString('es-CO')}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Pagado: ${catPaid.toLocaleString('es-CO')}</div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '0.5rem', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--color-success)' : 'var(--color-primary)', borderRadius: '2px' }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* MAGIC AI BAR */}
              <div className="glass-panel" style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem' }}>
                <div style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                  <Sparkles size={18} color="white" />
                </div>
                <form onSubmit={handleMagicSubmit} style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-control"
                    style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: 'none', padding: '0.7rem 1rem', borderRadius: '6px' }}
                    placeholder="Dile a tu asistente: Ayer gasté 15 mil en un almuerzo..."
                    value={aiText}
                    onChange={e => setAiText(e.target.value)}
                    disabled={aiLoading}
                  />
                  <button type="submit" className="glass-button primary" disabled={aiLoading || !aiText.trim()}>
                    {aiLoading ? 'Pensando...' : '✨ Enviar'}
                  </button>
                </form>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                <div className="search-input-wrapper" style={{ flex: 1, minWidth: '200px' }}>
                  <Search size={18} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar un pago..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="glass-button" onClick={() => { setModalHormigaOpen(true); }} style={{ flexShrink: 0 }}>
                  <Coffee size={18} /> Gasto Hormiga
                </button>
                <button className="glass-button primary" onClick={() => { setEditingExpense(null); setModalOpen(true); }} style={{ flexShrink: 0 }}>
                  <Plus size={18} /> Nuevo Gasto
                </button>
              </div>

              <div className="payment-list">
                {activePayments.length === 0 ? (
                  <div className="empty-state glass-panel">
                    <Heart size={48} />
                    <h3>No hay pagos aquí</h3>
                    <p>{searchQuery ? 'Intenta buscar con otro nombre.' : 'Agrega tu primer gasto mensual usando el botón de arriba.'}</p>
                  </div>
                ) : (
                  activePayments.sort((a, b) => {
                    const expA = expenses.find(e => e.id === a.expense_id);
                    const expB = expenses.find(e => e.id === b.expense_id);
                    const isOverdueA = a.month_year < currentMonth;
                    const isOverdueB = b.month_year < currentMonth;

                    if (isOverdueA && !isOverdueB) return -1;
                    if (!isOverdueA && isOverdueB) return 1;

                    if (a.completed === b.completed) {
                      return (expA?.due_day || 0) - (expB?.due_day || 0);
                    }
                    return a.completed ? 1 : -1;
                  }).map(payment => {
                    const expense = expenses.find(e => e.id === payment.expense_id);
                    if (!expense) return null;

                    const currentDay = getTodayDate().getDate();
                    const isOverdue = !payment.completed && (payment.month_year < currentMonth || (payment.month_year === currentMonth && expense.due_day < currentDay));
                    const isWarning = isOverdue;
                    const IconComponent = CATEGORIES[expense.category]?.icon || Droplet;

                    return (
                      <div key={payment.id} className="payment-card-wrap">
                        <div className={`glass-panel payment-card ${payment.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`}>
                          <div className="payment-details">
                            <div className="category-icon">
                              <IconComponent size={24} />
                            </div>
                            <div className="payment-info">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <h3>{expense.name}</h3>
                                <div className="card-top-actions">
                                  <button className="glass-icon-btn" title="Editar" onClick={() => openEditModal(expense)}>
                                    <Edit2 size={14} />
                                  </button>
                                  <button className="glass-icon-btn danger" title="Eliminar" onClick={() => deleteExpense(expense.id)}>
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                              <div className="payment-meta">
                                <span>
                                  Día {expense.due_day}
                                  {isWarning && <span className="overdue-badge"><AlertCircle size={10} style={{ display: 'inline', marginRight: '2px' }} /> Vencido</span>}
                                  {expense.is_spontaneous && <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>Hormiga</span>}
                                </span>
                                <span>• {CATEGORIES[expense.category]?.label || 'General'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="payment-actions">
                            <div className="amount">${Number(expense.amount).toLocaleString('es-CO')}</div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                              <button
                                className="glass-icon-btn"
                                title="Ver Detalle Completo"
                                onClick={() => setViewingExpenseId(expense.id)}
                              >
                                <History size={18} />
                              </button>
                              <button
                                className={`check-button ${payment.completed ? 'checked' : ''}`}
                                onClick={() => togglePayment(payment.id, payment.completed, expense.amount)}
                              >
                                <Check size={20} strokeWidth={3} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* NEW/EDIT EXPENSE MODAL */}
      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`}>
        <div className="glass-panel modal-content">
          <div className="modal-header">
            <h3>{editingExpense ? 'Modificar Gasto' : 'Agregar Nuevo Gasto'}</h3>
            <button className="close-button" onClick={handleCloseModal}>
              <X size={20} />
            </button>
          </div>

          {modalOpen && (
            <ExpenseForm
              initialData={editingExpense}
              onClose={handleCloseModal}
              onSuccess={fetchData}
            />
          )}
        </div>
      </div>

      {/* GASTO HORMIGA MODAL */}
      <div className={`modal-overlay ${modalHormigaOpen ? 'open' : ''}`}>
        <div className="glass-panel modal-content">
          <div className="modal-header">
            <h3>Registrar Gasto Hormiga</h3>
            <button className="close-button" onClick={() => setModalHormigaOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {modalHormigaOpen && (
            <ExpenseHormigaForm
              onClose={() => setModalHormigaOpen(false)}
              onSuccess={fetchData}
              session={session}
              currentMonth={currentMonth}
            />
          )}
        </div>
      </div>

      {/* PAYMENT CONFIRMATION MODAL */}
      <div className={`modal-overlay ${paymentConfirmation ? 'open' : ''}`}>
        <div className="glass-panel modal-content">
          <div className="modal-header">
            <h3>Confirmar Pago</h3>
            <button className="close-button" onClick={() => setPaymentConfirmation(null)}>
              <X size={20} />
            </button>
          </div>

          {paymentConfirmation && (
            <PaymentConfirmForm
              initialAmount={paymentConfirmation.amount}
              onConfirm={(amount) => executePaymentStatusUpdate(paymentConfirmation.paymentId, true, amount)}
              onCancel={() => setPaymentConfirmation(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
