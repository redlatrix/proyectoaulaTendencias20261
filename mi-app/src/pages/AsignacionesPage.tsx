import { useEffect, useState } from 'react';
import { asignacionesApi } from '../features/asignaciones/api';
import AsignacionForm from '../features/asignaciones/components/AsignacionForm';
import { isActive, type Assignment } from '../features/asignaciones/types';
import { useAuth } from '../features/auth/hooks/useAuth';
import { extractApiError } from '../utils/apiError';
import Modal from '../components/ui/Modal';

interface Props { title?: string; }

export default function AsignacionesPage({ title = 'Asignaciones' }: Props) {
  const { isAdministrador } = useAuth();
  const [asignaciones, setAsignaciones] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'returned'>('all');

  const fetchAsignaciones = async () => {
    setIsLoading(true);
    try {
      const { data } = await asignacionesApi.list();
      setAsignaciones(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAsignaciones(); }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleReturn = async (a: Assignment) => {
    if (!confirm(`¿Registrar devolución de "${a.resource_code}" hoy?`)) return;
    setActionId(a.id);
    try {
      await asignacionesApi.return(a.id, new Date().toISOString().split('T')[0]);
      showToast(`Recurso ${a.resource_code} devuelto. Estado actualizado a Disponible.`);
      await fetchAsignaciones();
    } catch (err) {
      showToast(extractApiError(err), 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (a: Assignment) => {
    if (!confirm(`¿Eliminar la asignación de "${a.resource_code}"?`)) return;
    setActionId(a.id);
    try {
      await asignacionesApi.delete(a.id);
      showToast('Asignación eliminada.');
      await fetchAsignaciones();
    } catch (err) {
      showToast(extractApiError(err), 'error');
    } finally {
      setActionId(null);
    }
  };

  const filtered = asignaciones.filter((a) => {
    if (filter === 'active') return isActive(a);
    if (filter === 'returned') return !isActive(a);
    return true;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdministrador ? 'Gestiona las asignaciones de recursos a empleados' : 'Recursos asignados a tu cuenta'}
          </p>
        </div>
        {isAdministrador && (
          <button onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva asignación
          </button>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div className="flex gap-1 mb-4">
        {(['all', 'active', 'returned'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${filter === f ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}>
            {f === 'all' ? 'Todas' : f === 'active' ? 'Activas' : 'Devueltas'}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 self-center">{filtered.length} registros</span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {isLoading ? <Spinner label="Cargando asignaciones..." /> : filtered.length === 0 ? (
          <Empty message="No hay asignaciones para mostrar." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Código', 'Asignado a', 'Inicio', 'Dev. esperada', 'Devuelto', 'Estado',
                    ...(isAdministrador ? ['Acciones'] : [])
                  ].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((a) => {
                  const active = isActive(a);
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-mono font-medium text-gray-900">{a.resource_code}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{a.assignee_name || '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">{fmt(a.start_date)}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                        {a.expected_return_date ? fmt(a.expected_return_date) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                        {a.returned_at ? fmt(a.returned_at) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {active ? 'Activa' : 'Devuelta'}
                        </span>
                      </td>
                      {isAdministrador && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {active && (
                              <button onClick={() => handleReturn(a)} disabled={actionId === a.id}
                                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 transition">
                                {actionId === a.id
                                  ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                  : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
                                }
                                Devolver
                              </button>
                            )}
                            <button onClick={() => handleDelete(a)} disabled={actionId === a.id}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-40">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva asignación" size="md">
        <AsignacionForm
          onSuccess={async () => {
            setIsModalOpen(false);
            showToast('Asignación creada. Recurso marcado como Asignado.');
            await fetchAsignaciones();
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div className={`mb-5 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
      type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
    }`}>
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        {type === 'success'
          ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        }
      </svg>
      {msg}
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {label}
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return <div className="py-16 text-center text-gray-400 text-sm">{message}</div>;
}
