import { useState, useEffect, useCallback } from 'react';

export function useQuery<T>(
  fetcher: () => Promise<{ data: T | null; error: { message: string } | null }>,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: d, error: err } = await fetcher();
    if (err) {
      setError(err.message);
      setData(null);
    } else {
      setData(d);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, deps);

  return { data, loading, error, refetch };
}
