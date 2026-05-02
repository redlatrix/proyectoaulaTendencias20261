export function extractApiError(err: unknown, fallback = 'Ocurrió un error. Intenta de nuevo.'): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: unknown } }).response?.data;
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      const messages = Object.entries(data as Record<string, string | string[]>)
        .map(([key, val]) => {
          const text = Array.isArray(val) ? val.join(', ') : String(val);
          return key === 'non_field_errors' || key === 'detail' ? text : `${key}: ${text}`;
        })
        .join(' | ');
      if (messages) return messages;
    }
  }
  return fallback;
}
