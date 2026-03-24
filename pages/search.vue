<template>
  <div class="min-h-screen bg-parchment dark:bg-stone-950">
    <!-- Header with Search Bar -->
    <AppHeader
      v-model:search-query="searchQuery"
      v-model:reverse-search="enableReverseSearch"
      v-model:options-expanded="optionsExpanded"
      @search="handleSearch"
      @query-input="handleInput"
      @height-change="searchHeaderHeight = $event"
    >
      <template #search-popover>
        <div
          v-if="suggestions.length > 0 && showSuggestions"
          class="absolute top-full left-0 right-0 mt-1 bg-parchment dark:bg-stone-900 border border-outline-soft/20 dark:border-stone-800 shadow-lg max-h-60 overflow-y-auto z-20 font-cjk-content"
        >
          <button
            v-for="(suggestion, idx) in suggestions"
            :key="idx"
            class="w-full px-4 py-2 text-left hover:bg-surface-low dark:hover:bg-stone-800 transition-colors text-ink dark:text-stone-100"
            @click="selectSuggestion(suggestion)"
          >
            {{ suggestion }}
          </button>
        </div>
      </template>

      <template #mobile-extra>
        <template v-if="actualSearchQuery && allResults.length > 0">
          <SearchFilterControls
            :selected-dict="selectedDict"
            :selected-dialect="selectedDialect"
            :selected-type="selectedType"
            :show-dict-dropdown="showDictDropdown"
            :show-dialect-dropdown="showDialectDropdown"
            :show-type-dropdown="showTypeDropdown"
            :available-dicts="availableDicts"
            :available-dialects="availableDialects"
            :available-types="availableTypes"
            :get-dict-count="getDictCount"
            :get-dialect-count="getDialectCount"
            :get-type-count="getTypeCount"
            :get-dialect-label="getDialectLabel"
            :get-type-name="getTypeName"
            @toggle-dict="showDictDropdown = !showDictDropdown"
            @toggle-dialect="showDialectDropdown = !showDialectDropdown"
            @toggle-type="showTypeDropdown = !showTypeDropdown"
            @select-dict="selectDict"
            @select-dialect="selectDialect"
            @select-type="selectType"
          />
          <div class="flex flex-wrap items-center gap-3">
            <SearchSortSelect
              :sort-by="sortBy"
              :show-sort-dropdown="showSortDropdown"
              :get-sort-label="getSortLabel"
              @toggle-sort="showSortDropdown = !showSortDropdown"
              @select-sort="selectSort"
            />
            <SearchViewModeToggle
              v-if="displayedResults.length > 0"
              v-model="viewMode"
              :compact="true"
              :show-icons="false"
            />
          </div>
        </template>
      </template>

      <template #after>
        <div
          v-if="actualSearchQuery && allResults.length > 0"
          class="hidden lg:block border-t border-outline-soft/20 dark:border-stone-800 bg-surface-low/80 dark:bg-stone-900/80"
        >
          <div class="max-w-7xl mx-auto px-6 md:px-8 py-3">
            <div class="flex flex-nowrap items-center gap-3">
              <SearchFilterControls
                :selected-dict="selectedDict"
                :selected-dialect="selectedDialect"
                :selected-type="selectedType"
                :show-dict-dropdown="showDictDropdown"
                :show-dialect-dropdown="showDialectDropdown"
                :show-type-dropdown="showTypeDropdown"
                :available-dicts="availableDicts"
                :available-dialects="availableDialects"
                :available-types="availableTypes"
                :get-dict-count="getDictCount"
                :get-dialect-count="getDialectCount"
                :get-type-count="getTypeCount"
                :get-dialect-label="getDialectLabel"
                :get-type-name="getTypeName"
                @toggle-dict="showDictDropdown = !showDictDropdown"
                @toggle-dialect="showDialectDropdown = !showDialectDropdown"
                @toggle-type="showTypeDropdown = !showTypeDropdown"
                @select-dict="selectDict"
                @select-dialect="selectDialect"
                @select-type="selectType"
              />
              <div class="flex items-center gap-3 ml-auto shrink-0">
                <SearchSortSelect
                  :sort-by="sortBy"
                  :show-sort-dropdown="showSortDropdown"
                  :get-sort-label="getSortLabel"
                  dropdown-align="right"
                  @toggle-sort="showSortDropdown = !showSortDropdown"
                  @select-sort="selectSort"
                />
                <SearchViewModeToggle
                  v-if="displayedResults.length > 0"
                  v-model="viewMode"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </AppHeader>

    <!-- Main Content -->
    <main
      id="main-content"
      class="max-w-7xl mx-auto px-6 md:px-8 py-8 min-h-[60vh] font-cjk-ui"
    >
      <ClientOnly>
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-16">
          <div
            class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-kapok border-t-transparent"
          ></div>
          <p class="text-graphite dark:text-stone-400 mt-4">
            {{ t("common.searching") }}
          </p>
        </div>

        <!-- Results Info -->
        <div
          v-else-if="actualSearchQuery"
          class="mb-4 sm:mb-6 font-cjk-content"
        >
          <h2
            class="text-lg sm:text-2xl text-ink dark:text-parchment flex flex-wrap items-center gap-1.5 sm:gap-2"
          >
            <span
              class="inline-flex items-center p-1.5 sm:p-2 font-semibold bg-kapok/10 dark:bg-kapok/20 text-kapok leading-none text-base sm:text-2xl"
            >
              {{ actualSearchQuery }}
            </span>
            <span>
              {{ resultsHeaderLabel }}
              <span class="font-semibold">{{ totalCount }}</span>
              {{ t("common.remainingSuffix") }}
            </span>
          </h2>
        </div>

        <!-- No Results -->
        <div
          v-if="
            !loading &&
            isSearchComplete &&
            actualSearchQuery &&
            allResults.length === 0
          "
          class="text-center py-16"
        >
          <h3 class="text-2xl font-semibold text-ink dark:text-parchment mb-2">
            {{ t("common.noResultsTitle") }}
          </h3>
          <p class="text-graphite dark:text-stone-400 mb-6">
            {{ t("common.noResultsDescription") }}
          </p>
          <div class="text-sm text-graphite/60 dark:text-stone-200">
            <p class="font-semibold mb-2">
              {{ t("common.noResultsTipsTitle") }}
            </p>
            <ul class="space-y-1">
              <li>• {{ t("common.noResultsTip1") }}</li>
              <li>• {{ t("common.noResultsTip2") }}</li>
              <li>• {{ t("common.noResultsTip3") }}</li>
              <li>• {{ t("common.noResultsTip4") }}</li>
            </ul>
          </div>
        </div>

        <!-- Results -->
        <div
          v-else-if="!loading && displayedResults.length > 0"
          class="space-y-4 font-cjk-content"
        >
          <!-- 卡片视图 -->
          <div v-if="viewMode === 'card'" class="space-y-4">
            <!-- 完全匹配的结果（仅文字搜索时显示） -->
            <template
              v-if="
                isTextSearch && displayedGroupedResults.exactMatches.length > 0
              "
            >
              <div
                class="mb-4 sm:mb-6 p-2 sm:p-3 border-l-4 bg-archive-green/10 dark:bg-archive-green/20 border-archive-green dark:border-archive-green/50 flex items-center gap-2"
              >
                <svg
                  class="w-3.5 sm:w-4 h-3.5 sm:h-4 text-archive-green dark:text-archive-green-light shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span
                  class="text-archive-green dark:text-archive-green-light text-xs sm:text-sm font-semibold"
                >
                  {{ t("common.exactMatchLabel") }}
                  {{ groupedResults.exactMatches.length }}
                  {{ t("common.remainingSuffix") }} ，{{
                    t("dictCard.collectedBy", {
                      count: exactMatchDictionaryCount,
                    })
                  }}
                </span>
              </div>
              <div class="space-y-4">
                <DictCardGroup
                  v-for="group in displayedGroupedResults.exactMatches"
                  :key="group.key"
                  :entries="group.entries"
                  :sticky-header="true"
                  :sticky-offset="searchHeaderHeight"
                  :card-clickable="true"
                />
              </div>
            </template>

            <!-- 其他相关结果 -->
            <template v-if="displayedGroupedResults.otherResults.length > 0">
              <div
                class="mb-4 sm:mb-6 p-2 sm:p-3 border-l-4 bg-muted-gold/10 dark:bg-amber-900/30 border-muted-gold dark:border-amber-500/50 flex items-center gap-2"
                :class="{
                  'mt-8 sm:mt-12':
                    isTextSearch &&
                    displayedGroupedResults.exactMatches.length > 0,
                }"
              >
                <svg
                  class="w-3.5 sm:w-4 h-3.5 sm:h-4 text-muted-gold dark:text-amber-300 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span
                  v-if="isTextSearch && sortBy === 'relevance'"
                  class="text-muted-gold dark:text-amber-300 text-xs sm:text-sm font-semibold"
                >
                  {{ t("common.otherResultsLabel") }}
                  {{ groupedResults.otherResults.length }}
                  {{ t("common.remainingSuffix") }}，{{
                    t("dictCard.collectedBy", {
                      count: otherResultsDictionaryCount,
                    })
                  }}
                </span>
                <span
                  v-else
                  class="text-muted-gold dark:text-amber-300 text-xs sm:text-sm font-semibold"
                >
                  {{ t("common.searchHeader") }}
                  {{ groupedResults.otherResults.length }}
                  {{ t("common.remainingSuffix") }}，{{
                    t("dictCard.collectedBy", {
                      count: otherResultsDictionaryCount,
                    })
                  }}
                </span>
              </div>
              <div class="space-y-4">
                <DictCardGroup
                  v-for="group in displayedGroupedResults.otherResults"
                  :key="group.key"
                  :entries="group.entries"
                  :sticky-header="true"
                  :sticky-offset="searchHeaderHeight"
                  :card-clickable="true"
                />
              </div>
            </template>

            <!-- 加载更多按钮 -->
            <div v-if="hasMore" class="flex justify-center py-8">
              <button
                class="px-6 py-3 bg-kapok text-white hover:bg-kapok/90 transition-colors disabled:bg-graphite/30 disabled:cursor-not-allowed"
                :disabled="loadingMore"
                @click="loadMore"
              >
                <span v-if="loadingMore">{{ t("common.loadingMore") }}</span>
                <span v-else
                  >{{ t("common.loadMore") }} ({{
                    totalCount - displayedResults.length
                  }}
                  {{ t("common.remainingSuffix") }})</span
                >
              </button>
            </div>
          </div>

          <!-- 列表视图（简洁） -->
          <div v-else>
            <SearchResultsListView
              :is-text-search="isTextSearch"
              :sort-by="sortBy"
              :displayed-grouped-results="displayedGroupedResults"
              :grouped-results="groupedResults"
              :get-group-jyutping="getGroupJyutping"
              :get-group-definitions="getGroupDefinitions"
              :get-group-sources="getGroupSources"
            />
            <!-- 加载更多按钮 -->
            <div v-if="hasMore" class="flex justify-center py-8">
              <button
                class="px-6 py-3 bg-kapok text-white hover:bg-kapok/90 transition-colors disabled:bg-graphite/30 disabled:cursor-not-allowed"
                :disabled="loadingMore"
                @click="loadMore"
              >
                <span v-if="loadingMore">{{ t("common.loadingMore") }}</span>
                <span v-else
                  >{{ t("common.loadMore") }} ({{
                    totalCount - displayedResults.length
                  }}
                  {{ t("common.remainingSuffix") }})</span
                >
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!loading" class="text-center py-16">
          <h3 class="text-2xl font-semibold text-ink dark:text-parchment mb-2">
            {{ t("common.startSearchTitle") }}
          </h3>
          <p class="text-graphite dark:text-stone-400 mb-6">
            {{ t("common.startSearchDescription") }}
          </p>
          <!-- 示例搜索 -->
          <div class="flex flex-wrap gap-2 justify-center">
            <span class="text-sm text-graphite/60 dark:text-stone-200">{{
              t("common.exampleSearchPrefix")
            }}</span>
            <button
              v-for="example in exampleSearches"
              :key="example"
              class="px-3 py-1 text-sm bg-surface-low dark:bg-stone-800 hover:bg-archive-green/10 hover:text-archive-green dark:hover:bg-archive-green/20 dark:hover:text-archive-green text-graphite dark:text-stone-400 rounded-full transition-colors"
              @click="searchExample(example)"
            >
              {{ example }}
            </button>
          </div>
        </div>
        <template #fallback>
          <div class="text-center py-16">
            <div
              class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-kapok border-t-transparent"
            ></div>
            <p class="text-graphite dark:text-stone-400 mt-4">
              {{ t("common.loading") }}
            </p>
          </div>
        </template>
      </ClientOnly>
    </main>

    <SiteFooter variant="search" />
  </div>
