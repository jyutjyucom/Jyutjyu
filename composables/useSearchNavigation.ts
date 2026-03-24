import { isJyutpingQuery, normalizeSearchQuery } from "~/utils/query-classify";

interface SearchResolveResponse {
  success: boolean;
  query: string;
  reverse: boolean;
  resolution?: {
    type: "word" | "search";
    reason: string;
    canonicalHeadword?: string;
  };
  error?: string;
}

interface NavigateFromSearchInputOptions {
  query: string;
  reverse?: boolean;
  knownExactHeadword?: boolean;
}

const RESOLVE_TIMEOUT_MS = 400;

const isAbortError = (error: unknown): boolean => {
  return (
    (error instanceof Error && error.name === "AbortError") ||
    String((error as { name?: string } | null)?.name || "") === "AbortError"
  );
};

export const useSearchNavigation = () => {
  const router = useRouter();
  const { searchPath, wordPath } = useAppRoutes();

  let activeResolveToken = 0;
  let pendingResolveController: AbortController | null = null;

  const clearPendingResolve = () => {
    if (!pendingResolveController) return;
    pendingResolveController.abort();
    pendingResolveController = null;
  };

  const navigateToSearchFallback = async (
    fallbackTarget: string,
    options: { hardReload?: boolean } = {},
  ) => {
    if (options.hardReload && process.client && typeof window !== "undefined") {
      window.location.assign(fallbackTarget);
      return;
    }

    await router.push(fallbackTarget);
  };

  const navigateFromSearchInput = async ({
    query,
    reverse = false,
    knownExactHeadword = false,
  }: NavigateFromSearchInputOptions): Promise<void> => {
    const normalizedQuery = normalizeSearchQuery(query);
    if (!normalizedQuery) return;

    const fallbackTarget = searchPath(normalizedQuery, reverse);

    if (reverse || isJyutpingQuery(normalizedQuery)) {
      clearPendingResolve();
      await router.push(fallbackTarget);
      return;
    }

    if (knownExactHeadword) {
      clearPendingResolve();
      await router.push(wordPath(normalizedQuery));
      return;
    }

    const resolveToken = ++activeResolveToken;
    clearPendingResolve();

    const controller = new AbortController();
    pendingResolveController = controller;

    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, RESOLVE_TIMEOUT_MS);

    try {
      const params = new URLSearchParams({
        q: normalizedQuery,
      });

      const response = await $fetch<SearchResolveResponse>(
        `/api/search/resolve?${params}`,
        {
          signal: controller.signal,
        },
      );

      if (resolveToken !== activeResolveToken) return;

      const canonicalHeadword = response.resolution?.canonicalHeadword?.trim();
      const target =
        response.success &&
        response.resolution?.type === "word" &&
        canonicalHeadword
          ? wordPath(canonicalHeadword)
          : fallbackTarget;

      await router.push(target);
    } catch (error) {
      if (resolveToken !== activeResolveToken) return;

      if (didTimeout) {
        await navigateToSearchFallback(fallbackTarget, { hardReload: true });
        return;
      }

      if (isAbortError(error)) {
        return;
      }

      await navigateToSearchFallback(fallbackTarget);
    } finally {
      clearTimeout(timeoutId);

      if (
        resolveToken === activeResolveToken &&
        pendingResolveController === controller
      ) {
        pendingResolveController = null;
      }
    }
  };

  onUnmounted(() => {
    clearPendingResolve();
  });

  return {
    navigateFromSearchInput,
  };
};
