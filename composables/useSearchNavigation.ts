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

// Cold Worker/OpenCC initialization can take a few seconds in production.
// Keep the timeout long enough for exact-match routing to win on the first
// request, while still falling back to the search page if the resolver hangs.
const RESOLVE_TIMEOUT_MS = 5000;

const getErrorName = (error: unknown): string => {
  if (error instanceof Error) return error.name;
  return String((error as { name?: string } | null)?.name || "");
};

const isTimeoutError = (error: unknown): boolean => {
  return getErrorName(error) === "TimeoutError";
};

const isAbortError = (error: unknown): boolean => {
  return getErrorName(error) === "AbortError";
};

const createDeadlineSignal = (
  controller: AbortController,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void; didTimeout: () => boolean } => {
  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.any === "function" &&
    typeof AbortSignal.timeout === "function"
  ) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    return {
      signal: AbortSignal.any([controller.signal, timeoutSignal]),
      cleanup: () => {},
      didTimeout: () => timeoutSignal.aborted,
    };
  }

  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
    didTimeout: () => timedOut,
  };
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
    if (
      options.hardReload &&
      import.meta.client &&
      typeof window !== "undefined"
    ) {
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
    const deadline = createDeadlineSignal(controller, RESOLVE_TIMEOUT_MS);

    try {
      const params = new URLSearchParams({
        q: normalizedQuery,
      });

      const response = await $fetch<SearchResolveResponse>(
        `/api/search/resolve?${params}`,
        {
          signal: deadline.signal,
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

      if (isTimeoutError(error) || deadline.didTimeout()) {
        await navigateToSearchFallback(fallbackTarget, { hardReload: true });
        return;
      }

      if (isAbortError(error)) {
        return;
      }

      await navigateToSearchFallback(fallbackTarget);
    } finally {
      deadline.cleanup();

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
