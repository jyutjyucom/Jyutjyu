<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header with Search Bar -->
    <header class="bg-white shadow-sm sticky top-0 z-10">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center gap-4">
          <NuxtLink to="/" class="text-xl font-bold text-blue-600 whitespace-nowrap">
            {{ t('common.siteName') }}
          </NuxtLink>
          <div class="flex-1 max-w-2xl relative">
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('common.searchPlaceholder')"
              class="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              @keyup.enter="handleSearch"
              @input="handleInput"
            >
            <button
              class="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
              @click="handleSearch"
            >
              {{ t('common.searchButton') }}
            </button>
            <!-- 搜索建议 -->
            <div
              v-if="suggestions.length > 0 && showSuggestions"
              class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20"
            >
              <button
                v-for="(suggestion, idx) in suggestions"
                :key="idx"
                class="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                @click="selectSuggestion(suggestion)"
              >
                {{ suggestion }}
              </button>
            </div>
          </div>
          <!-- 反查开关 -->
          <label class="flex items-center gap-2 cursor-pointer whitespace-nowrap select-none" title="反查：从释义中搜索词语">
            <input
              v-model="enableReverseSearch"
              type="checkbox"
              class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            >
            <span class="text-sm text-gray-600">{{ t('common.reverseSearchShort') }}</span>
          </label>
        </div>
      </div>
      
      <!-- 筛选栏 -->
      <div v-if="actualSearchQuery && allResults.length > 0" class="border-t border-gray-100 bg-gray-50/80">
        <div class="container mx-auto px-4 py-3">
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-sm text-gray-500 font-medium">{{ t('common.filterLabel') }}</span>
            
            <!-- 词典筛选 -->
            <div class="relative">
              <button
                class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors"
                :class="selectedDict ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'"
                @click="showDictDropdown = !showDictDropdown"
              >
                <span>{{ selectedDict || t('common.allDictionaries') }}</span>
                <svg class="w-4 h-4" :class="showDictDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <!-- 下拉菜单 -->
              <div
                v-if="showDictDropdown"
                class="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-30 min-w-[180px]"
              >
                <button
                  class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                  :class="!selectedDict ? 'text-blue-600 bg-blue-50' : 'text-gray-700'"
                  @click="selectDict(null)"
                >
                  {{ t('common.allDictionaries') }}
                </button>
                <button
                  v-for="dict in availableDicts"
                  :key="dict"
                  class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                  :class="selectedDict === dict ? 'text-blue-600 bg-blue-50' : 'text-gray-700'"
                  @click="selectDict(dict)"
                >
                  {{ dict }}
                  <span class="text-gray-400 text-xs ml-1">({{ getDictCount(dict) }})</span>
                </button>
              </div>
            </div>
            
            <!-- 方言点筛选 -->
            <div class="relative">
              <button
                class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors"
                :class="selectedDialect ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'"
                @click="showDialectDropdown = !showDialectDropdown"
              >
                <span>{{ selectedDialect || t('common.allDialects') }}</span>
                <svg class="w-4 h-4" :class="showDialectDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <!-- 下拉菜单 -->
              <div
                v-if="showDialectDropdown"
                class="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-30 min-w-[140px]"
              >
                <button
                  class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                  :class="!selectedDialect ? 'text-green-600 bg-green-50' : 'text-gray-700'"
                  @click="selectDialect(null)"
                >
                  {{ t('common.allDialects') }}
                </button>
                <button
                  v-for="dialect in availableDialects"
                  :key="dialect"
                  class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                  :class="selectedDialect === dialect ? 'text-green-600 bg-green-50' : 'text-gray-700'"
                  @click="selectDialect(dialect)"
                >
                  {{ dialect }}
                  <span class="text-gray-400 text-xs ml-1">({{ getDialectCount(dialect) }})</span>
                </button>
              </div>
            </div>

            <!-- 类型筛选 (字/词/短语) -->
            <div v-if="availableTypes.length > 1" class="relative">
              <button
                class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors"
                :class="selectedType ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'"
                @click="showTypeDropdown = !showTypeDropdown"
              >
                <span>{{ selectedType ? getTypeName(selectedType) : t('common.allTypes') }}</span>
                <svg class="w-4 h-4" :class="showTypeDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <!-- 下拉菜单 -->
              <div
                v-if="showTypeDropdown"
                class="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-30 min-w-[120px]"
              >
                <button
                  class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                  :class="!selectedType ? 'text-amber-600 bg-amber-50' : 'text-gray-700'"
                  @click="selectType(null)"
                >
                  {{ t('common.allTypes') }}
                </button>
                <button
                  v-for="type in availableTypes"
                  :key="type"
                  class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                  :class="selectedType === type ? 'text-amber-600 bg-amber-50' : 'text-gray-700'"
                  @click="selectType(type)"
                >
                  {{ getTypeName(type) }}
                  <span class="text-gray-400 text-xs ml-1">({{ getTypeCount(type) }})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8">
      <ClientOnly>
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-16">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p class="text-gray-600 mt-4">{{ t('common.searching') }}</p>
        </div>

        <!-- Results Info -->
        <div v-else-if="actualSearchQuery" class="mb-6">
          <h2 class="text-2xl font-semibold text-gray-900">
            {{ enableReverseSearch ? t('common.reverseSearchResultsPrefix') : t('common.searchResultsPrefix') }}
            "{{ actualSearchQuery }}"
          </h2>
          <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 justify-between">
            <p class="text-gray-600 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span v-if="enableReverseSearch" class="text-blue-500 text-sm">
                {{ t('common.searching') }}
              </span>
              <span>
                {{ t('common.searchHeader') }}
                <span class="font-semibold">{{ allResults.length }}</span>
                {{ t('common.remainingSuffix') }}
              </span>
              <!-- 筛选状态 -->
              <template v-if="selectedDict || selectedDialect || selectedType">
                <span class="text-gray-400">→</span>
                <span class="text-blue-600">
                  {{ t('common.filterLabel') }}
                  <span class="font-semibold">{{ filteredResults.length }}</span>
                  {{ t('common.remainingSuffix') }}
                </span>
                <button
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  @click="clearFilters"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {{ t('common.clear') }}
                </button>
              </template>
              <span v-if="!isSearchComplete" class="text-sm text-blue-500">
                <span class="inline-block animate-pulse">{{ t('common.searching') }}</span>
              </span>
              <span v-else-if="searchTime > 0" class="text-sm text-gray-400">
                ({{ searchTime }}ms)
              </span>
              <span v-if="totalCount > PAGE_SIZE" class="text-sm text-gray-400">
                · {{ t('common.showFirstPrefix') }} {{ displayedResults.length }} {{ t('common.showFirstSuffix') }}
              </span>
            </p>
            <!-- 视图切换（桌面端，仅在有结果时显示） -->
            <div v-if="displayedResults.length > 0" class="hidden md:flex">
              <div class="inline-flex rounded-lg border border-gray-300">
                <button
                  class="px-4 py-2 text-sm font-medium transition-colors"
                  :class="viewMode === 'card' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
                  @click="viewMode = 'card'"
                >
                  <span class="flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    {{ t('common.cardView') }}
                  </span>
                </button>
                <button
                  class="px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300"
                  :class="viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
                  @click="viewMode = 'list'"
                >
                  <span class="flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    {{ t('common.listView') }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

      <!-- No Results -->
      <div v-if="!loading && isSearchComplete && actualSearchQuery && allResults.length === 0" class="text-center py-16">
        <div class="text-6xl mb-4">🔍</div>
        <h3 class="text-2xl font-semibold text-gray-900 mb-2">
          {{ t('common.noResultsTitle') }}
        </h3>
        <p class="text-gray-600 mb-6">
          {{ t('common.noResultsDescription') }}
        </p>
        <div class="text-sm text-gray-500">
          <p class="font-semibold mb-2">{{ t('common.noResultsTipsTitle') }}</p>
          <ul class="space-y-1">
            <li>• {{ t('common.noResultsTip1') }}</li>
            <li>• {{ t('common.noResultsTip2') }}</li>
            <li>• {{ t('common.noResultsTip3') }}</li>
            <li>• {{ t('common.noResultsTip4') }}</li>
          </ul>
        </div>
      </div>

      <!-- Results -->
      <div v-else-if="!loading && displayedResults.length > 0" class="space-y-4">
        <!-- 卡片视图 -->
        <div v-if="viewMode === 'card'" class="space-y-4">
          <!-- 完全匹配的结果（仅文字搜索时显示） -->
          <template v-if="isTextSearch && displayedGroupedResults.exactMatches.length > 0">
            <div class="mb-2">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-green-800">
                  → {{ t('common.exactMatchLabel') }} <span class="font-semibold">{{ groupedResults.exactMatches.length }}</span> {{ t('common.remainingSuffix') }}
                </span>
              </div>
            </div>
            <DictCard
              v-for="entry in displayedGroupedResults.exactMatches"
              :key="entry.id"
              :entry="entry"
            />
          </template>
          
          <!-- 其他相关结果 -->
          <template v-if="displayedGroupedResults.otherResults.length > 0">
            <div class="mb-2" :class="{ 'mt-6': isTextSearch && displayedGroupedResults.exactMatches.length > 0 }">
              <div class="flex items-center gap-2 mb-3">
                <span v-if="isTextSearch" class="text-blue-800">
                  → {{ t('common.otherResultsLabel') }} <span class="font-semibold">{{ groupedResults.otherResults.length }}</span> {{ t('common.remainingSuffix') }}
                </span>
              </div>
            </div>
            <DictCard
              v-for="entry in displayedGroupedResults.otherResults"
              :key="entry.id"
              :entry="entry"
            />
          </template>
          
          <!-- 加载更多按钮 -->
          <div v-if="hasMore" class="flex justify-center py-8">
            <button
              class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              :disabled="loadingMore"
              @click="loadMore"
            >
              <span v-if="loadingMore">{{ t('common.loadingMore') }}</span>
              <span v-else>{{ t('common.loadMore') }} ({{ totalCount - displayedResults.length }} {{ t('common.remainingSuffix') }})</span>
            </button>
          </div>
        </div>

        <!-- 列表视图（简洁） -->
        <div v-else class="space-y-4">
          <!-- 完全匹配的结果（仅文字搜索时显示） -->
          <template v-if="isTextSearch && displayedGroupedResults.exactMatches.length > 0">
            <div class="mb-2">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-green-800">
                  → {{ t('common.exactMatchLabel') }} <span class="font-semibold">{{ groupedResults.exactMatches.length }}</span> {{ t('common.remainingSuffix') }}
                </span>
              </div>
            </div>
            <div class="bg-white rounded-lg shadow-md overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {{ t('common.wordColumn') }}
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {{ t('common.jyutpingColumn') }}
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {{ t('common.definitionColumn') }}
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {{ t('common.sourceColumn') }}
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <template v-for="entry in displayedGroupedResults.exactMatches" :key="entry.id">
                      <tr
                        class="hover:bg-gray-50 cursor-pointer transition-colors"
                        @click="expandedRow = expandedRow === entry.id ? null : entry.id"
                      >
                        <td class="px-6 py-4 whitespace-nowrap">
                          <div class="text-sm font-semibold text-gray-900">
                            {{ entry.headword.display }}
                          </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <div class="text-sm font-mono text-blue-600">
                            {{ entry.phonetic.jyutping[0] }}
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          <div class="text-sm text-gray-700 line-clamp-2">
                            {{ entry.senses[0]?.definition }}
                          </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <span class="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full">
                            {{ entry.source_book }}
                          </span>
                        </td>
                      </tr>
                      <!-- 展开详情 -->
                      <tr v-if="expandedRow === entry.id" :key="`${entry.id}-detail`">
                        <td colspan="4" class="px-6 py-4 bg-gray-50">
                          <DictCard :entry="entry" :show-details="false" />
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
          
          <!-- 其他相关结果 -->
          <template v-if="displayedGroupedResults.otherResults.length > 0">
            <div class="mb-2" :class="{ 'mt-6': isTextSearch && displayedGroupedResults.exactMatches.length > 0 }">
              <div class="flex items-center gap-2 mb-3">
                <span v-if="isTextSearch" class="text-blue-800">
                  → {{ t('common.otherResultsLabel') }} <span class="font-semibold">{{ groupedResults.otherResults.length }}</span> {{ t('common.remainingSuffix') }}
                </span>
              </div>
            </div>
            <div class="bg-white rounded-lg shadow-md overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {{ t('common.wordColumn') }}
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {{ t('common.jyutpingColumn') }}
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {{ t('common.definitionColumn') }}
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {{ t('common.sourceColumn') }}
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <template v-for="entry in displayedGroupedResults.otherResults" :key="entry.id">
                      <tr
                        class="hover:bg-gray-50 cursor-pointer transition-colors"
                        @click="expandedRow = expandedRow === entry.id ? null : entry.id"
                      >
                        <td class="px-6 py-4 whitespace-nowrap">
                          <div class="text-sm font-semibold text-gray-900">
                            {{ entry.headword.display }}
                          </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <div class="text-sm font-mono text-blue-600">
                            {{ entry.phonetic.jyutping[0] }}
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          <div class="text-sm text-gray-700 line-clamp-2">
                            {{ entry.senses[0]?.definition }}
                          </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <span class="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full">
                            {{ entry.source_book }}
                          </span>
                        </td>
                      </tr>
                      <!-- 展开详情 -->
                      <tr v-if="expandedRow === entry.id" :key="`${entry.id}-detail`">
                        <td colspan="4" class="px-6 py-4 bg-gray-50">
                          <DictCard :entry="entry" :show-details="false" />
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
          
          <!-- 加载更多按钮 -->
          <div v-if="hasMore" class="flex justify-center py-8">
            <button
              class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              :disabled="loadingMore"
              @click="loadMore"
            >
              <span v-if="loadingMore">{{ t('common.loadingMore') }}</span>
              <span v-else>{{ t('common.loadMore') }} ({{ totalCount - displayedResults.length }} {{ t('common.remainingSuffix') }})</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading" class="text-center py-16">
        <div class="text-6xl mb-4">📚</div>
        <h3 class="text-2xl font-semibold text-gray-900 mb-2">
          {{ t('common.startSearchTitle') }}
        </h3>
        <p class="text-gray-600 mb-6">
          {{ t('common.startSearchDescription') }}
        </p>
        <!-- 示例搜索 -->
        <div class="flex flex-wrap gap-2 justify-center">
          <span class="text-sm text-gray-500">{{ t('common.exampleSearchPrefix') }}</span>
          <button
            v-for="example in exampleSearches"
            :key="example"
            class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
            @click="searchExample(example)"
          >
            {{ example }}
          </button>
        </div>
      </div>
      </ClientOnly>
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-200 py-6 mt-16 bg-white">
      <div class="container mx-auto px-4 text-center text-gray-600 text-sm">
        <p class="mb-2">
          {{ t('common.footerCopyright') }}
          <NuxtLink to="/about" class="text-blue-600 hover:underline">
            {{ t('common.aboutProject') }}
          </NuxtLink>
          · 
          <a href="https://github.com/jyutjyucom/jyutjyu" class="text-blue-600 hover:underline" target="_blank">
            {{ t('common.github') }}
          </a>
        </p>
        <p class="text-xs text-gray-500">
          收录内容遵循不同授权协议 · 
          <NuxtLink to="/about#license" class="text-blue-600 hover:underline">
            {{ t('common.licenseDetails') }}
          </NuxtLink>
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { DictionaryEntry } from '~/types/dictionary'

