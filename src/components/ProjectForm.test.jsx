import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import ProjectForm from './ProjectForm';

describe('ProjectForm Component', () => {
  it('renders correctly for creation', () => {
    render(<ProjectForm onClose={vi.fn()} onSuccess={vi.fn()} createProject={vi.fn()} updateProject={vi.fn()} />);

    expect(screen.getByText('Nuevo Proyecto')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ej: Viaje a México/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/\$ 0/i)).toBeInTheDocument();
  });

  it('renders correctly for editing with initial data', () => {
    const initialData = { id: '1', name: 'Viaje a México', description: 'Vacaciones', budget: 1500000 };
    render(<ProjectForm onClose={vi.fn()} onSuccess={vi.fn()} createProject={vi.fn()} updateProject={vi.fn()} initialData={initialData} />);

    expect(screen.getByText('Editar Proyecto')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Viaje a México')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Vacaciones')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1.500.000')).toBeInTheDocument(); // Formatted COP
  });

  it('validates name is required and enables/disables submit button', () => {
    const createProjectMock = vi.fn();
    render(<ProjectForm onClose={vi.fn()} onSuccess={vi.fn()} createProject={createProjectMock} updateProject={vi.fn()} />);

    const submitBtn = screen.getByText('Guardar');
    expect(submitBtn).toBeDisabled();

    const nameInput = screen.getByPlaceholderText(/Ej: Viaje a México/i);
    fireEvent.change(nameInput, { target: { value: 'Viaje a México' } });

    expect(submitBtn).not.toBeDisabled();
  });

  it('formats budget input in real-time', () => {
    render(<ProjectForm onClose={vi.fn()} onSuccess={vi.fn()} createProject={vi.fn()} updateProject={vi.fn()} />);

    const budgetInput = screen.getByPlaceholderText(/\$ 0/i);
    fireEvent.change(budgetInput, { target: { value: '1500000' } });

    // Should display local format "1.500.000"
    expect(budgetInput.value).toBe('1.500.000');
  });

  it('calls createProject and success callbacks on submit', async () => {
    const createProjectMock = vi.fn().mockResolvedValue({ id: 'new-id' });
    const successMock = vi.fn();
    const closeMock = vi.fn();

    render(
      <ProjectForm
        onClose={closeMock}
        onSuccess={successMock}
        createProject={createProjectMock}
        updateProject={vi.fn()}
      />
    );

    const nameInput = screen.getByPlaceholderText(/Ej: Viaje a México/i);
    fireEvent.change(nameInput, { target: { value: 'Viaje a México' } });

    const budgetInput = screen.getByPlaceholderText(/\$ 0/i);
    fireEvent.change(budgetInput, { target: { value: '1500000' } });

    const form = screen.getByText('Guardar').closest('form');
    fireEvent.submit(form);

    expect(createProjectMock).toHaveBeenCalledWith('Viaje a México', '', 1500000);
    // Wait for the async actions to resolve
    await vi.waitFor(() => {
      expect(successMock).toHaveBeenCalled();
      expect(closeMock).toHaveBeenCalled();
    });
  });
});
