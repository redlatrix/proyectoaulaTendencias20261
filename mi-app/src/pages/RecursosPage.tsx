import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { recursosApi } from '../features/recursos/api';
import RecursoForm from '../features/recursos/components/RecursoForm';
import { useTiposRecurso } from '../features/recursos/hooks/useTiposRecurso';
import { CATEGORY_LABEL, STATUS_COLOR, STATUS_LABEL, type Resource, type ResourceType } from '../features/recursos/types';
import { useAuth } from '../features/auth/hooks/useAuth';
import { extractApiError } from '../utils/apiError';
import Modal from '../components/ui/Modal';

export default function RecursosPage() {
  const { isAdministrador } = useAuth();
  const { tipos } = useTiposRecurso();

  const [recursos, setRecursos] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | undefined>();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchRecursos = async () => {
    setIsLoading(true);
    try {
      const { data } = await recursosApi.listRecursos();
      setRecursos(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchRecursos(); }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openCreate = () => { setEditing(undefined); setIsModalOpen(true); };
  const openEdit = (r: Resource) => { setEditing(r); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditing(undefined); };

  const handleSuccess = async (verb: string) => {
    closeModal();
    showToast(`Recurso ${verb} exitosamente.`);
    await fetchRecursos();
  };

  const handleDelete = async (recurso: Resource) => {
    if (recurso.has_active_assignment) {
      showToast(`No se puede eliminar: "${recurso.name}" tiene una asignación activa.`, 'error');
      return;
    }
    if (recurso.status !== 'AVAILABLE') {
      showToast('Solo se pueden eliminar recursos en estado Disponible.', 'error');
      return;
    }
    if (!confirm(`¿Eliminar el recurso "${recurso.name}" (${recurso.code})?`)) return;
    setDeletingId(recurso.id);
    try {
      await recursosApi.deleteRecurso(recurso.id);
      showToast(`Recurso "${recurso.name}" eliminado.`);
      await fetchRecursos();
    } catch (err) {
      showToast(extractApiError(err, `No se pudo eliminar "${recurso.name}".`), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const tipoMap = tipos.reduce<Record<number, ResourceType>>((acc, t) => { acc[t.id] = t; return acc; }, {});

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recursos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Inventario de recursos del sistema</p>
        </div>
        {isAdministrador && (
          <button onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo recurso
          </button>
        )}
      </div>

      {/* Aviso sin tipos */}
      {isAdministrador && tipos.length === 0 && !isLoading && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          No hay tipos de recurso registrados. Antes de crear recursos, ve a{' '}
          <Link to="/tipos-recurso" className="font-semibold underline">Tipos de Recurso</Link> y crea al menos uno.
        </div>
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {isLoading ? <Spinner label="Cargando recursos..." /> : recursos.length === 0 ? (
          <Empty message="No hay recursos registrados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Código', 'Nombre', 'Tipo', 'Categoría', 'Estado', 'Área responsable', 'Valor',
                    ...(isAdministrador ? ['Acciones'] : [])
                  ].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recursos.map((r) => {
                  const tipo = r.type ? tipoMap[r.type] : null;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-mono text-gray-700">{r.code}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{r.name || '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{r.type_name || '—'}</td>
                      <td className="px-5 py-3.5">
                        {tipo ? <CategoryBadge category={tipo.category} /> : <span className="text-gray-300 text-sm">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{r.responsible_area}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">
                        {parseFloat(r.value) > 0 ? `$${parseFloat(r.value).toLocaleString('es-CO')}` : '—'}
                      </td>
                      {isAdministrador && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <IconBtn icon="edit" onClick={() => openEdit(r)} title="Editar" hoverColor="indigo" />
                            <IconBtn icon="delete" onClick={() => handleDelete(r)} title="Eliminar"
                              hoverColor="red" loading={deletingId === r.id}
                              disabled={r.status !== 'AVAILABLE' || r.has_active_assignment}
                              disabledTitle={r.has_active_assignment ? 'Tiene asignación activa' : 'Solo disponibles'} />
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? `Editar: ${editing.name || editing.code}` : 'Nuevo recurso'}
        size="lg"
      >
        {tipos.length === 0 ? (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 mb-4">
            No hay tipos de recurso. <Link to="/tipos-recurso" onClick={closeModal} className="font-semibold underline">Crear tipos primero →</Link>
          </div>
        ) : null}
        <RecursoForm
          tipos={tipos}
          editing={editing}
          onSuccess={() => handleSuccess(editing ? 'actualizado' : 'creado')}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}

// ── shared sub-components ─────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, string> = {
    PHYSICAL: 'bg-blue-100 text-blue-700',
    DIGITAL: 'bg-purple-100 text-purple-700',
    SPACE: 'bg-teal-100 text-teal-700',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${map[category] ?? 'bg-gray-100 text-gray-600'}`}>
      {CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL] ?? category}
    </span>
  );
}

interface IconBtnProps {
  icon: 'edit' | 'delete';
  onClick: () => void;
  title: string;
  hoverColor: 'indigo' | 'red';
  loading?: boolean;
  disabled?: boolean;
  disabledTitle?: string;
}

function IconBtn({ icon, onClick, title, hoverColor, loading, disabled, disabledTitle }: IconBtnProps) {
  const hover = hoverColor === 'indigo' ? 'hover:bg-primary-50 hover:text-primary-600' : 'hover:bg-red-50 hover:text-red-600';
  return (
    <button onClick={onClick} disabled={loading || disabled}
      title={disabled ? disabledTitle : title}
      className={`rounded-md p-1.5 text-gray-400 transition ${hover} disabled:opacity-30 disabled:cursor-not-allowed`}>
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon === 'edit' ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      )}
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
