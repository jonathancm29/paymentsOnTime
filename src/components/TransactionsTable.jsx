import { useState, useMemo } from 'react';
import { CheckCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { CATEGORIES } from '../utils/categories';

const PAGE_SIZE = 10;

function formatCOP(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return '—';
  return '$' + new Intl.NumberFormat('es-CO').format(Math.round(Number(amount)));
}

function TableSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            height: '44px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.04)',
            animation: 'kpiPulse 1.5s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function TransactionsTable({ transactions, loading }) {
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);

  const categories = useMemo(() => {
    if (!transactions) return [];
    const seen = new Set();
    const result = [];
    transactions.forEach((t) => {
      if (t.category && !seen.has(t.category)) {
        seen.add(t.category);
        result.push(t.category);
      }
    });
    return result;
  }, [transactions]);

  const filtered = useMemo(() => {
    if (!transactions) return [];
    if (!filterCategory) return transactions;
    return transactions.filter((t) => t.category === filterCategory);
  }, [transactions, filterCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleCategoryChange(e) {
    setFilterCategory(e.target.value);
    setPage(1);
  }

  const selectStyle = {
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid var(--color-glass-border)',
    color: 'var(--color-text-main)',
    padding: '0.5rem 0.9rem',
    borderRadius: '8px',
    fontFamily: 'var(--font-family)',
    fontSize: '0.875rem',
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.7rem center',
    paddingRight: '2rem',
  };

  const thStyle = {
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '0.75rem 0.75rem',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    whiteSpace: 'nowrap',
  };

  const tdStyle = {
    padding: '0.85rem 0.75rem',
    fontSize: '0.88rem',
    color: 'var(--color-text-main)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    verticalAlign: 'middle',
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      <style>{`@keyframes kpiPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-text-main)' }}>
          Transacciones del período
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="cat-filter" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Categoría:</label>
          <select
            id="cat-filter"
            value={filterCategory}
            onChange={handleCategoryChange}
            style={selectStyle}
            aria-label="Filtrar por categoría"
          >
            <option value="" style={{ background: '#161925' }}>Todas</option>
            {categories.map((cat) => (
              <option key={cat} value={cat} style={{ background: '#161925' }}>
                {CATEGORIES[cat]?.label || cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          No hay transacciones en este período
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>Categoría</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Monto esperado</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Monto pagado</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Estado</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Día</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((t) => {
                  const catLabel = CATEGORIES[t.category]?.label || t.category || '—';
                  return (
                    <tr key={t.id} style={{ transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={tdStyle}>
                        <span style={{ fontWeight: '500' }}>{t.name}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '999px',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          fontSize: '0.78rem',
                          color: 'var(--color-text-muted)',
                          whiteSpace: 'nowrap',
                        }}>
                          {catLabel}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCOP(t.amount)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: t.completed ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                        {t.completed ? formatCOP(t.amount_paid ?? t.amount) : '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {t.completed ? (
                          <CheckCircle size={18} color="var(--color-success)" aria-label="Pagado" />
                        ) : (
                          <Clock size={18} color="var(--color-text-muted)" aria-label="Pendiente" />
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        {t.due_day ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.25rem' }}>
              <button
                className="glass-button"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', opacity: currentPage === 1 ? 0.4 : 1 }}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Página anterior"
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                className="glass-button"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', opacity: currentPage === totalPages ? 0.4 : 1 }}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Página siguiente"
              >
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
