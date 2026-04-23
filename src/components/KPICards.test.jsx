import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import KPICards from './KPICards';

// ─── Helpers ────────────────────────────────────────────────────────────────

const FULL_REPORT = {
  total: 1_250_000,
  dailyAverage: 41_666,
  topCategory: 'tarjetas',
  variationPercent: 12.5,
  byCategory: [{ category: 'tarjetas', total: 1_250_000 }],
  byDay: [],
  transactions: [],
};

const ZERO_VARIATION_REPORT = {
  ...FULL_REPORT,
  variationPercent: null, // first month — no previous data
};

const NEGATIVE_VARIATION_REPORT = {
  ...FULL_REPORT,
  variationPercent: -8.3,
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('KPICards', () => {
  // ── Test 2a: skeleton when loading=true ─────────────────────────────────
  it('renders 4 skeleton cards when loading is true', () => {
    const { container } = render(<KPICards report={null} loading={true} />);

    // Skeletons are rendered as glass-panel divs with the kpi-skeleton class inside
    const skeletons = container.querySelectorAll('.kpi-skeleton');
    // Each skeleton card has 3 kpi-skeleton elements (icon placeholder + label placeholder + value placeholder)
    expect(skeletons.length).toBeGreaterThanOrEqual(4);

    // No KPI value text should appear
    expect(screen.queryByText(/\$1\.250\.000/i)).toBeNull();
    expect(screen.queryByText(/Total gastado/i)).toBeNull();
  });

  it('does not render any real values when loading', () => {
    render(<KPICards report={FULL_REPORT} loading={true} />);
    // Even if report is passed, loading=true should suppress real data display
    expect(screen.queryByText('Total gastado')).toBeNull();
  });

  // ── Test 2b: real values when loading=false ──────────────────────────────
  it('renders all 4 KPI card labels when loading is false', () => {
    render(<KPICards report={FULL_REPORT} loading={false} />);

    expect(screen.getByText('Total gastado')).toBeInTheDocument();
    expect(screen.getByText('Promedio diario')).toBeInTheDocument();
    expect(screen.getByText('Categoría principal')).toBeInTheDocument();
    expect(screen.getByText('Variación vs mes anterior')).toBeInTheDocument();
  });

  it('formats COP amount correctly for total and daily average', () => {
    render(<KPICards report={FULL_REPORT} loading={false} />);

    // 1_250_000 formatted in es-CO locale produces $1.250.000
    expect(screen.getByText('$1.250.000')).toBeInTheDocument();
    // 41_666 → $41.666
    expect(screen.getByText('$41.666')).toBeInTheDocument();
  });

  it('displays the human-readable category label for topCategory', () => {
    render(<KPICards report={FULL_REPORT} loading={false} />);
    // 'tarjetas' maps to 'Tarjetas de crédito' in CATEGORIES
    expect(screen.getByText('Tarjetas de crédito')).toBeInTheDocument();
  });

  it('shows — for variationPercent when it is null (first month)', () => {
    render(<KPICards report={ZERO_VARIATION_REPORT} loading={false} />);
    // The variation card should show the dash sentinel
    const dashElements = screen.getAllByText('—');
    expect(dashElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows positive variation with + prefix and danger color', () => {
    render(<KPICards report={FULL_REPORT} loading={false} />);
    // variationPercent = 12.5 → should display "+12.5%"
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
  });

  it('shows negative variation with - prefix', () => {
    render(<KPICards report={NEGATIVE_VARIATION_REPORT} loading={false} />);
    // variationPercent = -8.3 → should display "-8.3%"
    expect(screen.getByText('-8.3%')).toBeInTheDocument();
  });

  it('renders null when report is falsy and not loading', () => {
    const { container } = render(<KPICards report={null} loading={false} />);
    expect(container.firstChild).toBeNull();
  });
});