</template>

<script setup lang="ts">
import type { DictionaryEntry } from "~/types/dictionary";
import { hasDialectI18n } from "~/constants/dialect";
import { isJyutpingQuery } from "~/utils/query-classify";

interface AggregatedEntry {
  key: string;
  primary: DictionaryEntry;
  entries: DictionaryEntry[];
}

const route = useRoute();
const router = useRouter();
const { searchBasic, getSuggestions, getMode } = useSearch();
const { navigateFromSearchInput } = useSearchNavigation();
const { t, locale } = useI18n();
const { getAllVariants, ensureInitialized } = useChineseConverter();
const warmContentFonts = useWarmContentFonts();
const { searchPath } = useAppRoutes();

// 开发时显示当前模式
if (process.dev) {
  console.log(`🔍 搜索模式: ${getMode()}`);
}

// 状态
const searchQuery = ref((route.query.q as string) || ""); // 输入框中的查询词
const actualSearchQuery = ref((route.query.q as string) || ""); // 实际已搜索的查询词
const allResults = ref<DictionaryEntry[]>([]); // 所有搜索结果
const displayedResults = ref<AggregatedEntry[]>([]); // 当前显示的结果（聚合后）
const loading = ref(false);
const loadingMore = ref(false);
const suggestions = ref<string[]>([]);
const showSuggestions = ref(false);
// 使用全局状态在路由切换之间保留视图模式（卡片 / 列表）
const viewMode = useState<"card" | "list">("search-view-mode", () => "card");
const enableReverseSearch = ref(route.query.reverse === "1"); // 从 URL 读取反查状态
const isSearchComplete = ref(true); // 搜索是否完成（流式搜索中用）

