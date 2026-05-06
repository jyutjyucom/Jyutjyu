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
          data-search-interactive
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
        <template v-if="hasSearchContext">
          <SearchFilterControls
            :selected-dict="selectedDict"
            :selected-dialect="selectedDialect"
            :selected-type="selectedType"
            :disabled="!actualSearchQuery"
            :loading="loading || loadingMore"
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
            @toggle-dict="toggleDropdown('dict')"
            @toggle-dialect="toggleDropdown('dialect')"
            @toggle-type="toggleDropdown('type')"
            @select-dict="selectDict"
            @select-dialect="selectDialect"
            @select-type="selectType"
          />
          <div class="flex flex-wrap items-center gap-3">
            <SearchSortSelect
              :sort-by="sortBy"
              :disabled="!actualSearchQuery"
              :show-sort-dropdown="showSortDropdown"
              :get-sort-label="getSortLabel"
              @toggle-sort="toggleDropdown('sort')"
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
          v-if="hasSearchContext"
          class="hidden lg:block border-t border-outline-soft/20 dark:border-stone-800 bg-surface-low/80 dark:bg-stone-900/80"
        >
          <div class="max-w-7xl mx-auto px-6 md:px-8 py-3">
            <div class="flex flex-nowrap items-center gap-3">
              <SearchFilterControls
                :selected-dict="selectedDict"
                :selected-dialect="selectedDialect"
                :selected-type="selectedType"
                :disabled="!actualSearchQuery"
                :loading="loading || loadingMore"
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
                @toggle-dict="toggleDropdown('dict')"
                @toggle-dialect="toggleDropdown('dialect')"
                @toggle-type="toggleDropdown('type')"
                @select-dict="selectDict"
                @select-dialect="selectDialect"
                @select-type="selectType"
              />
              <div class="flex items-center gap-3 ml-auto shrink-0">
                <SearchSortSelect
                  :sort-by="sortBy"
                  :disabled="!actualSearchQuery"
                  :show-sort-dropdown="showSortDropdown"
                  :get-sort-label="getSortLabel"
                  dropdown-align="right"
                  @toggle-sort="toggleDropdown('sort')"
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
      class="max-w-7xl mx-auto px-6 md:px-8 py-6 md:py-8 min-h-[60vh] font-cjk-ui"
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
              <span class="font-semibold">{{ totalCountLabel }}</span>
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
            filteredTotalCount === 0
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
                class="mb-6 p-3 border-l-4 bg-archive-green/10 dark:bg-archive-green/20 border-archive-green dark:border-archive-green/50 flex items-center gap-2"
              >
                <svg
                  class="w-4 h-4 text-archive-green dark:text-archive-green-light shrink-0"
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
                  class="text-archive-green dark:text-archive-green-light text-sm font-semibold"
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
                class="mb-6 p-3 border-l-4 bg-muted-gold/10 dark:bg-amber-900/30 border-muted-gold dark:border-amber-500/50 flex items-center gap-2"
                :class="{
                  'mt-12':
                    isTextSearch &&
                    displayedGroupedResults.exactMatches.length > 0,
                }"
              >
                <svg
                  class="w-4 h-4 text-muted-gold dark:text-amber-300 shrink-0"
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
                  class="text-muted-gold dark:text-amber-300 text-sm font-semibold"
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
                  class="text-muted-gold dark:text-amber-300 text-sm font-semibold"
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
                <span v-else>{{ t("common.loadMore") }}</span>
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
              :get-group-pronunciation-items="getGroupPronunciationItems"
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
                <span v-else>{{ t("common.loadMore") }}</span>
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
import type { DictionaryEntry, EntryType } from "~/types/dictionary";
import { hasDialectI18n } from "~/constants/dialect";
import {
  aggregateSearchEntries,
  countSearchGroupFacets,
  createEmptySearchFacetCounts,
  flattenSearchGroups,
  SEARCH_LOCAL_RESULT_LIMIT,
  SEARCH_PAGE_SIZE,
  type AggregatedSearchEntry,
  type GroupedSearchResponse,
  type SearchFacetCounts,
  type SearchSortOption,
  type SearchTotalMeta,
} from "~/utils/search-result-groups";
import { isJyutpingQuery } from "~/utils/query-classify";
import { isSearchResultsViewQuery } from "~/utils/route-paths";
import { getAggregatePronunciationDisplayItems } from "~/utils/pronunciation-display";

