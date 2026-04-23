import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot,
} from 'recharts';

function abbreviateCOP(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value}`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: 'rgba(15,17,26,0.95)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '8px',
      padding: '0.6rem 0.9rem',
      fontSize: '0.85rem',
    }}>
      <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Día {label}</div>
      <div style={{ color: '#6366f1', fontWeight: '700' }}>
        ${new Intl.NumberFormat('es-CO').format(payload[0].value)}
      </div>
    </div>
  );
}

export default function DailyLineChart({ data, loading }) {
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

  const sortedData = [...data].sort((a, b) => a.day - b.day);

  return (
    <div aria-label="Evolución diaria del gasto" role="img">
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={sortedData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="day"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Día', position: 'insideBottomRight', offset: -4, fill: '#94a3b8', fontSize: 11 }}
          />
          <YAxis
            tickFormatter={abbreviateCOP}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#6366f1', stroke: 'rgba(99,102,241,0.4)', strokeWidth: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