// 筛选相关状态
const selectedDict = ref<string | null>(null); // 选中的词典
const selectedDialect = ref<string | null>(null); // 选中的方言点
const selectedType = ref<string | null>(null); // 选中的类型 (character|word|phrase)
const sortBy = ref<"relevance" | "jyutping" | "headword" | "dictionary">(
  "relevance",
); // 排序方式
const showDictDropdown = ref(false); // 词典下拉菜单显示状态
const showDialectDropdown = ref(false); // 方言下拉菜单显示状态
const showTypeDropdown = ref(false); // 类型下拉菜单显示状态
const showSortDropdown = ref(false); // 排序下拉菜单显示状态
const optionsExpanded = ref(false); // 移动端：选项面板（反查/语言/筛选/排序/视图）是否展开
const searchHeaderHeight = ref(0);
const chineseConverterReady = ref(false);

let chineseConverterInitPromise: Promise<void> | null = null;
let chineseConverterWarmupTimeout: ReturnType<typeof setTimeout> | null = null;

const ensureChineseConverterReady = async () => {
  if (chineseConverterReady.value) {
    return;
  }

  if (!chineseConverterInitPromise) {
    chineseConverterInitPromise = ensureInitialized()
      .then(() => {
        chineseConverterReady.value = true;
      })
      .finally(() => {
        chineseConverterInitPromise = null;
      });
  }

  await chineseConverterInitPromise;
};

