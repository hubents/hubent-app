"use client";

import { useState, useEffect, useCallback } from "react";
import type { ApiResponse } from "@/types";

interface UseApiOptions {
  immediate?: boolean;
}

export function useApi<T>(
  url: string,
  options: UseApiOptions = { immediate: true }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(options.immediate ?? true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (queryParams?: Record<string, string>) => {
    setLoading(true);
    setError(null);

    try {
      let fetchUrl = url;
      if (queryParams) {
        const params = new URLSearchParams(queryParams);
        fetchUrl = `${url}?${params.toString()}`;
      }

      const response = await fetch(fetchUrl);
      const result: ApiResponse<T> = await response.json();

      if (result.success) {
        setData(result.data ?? null);
      } else {
        setError(result.error?.message ?? "Unknown error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (options.immediate) {
      fetchData();
    }
  }, [fetchData, options.immediate]);

  return { data, loading, error, refetch: fetchData };
}

export function useMutation<TInput, TOutput>(url: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (
    data: TInput,
    method: "POST" | "PATCH" | "DELETE" = "POST"
  ): Promise<TOutput | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<TOutput> = await response.json();

      if (result.success) {
        return result.data ?? null;
      } else {
        setError(result.error?.message ?? "Unknown error");
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mutate");
      return null;
    } finally {
      setLoading(false);
    }
  }, [url]);

  return { mutate, loading, error };
}
