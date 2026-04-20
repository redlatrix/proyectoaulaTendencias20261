import { useState, useEffect, type FormEvent } from 'react';
import { asignacionesApi } from '../api';
import type { AssignmentFormData } from '../types';
import type { Resource } from '../../recursos/types';
import type { User } from '../../auth/types';
import { recursosApi } from '../../recursos/api';
import { authApi } from '../../auth/api';
import { extractApiError } from '../../../utils/apiError';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

const EMPTY: AssignmentFormData = {
  resource: '',
  assignee: '',
  start_date: today(),
  expected_return_date: '',
  notes: '',
};

export default function AsignacionForm({ onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<AssignmentFormData>(EMPTY);
  const [availableResources, setAvailableResources] = useState<Resource[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [resRes, usersRes] = await Promise.all([
          recursosApi.listRecursos(),
          authApi.listUsers(),
        ]);
        // Frontend validation: only show AVAILABLE resources
        setAvailableResources(resRes.data.filter((r) => r.status === 'AVAILABLE'));
        setUsers(usersRes.data);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.resource) { setError('Selecciona un recurso disponible.'); return; }
    if (!form.assignee) { setError('Selecciona un empleado.'); return; }

    // Extra frontend guard: verify selected resource is still AVAILABLE
    const selected = availableResources.find((r) => r.id === Number(form.resource));
    if (!selected) {
      setError('El recurso seleccionado ya no está disponible. Recarga la página.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await asignacionesApi.create(form);
      onSuccess();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const set = (key: keyof AssignmentFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  if (isLoadingData) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Cargando recursos y usuarios...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {availableResources.length === 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          No hay recursos en estado <strong className="mx-1">Disponible</strong> para asignar.
        </div>
      )}

      {/* Recurso */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Recurso <span className="text-red-500">*</span>
          <span className="ml-2 text-xs font-normal text-gray-400">(solo se muestran los disponibles)</span>
        </label>
        <select required value={form.resource} onChange={set('resource')}
          disabled={availableResources.length === 0}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-400">
          <option value="">Seleccionar recurso...</option>
          {availableResources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.code} — {r.name || r.type_name}
            </option>
          ))}
        </select>
      </div>

      {/* Empleado */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Asignar a <span className="text-red-500">*</span>
        </label>
        <select required value={form.assignee} onChange={set('assignee')}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent bg-white">
          <option value="">Seleccionar empleado...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
              {u.cargo ? ` — ${u.cargo}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Fecha inicio <span className="text-red-500">*</span>
          </label>
          <input type="date" required value={form.start_date} onChange={set('start_date')}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Devolución esperada</label>
          <input type="date" value={form.expected_return_date} onChange={set('expected_return_date')}
            min={form.start_date}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent" />
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas</label>
        <textarea value={form.notes} onChange={set('notes')} rows={2}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent resize-none"
          placeholder="Observaciones adicionales..." />
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
          Cancelar
        </button>
        <button type="submit" disabled={isSubmitting || availableResources.length === 0}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 transition">
          {isSubmitting ? (
            <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>Registrando...</>
          ) : 'Registrar asignación'}
        </button>
      </div>
    </form>
  );
}