const scheduleChineseConverterWarmup = () => {
  if (
    !process.client ||
    chineseConverterReady.value ||
    chineseConverterInitPromise ||
    chineseConverterWarmupTimeout
  ) {
    return;
  }

  chineseConverterWarmupTimeout = setTimeout(() => {
    chineseConverterWarmupTimeout = null;
    void ensureChineseConverterReady();
  }, 0);
};

// 分页配置
const PAGE_SIZE = 10; // 每页显示10条
const currentPage = ref(1);

// 示例搜索
const exampleSearches = ["我哋", "你哋", "佢", "dei6", "ngo5 dei6"];

// 筛选函数
const selectDict = (dict: string | null) => {
  selectedDict.value = dict;
  showDictDropdown.value = false;
  currentPage.value = 1;
  updateDisplayedResults();
};

const selectDialect = (dialect: string | null) => {
  selectedDialect.value = dialect;
  showDialectDropdown.value = false;
  currentPage.value = 1;
  updateDisplayedResults();
};

const selectType = (type: string | null) => {
  selectedType.value = type;
  showTypeDropdown.value = false;
  currentPage.value = 1;
  updateDisplayedResults();
};

const selectSort = (
  sort: "relevance" | "jyutping" | "headword" | "dictionary",
) => {
  sortBy.value = sort;
  showSortDropdown.value = false;
  currentPage.value = 1;
  updateDisplayedResults();
};

// 聚合：将相同词头（display + normalized）的结果合并展示
const getAggregationKey = (entry: DictionaryEntry): string => {
  const headwordDisplay = entry.headword.display?.trim() || "";
  const headwordNormalized = entry.headword.normalized?.trim() || "";
  const jyutpingKey = getEntryJyutpingKey(entry);
  return [headwordDisplay, headwordNormalized, jyutpingKey].join("||");
};

