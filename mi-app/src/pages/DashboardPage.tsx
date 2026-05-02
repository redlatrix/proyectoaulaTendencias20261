import { useAuth } from '../features/auth/hooks/useAuth';
import AlertasMantenimiento from '../features/mantenimiento/components/AlertasMantenimiento';

export default function DashboardPage() {
  const { user, isAdministrador } = useAuth();

  const fullName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username ?? '';

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bienvenido, {fullName}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isAdministrador
            ? 'Tienes acceso completo al sistema de gestión de recursos.'
            : 'Aquí puedes consultar tus recursos y asignaciones.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Summary cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5 content-start">
          {isAdministrador ? (
            <>
              <SummaryCard label="Recursos" description="Gestiona el inventario" color="indigo" href="/recursos" />
              <SummaryCard label="Asignaciones" description="Controla las asignaciones activas" color="emerald" href="/asignaciones" />
              <SummaryCard label="Mantenimiento" description="Programa y registra mantenimientos" color="amber" href="/mantenimiento" />
              <SummaryCard label="Usuarios" description="Administra las cuentas del sistema" color="purple" href="/usuarios" />
            </>
          ) : (
            <>
              <SummaryCard label="Mis Recursos" description="Recursos asignados a ti" color="indigo" href="/mis-recursos" />
              <SummaryCard label="Mis Asignaciones" description="Historial de asignaciones" color="emerald" href="/mis-asignaciones" />
            </>
          )}
        </div>

        {/* Alerts widget — admin only */}
        {isAdministrador && (
          <div className="lg:col-span-1">
            <AlertasMantenimiento defaultDays={7} />
          </div>
        )}
      </div>
    </div>
  );
}

interface CardProps { label: string; description: string; color: string; href: string; }

function SummaryCard({ label, description, color, href }: CardProps) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-primary-50 border-primary-100 text-primary-700 hover:bg-primary-100',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100',
    amber: 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100',
    purple: 'bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100',
  };
  return (
    <a href={href} className={`rounded-xl border p-5 transition cursor-pointer ${colorMap[color]}`}>
      <p className="text-lg font-semibold">{label}</p>
      <p className="text-sm opacity-70 mt-1">{description}</p>
    </a>
  );
}
