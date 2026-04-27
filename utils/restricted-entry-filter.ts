interface RestrictedEntryIdsArtifact {
  entry_ids?: unknown[];
}

const PUBLIC_RESTRICTED_ENTRY_IDS_PATH =
  "/moderation/cn-restricted-entry-ids.json";
const PUBLIC_MODERATION_STATUS_PATH = "/api/moderation/status";

let cachedRestrictedEntryIds: Set<string> | null = null;
let restrictedEntryIdsPromise: Promise<Set<string>> | null = null;
let cachedShouldApplyRestrictedEntryFilter: boolean | null = null;
let shouldApplyRestrictedEntryFilterPromise: Promise<boolean> | null = null;

interface PublicModerationStatus {
  applies?: boolean;
}

export const createRestrictedEntryIdSet = (
  ids: unknown[] | undefined,
): Set<string> => {
  return new Set(
    (ids || [])
      .map((id) => String(id || "").trim())
      .filter(Boolean),
  );
};

export const isRestrictedEntry = (
  entry: { id?: unknown } | null | undefined,
  restrictedEntryIds: Set<string>,
): boolean => {
  return restrictedEntryIds.has(String(entry?.id || "").trim());
};

export const filterRestrictedEntryIds = <T extends Record<string, any>>(
  entries: T[],
  restrictedEntryIds: Set<string>,
): T[] => {
  if (restrictedEntryIds.size === 0) {
    return entries;
  }
  return entries.filter(
    (entry) => !isRestrictedEntry(entry, restrictedEntryIds),
  );
};

export const loadPublicRestrictedEntryIds = async (): Promise<Set<string>> => {
  if (!process.client) {
    return new Set();
  }

  if (cachedRestrictedEntryIds) {
    return cachedRestrictedEntryIds;
  }

  if (restrictedEntryIdsPromise) {
    return restrictedEntryIdsPromise;
  }

  restrictedEntryIdsPromise = (async () => {
    try {
      const response = await fetch(PUBLIC_RESTRICTED_ENTRY_IDS_PATH);
      if (!response.ok) {
        cachedRestrictedEntryIds = new Set();
        return cachedRestrictedEntryIds;
      }

      const artifact = (await response.json()) as RestrictedEntryIdsArtifact;
      cachedRestrictedEntryIds = createRestrictedEntryIdSet(artifact.entry_ids);
      return cachedRestrictedEntryIds;
    } catch (error) {
      console.error("讀取公開受限詞條索引失敗:", error);
      cachedRestrictedEntryIds = new Set();
      return cachedRestrictedEntryIds;
    } finally {
      restrictedEntryIdsPromise = null;
    }
  })();

  return restrictedEntryIdsPromise;
};

export const loadShouldApplyPublicRestrictedEntryFilter =
  async (): Promise<boolean> => {
    if (!process.client) {
      return false;
    }

    if (cachedShouldApplyRestrictedEntryFilter !== null) {
      return cachedShouldApplyRestrictedEntryFilter;
    }

    if (shouldApplyRestrictedEntryFilterPromise) {
      return shouldApplyRestrictedEntryFilterPromise;
    }

    shouldApplyRestrictedEntryFilterPromise = (async () => {
      try {
        const response = await fetch(PUBLIC_MODERATION_STATUS_PATH);
        if (!response.ok) {
          cachedShouldApplyRestrictedEntryFilter = false;
          return cachedShouldApplyRestrictedEntryFilter;
        }

        const status = (await response.json()) as PublicModerationStatus;
        cachedShouldApplyRestrictedEntryFilter = status.applies === true;
        return cachedShouldApplyRestrictedEntryFilter;
      } catch (error) {
        console.error("讀取公開審核狀態失敗:", error);
        cachedShouldApplyRestrictedEntryFilter = false;
        return cachedShouldApplyRestrictedEntryFilter;
      } finally {
        shouldApplyRestrictedEntryFilterPromise = null;
      }
    })();

    return shouldApplyRestrictedEntryFilterPromise;
  };

export const loadPublicRestrictedEntryFilterIds =
  async (): Promise<Set<string>> => {
    if (!(await loadShouldApplyPublicRestrictedEntryFilter())) {
      return new Set();
    }

    return loadPublicRestrictedEntryIds();
  };
