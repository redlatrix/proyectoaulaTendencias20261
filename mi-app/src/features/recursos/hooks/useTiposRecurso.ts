import { useEffect, useState } from 'react';
import { recursosApi } from '../api';
import type { ResourceType } from '../types';

export function useTiposRecurso() {
  const [tipos, setTipos] = useState<ResourceType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = async () => {
    setIsLoading(true);
    try {
      const { data } = await recursosApi.listTipos();
      setTipos(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  return { tipos, isLoading, refresh: fetch };
}
