import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import ProjectTransactionForm from './ProjectTransactionForm';

describe('ProjectTransactionForm Component', () => {
  it('renders fields correctly', () => {
    render(
      <ProjectTransactionForm
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        addTransaction={vi.fn()}
        updateTransaction={vi.fn()}
        projectId="proj-1"
      />
    );

    expect(screen.getByText('Registrar Transacción')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ej: Hotel en CDMX/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/\$ 0/i)).toBeInTheDocument();
    // Default mode should be expense
    const expenseBtn = screen.getByText('Gasto / Egreso');
    expect(expenseBtn.className).toContain('active-expense');
  });

  it('toggles transaction types and updates categories list', () => {
    render(
      <ProjectTransactionForm
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        addTransaction={vi.fn()}
        updateTransaction={vi.fn()}
        projectId="proj-1"
      />
    );

    // Let's verify we have standard categories dropdown
    const selectEl = screen.getByRole('combobox');
    
    // Default categories list (expense-based or both)
    expect(screen.getByRole('option', { name: 'Hospedaje' })).toBeInTheDocument();
    
    // "Aporte Personal" shouldn't be in the list for expenses since its kind is income
    expect(screen.queryByRole('option', { name: 'Aporte Personal' })).toBeNull();

    // Toggle to Income
    const incomeBtn = screen.getByText('Ingreso / Aporte');
    fireEvent.click(incomeBtn);

    expect(incomeBtn.className).toContain('active-income');
    expect(screen.queryByRole('option', { name: 'Hospedaje' })).toBeNull();
    expect(screen.getByRole('option', { name: 'Aporte Personal' })).toBeInTheDocument();
  });

  it('negates amount when submitting an expense', async () => {
    const addTxMock = vi.fn().mockResolvedValue({ id: 'tx-new' });
    const successMock = vi.fn();
    const closeMock = vi.fn();

    render(
      <ProjectTransactionForm
        onClose={closeMock}
        onSuccess={successMock}
        addTransaction={addTxMock}
        updateTransaction={vi.fn()}
        projectId="proj-1"
      />
    );

    // Enter description
    const descInput = screen.getByPlaceholderText(/Ej: Hotel en CDMX/i);
    fireEvent.change(descInput, { target: { value: 'Comida en el aeropuerto' } });

    // Enter amount
    const amountInput = screen.getByPlaceholderText(/\$ 0/i);
    fireEvent.change(amountInput, { target: { value: '45000' } });

    // Default type is expense, so we just submit
    const submitBtn = screen.getByText('Guardar');
    fireEvent.click(submitBtn);

    expect(addTxMock).toHaveBeenCalledWith(
      'proj-1',
      'Comida en el aeropuerto',
      -45000, // Negative for expense
      expect.any(String),
      expect.any(String)
    );

    await vi.waitFor(() => {
      expect(successMock).toHaveBeenCalled();
      expect(closeMock).toHaveBeenCalled();
    });
  });

  it('keeps positive amount when submitting an income', async () => {
    const addTxMock = vi.fn().mockResolvedValue({ id: 'tx-new' });
    const successMock = vi.fn();
    const closeMock = vi.fn();

    render(
      <ProjectTransactionForm
        onClose={closeMock}
        onSuccess={successMock}
        addTransaction={addTxMock}
        updateTransaction={vi.fn()}
        projectId="proj-1"
      />
    );

    // Toggle to income
    const incomeBtn = screen.getByText('Ingreso / Aporte');
    fireEvent.click(incomeBtn);

    // Enter description
    const descInput = screen.getByPlaceholderText(/Ej: Ahorro inicial/i);
    fireEvent.change(descInput, { target: { value: 'Regalo de cumpleaños' } });

    // Enter amount
    const amountInput = screen.getByPlaceholderText(/\$ 0/i);
    fireEvent.change(amountInput, { target: { value: '100000' } });

    // Submit
    const submitBtn = screen.getByText('Guardar');
    fireEvent.click(submitBtn);

    expect(addTxMock).toHaveBeenCalledWith(
      'proj-1',
      'Regalo de cumpleaños',
      100000, // Positive for income
      expect.any(String),
      expect.any(String)
    );

    await vi.waitFor(() => {
      expect(successMock).toHaveBeenCalled();
      expect(closeMock).toHaveBeenCalled();
    });
  });
});