const getEntryJyutpingKey = (entry: DictionaryEntry): string => {
  const seen = new Set<string>();
  const result: string[] = [];
  const jps = entry.phonetic?.jyutping || [];
  jps.forEach((jp) => {
    const value = jp?.trim();
    if (!value) return;
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  });
  return result.join("; ");
};

const aggregateEntries = (entries: DictionaryEntry[]): AggregatedEntry[] => {
  const keyInfo = new Map<string, DictionaryEntry[]>();

  for (const entry of entries) {
    const key = getAggregationKey(entry);
    const list = keyInfo.get(key) || [];
    list.push(entry);
    keyInfo.set(key, list);
  }

  const results: AggregatedEntry[] = [];
  const seenKeys = new Set<string>();

  for (const entry of entries) {
    const key = getAggregationKey(entry);
    const grouped = keyInfo.get(key);
    if (!grouped || grouped.length === 0) continue;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      const primaryEntry = grouped[0];
      if (primaryEntry) {
        results.push({
          key,
          primary: primaryEntry,
          entries: grouped,
        });
      }
    }
  }

  return results;
};

const getGroupSources = (group: AggregatedEntry): string[] => {
  const sources = new Set<string>();
  group.entries.forEach((entry) => {
    if (entry.source_book) sources.add(entry.source_book);
  });
  return Array.from(sources);
};

const getGroupJyutping = (group: AggregatedEntry): string => {
  const seen = new Set<string>();
  const result: string[] = [];
  group.entries.forEach((entry) => {
    const jps = entry.phonetic?.jyutping || [];
    jps.forEach((jp) => {
      const value = jp?.trim();
      if (!value) return;
      if (!seen.has(value)) {
        seen.add(value);
        result.push(value);
      }
    });
  });
  return result.join("; ");
};

const getGroupDefinitions = (group: AggregatedEntry): string => {
  const seen = new Set<string>();
  const result: string[] = [];
  group.entries.forEach((entry) => {
    const senses = entry.senses || [];
    senses.forEach((sense) => {
      const value = sense?.definition?.trim();
      if (!value) return;
      if (!seen.has(value)) {
        seen.add(value);
        result.push(value);
      }
    });
  });
  return result.join("; ");
};

// 更新显示结果（基于筛选）
const updateDisplayedResults = () => {
  // 保持 displayedResults 用于兼容性，但实际显示使用 displayedGroupedResults
  const { exactMatches, otherResults } = displayedGroupedResults.value;
  displayedResults.value = [...exactMatches, ...otherResults];
};

// 计算属性：从搜索结果中提取可用的词典和方言点
const availableDicts = computed(() => {
  const dicts = new Set<string>();
  allResults.value.forEach((entry) => {
    if (entry.source_book) dicts.add(entry.source_book);
  });
  return Array.from(dicts).sort();
});

const availableDialects = computed(() => {
  const dialects = new Set<string>();
  allResults.value.forEach((entry) => {
    const code = entry.dialect?.region_code?.toUpperCase();
    if (code) dialects.add(code);
  });
  // 优先固定顺序，剩余按字母排序
  const preferredOrder = ["YUE", "HK", "GZ"];
  return Array.from(dialects).sort((a, b) => {
    const ai = preferredOrder.indexOf(a);
    const bi = preferredOrder.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    }
    return a.localeCompare(b);
  });
});

// 方言显示名：使用地区代码映射（便于 i18n）
const getDialectLabel = (code: string) => {
  const normalized = code?.toUpperCase();
  if (hasDialectI18n(normalized)) {
    return t(`dictCard.dialect.${normalized}`);
  }
  return normalized || code;
};

const availableTypes = computed(() => {
  const types = new Set<string>();
  allResults.value.forEach((entry) => {
    if (entry.entry_type) types.add(entry.entry_type);
  });
  return Array.from(types).sort((a, b) => {
    // 排序: 字, 词, 短语
    const order = { character: 1, word: 2, phrase: 3 } as Record<
      string,
      number
    >;
    return (order[a] || 9) - (order[b] || 9);
  });
});

const getTypeName = (type: string) => {
  switch (type) {
    case "character":
      return t("common.entryTypeCharacter");
    case "word":
      return t("common.entryTypeWord");
    case "phrase":
      return t("common.entryTypePhrase");
    default:
      return type;
  }
};

const getSortLabel = (sort: string) => {
  switch (sort) {
    case "relevance":
      return t("common.sortByRelevance");
    case "jyutping":
      return t("common.sortByJyutping");
    case "headword":
      return t("common.sortByHeadword");
    case "dictionary":
      return t("common.sortByDictionary");
    default:
      return sort;
  }
};

