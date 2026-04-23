const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const selectStyle = {
  background: 'rgba(0,0,0,0.25)',
  border: '1px solid var(--color-glass-border)',
  color: 'var(--color-text-main)',
  padding: '0.6rem 1rem',
  borderRadius: 'var(--border-radius-sm)',
  fontFamily: 'var(--font-family)',
  fontSize: '0.95rem',
  cursor: 'pointer',
  outline: 'none',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.75rem center',
  paddingRight: '2.25rem',
  minWidth: '130px',
};

import { getTodayDate } from '../utils/dateHelpers';

export default function MonthYearPicker({ month, year, onMonthChange, onYearChange }) {
  const currentYear = getTodayDate().getFullYear();
  const years = [];
  for (let y = 2024; y <= currentYear; y++) {
    years.push(y);
  }

  return (
    <div
      className="glass-panel"
      style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
    >
      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
        Período
      </span>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <select
          aria-label="Seleccionar mes"
          value={month}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          style={selectStyle}
        >
          {MONTH_NAMES.map((name, idx) => (
            <option key={idx + 1} value={idx + 1} style={{ background: '#161925', color: '#f8fafc' }}>
              {name}
            </option>
          ))}
        </select>

        <select
          aria-label="Seleccionar año"
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          style={selectStyle}
        >
          {years.map((y) => (
            <option key={y} value={y} style={{ background: '#161925', color: '#f8fafc' }}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
