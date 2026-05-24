import { useState } from 'react';
import { digitsOnly, formatCopFromDigits, parseCopDigitsToNumber } from '../utils/money';
import { Edit2, Plus } from 'lucide-react';

export default function ProjectForm({ onClose, onSuccess, initialData, createProject, updateProject }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData ? initialData.name : '',
    description: initialData ? (initialData.description || '') : '',
    budget: initialData && initialData.budget ? digitsOnly(Math.round(Number(initialData.budget))) : ''
  });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setLoading(true);

    try {
      const parsedBudget = formData.budget ? parseCopDigitsToNumber(formData.budget) : null;
      if (initialData) {
        await updateProject(initialData.id, formData.name, formData.description, parsedBudget);
      } else {
        await createProject(formData.name, formData.description, parsedBudget);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving project:", err);
      alert("Error al guardar el proyecto. Consulta la consola.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <div className="expense-form__header">
        <div className="expense-form__icon" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
          {initialData ? <Edit2 size={20} color="white" /> : <Plus size={20} color="white" />}
        </div>
        <div>
          <h2 className="expense-form__title">
            {initialData ? 'Editar Proyecto' : 'Nuevo Proyecto'}
          </h2>
          <p className="expense-form__subtitle">
            {initialData ? 'Actualiza los detalles de esta cuenta de proyecto' : 'Crea una cuenta dedicada a un proyecto o viaje específico'}
          </p>
        </div>
      </div>

      <div className="expense-form__fields">
        <div className="form-group">
          <label>Nombre del Proyecto *</label>
          <input
            type="text"
            className="form-control"
            required
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej: Viaje a México, Remodelación Cocina..."
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Descripción</label>
          <textarea
            className="form-control"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ej: Gastos personales e imprevistos del viaje de vacaciones."
            rows={3}
            style={{ resize: 'vertical', minHeight: '80px' }}
          />
        </div>

        <div className="form-group">
          <label>Presupuesto Máximo Estimado (Opcional)</label>
          <input
            type="text"
            className="form-control"
            inputMode="numeric"
            value={formatCopFromDigits(formData.budget)}
            onChange={e => setFormData({ ...formData, budget: digitsOnly(e.target.value) })}
            placeholder="$ 0 (Dejar vacío para ilimitado)"
          />
        </div>
      </div>

      <div className="expense-form__actions">
        <button
          type="button"
          className="glass-button"
          onClick={onClose}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="glass-button primary"
          disabled={loading || !formData.name.trim()}
        >
          {loading ? (
            <>
              <span className="expense-form__spinner" />
              Guardando...
            </>
          ) : (
            initialData ? 'Actualizar' : 'Guardar'
          )}
        </button>
      </div>
    </form>
  );
}