const route = useRoute();
const router = useRouter();
const apiSearch = useDictionaryAPI();
const jsonSearch = useDictionary();
const { getSuggestions, getMode } = useSearch();
const { navigateFromSearchInput } = useSearchNavigation();
const { t } = useI18n();
const { getAllVariants, ensureInitialized } = useChineseConverter();
const warmContentFonts = useWarmContentFonts();
const { searchPath, wordPath } = useAppRoutes();

// 开发时显示当前模式
if (process.dev) {
  console.log(`🔍 搜索模式: ${getMode()}`);
}

// 状态
const searchQuery = ref((route.query.q as string) || ""); // 输入框中的查询词
const actualSearchQuery = useState<string>(
  "search-actual-query",
  () => (route.query.q as string) || "",
); // 实际已搜索的查询词
const searchGroups = useState<AggregatedSearchEntry[]>("search-groups", () => []);
const jsonResultGroups = useState<AggregatedSearchEntry[]>(
  "search-json-result-groups",
  () => [],
);
const displayedResults = useState<AggregatedSearchEntry[]>(
  "search-displayed-results",
  () => [],
);
const loading = ref(false);
const loadingMore = ref(false);
const suggestions = ref<string[]>([]);
const showSuggestions = ref(false);
const redirectingToExactMatch = ref(false);
const exactResultsReady = ref(false);
const searchTotal = useState<SearchTotalMeta>("search-total", () => ({
  grouped: 0,
  entries: 0,
  exact: true,
}));
const searchFacets = useState<SearchFacetCounts>("search-facets", () =>
  createEmptySearchFacetCounts(),
);
const nextSearchOffset = useState<number | null>(
  "search-next-offset",
  () => null,
);
// 使用全局状态在路由切换之间保留视图模式（卡片 / 列表）
const viewMode = useState<"card" | "list">("search-view-mode", () => "card");
const enableReverseSearch = useState<boolean>(
  "search-reverse-enabled",
  () => route.query.reverse === "1",
); // 从 URL 读取反查状态
const isSearchComplete = useState<boolean>("search-complete", () => true); // 搜索是否完成（流式搜索中用）
const allResults = computed(() => flattenSearchGroups(searchGroups.value));
const hasSearchContext = computed(() =>
  Boolean(actualSearchQuery.value) &&
  (allResults.value.length > 0 || loading.value || loadingMore.value),
);

// 筛选相关状态
const selectedDict = useState<string | null>("search-selected-dict", () => null); // 选中的词典
const selectedDialect = useState<string | null>(
  "search-selected-dialect",
  () => null,
); // 选中的方言点
const selectedType = useState<string | null>("search-selected-type", () => null); // 选中的类型 (character|word|phrase)
const sortBy = useState<SearchSortOption>("search-sort-by", () => "relevance"); // 排序方式
const showDictDropdown = ref(false); // 词典下拉菜单显示状态
const showDialectDropdown = ref(false); // 方言下拉菜单显示状态
const showTypeDropdown = ref(false); // 类型下拉菜单显示状态
const showSortDropdown = ref(false); // 排序下拉菜单显示状态
const optionsExpanded = ref(true); // 移动端：选项面板（反查/语言/筛选/排序/视图）是否展开
const searchHeaderHeight = ref(0);
const chineseConverterReady = ref(false);

// Dropdown toggle helper - 关闭其他dropdown再打开指定的
const toggleDropdown = (dropdown: 'dict' | 'dialect' | 'type' | 'sort') => {
  const wasOpen =
    dropdown === 'dict'
      ? showDictDropdown.value
      : dropdown === 'dialect'
        ? showDialectDropdown.value
        : dropdown === 'type'
          ? showTypeDropdown.value
          : showSortDropdown.value;

  showDictDropdown.value = false;
  showDialectDropdown.value = false;
  showTypeDropdown.value = false;
  showSortDropdown.value = false;

  if (wasOpen) return;

  if (dropdown === 'dict') showDictDropdown.value = true;
  if (dropdown === 'dialect') showDialectDropdown.value = true;
  if (dropdown === 'type') showTypeDropdown.value = true;
  if (dropdown === 'sort') showSortDropdown.value = true;
};
const showingSearchResultsView = computed(() =>
  isSearchResultsViewQuery(route.query),
);

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
const PAGE_SIZE = SEARCH_PAGE_SIZE;
const currentPage = ref(1);
let activeSearchRequestId = 0;