// 筛选后的原始结果（未聚合）
const filteredEntries = computed(() => {
  let results = allResults.value;
  if (selectedDict.value) {
    results = results.filter((e) => e.source_book === selectedDict.value);
  }
  if (selectedDialect.value) {
    results = results.filter(
      (e) => e.dialect?.region_code?.toUpperCase() === selectedDialect.value,
    );
  }
  if (selectedType.value) {
    results = results.filter((e) => e.entry_type === selectedType.value);
  }
  return results;
});

// 排序后的原始结果
const sortedEntries = computed(() => {
  const results = [...filteredEntries.value];

  if (sortBy.value === "relevance") {
    // 保持原样 (allResults 已经是按相关度排序的)
    return results;
  }

  return results.sort((a, b) => {
    switch (sortBy.value) {
      case "jyutping": {
        const ja = a.phonetic.jyutping[0] || "";
        const jb = b.phonetic.jyutping[0] || "";
        return ja.localeCompare(jb);
      }
      case "headword": {
        const ha = a.headword.normalized || a.headword.display || "";
        const hb = b.headword.normalized || b.headword.display || "";
        return ha.localeCompare(hb, locale.value || undefined);
      }
      case "dictionary": {
        const da = a.source_book || "";
        const db = b.source_book || "";
        return da.localeCompare(db, locale.value || undefined);
      }
      default:
        return 0;
    }
  });
});

// 聚合后的结果（用于展示）
const aggregatedResults = computed(() => aggregateEntries(sortedEntries.value));

const resultsHeaderLabel = computed(() => {
  const label = enableReverseSearch.value
    ? t("common.reverseSearchResultsPrefix")
    : t("common.searchHeader");
  return label.replace(/[：:]\s*$/, "");
});

// 检查词条是否与查询词完全匹配（仅文字搜索时，支持简繁转换）
const isExactMatch = (entry: DictionaryEntry, query: string): boolean => {
  if (enableReverseSearch.value) {
    return false; // 反查时不进行完全匹配判断
  }
  const queryTrimmed = query.trim();
  if (!queryTrimmed) return false;

  const queryLower = queryTrimmed.toLowerCase();
  const displayLower = (entry.headword.display || "").toLowerCase();
  const normalizedLower = (entry.headword.normalized || "").toLowerCase();

  if (!chineseConverterReady.value) {
    return displayLower === queryLower || normalizedLower === queryLower;
  }

  try {
    // 获取查询词的所有变体（原文、简体、繁体），并转换为小写
    const queryVariants = getAllVariants(queryTrimmed).map((v) =>
      v.toLowerCase(),
    );

    // 获取词头的所有变体（原文、简体、繁体），并转换为小写
    const displayVariants = getAllVariants(entry.headword.display || "").map(
      (v) => v.toLowerCase(),
    );
    const normalizedVariants = getAllVariants(
      entry.headword.normalized || "",
    ).map((v) => v.toLowerCase());

    // 合并所有词头变体
    const allHeadwordVariants = new Set([
      ...displayVariants,
      ...normalizedVariants,
    ]);

    // 检查是否有任何查询变体与词头变体完全匹配
    return queryVariants.some((qv) => allHeadwordVariants.has(qv));
  } catch (error) {
    // 如果转换失败，回退到直接匹配
    console.warn("簡繁轉換失敗，改用直接比對:", error);
    return displayLower === queryLower || normalizedLower === queryLower;
  }
};

// 判断是否是文字搜索（非反查且非粤拼）
const isTextSearch = computed(() => {
  if (!actualSearchQuery.value) return false;
  return (
    !enableReverseSearch.value && !isJyutpingQuery(actualSearchQuery.value)
  );
});

// 将结果分为完全匹配和其他结果（仅文字搜索时）
const groupedResults = computed(() => {
  // 反查、粤拼搜索、非默认排序或没有查询词时，不分组
  if (!isTextSearch.value || sortBy.value !== "relevance") {
    return {
      exactMatches: [] as AggregatedEntry[],
      otherResults: aggregatedResults.value,
    };
  }

  const exactMatches: AggregatedEntry[] = [];
  const otherResults: AggregatedEntry[] = [];

  // 按照后端返回的顺序遍历，保持顺序
  for (const group of aggregatedResults.value) {
    if (isExactMatch(group.primary, actualSearchQuery.value)) {
      exactMatches.push(group);
    } else {
      otherResults.push(group);
    }
  }

  return {
    exactMatches,
    otherResults,
  };
});