const route = useRoute()
const router = useRouter()
const { searchBasic, getSuggestions, getMode } = useSearch()
const { t } = useI18n()
const { getAllVariants, ensureInitialized } = useChineseConverter()

// 开发时显示当前模式
if (process.dev) {
  console.log(`🔍 搜索模式: ${getMode()}`)
}

// 状态
const searchQuery = ref(route.query.q as string || '') // 输入框中的查询词
const actualSearchQuery = ref(route.query.q as string || '') // 实际已搜索的查询词
const allResults = ref<DictionaryEntry[]>([]) // 所有搜索结果
const displayedResults = ref<DictionaryEntry[]>([]) // 当前显示的结果
const loading = ref(false)
const loadingMore = ref(false)
const searchTime = ref(0)
const suggestions = ref<string[]>([])
const showSuggestions = ref(false)
const viewMode = ref<'card' | 'list'>('card')
const expandedRow = ref<string | null>(null)
const enableReverseSearch = ref(route.query.reverse === '1') // 从 URL 读取反查状态
const isSearchComplete = ref(true) // 搜索是否完成（流式搜索中用）

// 筛选相关状态
const selectedDict = ref<string | null>(null) // 选中的词典
const selectedDialect = ref<string | null>(null) // 选中的方言点
const selectedType = ref<string | null>(null) // 选中的类型 (character|word|phrase)
const showDictDropdown = ref(false) // 词典下拉菜单显示状态
const showDialectDropdown = ref(false) // 方言下拉菜单显示状态
const showTypeDropdown = ref(false) // 类型下拉菜单显示状态

