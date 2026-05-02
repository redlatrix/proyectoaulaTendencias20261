import { useState, useEffect, type FormEvent } from 'react';
import { recursosApi } from '../api';
import {
  CATEGORY_LABEL,
  STATUS_LABEL,
  type Resource,
  type ResourceFormData,
  type ResourceStatus,
  type ResourceType,
} from '../types';
import { extractApiError } from '../../../utils/apiError';

interface Props {
  tipos: ResourceType[];
  editing?: Resource;
  onSuccess: () => void;
  onCancel: () => void;
}

const EMPTY: ResourceFormData = {
  name: '',
  code: '',
  type: '',
  technical_description: '',
  acquisition_date: '',
  value: '0',
  responsible_area: '',
};

// Status options allowed to set manually (ASSIGNED is managed by assignments)
const EDITABLE_STATUSES: ResourceStatus[] = ['AVAILABLE', 'MAINTENANCE', 'RETIRED'];

export default function RecursoForm({ tipos, editing, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<ResourceFormData>(EMPTY);
  const [status, setStatus] = useState<ResourceStatus>('AVAILABLE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        code: editing.code,
        type: editing.type ?? '',
        technical_description: editing.technical_description,
        acquisition_date: editing.acquisition_date ?? '',
        value: editing.value,
        responsible_area: editing.responsible_area,
      });
      setStatus(editing.status);
    } else {
      setForm(EMPTY);
      setStatus('AVAILABLE');
    }
    setError(null);
  }, [editing]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.type) { setError('Selecciona un tipo de recurso.'); return; }
    setIsLoading(true);
    setError(null);
    try {
      if (editing) {
        await recursosApi.updateRecurso(editing.id, { ...form, status });
      } else {
        await recursosApi.createRecurso(form as ResourceFormData);
      }
      onSuccess();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const set = (key: keyof ResourceFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Row 1: nombre + código */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
          <input value={form.name} onChange={set('name')}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            placeholder="Nombre del recurso" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Código <span className="text-red-500">*</span>
          </label>
          <input required value={form.code} onChange={set('code')}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent font-mono"
            placeholder="Ej: LAP-001" />
          <p className="mt-1 text-xs text-gray-400">Debe ser único en el sistema</p>
        </div>
      </div>

      {/* Row 2: tipo + área */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Tipo de recurso <span className="text-red-500">*</span>
          </label>
          <select required value={form.type} onChange={set('type')}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent bg-white">
            <option value="">Seleccionar tipo...</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {CATEGORY_LABEL[t.category]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Área responsable <span className="text-red-500">*</span>
          </label>
          <input required value={form.responsible_area} onChange={set('responsible_area')}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            placeholder="Ej: Tecnología" />
        </div>
      </div>

      {/* Row 3: fecha + valor */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de adquisición</label>
          <input type="date" value={form.acquisition_date} onChange={set('acquisition_date')}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor ($)</label>
          <input type="number" min="0" step="0.01" value={form.value} onChange={set('value')}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent" />
        </div>
      </div>

      {/* Estado — solo en edición */}
      {editing && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as ResourceStatus)}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent bg-white">
            {EDITABLE_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          {status === 'AVAILABLE' && editing.has_active_assignment && (
            <p className="mt-1 text-xs text-amber-600">
              Este recurso tiene una asignación activa; el backend rechazará el estado "Disponible".
            </p>
          )}
        </div>
      )}

      {/* Descripción técnica */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción técnica</label>
        <textarea value={form.technical_description} onChange={set('technical_description')} rows={2}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent resize-none"
          placeholder="Especificaciones, modelo, características..." />
      </div>

      {/* Estado en creación — informativo */}
      {!editing && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          El recurso se creará con estado <strong className="ml-1">Disponible</strong> automáticamente.
        </div>
      )}

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
          ) : editing ? 'Guardar cambios' : 'Crear recurso'}
        </button>
      </div>
    </form>
  );
}
