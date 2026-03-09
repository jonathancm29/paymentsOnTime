import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import {
  CreditCard, Droplet, TrendingDown, Landmark, Heart, Briefcase,
  Check, Plus, AlertCircle, X, Database, Search, Edit2, Trash2, History, ChevronDown, ChevronUp, DollarSign,
  Tv, Shield, BookOpen, Home, Car, Coffee, Gamepad2, ShoppingBag, ChevronLeft
} from 'lucide-react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { format, startOfMonth, isBefore, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Category Definitions
const CATEGORIES = {
  tarjetas: { id: 'tarjetas', label: 'Tarjetas de crédito', icon: CreditCard },
  recibos: { id: 'recibos', label: 'Recibos públicos', icon: Droplet },
  deudas: { id: 'deudas', label: 'Deudas', icon: TrendingDown },
  creditos: { id: 'creditos', label: 'Créditos', icon: Landmark },
  manutenciones: { id: 'manutenciones', label: 'Manutenciones', icon: Heart },
  suscripciones: { id: 'suscripciones', label: 'Suscripciones (Netflix, Spotify)', icon: Tv },
  arriendo: { id: 'arriendo', label: 'Arriendo / Hipoteca', icon: Home },
  seguros: { id: 'seguros', label: 'Seguros', icon: Shield },
  educacion: { id: 'educacion', label: 'Educación', icon: BookOpen },
  transporte: { id: 'transporte', label: 'Transporte / Gasolina', icon: Car },
  compras: { id: 'compras', label: 'Compras / Supermercado', icon: ShoppingBag },
  entretenimiento: { id: 'entretenimiento', label: 'Entretenimiento / Salidas', icon: Gamepad2 },
  compromisos: { id: 'compromisos', label: 'Otros Compromisos', icon: Briefcase }
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // New States
  const [searchQuery, setSearchQuery] = useState('');
  const [editingExpense, setEditingExpense] = useState(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [paymentConfirmation, setPaymentConfirmation] = useState(null);
  const [viewingExpenseId, setViewingExpenseId] = useState(null);

  // Current month string 'yyyy-MM'
  const currentMonth = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      setLoading(false);
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

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch expenses (catalog)
      const { data: expensesData, error: expError } = await supabase
        .from('expenses')
        .select('*')
        .order('due_day', { ascending: true });

      if (expError) throw expError;

      // 2. Fetch payments (instances for current month AND uncompleted old months + HISTORY)
      const { data: paymentsData, error: payError } = await supabase
        .from('payments')
        .select('*')
        .order('month_year', { ascending: false });

      if (payError) throw payError;

      // 3. Sync Logic: Ensure all expenses have a payment instance for THIS month
      const currentMonthPayments = paymentsData.filter(p => p.month_year === currentMonth);
      const newPaymentsToInsert = [];

      for (const expense of expensesData) {
        const hasPaymentThisMonth = currentMonthPayments.some(p => p.expense_id === expense.id);
        if (!hasPaymentThisMonth) {
          newPaymentsToInsert.push({
            expense_id: expense.id,
            month_year: currentMonth,
            completed: false
          });
        }
      }

      if (newPaymentsToInsert.length > 0) {
        const { data: inserted, error: insertErr } = await supabase
          .from('payments')
          .insert(newPaymentsToInsert)
          .select();

        if (insertErr) {
          console.error("Error inserting new month payments:", insertErr);
        } else if (inserted) {
          paymentsData.push(...inserted);
        }
      }

      setExpenses(expensesData || []);
      setPayments(paymentsData || []);

    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function togglePayment(paymentId, currentStatus, expenseAmount) {
    if (!supabase) return;

    if (!currentStatus) {
      // Intentando pagar: abrimos modal de confirmación
      setPaymentConfirmation({
        paymentId,
        amount: expenseAmount
      });
      return;
    }

    // Si ya estaba pagado y se quiere desmarcar, va directo
    await executePaymentStatusUpdate(paymentId, false, null);
  }

  async function executePaymentStatusUpdate(paymentId, newStatus, amountPaidVal) {
    const completedAt = newStatus ? new Date().toISOString() : null;

    // Optimistic update
    setPayments(prev => prev.map(p =>
      p.id === paymentId ? { ...p, completed: newStatus, completed_at: completedAt, amount_paid: amountPaidVal } : p
    ));

    const { error } = await supabase
      .from('payments')
      .update({
        completed: newStatus,
        completed_at: completedAt,
        amount_paid: amountPaidVal
      })
      .eq('id', paymentId);

    if (error) {
      console.error("Error updating payment", error);
      fetchData(); // Rollback
    }

    setPaymentConfirmation(null);
  }

  async function deleteExpense(expenseId) {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este gasto de forma permanente (y todo su historial)?")) return;

    // Optimistic UI update
    setExpenses(prev => prev.filter(e => e.id !== expenseId));

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) {
      console.error("Error deleting expense", error);
      alert("No se pudo eliminar el gasto.");
      fetchData(); // Rollback
    } else {
      fetchData();
    }
  }

  function openEditModal(expense) {
    setEditingExpense(expense);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setEditingExpense(null);
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
  // Active payments for main view: This month + older ones NOT completed
  let activePayments = payments.filter(p => p.month_year === currentMonth || (p.month_year < currentMonth && !p.completed));

  // Apply Search Filter
  if (searchQuery.trim() !== '') {
    activePayments = activePayments.filter(p => {
      const exp = expenses.find(e => e.id === p.expense_id);
      return exp?.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }

  // Calculate completion percentage & totals
  const totalActive = activePayments.length;
  const percentage = totalActive > 0 ? Math.round((activePayments.filter(p => p.completed).length / totalActive) * 100) : 100;

  // Montos
  const totalAmountToPay = activePayments.reduce((acc, p) => {
    const e = expenses.find(exp => exp.id === p.expense_id);
    return acc + (e ? Number(e.amount) : 0);
  }, 0);

  const totalAmountPaid = activePayments.filter(p => p.completed).reduce((acc, p) => {
    const e = expenses.find(exp => exp.id === p.expense_id);
    return acc + (e ? Number(e.amount) : 0);
  }, 0);

  const pendingAmount = totalAmountToPay - totalAmountPaid;

  const displayMonth = format(new Date(), 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase());

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
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="search-input-wrapper">
                  <Search size={18} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar un pago..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="glass-button primary" onClick={() => { setEditingExpense(null); setModalOpen(true); }}>
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

                    const isOverdue = payment.month_year < currentMonth && !payment.completed;
                    const IconComponent = CATEGORIES[expense.category]?.icon || Droplet;

                    // History for this expense explicitly
                    const expenseHistory = payments.filter(p => p.expense_id === expense.id && p.completed && p.id !== payment.id);
                    const isHistoryExpanded = expandedHistoryId === expense.id;

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
                                  {isOverdue && <span className="overdue-badge">Vencido</span>}
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

// --- SUB COMPONENTS ---
function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!captchaToken) {
      setMessage('Por favor, completa la verificación de seguridad (Captcha).');
      return;
    }

    setLoading(true);
    setMessage('');

    let result;
    if (isLogin) {
      result = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken }
      });
    } else {
      result = await supabase.auth.signUp({
        email,
        password,
        options: { captchaToken }
      });
    }

    if (result.error) {
      if (result.error.message.includes('Email confirmations')) {
        setMessage('Casi listo. Revisa tu correo y haz clic en el enlace de confirmación antes de iniciar sesión.');
      } else {
        setMessage(`Error: ${result.error.message}`);
      }
    } else if (!isLogin && result.data?.user?.identities?.length === 0) {
      setMessage('Un usuario con este correo ya existe. Intenta iniciar sesión.');
    } else if (!isLogin) {
      setMessage('¡Cuenta creada! Revisa tu correo si pedimos confirmación (depende de tu configuración en Supabase).');
    }

    setLoading(false);
  }

  return (
    <div className="app-container">
      <div className="glass-panel setup-screen" style={{ maxWidth: '400px', margin: '0 auto', padding: '3rem 2rem' }}>
        <Heart size={48} style={{ color: 'var(--color-primary)', marginBottom: '1rem', filter: 'drop-shadow(0 0 10px rgba(99,102,241,0.5))' }} />
        <h2>{isLogin ? 'Inicia Sesión' : 'Crea una Cuenta'}</h2>
        <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted)' }}>
          {isLogin
            ? 'Ingresa con tu correo y contraseña.'
            : 'Tu información estará protegida y sincronizada.'}
        </p>

        <form onSubmit={handleAuth}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label>Correo Electrónico</label>
            <input
              type="email"
              className="form-control"
              placeholder="tu@correo.com"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ textAlign: 'left', marginBottom: '2rem' }}>
            <label>Contraseña</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              required
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <HCaptcha
              sitekey="373a4f4e-6414-4f56-b9f0-485c8316bfd6"
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
            />
          </div>

          <button type="submit" className="glass-button primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Procesando...' : (isLogin ? 'Entrar' : 'Registrarme')}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setIsLogin(!isLogin); setMessage(''); }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            marginTop: '1.5rem',
            cursor: 'pointer',
            fontSize: '0.9rem',
            textDecoration: 'underline'
          }}
        >
          {isLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>

        {message && <p style={{ marginTop: '1.5rem', color: 'var(--color-primary)', fontSize: '0.9rem' }}>{message}</p>}
      </div>
    </div>
  );
}