// 分页配置
const PAGE_SIZE = 10 // 每页显示10条
const currentPage = ref(1)

// 示例搜索
const exampleSearches = ['我哋', '你哋', '佢', 'dei6', 'ngo5 dei6']

// 筛选函数
const selectDict = (dict: string | null) => {
  selectedDict.value = dict
  showDictDropdown.value = false
  currentPage.value = 1
  updateDisplayedResults()
}

const selectDialect = (dialect: string | null) => {
  selectedDialect.value = dialect
  showDialectDropdown.value = false
  currentPage.value = 1
  updateDisplayedResults()
}

const selectType = (type: string | null) => {
  selectedType.value = type
  showTypeDropdown.value = false
  currentPage.value = 1
  updateDisplayedResults()
}

const clearFilters = () => {
  selectedDict.value = null
  selectedDialect.value = null
  selectedType.value = null
  currentPage.value = 1
  updateDisplayedResults()
}

// 更新显示结果（基于筛选）
const updateDisplayedResults = () => {
  // 保持 displayedResults 用于兼容性，但实际显示使用 displayedGroupedResults
  const { exactMatches, otherResults } = displayedGroupedResults.value
  displayedResults.value = [...exactMatches, ...otherResults]
}

// 计算属性：从搜索结果中提取可用的词典和方言点
const availableDicts = computed(() => {
  const dicts = new Set<string>()
  allResults.value.forEach(entry => {
    if (entry.source_book) dicts.add(entry.source_book)
  })
  return Array.from(dicts).sort()
})