const exactMatchDictionaryCount = computed(() => {
  const sources = new Set<string>();
  groupedResults.value.exactMatches.forEach((group) => {
    group.entries.forEach((entry) => {
      const source = entry.source_book?.trim();
      if (source) sources.add(source);
    });
  });
  return sources.size;
});

const otherResultsDictionaryCount = computed(() => {
  const sources = new Set<string>();
  groupedResults.value.otherResults.forEach((group) => {
    group.entries.forEach((entry) => {
      const source = entry.source_book?.trim();
      if (source) sources.add(source);
    });
  });
  return sources.size;
});

// 用于显示的合并结果（完全匹配在前，其他结果在后）
const displayedGroupedResults = computed(() => {
  const { exactMatches, otherResults } = groupedResults.value;

  // 先显示所有完全匹配的结果
  const allExactDisplayed = exactMatches;

  // 计算当前页应该显示的其他结果数量
  const targetDisplayCount = currentPage.value * PAGE_SIZE;

  // 如果完全匹配的结果已经超过当前页限制，只显示部分完全匹配
  if (allExactDisplayed.length >= targetDisplayCount) {
    return {
      exactMatches: allExactDisplayed.slice(0, targetDisplayCount),
      otherResults: [] as AggregatedEntry[],
      hasMoreExact: allExactDisplayed.length > targetDisplayCount,
      hasMoreOther: otherResults.length > 0,
    };
  }

  // 否则显示所有完全匹配，再加上部分其他结果
  const remainingSlots = targetDisplayCount - allExactDisplayed.length;
  const otherDisplayed = otherResults.slice(0, remainingSlots);

  return {
    exactMatches: allExactDisplayed,
    otherResults: otherDisplayed,
    hasMoreExact: false,
    hasMoreOther: otherResults.length > otherDisplayed.length,
  };
});

watch(
  displayedGroupedResults,
  () => {
    updateDisplayedResults();
  },
  { immediate: true },
);

watch(
  [isTextSearch, allResults],
  ([isTextSearchNow, results]) => {
    if (isTextSearchNow && results.length > 0) {
      scheduleChineseConverterWarmup();
    }
  },
  { immediate: true },
);

// 计算各筛选项的数量
const getDictCount = (dict: string): number => {
  let results = allResults.value;
  if (selectedDialect.value) {
    results = results.filter(
      (e) => e.dialect?.region_code?.toUpperCase() === selectedDialect.value,
    );
  }
  return results.filter((e) => e.source_book === dict).length;
};

const getDialectCount = (dialect: string): number => {
  let results = allResults.value;
  if (selectedDict.value) {
    results = results.filter((e) => e.source_book === selectedDict.value);
  }
  if (selectedType.value) {
    results = results.filter((e) => e.entry_type === selectedType.value);
  }
  const code = dialect?.toUpperCase();
  return results.filter((e) => e.dialect?.region_code?.toUpperCase() === code)
    .length;
};

const getTypeCount = (type: string): number => {
  let results = allResults.value;
  if (selectedDict.value) {
    results = results.filter((e) => e.source_book === selectedDict.value);
  }
  if (selectedDialect.value) {
    results = results.filter(
      (e) => e.dialect?.region_code?.toUpperCase() === selectedDialect.value,
    );
  }
  return results.filter((e) => e.entry_type === type).length;
};

// 基于筛选结果的分页
const hasMore = computed(() => {
  const totalDisplayed =
    displayedGroupedResults.value.exactMatches.length +
    displayedGroupedResults.value.otherResults.length;
  return totalDisplayed < aggregatedResults.value.length;
});
const totalCount = computed(() => aggregatedResults.value.length);

// 执行搜索
const performSearch = async (query: string) => {
  if (!query || query.trim() === "") {
    allResults.value = [];
    displayedResults.value = [];
    actualSearchQuery.value = "";
    currentPage.value = 1;
    isSearchComplete.value = true;
    loading.value = false;
    return;
  }

  // 先设置加载状态和清空结果，避免显示旧结果
  loading.value = true;
  warmContentFonts();
  isSearchComplete.value = false;
  allResults.value = [];
  displayedResults.value = [];
  currentPage.value = 1;

  // 更新实际搜索的查询词
  actualSearchQuery.value = query.trim();

  // 重置筛选状态
  selectedDict.value = null;
  selectedDialect.value = null;
  selectedType.value = null;

  try {
    // 流式搜索：搜到什么先展示什么
    await searchBasic(query.trim(), {
      limit: 1000,
      searchDefinition: enableReverseSearch.value,
      onResults: (entries, complete) => {
        // 更新结果
        allResults.value = entries;
        // 重新计算显示的结果（保持当前页数，使用筛选后的结果）
        // 新搜索时筛选已重置，所以 filteredEntries 等于 allResults
        updateDisplayedResults();

        // 首次收到结果时关闭 loading
        if (loading.value && entries.length > 0) {
          loading.value = false;
        }

        // 更新搜索耗时
        if (complete) {
          isSearchComplete.value = true;
          loading.value = false;
        }
      },
    });
  } catch (error) {
    console.error("搜尋失敗:", error);
    allResults.value = [];
    displayedResults.value = [];
  } finally {
    loading.value = false;
    isSearchComplete.value = true;
  }
};

