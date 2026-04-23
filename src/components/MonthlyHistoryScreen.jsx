import { X, BarChart2, AlertCircle } from 'lucide-react';
import { useMonthlyHistoryData } from '../hooks/useMonthlyHistoryData';
import MonthYearPicker from './MonthYearPicker';
import KPICards from './KPICards';
import CategoryBarChart from './CategoryBarChart';
import DailyLineChart from './DailyLineChart';
import CategoryPieChart from './CategoryPieChart';
import TransactionsTable from './TransactionsTable';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const screenStyles = `
  .history-charts-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  @media (min-width: 768px) {
    .history-charts-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  .history-chart-card {
    padding: 1.25rem;
  }
  .history-chart-title {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
  }
`;

export default function MonthlyHistoryScreen({ session, onClose }) {
  const { loading, error, report, month, year, setMonth, setYear } = useMonthlyHistoryData(session);

  return (
    <div style={{ animation: 'slideDown 0.3s ease' }}>
      <style>{screenStyles}</style>

      {/* Header */}
      <div
        className="glass-panel"
        style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <BarChart2 size={18} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', color: 'transparent', margin: 0 }}>
              Histórico de Gastos
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
              {MONTH_NAMES[month - 1]} {year}
            </p>
          </div>
        </div>

        <button
          className="glass-button"
          onClick={onClose}
          aria-label="Cerrar histórico"
          style={{ padding: '0.5rem 1rem', fontSize: '0.88rem', flexShrink: 0 }}
        >
          <X size={16} /> Volver
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div
          className="glass-panel"
          style={{ padding: '1.25rem', marginBottom: '1.5rem', borderColor: 'rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-danger)' }}
        >
          <AlertCircle size={20} />
          <span>{error.message || String(error)}</span>
        </div>
      )}

      {/* Month / Year Picker */}
      <div style={{ marginBottom: '1.5rem' }}>
        <MonthYearPicker
          month={month}
          year={year}
          onMonthChange={setMonth}
          onYearChange={setYear}
        />
      </div>

      {/* KPI Cards */}
      <div style={{ marginBottom: '1.5rem' }}>
        <KPICards report={report} loading={loading} />
      </div>

      {/* Charts grid */}
      <div className="history-charts-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="glass-panel history-chart-card">
          <div className="history-chart-title">Por Categoría (Barras)</div>
          <CategoryBarChart data={report?.byCategory} loading={loading} />
        </div>

        <div className="glass-panel history-chart-card">
          <div className="history-chart-title">Evolución Diaria</div>
          <DailyLineChart data={report?.byDay} loading={loading} />
        </div>

        <div className="glass-panel history-chart-card">
          <div className="history-chart-title">Distribución por Categoría</div>
          <CategoryPieChart data={report?.byCategory} loading={loading} />
        </div>
      </div>

      {/* Transactions Table */}
      <TransactionsTable transactions={report?.transactions} loading={loading} />
    </div>
  );
}
