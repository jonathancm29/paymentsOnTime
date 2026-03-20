import { Database } from 'lucide-react';

export default function SetupScreen() {
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
