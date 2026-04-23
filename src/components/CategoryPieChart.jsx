import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { CATEGORIES } from '../utils/categories';

const CHART_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
  '#a855f7', '#eab308', '#64748b',
];

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

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function CustomLegend({ payload }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', justifyContent: 'center', marginTop: '0.5rem' }}>
      {payload.map((entry, index) => {
        const label = CATEGORIES[entry.payload.category]?.label || entry.payload.category;
        const shortLabel = label.length > 20 ? label.slice(0, 18) + '…' : label;
        return (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: entry.color, flexShrink: 0 }} />
            {shortLabel}
          </div>
        );
      })}
    </div>
  );
}

export default function CategoryPieChart({ data, loading }) {
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

  return (
    <div aria-label="Proporción de gastos por categoría" role="img">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="45%"
            outerRadius={90}
            labelLine={false}
            label={renderCustomLabel}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
