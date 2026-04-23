/**
 * 词头详情 API
 *
 * GET /api/word/:headword
 *   根据词头获取对应词条，并返回规范化后的 canonical 词头
 */

import type { WordResolveTrace } from "~/utils/headword-exact-match";

import { resolveWordEntries } from "../../utils/word-resolver";

const WORD_RESOLVE_WARN_TOTAL_MS = 200;
const WORD_RESOLVE_WARN_PHASE_MS = 100;

const createWordResolveTrace = (): WordResolveTrace => ({
  phaseMs: {},
  counts: {},
});

const hashWordQuery = (value: string): string => {
  const bytes = new TextEncoder().encode(String(value || ""));
  let hash = 0x811c9dc5;

  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
};

const getWordQuerySample = (headword: string): string => {
  const trimmed = String(headword || "").trim();
  return trimmed.length > 24 ? `${trimmed.slice(0, 24)}…` : trimmed;
};

const shouldLogSlowWordResolve = (trace: WordResolveTrace): boolean => {
  if ((trace.phaseMs["resolve.total"] || 0) > WORD_RESOLVE_WARN_TOTAL_MS) {
    return true;
  }

  return Object.values(trace.phaseMs).some(
    (duration) => duration > WORD_RESOLVE_WARN_PHASE_MS,
  );
};

const getWordResolveLogPayload = (
  headword: string,
  trace: WordResolveTrace,
  extra: Record<string, unknown> = {},
) => ({
  headwordHash: hashWordQuery(headword),
  headwordSample: getWordQuerySample(headword),
  strategy: trace.strategy,
  totalMs: trace.phaseMs["resolve.total"] || 0,
  phaseMs: trace.phaseMs,
  counts: Object.keys(trace.counts).length > 0 ? trace.counts : undefined,
  ...extra,
});

export default defineEventHandler(async (event) => {
  const headwordParam = getRouterParam(event, "headword");
  let headword = "";
  try {
    headword = decodeURIComponent(headwordParam || "").trim();
  } catch {
    headword = String(headwordParam || "").trim();
  }

  if (!headword) {
    setResponseStatus(event, 400);
    return {
      success: false,
      error: "请提供词头",
      canonical_headword: null,
      total: 0,
      entries: [],
    };
  }

  const trace = createWordResolveTrace();

  try {
    const resolved = await resolveWordEntries(headword, trace);

    if (!resolved || resolved.entries.length === 0) {
      if (shouldLogSlowWordResolve(trace)) {
        console.warn(
          "[word-api] slow",
          getWordResolveLogPayload(headword, trace, {
            status: 404,
            resultCount: 0,
          }),
        );
      }

      setResponseStatus(event, 404);
      return {
        success: false,
        error: "词条不存在",
        canonical_headword: null,
        total: 0,
        entries: [],
      };
    }

    if (shouldLogSlowWordResolve(trace)) {
      console.warn(
        "[word-api] slow",
        getWordResolveLogPayload(headword, trace, {
          status: 200,
          resultCount: resolved.entries.length,
          canonicalHeadword: resolved.canonicalHeadword,
        }),
      );
    }

    return {
      success: true,
      canonical_headword: resolved.canonicalHeadword,
      total: resolved.entries.length,
      entries: resolved.entries,
    };
  } catch (error: any) {
    console.error(
      "[word-api] failed",
      getWordResolveLogPayload(headword, trace, {
        error: error instanceof Error ? error.message : String(error || ""),
      }),
    );
    setResponseStatus(event, 500);

    return {
      success: false,
      error: error?.message || "服务暂时不可用",
      canonical_headword: null,
      total: 0,
      entries: [],
    };
  }
});
