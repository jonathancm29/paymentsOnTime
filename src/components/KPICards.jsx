import { TrendingUp, Calendar, Star, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { CATEGORIES } from '../utils/categories';

function formatCOP(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0';
  return '$' + new Intl.NumberFormat('es-CO').format(Math.round(amount));
}

const skeletonAnim = `
  @keyframes kpiPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
  .kpi-skeleton { animation: kpiPulse 1.5s ease-in-out infinite; }
  @media (min-width: 640px) {
    .kpi-grid { grid-template-columns: repeat(4, 1fr) !important; }
  }
`;

function SkeletonCard() {
  return (
    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="kpi-skeleton" style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.07)' }} />
        <div className="kpi-skeleton" style={{ height: '12px', width: '80px', borderRadius: '4px', background: 'rgba(255,255,255,0.07)' }} />
      </div>
      <div className="kpi-skeleton" style={{ height: '26px', width: '120px', borderRadius: '6px', background: 'rgba(255,255,255,0.07)' }} />
    </div>
  );
}

function KPICard({ icon: Icon, iconColor, label, value, valueColor }) {
  return (
    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={18} color={iconColor || 'var(--color-primary)'} />
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600', lineHeight: 1.3 }}>
          {label}
        </span>
      </div>
      <div style={{
        fontSize: '1.3rem', fontWeight: '700',
        color: valueColor || 'var(--color-text-main)',
        fontVariantNumeric: 'tabular-nums',
        marginTop: '0.15rem',
        wordBreak: 'break-word',
      }}>
        {value}
      </div>
    </div>
  );
}

export default function KPICards({ report, loading }) {
  if (loading) {
    return (
      <>
        <style>{skeletonAnim}</style>
        <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      </>
    );
  }

  if (!report) return null;

  const { total, dailyAverage, topCategory, variationPercent } = report;

  const categoryLabel = topCategory
    ? (CATEGORIES[topCategory]?.label || topCategory)
    : '—';

  let variationDisplay = '—';
  let variationColor = 'var(--color-text-muted)';
  let VariationIcon = Minus;
  if (variationPercent !== null && variationPercent !== undefined) {
    const sign = variationPercent >= 0 ? '+' : '';
    variationDisplay = `${sign}${Number(variationPercent).toFixed(1)}%`;
    if (variationPercent > 0) {
      variationColor = 'var(--color-danger)';
      VariationIcon = ArrowUp;
    } else if (variationPercent < 0) {
      variationColor = 'var(--color-success)';
      VariationIcon = ArrowDown;
    } else {
      variationColor = 'var(--color-text-muted)';
    }
  }

  return (
    <>
      <style>{skeletonAnim}</style>
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        <KPICard
          icon={TrendingUp}
          iconColor="var(--color-primary)"
          label="Total gastado"
          value={formatCOP(total)}
        />
        <KPICard
          icon={Calendar}
          iconColor="#f59e0b"
          label="Promedio diario"
          value={formatCOP(dailyAverage)}
        />
        <KPICard
          icon={Star}
          iconColor="#ec4899"
          label="Categoría principal"
          value={categoryLabel}
        />
        <KPICard
          icon={VariationIcon}
          iconColor={variationColor}
          label="Variación vs mes anterior"
          value={variationDisplay}
          valueColor={variationColor}
        />
      </div>
    </>
  );
}
