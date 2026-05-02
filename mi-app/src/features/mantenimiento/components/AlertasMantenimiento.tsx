import { useEffect, useState } from 'react';
import { mantenimientoApi } from '../api';
import { MAINTENANCE_TYPE_LABEL, type Maintenance } from '../types';

interface Props {
  defaultDays?: number;
}

export default function AlertasMantenimiento({ defaultDays = 7 }: Props) {
  const [days, setDays] = useState(defaultDays);
  const [alerts, setAlerts] = useState<Maintenance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    mantenimientoApi.getAlerts(days)
      .then(({ data }) => setAlerts(data))
      .finally(() => setIsLoading(false));
  }, [days]);

  const getDaysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const urgencyColor = (daysUntil: number) => {
    if (daysUntil <= 2) return 'border-red-300 bg-red-50';
    if (daysUntil <= 5) return 'border-amber-300 bg-amber-50';
    return 'border-blue-200 bg-blue-50';
  };

  const urgencyText = (daysUntil: number) => {
    if (daysUntil <= 0) return { label: 'Hoy', color: 'text-red-700 bg-red-100' };
    if (daysUntil === 1) return { label: 'Mañana', color: 'text-red-700 bg-red-100' };
    if (daysUntil <= 2) return { label: `${daysUntil} días`, color: 'text-red-700 bg-red-100' };
    if (daysUntil <= 5) return { label: `${daysUntil} días`, color: 'text-amber-700 bg-amber-100' };
    return { label: `${daysUntil} días`, color: 'text-blue-700 bg-blue-100' };
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">Próximos mantenimientos</h3>
          {!isLoading && alerts.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {alerts.length}
            </span>
          )}
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-600"
        >
          <option value={7}>Próximos 7 días</option>
          <option value={14}>Próximos 14 días</option>
          <option value={30}>Próximos 30 días</option>
        </select>
      </div>

      {/* Body */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Cargando alertas...
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Sin mantenimientos programados para los próximos {days} días.
          </div>
        ) : (
          <ul className="space-y-2">
            {alerts.map((m) => {
              const daysUntil = getDaysUntil(m.scheduled_date);
              const urgency = urgencyText(daysUntil);
              return (
                <li key={m.id} className={`flex items-start justify-between rounded-lg border p-3 ${urgencyColor(daysUntil)}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {m.resource_name || m.resource_code}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {MAINTENANCE_TYPE_LABEL[m.maintenance_type]} · {m.technician}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(m.scheduled_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`ml-3 shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${urgency.color}`}>
                    {urgency.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
