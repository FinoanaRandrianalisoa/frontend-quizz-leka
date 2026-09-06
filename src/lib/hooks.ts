import { useCallback, useEffect, useState } from "react";
import { GraphqlError } from "./graphql";

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fn());
    } catch (err) {
      setError(err instanceof GraphqlError || err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}

export function errMsg(err: unknown): string {
  if (err instanceof GraphqlError || err instanceof Error) return err.message;
  return "Une erreur est survenue.";
}