const availableDialects = computed(() => {
  const dialects = new Set<string>()
  allResults.value.forEach(entry => {
    if (entry.dialect?.name) dialects.add(entry.dialect.name)
  })
  return Array.from(dialects).sort()
})

const availableTypes = computed(() => {
  const types = new Set<string>()
  allResults.value.forEach(entry => {
    if (entry.entry_type) types.add(entry.entry_type)
  })
  return Array.from(types).sort((a, b) => {
    // 排序: 字, 词, 短语
    const order = { 'character': 1, 'word': 2, 'phrase': 3 } as Record<string, number>
    return (order[a] || 9) - (order[b] || 9)
  })
})

const getTypeName = (type: string) => {
  switch (type) {
    case 'character': return t('common.entryTypeCharacter')
    case 'word': return t('common.entryTypeWord')
    case 'phrase': return t('common.entryTypePhrase')
    default: return type
  }
}

// 筛选后的结果
const filteredResults = computed(() => {
  let results = allResults.value
  if (selectedDict.value) {
    results = results.filter(e => e.source_book === selectedDict.value)
  }
  if (selectedDialect.value) {
    results = results.filter(e => e.dialect?.name === selectedDialect.value)
  }
  if (selectedType.value) {
    results = results.filter(e => e.entry_type === selectedType.value)
  }
  return results
})

