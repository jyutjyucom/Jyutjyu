import { getHeader, setHeader } from "h3";
import type { H3Event } from "h3";

import restrictedEntryIdsArtifact from "../assets/moderation/cn-restricted-entry-ids.json" with { type: "json" };
import restrictedTermsArtifact from "../assets/moderation/cn-restricted-terms.json" with { type: "json" };

interface RestrictedEntryIdsArtifact {
  entry_ids?: string[];
}

interface RestrictedTermsArtifact {
  terms?: string[];
}

const restrictedEntryIds = new Set<string>(
  ((restrictedEntryIdsArtifact as RestrictedEntryIdsArtifact).entry_ids || [])
    .map((id) => String(id || "").trim())
    .filter(Boolean),
);

const restrictedTerms = Array.from(
  new Set(
    ((restrictedTermsArtifact as RestrictedTermsArtifact).terms || [])
      .map((term) => String(term || "").trim().toLowerCase())
      .filter(Boolean),
  ),
).sort((a, b) => b.length - a.length);

const normalizeCountryCode = (value: unknown): string => {
  return String(value || "")
    .trim()
    .toUpperCase();
};

const normalizeQuery = (value: string): string => {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const isLatinTerm = (term: string): boolean => {
  return /^[a-z0-9][a-z0-9\s._:/?#[\]@!$&'()*+,;=%-]*$/i.test(term);
};

const containsLatinTerm = (query: string, term: string): boolean => {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(query);
};

export const getCountryCode = (event: H3Event): string => {
  const testCountry = normalizeCountryCode(
    process.env.NUXT_MODERATION_TEST_COUNTRY ||
      getHeader(event, "x-jyutjyu-test-country"),
  );
  if (testCountry) return testCountry;

  const cloudflareCountry = normalizeCountryCode(
    (event.context as any)?.cloudflare?.request?.cf?.country ||
      (event.context as any)?.cloudflare?.cf?.country ||
      (event.node.req as any)?.cf?.country,
  );
  if (cloudflareCountry) return cloudflareCountry;

  return normalizeCountryCode(getHeader(event, "cf-ipcountry"));
};

export const shouldApplyMainlandModeration = (event: H3Event): boolean => {
  return getCountryCode(event) === "CN";
};

export const getModerationMongoFilter = (
  event: H3Event,
): Record<string, unknown> => {
  if (!shouldApplyMainlandModeration(event)) return {};
  return {
    "moderation.restricted_regions": { $ne: "CN" },
  };
};

export const setModerationCacheHeaders = (event: H3Event) => {
  if (!shouldApplyMainlandModeration(event)) return;

  setHeader(event, "cache-control", "private, no-store");
  setHeader(event, "vary", "CF-IPCountry");
};

export const isRestrictedEntryId = (id: unknown): boolean => {
  return restrictedEntryIds.has(String(id || "").trim());
};

export const stripModerationMetadata = <T extends Record<string, any>>(
  entry: T,
): Omit<T, "moderation"> => {
  const { moderation: _moderation, ...cleanEntry } = entry || {};
  return cleanEntry;
};

export const filterRestrictedEntries = <T extends Record<string, any>>(
  event: H3Event,
  entries: T[],
): Array<Omit<T, "moderation">> => {
  const shouldFilter = shouldApplyMainlandModeration(event);
  const filtered = shouldFilter
    ? entries.filter((entry) => !isRestrictedEntryId(entry?.id))
    : entries;

  return filtered.map((entry) => stripModerationMetadata(entry));
};

export const queryTouchesRestrictedTerm = (query: string): boolean => {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) return false;

  return restrictedTerms.some((term) => {
    if (isLatinTerm(term)) {
      return containsLatinTerm(normalizedQuery, term);
    }
    return normalizedQuery.includes(term);
  });
};
