import { useEffect, useState } from 'react';
import { authApi } from '../features/auth/api';
import RegisterForm from '../features/auth/components/RegisterForm';
import type { User } from '../types';
import Modal from '../components/ui/Modal';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data } = await authApi.listUsers();
      setUsers(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSuccess = async () => {
    setIsModalOpen(false);
    showToast('Usuario registrado exitosamente.');
    await fetchUsers();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Administra los usuarios del sistema</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {isLoading ? (
          <Spinner label="Cargando usuarios..." />
        ) : users.length === 0 ? (
          <Empty message="No hay usuarios registrados." />
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Usuario', 'Nombre completo', 'Correo', 'Cargo', 'Área', 'Rol'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{user.username}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">
                    {[user.first_name, user.last_name].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{user.email || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{user.cargo || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{user.area || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.is_superuser || user.groups.includes('Administrador')
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {user.is_superuser || user.groups.includes('Administrador') ? 'Administrador' : 'Solicitante'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar nuevo usuario" size="md">
        <RegisterForm
          onSuccess={handleSuccess}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
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
