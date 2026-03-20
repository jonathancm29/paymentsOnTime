import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Heart } from 'lucide-react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

export default function LoginScreen() {
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
