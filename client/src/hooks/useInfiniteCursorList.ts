import { useCallback, useEffect, useRef, useState } from "react";

type CursorResponse<T> = {
  data: {
    items: T[];
    next_cursor: string | null;
    has_more: boolean;
    total_count: number;
  };
};

type FetchPage<T> = (options: {
  search: string;
  cursor: string | null;
  signal: AbortSignal;
}) => Promise<CursorResponse<T>>;

type Options<T> = {
  search: string;
  fetchPage: FetchPage<T>;
};

export function useInfiniteCursorList<T>({ search, fetchPage }: Options<T>) {
  const [items, setItems] = useState<T[]>([]);

  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [hasMore, setHasMore] = useState(true);

  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);

  const [error, setError] = useState("");

  const requestIdRef = useRef(0);

  const activeControllerRef = useRef<AbortController | null>(null);

  const loadPage = useCallback(
    async ({
      cursor,
      replace,
    }: {
      cursor: string | null;
      replace: boolean;
    }) => {
      if (loading && !replace) {
        return;
      }

      activeControllerRef.current?.abort();

      const controller = new AbortController();

      activeControllerRef.current = controller;

      requestIdRef.current += 1;

      const requestId = requestIdRef.current;

      setLoading(true);
      setError("");

      if (replace) {
        setInitialLoading(true);
      }

      try {
        const response = await fetchPage({
          search,
          cursor,
          signal: controller.signal,
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        setItems((current) =>
          replace ? response.data.items : [...current, ...response.data.items],
        );

        setNextCursor(response.data.next_cursor);

        setHasMore(response.data.has_more);

        setTotalCount(Number(response.data.total_count || 0));
      } catch (caughtError: unknown) {
        if (
          caughtError instanceof DOMException &&
          caughtError.name === "AbortError"
        ) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load data.",
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setInitialLoading(false);
        }
      }
    },
    [fetchPage, loading, search],
  );

  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    setHasMore(true);
    setTotalCount(0);

    void loadPage({
      cursor: null,
      replace: true,
    });

    return () => {
      activeControllerRef.current?.abort();
    };
  }, [search]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || !nextCursor) {
      return;
    }

    void loadPage({
      cursor: nextCursor,
      replace: false,
    });
  }, [hasMore, loadPage, loading, nextCursor]);

  const reload = useCallback(() => {
    setItems([]);
    setNextCursor(null);
    setHasMore(true);
    setTotalCount(0);

    void loadPage({
      cursor: null,
      replace: true,
    });
  }, [loadPage]);

  return {
    items,
    totalCount,
    hasMore,
    loading,
    initialLoading,
    error,
    loadMore,
    reload,
  };
}