// 示例搜索
const exampleSearches = ["我哋", "你哋", "佢", "dei6", "ngo5 dei6"];

// 筛选函数
const selectDict = (dict: string | null) => {
  // 如果值未改变，只关闭dropdown
  if (selectedDict.value === dict) {
    showDictDropdown.value = false;
    return;
  }

  selectedDict.value = dict;
  showDictDropdown.value = false;
  currentPage.value = 1;

  // API模式下触发重新搜索（带筛选参数），让后端在完整数据集筛选
  if (getMode() === 'mongodb' && actualSearchQuery.value) {
    void performSearch(actualSearchQuery.value, { resetFilters: false });
  }
};

const selectDialect = (dialect: string | null) => {
  // 如果值未改变，只关闭dropdown
  if (selectedDialect.value === dialect) {
    showDialectDropdown.value = false;
    return;
  }

  selectedDialect.value = dialect;
  showDialectDropdown.value = false;
  currentPage.value = 1;

  // API模式下触发重新搜索（带筛选参数），让后端在完整数据集筛选
  if (getMode() === 'mongodb' && actualSearchQuery.value) {
    void performSearch(actualSearchQuery.value, { resetFilters: false });
  }
};

const selectType = (type: string | null) => {
  // 如果值未改变，只关闭dropdown
  if (selectedType.value === type) {
    showTypeDropdown.value = false;
    return;
  }

  selectedType.value = type;
  showTypeDropdown.value = false;
  currentPage.value = 1;

  // API模式下触发重新搜索（带筛选参数），让后端在完整数据集筛选
  if (getMode() === 'mongodb' && actualSearchQuery.value) {
    void performSearch(actualSearchQuery.value, { resetFilters: false });
  }
};

const getSelectedEntryType = (): EntryType | undefined => {
  const type = selectedType.value;
  return type === "character" || type === "word" || type === "phrase"
    ? type
    : undefined;
};

const selectSort = (sort: SearchSortOption) => {
  sortBy.value = sort;
  showSortDropdown.value = false;
  currentPage.value = 1;
};

const getGroupSources = (group: AggregatedSearchEntry): string[] => {
  const sources = new Set<string>();
  group.entries.forEach((entry) => {
    if (entry.source_book) sources.add(entry.source_book);
  });
  return Array.from(sources);
};

const getGroupPronunciationItems = (group: AggregatedSearchEntry) => {
  return getAggregatePronunciationDisplayItems(group.entries);
};

const getGroupDefinitions = (group: AggregatedSearchEntry): string => {
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
  return searchFacets.value.dictionaries.map((bucket) => bucket.value);
});