function SetupScreen() {
  return (
    <div className="app-container">
      <div className="glass-panel setup-screen">
        <Database size={64} style={{ color: 'var(--color-primary)', marginBottom: '1rem', filter: 'drop-shadow(0 0 10px rgba(99,102,241,0.5))' }} />
        <h2>Conexión a Supabase Requerida</h2>
        <p>
          Para garantizar la persistencia de tus registros y que nada se pierda nunca, necesitamos configurar la conexión a la base de datos real.
        </p>
      </div>
    </div>
  );
}

function ExpenseForm({ onClose, onSuccess, initialData }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData ? initialData.name : '',
    category: initialData ? initialData.category : 'tarjetas',
    amount: initialData ? initialData.amount : '',
    due_day: initialData ? initialData.due_day : '15'
  });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);

    try {
      if (initialData) {
        // Edit Existing Expense
        const { error } = await supabase
          .from('expenses')
          .update({
            name: formData.name,
            category: formData.category,
            amount: parseFloat(formData.amount),
            due_day: parseInt(formData.due_day)
          })
          .eq('id', initialData.id);

        if (error) throw error;
      } else {
        // Insert New Template
        const { data: expense, error } = await supabase
          .from('expenses')
          .insert([{
            name: formData.name,
            category: formData.category,
            amount: parseFloat(formData.amount),
            due_day: parseInt(formData.due_day)
          }])
          .select()
          .single();

        if (error) throw error;

        // Insert First Monthly Instance
        const currentMonth = format(new Date(), 'yyyy-MM');
        const { error: paymentError } = await supabase
          .from('payments')
          .insert([{
            expense_id: expense.id,
            month_year: currentMonth,
            completed: false
          }]);

        if (paymentError) throw paymentError;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Insert/Update error:", err);
      alert("Error guardando el gasto. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: '0 2rem 2rem' }}>
      <div className="form-group">
        <label>Nombre del Compromiso (Ej. Tarjeta de Crédito Nu)</label>
        <input
          type="text"
          className="form-control"
          required
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>Categoría</label>
        <select
          className="form-control"
          value={formData.category}
          onChange={e => setFormData({ ...formData, category: e.target.value })}
        >
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <option key={key} value={key}>{cat.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Monto Estimado</label>
          <input
            type="number"
            className="form-control"
            required
            min="0"
            step="100"
            value={formData.amount}
            onChange={e => setFormData({ ...formData, amount: e.target.value })}
          />
        </div>

        <div className="form-group" style={{ width: '120px' }}>
          <label>Día (1-31)</label>
          <input
            type="number"
            className="form-control"
            required
            min="1"
            max="31"
            value={formData.due_day}
            onChange={e => setFormData({ ...formData, due_day: e.target.value })}
          />
        </div>
      </div>

      <button
        type="submit"
        className="glass-button primary"
        style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
        disabled={loading}
      >
        {loading ? 'Guardando...' : (initialData ? 'Actualizar Gasto' : 'Guardar Gasto')}
      </button>
    </form>
  );
}

function PaymentConfirmForm({ initialAmount, onConfirm, onCancel }) {
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

function ExpenseDetailScreen({ expense, allPayments, onBack, onTogglePayment, currentMonth }) {
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
