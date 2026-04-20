import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Layout from '../components/layout/Layout';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import UsersPage from '../pages/UsersPage';
import RecursosPage from '../pages/RecursosPage';
import TiposRecursoPage from '../pages/TiposRecursoPage';
import AsignacionesPage from '../pages/AsignacionesPage';
import MantenimientoPage from '../pages/MantenimientoPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected — all authenticated users */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />

          {/* Shared — backend filters by role automatically */}
          <Route path="/recursos" element={<RecursosPage />} />
          <Route path="/mis-recursos" element={<RecursosPage />} />
          <Route path="/asignaciones" element={<AsignacionesPage title="Asignaciones" />} />
          <Route path="/mis-asignaciones" element={<AsignacionesPage title="Mis Asignaciones" />} />
          <Route path="/tipos-recurso" element={<TiposRecursoPage />} />

          {/* Admin only */}
          <Route element={<ProtectedRoute requireAdmin />}>
            <Route path="/mantenimiento" element={<MantenimientoPage />} />
            <Route path="/usuarios" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
