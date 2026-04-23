import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { CATEGORIES } from '../utils/categories';

const CHART_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
  '#a855f7', '#eab308', '#64748b',
];

function abbreviateCOP(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value}`;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const { category, total } = payload[0].payload;
  const label = CATEGORIES[category]?.label || category;
  return (
    <div style={{
      background: 'rgba(15,17,26,0.95)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '8px',
      padding: '0.6rem 0.9rem',
      fontSize: '0.85rem',
    }}>
      <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ color: 'var(--color-text-main)', fontWeight: '700' }}>
        ${new Intl.NumberFormat('es-CO').format(total)}
      </div>
    </div>
  );
}

export default function CategoryBarChart({ data, loading }) {
  if (loading) {
    return (
      <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loader" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
        Sin datos para este período
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    shortName: CATEGORIES[item.category]?.label
      ? CATEGORIES[item.category].label.split(' ')[0]
      : item.category,
  }));

  return (
    <div aria-label="Gráfica de barras por categoría" role="img">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="shortName"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={abbreviateCOP}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