const availableDialects = computed(() => {
  const dialects = searchFacets.value.dialects.map((bucket) =>
    bucket.value.toUpperCase(),
  );
  // 优先固定顺序，剩余按字母排序
  const preferredOrder = ["YUE", "HK", "GZ"];
  return Array.from(new Set(dialects)).sort((a, b) => {
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
  const types = searchFacets.value.types.map((bucket) => bucket.value);
  return Array.from(new Set(types)).sort((a, b) => {
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

// API 已返回分组和排序后的结果；JSON 应急模式也会预先聚合。
const aggregatedResults = computed(() => searchGroups.value);

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
      exactMatches: [] as AggregatedSearchEntry[],
      otherResults: aggregatedResults.value,
    };
  }

  const exactMatches: AggregatedSearchEntry[] = [];
  const otherResults: AggregatedSearchEntry[] = [];

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

// 前端筛选后的结果（基于groupedResults）
const filteredGroups = computed(() => {
  // 获取原始分组结果
  const { exactMatches, otherResults } = groupedResults.value

  // 筛选exact matches
  let filteredExact = selectedDict.value || selectedDialect.value || selectedType.value
    ? exactMatches.filter(group => {
        // 篮选词典
        if (selectedDict.value) {
          const hasDict = group.entries.some(entry => entry.source_book === selectedDict.value)
          if (!hasDict) return false
        }

        // 篮选方言
        if (selectedDialect.value) {
          const hasDialect = group.entries.some(entry =>
            entry.dialect?.region_code?.toUpperCase() === selectedDialect.value?.toUpperCase()
          )
          if (!hasDialect) return false
        }

        // 篮选类型
        if (selectedType.value) {
          const selectedEntryType = getSelectedEntryType()
          if (selectedEntryType) {
            const hasType = group.primary.entry_type === selectedEntryType
            if (!hasType) return false
          }
        }

        return true
      })
    : exactMatches

  // 篮选other results
  let filteredOther = selectedDict.value || selectedDialect.value || selectedType.value
    ? otherResults.filter(group => {
        // 篮选词典
        if (selectedDict.value) {
          const hasDict = group.entries.some(entry => entry.source_book === selectedDict.value)
          if (!hasDict) return false
        }

        // 篮选方言
        if (selectedDialect.value) {
          const hasDialect = group.entries.some(entry =>
            entry.dialect?.region_code?.toUpperCase() === selectedDialect.value?.toUpperCase()
          )
          if (!hasDialect) return false
        }

        // 篮选类型
        if (selectedType.value) {
          const selectedEntryType = getSelectedEntryType()
          if (selectedEntryType) {
            const hasType = group.primary.entry_type === selectedEntryType
            if (!hasType) return false
          }
        }

        return true
      })
    : otherResults

  // 应用排序（非relevance时）- 复制数组后再排序，避免直接修改
  if (sortBy.value === 'headword') {
    filteredExact = [...filteredExact].sort((a, b) =>
      (a.primary.headword.display || '').localeCompare(b.primary.headword.display || '')
    )
    filteredOther = [...filteredOther].sort((a, b) =>
      (a.primary.headword.display || '').localeCompare(b.primary.headword.display || '')
    )
  } else if (sortBy.value === 'jyutping') {
    filteredExact = [...filteredExact].sort((a, b) =>
      (a.primary.phonetic?.jyutping?.[0] || '').localeCompare(b.primary.phonetic?.jyutping?.[0] || '')
    )
    filteredOther = [...filteredOther].sort((a, b) =>
      (a.primary.phonetic?.jyutping?.[0] || '').localeCompare(b.primary.phonetic?.jyutping?.[0] || '')
    )
  } else if (sortBy.value === 'dictionary') {
    filteredExact = [...filteredExact].sort((a, b) =>
      (a.primary.source_book || '').localeCompare(b.primary.source_book || '')
    )
    filteredOther = [...filteredOther].sort((a, b) =>
      (a.primary.source_book || '').localeCompare(b.primary.source_book || '')
    )
  }

  return {
    exactMatches: filteredExact,
    otherResults: filteredOther,
  }
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
  const { exactMatches, otherResults } = filteredGroups.value;

  return {
    exactMatches,
    otherResults,
    hasMoreExact: false,
    hasMoreOther: nextSearchOffset.value !== null,
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
  return (
    searchFacets.value.dictionaries.find((bucket) => bucket.value === dict)
      ?.count || 0
  );
};

const getDialectCount = (dialect: string): number => {
  const code = dialect?.toUpperCase();
  return (
    searchFacets.value.dialects.find(
      (bucket) => bucket.value.toUpperCase() === code,
    )?.count || 0
  );
};

const getTypeCount = (type: string): number => {
  return (
    searchFacets.value.types.find((bucket) => bucket.value === type)?.count || 0
  );
};

// 基于筛选结果的分页
const hasMore = computed(() => {
  return nextSearchOffset.value !== null;
});

// 篮选后的结果总数
const filteredTotalCount = computed(() => {
  const { exactMatches, otherResults } = filteredGroups.value
  return exactMatches.length + otherResults.length
})

const totalCountLabel = computed(() => {
  // 如果有筛选条件，显示筛选后的数量
  if (selectedDict.value || selectedDialect.value || selectedType.value) {
    return String(filteredTotalCount.value)
  }
  // 否则显示API返回的原始总数
  return searchTotal.value.exact
    ? String(searchTotal.value.grouped)
    : `${searchTotal.value.grouped}+`;
});

const getExactRedirectHeadword = (
  entries: DictionaryEntry[],
  query: string,
): string | null => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return null;
  if (enableReverseSearch.value) return null;
  if (isJyutpingQuery(normalizedQuery)) return null;

  const exactMatches = aggregateSearchEntries(entries).filter((group) =>
    isExactMatch(group.primary, normalizedQuery),
  );

  const exactQueryLower = normalizedQuery.toLowerCase();
  const exactOriginalMatches = exactMatches.filter((group) => {
    const display = group.primary.headword.display?.trim().toLowerCase() || "";
    const normalized =
      group.primary.headword.normalized?.trim().toLowerCase() || "";
    return display === exactQueryLower || normalized === exactQueryLower;
  });

  const preferredMatches =
    exactOriginalMatches.length === 1 ? exactOriginalMatches : exactMatches;

  if (preferredMatches.length !== 1) {
    return null;
  }

  const primary = preferredMatches[0]?.primary;
  const headword =
    primary?.headword.normalized?.trim() || primary?.headword.display?.trim();

  return headword || null;
};

const redirectToExactMatchIfNeeded = async (
  entries: DictionaryEntry[],
  query: string,
): Promise<boolean> => {
  if (!process.client || redirectingToExactMatch.value) {
    return false;
  }

  if (showingSearchResultsView.value) {
    return false;
  }

  const headword = getExactRedirectHeadword(entries, query);
  if (!headword) {
    return false;
  }

  redirectingToExactMatch.value = true;

  try {
    await navigateTo(wordPath(headword), {
      replace: true,
    });
    return true;
  } finally {
    redirectingToExactMatch.value = false;
  }
};

interface PerformSearchOptions {
  resetFilters?: boolean;
}

const resetSearchState = () => {
  searchGroups.value = [];
  jsonResultGroups.value = [];
  displayedResults.value = [];
  searchFacets.value = createEmptySearchFacetCounts();
  searchTotal.value = {
    grouped: 0,
    entries: 0,
    exact: true,
  };
  nextSearchOffset.value = null;
  exactResultsReady.value = false;
};

const applySearchResponse = (
  response: GroupedSearchResponse,
  { append = false }: { append?: boolean } = {},
) => {
  searchGroups.value = append
    ? [...searchGroups.value, ...response.groups]
    : response.groups;
  searchTotal.value = response.total;
  searchFacets.value = response.facets;
  nextSearchOffset.value = response.page.nextOffset;
  exactResultsReady.value = true;
  isSearchComplete.value = true;
  updateDisplayedResults();
};

const performJsonEmergencySearch = async (query: string, requestId: number) => {
  const results = await jsonSearch.searchBasic(query, {
    limit: SEARCH_LOCAL_RESULT_LIMIT,
    searchDefinition: enableReverseSearch.value,
  });
  if (requestId !== activeSearchRequestId) return;

  jsonResultGroups.value = aggregateSearchEntries(results);
  const pageGroups = jsonResultGroups.value.slice(0, PAGE_SIZE);
  searchGroups.value = pageGroups;
  searchTotal.value = {
    grouped: jsonResultGroups.value.length,
    entries: results.length,
    exact: results.length < SEARCH_LOCAL_RESULT_LIMIT,
  };
  searchFacets.value = countSearchGroupFacets(jsonResultGroups.value);
  nextSearchOffset.value =
    jsonResultGroups.value.length > pageGroups.length ? pageGroups.length : null;
  exactResultsReady.value = true;
  isSearchComplete.value = true;
  updateDisplayedResults();

  await redirectToExactMatchIfNeeded(results, query);
};

// 执行搜索
const performSearch = async (
  query: string,
  options: PerformSearchOptions = {},
) => {
  const requestId = ++activeSearchRequestId;
  const { resetFilters = true } = options;

  if (!query || query.trim() === "") {
    resetSearchState();
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
  resetSearchState();
  currentPage.value = 1;

  // 更新实际搜索的查询词
  actualSearchQuery.value = query.trim();

  // 重置筛选状态
  if (resetFilters) {
    selectedDict.value = null;
    selectedDialect.value = null;
    selectedType.value = null;
    sortBy.value = "relevance";
  }
  showDictDropdown.value = false;
  showDialectDropdown.value = false;
  showTypeDropdown.value = false;
  showSortDropdown.value = false;

  try {
    const normalizedQuery = query.trim();
    if (getMode() === "json") {
      await performJsonEmergencySearch(normalizedQuery, requestId);
      return;
    }

    const response = await apiSearch.searchDetailedOrNull(normalizedQuery, {
      limit: PAGE_SIZE,
      offset: 0,
      mode: enableReverseSearch.value ? "reverse" : "normal",
      dict: selectedDict.value || undefined,
      dialect: selectedDialect.value || undefined,
      type: getSelectedEntryType(),
      sort: sortBy.value,
    });

    if (requestId !== activeSearchRequestId) {
      return;
    }

    if (!response) {
      resetSearchState();
      isSearchComplete.value = true;
      return;
    }

    applySearchResponse(response);
    await redirectToExactMatchIfNeeded(response.results, normalizedQuery);
  } catch (error) {
    console.error("搜尋失敗:", error);
    resetSearchState();
  } finally {
    if (requestId === activeSearchRequestId) {
      isSearchComplete.value = true;
      loading.value = false;
    }
  }
};

// 加载更多结果
const loadMore = async () => {
  if (!hasMore.value || loadingMore.value) {
    return;
  }

  const requestId = activeSearchRequestId;
  const query = actualSearchQuery.value;
  const dict = selectedDict.value;
  const dialect = selectedDialect.value;
  const type = selectedType.value;
  const entryType = getSelectedEntryType();
  const sort = sortBy.value;

  const isStillCurrent = () =>
    requestId === activeSearchRequestId &&
    actualSearchQuery.value === query &&
    selectedDict.value === dict &&
    selectedDialect.value === dialect &&
    selectedType.value === type &&
    sortBy.value === sort;

  loadingMore.value = true;

  try {
    const offset = nextSearchOffset.value;
    if (offset === null) {
      return;
    }

    if (getMode() === "json") {
      const nextGroups = jsonResultGroups.value.slice(offset, offset + PAGE_SIZE);
      if (!isStillCurrent()) return;

      searchGroups.value = [...searchGroups.value, ...nextGroups];
      nextSearchOffset.value =
        jsonResultGroups.value.length > offset + nextGroups.length
          ? offset + nextGroups.length
          : null;
      currentPage.value++;
      updateDisplayedResults();
      return;
    }

    const response = await apiSearch.searchDetailedOrNull(query, {
      limit: PAGE_SIZE,
      offset,
      mode: enableReverseSearch.value ? "reverse" : "normal",
      dict: dict || undefined,
      dialect: dialect || undefined,
      type: entryType,
      sort,
    });

    if (response && isStillCurrent()) {
      applySearchResponse(response, { append: true });
      currentPage.value++;
    }
  } finally {
    loadingMore.value = false;
  }
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
    if (searchQuery.value.length >= 2) {
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
    const trimmedQuery = String(newQuery || "").trim();
    const newReverseEnabled = newReverse === "1";
    const isSameCompletedSearch =
      actualSearchQuery.value === trimmedQuery &&
      enableReverseSearch.value === newReverseEnabled &&
      searchGroups.value.length > 0 &&
      isSearchComplete.value;

    searchQuery.value = trimmedQuery;
    enableReverseSearch.value = newReverseEnabled;
    // 只在客户端执行搜索
    if (process.client) {
      if (trimmedQuery) {
        if (isSameCompletedSearch) {
          loading.value = false;
          loadingMore.value = false;
          return;
        }
        performSearch(trimmedQuery);
      } else {
        resetSearchState();
        actualSearchQuery.value = "";
        isSearchComplete.value = true;
      }
    }
  },
  { immediate: true },
);

// 监听反查开关变化，更新 URL 并重新搜索
watch(enableReverseSearch, (newValue) => {
  if (process.client && actualSearchQuery.value) {
    router.replace(
      searchPath(actualSearchQuery.value, newValue, {
        showResults: showingSearchResultsView.value,
      }),
    );
  }
});

// 点击外部关闭建议和筛选下拉菜单
onMounted(async () => {
  clickOutsideHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-search-interactive]')) return;

    showSuggestions.value = false;
    showDictDropdown.value = false;
    showDialectDropdown.value = false;
    showTypeDropdown.value = false;
    showSortDropdown.value = false;
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