// 判断查询是否是粤拼查询（只包含字母、数字和空格，不包含中文字符）
const isJyutpingQuery = (query: string): boolean => {
  const trimmed = query.trim()
  if (!trimmed) return false
  // 粤拼查询：只包含字母、数字、空格和常见标点，不包含中文字符
  // 中文字符范围：\u4e00-\u9fa5
  return !/[\u4e00-\u9fa5]/.test(trimmed)
}

// 检查词条是否与查询词完全匹配（仅文字搜索时，支持简繁转换）
const isExactMatch = (entry: DictionaryEntry, query: string): boolean => {
  if (enableReverseSearch.value) {
    return false // 反查时不进行完全匹配判断
  }
  const queryTrimmed = query.trim()
  if (!queryTrimmed) return false
  
  try {
    // 获取查询词的所有变体（原文、简体、繁体），并转换为小写
    const queryVariants = getAllVariants(queryTrimmed).map(v => v.toLowerCase())
    
    // 获取词头的所有变体（原文、简体、繁体），并转换为小写
    const displayVariants = getAllVariants(entry.headword.display || '').map(v => v.toLowerCase())
    const normalizedVariants = getAllVariants(entry.headword.normalized || '').map(v => v.toLowerCase())
    
    // 合并所有词头变体
    const allHeadwordVariants = new Set([...displayVariants, ...normalizedVariants])
    
    // 检查是否有任何查询变体与词头变体完全匹配
    return queryVariants.some(qv => allHeadwordVariants.has(qv))
  } catch (error) {
    // 如果转换失败，回退到直接匹配
    console.warn('简繁转换失败，使用直接匹配:', error)
    const queryLower = queryTrimmed.toLowerCase()
    const displayMatch = (entry.headword.display || '').toLowerCase() === queryLower
    const normalizedMatch = (entry.headword.normalized || '').toLowerCase() === queryLower
    return displayMatch || normalizedMatch
  }
}