// 加载更多结果
const loadMore = () => {
  if (!hasMore.value || loadingMore.value) {
    return;
  }

  loadingMore.value = true;

  setTimeout(() => {
    currentPage.value++;
    updateDisplayedResults();
    loadingMore.value = false;
  }, 100); // 小延迟以显示加载状态
};

// 处理搜索
const handleSearch = () => {
  const query = searchQuery.value.trim();
  if (!query) return;

  showSuggestions.value = false;
  void navigateFromSearchInput({
    query,
    reverse: enableReverseSearch.value,
  });
};

// 输入时获取建议
let suggestionTimeout: NodeJS.Timeout | null = null;
let clickOutsideHandler: ((e: MouseEvent) => void) | null = null;
const handleInput = () => {
  if (suggestionTimeout) {
    clearTimeout(suggestionTimeout);
  }

  suggestionTimeout = setTimeout(async () => {
    if (searchQuery.value.length >= 1) {
      warmContentFonts();
      suggestions.value = await getSuggestions(searchQuery.value);
      showSuggestions.value = suggestions.value.length > 0;
    } else {
      suggestions.value = [];
      showSuggestions.value = false;
    }
  }, 300);
};

// 选择建议
const selectSuggestion = (suggestion: string) => {
  searchQuery.value = suggestion;
  showSuggestions.value = false;
  void navigateFromSearchInput({
    query: suggestion,
    reverse: enableReverseSearch.value,
    knownExactHeadword: !enableReverseSearch.value,
  });
};

// 示例搜索
const searchExample = (query: string) => {
  searchQuery.value = query;
  handleSearch();
};

// 监听 URL 变化（只在客户端执行搜索）
watch(
  () => [route.query.q, route.query.reverse],
  ([newQuery, newReverse]) => {
    searchQuery.value = (newQuery as string) || "";
    enableReverseSearch.value = newReverse === "1";
    // 只在客户端执行搜索
    if (process.client) {
      if (newQuery) {
        performSearch(newQuery as string);
      } else {
        allResults.value = [];
        displayedResults.value = [];
      }
    }
  },
  { immediate: true },
);

// 监听反查开关变化，更新 URL 并重新搜索
watch(enableReverseSearch, (newValue) => {
  if (process.client && actualSearchQuery.value) {
    router.replace(searchPath(actualSearchQuery.value, newValue));
  }
});

// 点击外部关闭建议和筛选下拉菜单
onMounted(async () => {
  clickOutsideHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".relative")) {
      showSuggestions.value = false;
      showDictDropdown.value = false;
      showDialectDropdown.value = false;
      showTypeDropdown.value = false;
      showSortDropdown.value = false;
    }
  };
  document.addEventListener("click", clickOutsideHandler);
});

onUnmounted(() => {
  if (clickOutsideHandler) {
    document.removeEventListener("click", clickOutsideHandler);
    clickOutsideHandler = null;
  }
  if (suggestionTimeout) {
    clearTimeout(suggestionTimeout);
    suggestionTimeout = null;
  }
  if (chineseConverterWarmupTimeout) {
    clearTimeout(chineseConverterWarmupTimeout);
    chineseConverterWarmupTimeout = null;
  }
});

useHead(() => {
  const pageTitle = actualSearchQuery.value
    ? `${actualSearchQuery.value} - ${t("common.searchHeader")} | ${t("common.siteName")}`
    : `${t("common.searchHeader")} | ${t("common.siteName")}`;
  const pageDescription = actualSearchQuery.value
    ? `${t("common.searchHeader")}：${actualSearchQuery.value}`
    : t("common.metaDescription");

  return {
    title: pageTitle,
    meta: [
      { name: "description", content: pageDescription },
      { property: "og:title", content: pageTitle },
      { property: "og:description", content: pageDescription },
      { name: "robots", content: "noindex, follow" },
    ],
  };
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
