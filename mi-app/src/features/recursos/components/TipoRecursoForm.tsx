import { useState, useEffect, type FormEvent } from 'react';
import { recursosApi } from '../api';
import { CATEGORY_LABEL, type ResourceType, type TipoRecursoFormData, type ResourceCategory } from '../types';
import { extractApiError } from '../../../utils/apiError';

interface Props {
  editing?: ResourceType;
  onSuccess: () => void;
  onCancel: () => void;
}

const EMPTY: TipoRecursoFormData = { name: '', description: '', category: '' };

export default function TipoRecursoForm({ editing, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<TipoRecursoFormData>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setForm({ name: editing.name, description: editing.description, category: editing.category });
    } else {
      setForm(EMPTY);
    }
    setError(null);
  }, [editing]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.category) { setError('Selecciona una categoría.'); return; }
    setIsLoading(true);
    setError(null);
    try {
      if (editing) {
        await recursosApi.updateTipo(editing.id, form as TipoRecursoFormData);
      } else {
        await recursosApi.createTipo(form as TipoRecursoFormData);
      }
      onSuccess();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const field = (key: keyof TipoRecursoFormData) => (
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={form.name}
            onChange={field('name')}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            placeholder="Ej: Computador portátil"
          />
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Categoría <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={form.category}
            onChange={field('category')}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent bg-white"
          >
            <option value="">Seleccionar...</option>
            {(Object.keys(CATEGORY_LABEL) as ResourceCategory[]).map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABEL[cat]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
        <textarea
          value={form.description}
          onChange={field('description')}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent resize-none"
          placeholder="Descripción opcional del tipo de recurso"
        />
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
          Cancelar
        </button>
        <button type="submit" disabled={isLoading}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 transition">
          {isLoading ? (
            <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>Guardando...</>
          ) : editing ? 'Guardar cambios' : 'Crear tipo'}
        </button>
      </div>
    </form>
  );
}
