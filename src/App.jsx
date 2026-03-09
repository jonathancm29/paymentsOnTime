import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import {
  CreditCard, Droplet, TrendingDown, Landmark, Heart, Briefcase,
  Check, Plus, AlertCircle, X, Database
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
  compromisos: { id: 'compromisos', label: 'Compromisos', icon: Briefcase }
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

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

      // 2. Fetch payments (instances for current month AND uncompleted old months)
      const { data: paymentsData, error: payError } = await supabase
        .from('payments')
        .select('*');
      // A robust query logic could be done at SQL level, but for simplicity:

      if (payError) throw payError;

      // 3. Sync Logic: Ensure all expenses have a payment instance for THIS month
      // This is crucial. If 'Visa' exists, there MUST be a row in `payments` for '2026-03'.
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

  async function togglePayment(paymentId, currentStatus) {
    if (!supabase) return;

    // Optimistic update
    setPayments(prev => prev.map(p =>
      p.id === paymentId ? { ...p, completed: !currentStatus, completed_at: !currentStatus ? new Date().toISOString() : null } : p
    ));

    const { error } = await supabase
      .from('payments')
      .update({
        completed: !currentStatus,
        completed_at: !currentStatus ? new Date().toISOString() : null
      })
      .eq('id', paymentId);

    if (error) {
      console.error("Error updating payment", error);
      fetchData(); // Rollback
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
  // All relevant payments: This month + older ones that are NOT completed
  const activePayments = payments.filter(p => {
    return p.month_year === currentMonth || (p.month_year < currentMonth && !p.completed);
  });

  // Calculate completion percentage for the UI
  // Wait, percentages and stats should probably only count THIS month's expected payments, 
  // or all active payments. Let's do all active.
  const totalActive = activePayments.length;
  const completedActive = activePayments.filter(p => p.completed && p.month_year === currentMonth).length;
  // Percentage based on current month only, plus past due? Let's just do all open vs completed.
  const percentage = totalActive > 0 ? Math.round((activePayments.filter(p => p.completed).length / totalActive) * 100) : 100;

  // Format the month nicely (e.g., "Marzo 2026")
  const displayMonth = format(new Date(), 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase());

  return (
    <div className="app-container">
      <header className="glass-panel progress-header">
        <div className="progress-info">
          <h1>{displayMonth}</h1>
          <p>
            {percentage === 100 && totalActive > 0 && "¡Excelente! Has pagado todo."}
            {percentage < 100 && `Has completado el ${percentage}% de tus pagos.`}
            {totalActive === 0 && "No tienes pagos configurados todavía."}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
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

      {loading ? (
        <div className="loader"></div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="glass-button primary" onClick={() => setModalOpen(true)}>
              <Plus size={18} /> Nuevo Gasto
            </button>
          </div>

          <div className="payment-list">
            {activePayments.length === 0 ? (
              <div className="empty-state glass-panel">
                <Heart size={48} />
                <h3>Todo tranquilo por aquí</h3>
                <p>Agrega tu primer gasto mensual usando el botón de arriba.</p>
              </div>
            ) : (
              activePayments.sort((a, b) => {
                // Sorting logic: Overdue first, then by completed status, then by due day
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

                return (
                  <div key={payment.id} className={`glass-panel payment-card ${payment.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`}>
                    <div className="payment-details">
                      <div className="category-icon">
                        <IconComponent size={24} />
                      </div>
                      <div className="payment-info">
                        <h3>{expense.name}</h3>
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
                      <div className="amount">${expense.amount.toLocaleString('es-CO')}</div>
                      <button
                        className={`check-button ${payment.completed ? 'checked' : ''}`}
                        onClick={() => togglePayment(payment.id, payment.completed)}
                      >
                        <Check size={20} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* NEW EXPENSE MODAL */}
      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`}>
        <div className="glass-panel modal-content">
          <div className="modal-header">
            <h3>Agregar Nuevo Gasto</h3>
            <button className="close-button" onClick={() => setModalOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <ExpenseForm
            onClose={() => setModalOpen(false)}
            onSuccess={fetchData}
          />
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
      // Manejar el caso especial de que las cuentas requieran confirmación de correo
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
        <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>Instrucciones:</h4>
          <ol style={{ paddingLeft: '1.25rem', color: 'var(--color-text-muted)' }}>
            <li style={{ marginBottom: '0.5rem' }}>Crea un proyecto en <a href="https://supabase.com" target="_blank" style={{ color: 'var(--color-primary)' }}>Supabase</a></li>
            <li style={{ marginBottom: '0.5rem' }}>Abre la consola de SQL en tu proyecto y ejecuta el código que he dejado en tus registros para crear las tablas <code style={{ background: 'black', padding: '2px' }}>expenses</code> y <code style={{ background: 'black', padding: '2px' }}>payments</code>.</li>
            <li>Crea un archivo <strong>.env.local</strong> en la raíz del proyecto con tus credenciales:</li>
          </ol>
          <pre style={{ background: '#0a0a0f', padding: '1rem', borderRadius: '4px', marginTop: '1rem', fontSize: '0.9rem', overflowX: 'auto' }}>
            VITE_SUPABASE_URL=tu_url_de_supabase
            VITE_SUPABASE_ANON_KEY=tu_anon_key</pre>
        </div>
      </div>
    </div>
  );
}

function ExpenseForm({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'tarjetas',
    amount: '',
    due_day: '15'
  });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);

    try {
      // 1. Insert Expense Template
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

      // 2. Insert First Payment Instance for CURRENT MONTH automatically
      const currentMonth = format(new Date(), 'yyyy-MM');
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          expense_id: expense.id,
          month_year: currentMonth,
          completed: false
        }]);

      if (paymentError) throw paymentError;

      onSuccess();
      onClose();
      // reset form
      setFormData({ name: '', category: 'tarjetas', amount: '', due_day: '15' });
    } catch (err) {
      console.error("Insert error:", err);
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
        {loading ? 'Guardando...' : 'Guardar Gasto'}
      </button>
    </form>
  );
}