// 判断是否是文字搜索（非反查且非粤拼）
const isTextSearch = computed(() => {
  if (!actualSearchQuery.value) return false
  return !enableReverseSearch.value && !isJyutpingQuery(actualSearchQuery.value)
})

// 将结果分为完全匹配和其他结果（仅文字搜索时）
const groupedResults = computed(() => {
  // 反查、粤拼搜索或没有查询词时，不分组
  if (!isTextSearch.value) {
    return {
      exactMatches: [] as DictionaryEntry[],
      otherResults: filteredResults.value
    }
  }
  
  const exactMatches: DictionaryEntry[] = []
  const otherResults: DictionaryEntry[] = []
  
  // 按照后端返回的顺序遍历，保持顺序
  for (const entry of filteredResults.value) {
    if (isExactMatch(entry, actualSearchQuery.value)) {
      exactMatches.push(entry)
    } else {
      otherResults.push(entry)
    }
  }
  
  return {
    exactMatches,
    otherResults
  }
})

// 用于显示的合并结果（完全匹配在前，其他结果在后）
const displayedGroupedResults = computed(() => {
  const { exactMatches, otherResults } = groupedResults.value
  
  // 先显示所有完全匹配的结果
  const allExactDisplayed = exactMatches
  
  // 计算当前页应该显示的其他结果数量
  const targetDisplayCount = currentPage.value * PAGE_SIZE
  
  // 如果完全匹配的结果已经超过当前页限制，只显示部分完全匹配
  if (allExactDisplayed.length >= targetDisplayCount) {
    return {
      exactMatches: allExactDisplayed.slice(0, targetDisplayCount),
      otherResults: [] as DictionaryEntry[],
      hasMoreExact: allExactDisplayed.length > targetDisplayCount,
      hasMoreOther: otherResults.length > 0
    }
  }
  
  // 否则显示所有完全匹配，再加上部分其他结果
  const remainingSlots = targetDisplayCount - allExactDisplayed.length
  const otherDisplayed = otherResults.slice(0, remainingSlots)
  
  return {
    exactMatches: allExactDisplayed,
    otherResults: otherDisplayed,
    hasMoreExact: false,
    hasMoreOther: otherResults.length > otherDisplayed.length
  }
})

// 计算各筛选项的数量
const getDictCount = (dict: string): number => {
  let results = allResults.value
  if (selectedDialect.value) {
    results = results.filter(e => e.dialect?.name === selectedDialect.value)
  }
  return results.filter(e => e.source_book === dict).length
}

const getDialectCount = (dialect: string): number => {
  let results = allResults.value
  if (selectedDict.value) {
    results = results.filter(e => e.source_book === selectedDict.value)
  }
  if (selectedType.value) {
    results = results.filter(e => e.entry_type === selectedType.value)
  }
  return results.filter(e => e.dialect?.name === dialect).length
}

const getTypeCount = (type: string): number => {
  let results = allResults.value
  if (selectedDict.value) {
    results = results.filter(e => e.source_book === selectedDict.value)
  }
  if (selectedDialect.value) {
    results = results.filter(e => e.dialect?.name === selectedDialect.value)
  }
  return results.filter(e => e.entry_type === type).length
}

// 基于筛选结果的分页
const hasMore = computed(() => {
  const totalDisplayed = displayedGroupedResults.value.exactMatches.length + displayedGroupedResults.value.otherResults.length
  return totalDisplayed < filteredResults.value.length
})
const totalCount = computed(() => filteredResults.value.length)

