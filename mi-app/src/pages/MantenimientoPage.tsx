import { useEffect, useState } from 'react';
import { mantenimientoApi } from '../features/mantenimiento/api';
import MantenimientoForm from '../features/mantenimiento/components/MantenimientoForm';
import AlertasMantenimiento from '../features/mantenimiento/components/AlertasMantenimiento';
import {
  MAINTENANCE_STATUS_COLOR, MAINTENANCE_STATUS_LABEL, MAINTENANCE_TYPE_LABEL,
  type Maintenance, type MaintenanceStatus,
} from '../features/mantenimiento/types';
import { extractApiError } from '../utils/apiError';
import Modal from '../components/ui/Modal';

export default function MantenimientoPage() {
  const [mantenimientos, setMantenimientos] = useState<Maintenance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  const fetchMantenimientos = async () => {
    setIsLoading(true);
    try {
      const { data } = await mantenimientoApi.list();
      setMantenimientos(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMantenimientos(); }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleStatusChange = async (m: Maintenance, newStatus: MaintenanceStatus) => {
    const confirmMsg: Record<string, string> = {
      IN_PROGRESS: `¿Iniciar mantenimiento de "${m.resource_name || m.resource_code}"? El recurso pasará a "En mantenimiento".`,
      COMPLETED: '¿Marcar como completado? El recurso volverá a "Disponible".',
      CANCELLED: '¿Cancelar este mantenimiento? El recurso volverá a "Disponible".',
    };
    if (!confirm(confirmMsg[newStatus])) return;
    setActionId(m.id);
    try {
      await mantenimientoApi.updateStatus(m.id, newStatus);
      showToast(`Mantenimiento actualizado: ${MAINTENANCE_STATUS_LABEL[newStatus]}.`);
      await fetchMantenimientos();
    } catch (err) {
      showToast(extractApiError(err), 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (m: Maintenance) => {
    if (!confirm(`¿Eliminar el mantenimiento de "${m.resource_name || m.resource_code}"?`)) return;
    setActionId(m.id);
    try {
      await mantenimientoApi.delete(m.id);
      showToast('Mantenimiento eliminado.');
      await fetchMantenimientos();
    } catch (err) {
      showToast(extractApiError(err), 'error');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mantenimiento</h1>
          <p className="text-sm text-gray-500 mt-0.5">Programa y gestiona los mantenimientos de recursos</p>
        </div>
        <button onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Programar mantenimiento
        </button>
      </div>

      <div className="mb-6">
        <AlertasMantenimiento defaultDays={7} />
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {isLoading ? <Spinner label="Cargando mantenimientos..." /> : mantenimientos.length === 0 ? (
          <Empty message="No hay mantenimientos registrados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Código', 'Recurso', 'Tipo', 'Estado', 'Técnico', 'Fecha prog.', 'Costo est.', 'Acciones'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mantenimientos.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-mono text-gray-700">{m.resource_code}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{m.resource_name || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${m.maintenance_type === 'PREVENTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {MAINTENANCE_TYPE_LABEL[m.maintenance_type]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${MAINTENANCE_STATUS_COLOR[m.status]}`}>
                        {MAINTENANCE_STATUS_LABEL[m.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{m.technician}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(m.scheduled_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {m.estimated_cost ? `$${parseFloat(m.estimated_cost).toLocaleString('es-CO')}` : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {m.status === 'SCHEDULED' && (
                          <ActionBtn label="Iniciar" color="amber" loading={actionId === m.id} onClick={() => handleStatusChange(m, 'IN_PROGRESS')} />
                        )}
                        {m.status === 'IN_PROGRESS' && (
                          <ActionBtn label="Completar" color="emerald" loading={actionId === m.id} onClick={() => handleStatusChange(m, 'COMPLETED')} />
                        )}
                        {(m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS') && (
                          <ActionBtn label="Cancelar" color="gray" loading={actionId === m.id} onClick={() => handleStatusChange(m, 'CANCELLED')} />
                        )}
                        {m.status === 'SCHEDULED' && (
                          <button onClick={() => handleDelete(m)} disabled={actionId === m.id}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-40">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Programar mantenimiento" size="lg">
        <MantenimientoForm
          onSuccess={async () => { setIsModalOpen(false); showToast('Mantenimiento programado.'); await fetchMantenimientos(); }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

function ActionBtn({ label, color, loading, onClick }: { label: string; color: string; loading: boolean; onClick: () => void }) {
  const colors: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    gray: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  };
  return (
    <button onClick={onClick} disabled={loading}
      className={`rounded-md px-2 py-1 text-xs font-medium transition disabled:opacity-40 ${colors[color]}`}>
      {label}
    </button>
  );
}

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
