export const DEFAULT_RANDOM_QUERY_TIMEOUT_MS = 1200;
export const WORKER_RANDOM_QUERY_TIMEOUT_MS = 1200;

export interface RandomEntriesResponse<T> {
  success: boolean;
  count: number;
  results: T[];
  error?: string;
}

interface ResolveRandomEntriesOptions<T> {
  count: number;
  event?: any;
  fallbackEntries: T[];
  fetchFromMongo: (count: number, timeoutMs: number) => Promise<T[]>;
  timeoutMsOverride?: number;
  onError?: (error: unknown) => void;
}

export class RandomQueryTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RandomQueryTimeoutError";
  }
}

export const isProductionWorkerRandomRuntime = (event?: any): boolean => {
  const isProduction =
    String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";

  return isProduction && Boolean(event?.context?.cloudflare);
};

export const getRandomQueryTimeoutMs = (event?: any): number => {
  return isProductionWorkerRandomRuntime(event)
    ? WORKER_RANDOM_QUERY_TIMEOUT_MS
    : DEFAULT_RANDOM_QUERY_TIMEOUT_MS;
};

export const pickRandomEntries = <T>(entries: T[], count: number): T[] => {
  if (entries.length <= count) {
    return [...entries];
  }

  const shuffled = [...entries];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  return shuffled.slice(0, count);
};

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new RandomQueryTimeoutError(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const resolveRandomEntries = async <T>({
  count,
  event,
  fallbackEntries,
  fetchFromMongo,
  timeoutMsOverride,
  onError,
}: ResolveRandomEntriesOptions<T>): Promise<RandomEntriesResponse<T>> => {
  const timeoutMs = timeoutMsOverride ?? getRandomQueryTimeoutMs(event);

  try {
    const results = await withTimeout(
      fetchFromMongo(count, timeoutMs),
      timeoutMs,
      `Random entry query timed out after ${timeoutMs}ms`,
    );

    return {
      success: true,
      count: results.length,
      results,
    };
  } catch (error) {
    onError?.(error);

    if (fallbackEntries.length > 0) {
      const results = pickRandomEntries(fallbackEntries, count);

      return {
        success: true,
        count: results.length,
        results,
      };
    }

    return {
      success: false,
      error: "推荐词条暂时不可用",
      count: 0,
      results: [],
    };
  }
};