// 执行搜索
const performSearch = async (query: string) => {
  if (!query || query.trim() === '') {
    allResults.value = []
    displayedResults.value = []
    actualSearchQuery.value = ''
    currentPage.value = 1
    isSearchComplete.value = true
    loading.value = false
    return
  }

  // 先设置加载状态和清空结果，避免显示旧结果
  loading.value = true
  isSearchComplete.value = false
  allResults.value = []
  displayedResults.value = []
  searchTime.value = 0
  currentPage.value = 1

  // 更新实际搜索的查询词
  actualSearchQuery.value = query.trim()
  
  // 重置筛选状态
  selectedDict.value = null
  selectedDialect.value = null
  selectedType.value = null
  
  // 确保转换器已初始化（用于完全匹配判断）
  await ensureInitialized()
  
  const startTime = Date.now()

  try {
    // 流式搜索：搜到什么先展示什么
    await searchBasic(query.trim(), {
      limit: 1000,
      searchDefinition: enableReverseSearch.value,
      onResults: (entries, complete) => {
        // 更新结果
        allResults.value = entries
        // 重新计算显示的结果（保持当前页数，使用筛选后的结果）
        // 新搜索时筛选已重置，所以 filteredResults 等于 allResults
        updateDisplayedResults()
        
        // 首次收到结果时关闭 loading
        if (loading.value && entries.length > 0) {
          loading.value = false
        }
        
        // 更新搜索耗时
        if (complete) {
          searchTime.value = Date.now() - startTime
          isSearchComplete.value = true
          loading.value = false
        }
      }
    })
  } catch (error) {
    console.error('搜索失败:', error)
    allResults.value = []
    displayedResults.value = []
  } finally {
    loading.value = false
    isSearchComplete.value = true
  }
}

// 加载更多结果
const loadMore = () => {
  if (!hasMore.value || loadingMore.value) {
    return
  }

  loadingMore.value = true
  
  setTimeout(() => {
    currentPage.value++
    updateDisplayedResults()
    loadingMore.value = false
  }, 100) // 小延迟以显示加载状态
}

// 处理搜索
const handleSearch = () => {
  if (searchQuery.value.trim()) {
    const params = new URLSearchParams({ q: searchQuery.value })
    if (enableReverseSearch.value) {
      params.set('reverse', '1')
    }
    router.push(`/search?${params.toString()}`)
    showSuggestions.value = false
  }
}

// 输入时获取建议
let suggestionTimeout: NodeJS.Timeout | null = null
const handleInput = () => {
  if (suggestionTimeout) {
    clearTimeout(suggestionTimeout)
  }

  suggestionTimeout = setTimeout(async () => {
    if (searchQuery.value.length >= 1) {
      suggestions.value = await getSuggestions(searchQuery.value)
      showSuggestions.value = suggestions.value.length > 0
    } else {
      suggestions.value = []
      showSuggestions.value = false
    }
  }, 300)
}

// 选择建议
const selectSuggestion = (suggestion: string) => {
  searchQuery.value = suggestion
  showSuggestions.value = false
  handleSearch()
}

// 示例搜索
const searchExample = (query: string) => {
  searchQuery.value = query
  handleSearch()
}

// 监听 URL 变化（只在客户端执行搜索）
watch(() => [route.query.q, route.query.reverse], ([newQuery, newReverse]) => {
  searchQuery.value = newQuery as string || ''
  enableReverseSearch.value = newReverse === '1'
  // 只在客户端执行搜索
  if (process.client) {
    if (newQuery) {
      performSearch(newQuery as string)
    } else {
      allResults.value = []
      displayedResults.value = []
    }
  }
}, { immediate: true })

// 监听反查开关变化，更新 URL 并重新搜索
watch(enableReverseSearch, (newValue) => {
  if (process.client && actualSearchQuery.value) {
    const params = new URLSearchParams({ q: actualSearchQuery.value })
    if (newValue) {
      params.set('reverse', '1')
    }
    router.replace(`/search?${params.toString()}`)
  }
})

// 点击外部关闭建议和筛选下拉菜单
onMounted(async () => {
  // 确保转换器已初始化（用于完全匹配判断）
  await ensureInitialized()
  
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.relative')) {
      showSuggestions.value = false
      showDictDropdown.value = false
      showDialectDropdown.value = false
      showTypeDropdown.value = false
    }
  }
  document.addEventListener('click', handleClickOutside)
  
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})

// SEO
useHead({
  title: computed(() => actualSearchQuery.value 
    ? `${actualSearchQuery.value} - ${t('common.searchHeader')} | ${t('common.siteName')}` 
    : `${t('common.searchHeader')} | ${t('common.siteName')}`
  )
})
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

