import { render, screen } from '@testing-library/react';
import SetupScreen from './SetupScreen';

describe('SetupScreen Component', () => {
  it('renders connection required message', () => {
    render(<SetupScreen />);
    const headingOptions = screen.getAllByRole('heading', { level: 2 });
    expect(headingOptions[0]).toHaveTextContent('Conexión a Supabase Requerida');
  });

  it('renders explanation paragraph', () => {
    render(<SetupScreen />);
    expect(screen.getByText(/garantizar la persistencia de tus registros/i)).toBeInTheDocument();
  });
});
