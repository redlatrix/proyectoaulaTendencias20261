import { useState, useEffect, type FormEvent } from 'react';
import { mantenimientoApi } from '../api';
import { MAINTENANCE_TYPE_LABEL, type MantenimientoFormData, type MaintenanceType } from '../types';
import type { Resource } from '../../recursos/types';
import { recursosApi } from '../../recursos/api';
import { extractApiError } from '../../../utils/apiError';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

const EMPTY: MantenimientoFormData = {
  resource: '',
  maintenance_type: '',
  scheduled_date: today(),
  technician: '',
  description: '',
  estimated_cost: '',
};

export default function MantenimientoForm({ onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<MantenimientoFormData>(EMPTY);
  const [eligibleResources, setEligibleResources] = useState<Resource[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    recursosApi.listRecursos().then(({ data }) => {
      // Only AVAILABLE resources can be scheduled for maintenance
      setEligibleResources(data.filter((r) => r.status === 'AVAILABLE'));
    }).finally(() => setIsLoadingData(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.resource) { setError('Selecciona un recurso.'); return; }
    if (!form.maintenance_type) { setError('Selecciona el tipo de mantenimiento.'); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      await mantenimientoApi.create(form);
      onSuccess();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const set = (key: keyof MantenimientoFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  if (isLoadingData) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Cargando recursos disponibles...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {eligibleResources.length === 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          No hay recursos <strong className="mx-1">Disponibles</strong> para programar mantenimiento.
        </div>
      )}

      {/* Recurso + Tipo */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Recurso <span className="text-red-500">*</span>
            <span className="ml-2 text-xs font-normal text-gray-400">(solo disponibles)</span>
          </label>
          <select required value={form.resource} onChange={set('resource')}
            disabled={eligibleResources.length === 0}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent bg-white disabled:bg-gray-50">
            <option value="">Seleccionar recurso...</option>
            {eligibleResources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} — {r.name || r.type_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Tipo <span className="text-red-500">*</span>
          </label>
          <select required value={form.maintenance_type} onChange={set('maintenance_type')}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent bg-white">
            <option value="">Seleccionar tipo...</option>
            {(Object.keys(MAINTENANCE_TYPE_LABEL) as MaintenanceType[]).map((t) => (
              <option key={t} value={t}>{MAINTENANCE_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Fecha + Técnico */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Fecha programada <span className="text-red-500">*</span>
          </label>
          <input type="date" required value={form.scheduled_date} onChange={set('scheduled_date')}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Técnico <span className="text-red-500">*</span>
          </label>
          <input required value={form.technician} onChange={set('technician')}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            placeholder="Nombre del técnico" />
        </div>
      </div>

      {/* Costo estimado + Descripción */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Costo estimado ($)</label>
        <input type="number" min="0" step="0.01" value={form.estimated_cost} onChange={set('estimated_cost')}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
          placeholder="Opcional" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
        <textarea value={form.description} onChange={set('description')} rows={2}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent resize-none"
          placeholder="Detalle del trabajo a realizar..." />
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
          Cancelar
        </button>
        <button type="submit" disabled={isSubmitting || eligibleResources.length === 0}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 transition">
          {isSubmitting ? (
            <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>Programando...</>
          ) : 'Programar mantenimiento'}
        </button>
      </div>
    </form>
  );
}
