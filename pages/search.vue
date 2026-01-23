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
                <span>{{ selectedDialect ? getDialectLabel(selectedDialect) : t('common.allDialects') }}</span>
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
                  {{ getDialectLabel(dialect) }}
                  <span class="text-gray-400 text-xs ml-1">({{ getDialectCount(dialect) }})</span>
                </button>
              </div>
            </div>

            <!-- 类型筛选 (字/词/短语) -->
            <div class="relative">
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
                <span class="font-semibold">{{ allAggregatedCount }}</span>
                {{ t('common.remainingSuffix') }}
              </span>
              <!-- 筛选状态 -->
              <template v-if="selectedDict || selectedDialect || selectedType">
                <span class="text-gray-400">→</span>
                <span class="text-blue-600">
                  {{ t('common.filterLabel') }}
                  <span class="font-semibold">{{ totalCount }}</span>
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
            
            <div class="flex flex-wrap items-center gap-4">
              <!-- 排序下拉菜单 -->
              <div class="relative">
                <button
                  class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm"
                  @click.stop="showSortDropdown = !showSortDropdown"
                >
                  <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  <span>{{ getSortLabel(sortBy) }}</span>
                  <svg class="w-4 h-4 transition-transform" :class="showSortDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  v-if="showSortDropdown"
                  class="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-30 min-w-[140px]"
                >
                  <button
                    v-for="sort in ['relevance', 'jyutping', 'headword', 'dictionary']"
                    :key="sort"
                    class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                    :class="sortBy === sort ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-700'"
                    @click="selectSort(sort as any)"
                  >
                    {{ getSortLabel(sort) }}
                  </button>
                </div>
              </div>

              <!-- 视图切换 (桌面端) -->
              <div v-if="displayedResults.length > 0" class="flex">
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
            <div class="mb-6 p-3 border-l-4 bg-green-50 border-green-400 rounded-r-lg flex items-center gap-2 shadow-sm">
              <svg class="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-green-800 text-sm font-semibold">
                {{ t('common.exactMatchLabel') }} <span class="ml-1 px-1.5 py-0.5 bg-green-100 rounded text-green-900">{{ groupedResults.exactMatches.length }}</span> {{ t('common.remainingSuffix') }}
              </span>
            </div>
            <div class="space-y-4">
              <DictCardGroup
                v-for="group in displayedGroupedResults.exactMatches"
                :key="group.key"
                :entries="group.entries"
              />
            </div>
          </template>
          
          <!-- 其他相关结果 -->
          <template v-if="displayedGroupedResults.otherResults.length > 0">
            <div class="mb-6 p-3 border-l-4 bg-blue-50 border-blue-400 rounded-r-lg flex items-center gap-2 shadow-sm" :class="{ 'mt-12': isTextSearch && displayedGroupedResults.exactMatches.length > 0 }">
              <svg class="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span v-if="isTextSearch && sortBy === 'relevance'" class="text-blue-800 text-sm font-semibold">
                {{ t('common.otherResultsLabel') }} <span class="ml-1 px-1.5 py-0.5 bg-blue-100 rounded text-blue-900">{{ groupedResults.otherResults.length }}</span> {{ t('common.remainingSuffix') }}
              </span>
              <span v-else class="text-blue-800 text-sm font-semibold">
                {{ t('common.searchHeader') }} <span class="font-bold ml-1 px-1.5 py-0.5 bg-blue-100 rounded text-blue-900">{{ groupedResults.otherResults.length }}</span> {{ t('common.remainingSuffix') }}
              </span>
            </div>
            <div class="space-y-4">
              <DictCardGroup
                v-for="group in displayedGroupedResults.otherResults"
                :key="group.key"
                :entries="group.entries"
              />
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

        <!-- 列表视图（简洁） -->
        <div v-else class="space-y-4">
          <!-- 完全匹配的结果（仅文字搜索时显示） -->
          <template v-if="isTextSearch && displayedGroupedResults.exactMatches.length > 0">
            <div class="mb-6 p-3 border-l-4 bg-green-50 border-green-400 rounded-r-lg flex items-center gap-2 shadow-sm">
              <svg class="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-green-800 text-sm font-semibold">
                {{ t('common.exactMatchLabel') }} <span class="ml-1 px-1.5 py-0.5 bg-green-100 rounded text-green-900">{{ groupedResults.exactMatches.length }}</span> {{ t('common.remainingSuffix') }}
              </span>
            </div>
            <div class="bg-white rounded-lg shadow-md overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-50 border-b border-gray-400">
                    <tr>
                      <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2">
                        {{ t('common.wordColumn') }}
                      </th>
                      <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2">
                        {{ t('common.jyutpingColumn') }}
                      </th>
                      <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2">
                        {{ t('common.definitionColumn') }}
                      </th>
                      <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2">
                        {{ t('common.sourceColumn') }}
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <template v-for="group in displayedGroupedResults.exactMatches" :key="group.key">
                      <tr
                        class="hover:bg-gray-50 cursor-pointer transition-colors"
                        @click="expandedRow = expandedRow === group.key ? null : group.key"
                      >
                        <td class="px-3 whitespace-nowrap py-2">
                          <div class="text-base font-semibold text-gray-900">
                            {{ group.primary.headword.display }}
                          </div>
                        </td>
                        <td class="px-3 whitespace-nowrap py-2">
                          <div class="text-base font-mono font-semibold text-blue-600">
                            {{ getGroupJyutping(group) || '-' }}
                          </div>
                        </td>
                        <td class="px-3 py-2">
                          <div class="text-base text-gray-700 line-clamp-2">
                            {{ getGroupDefinitions(group) || '-' }}
                          </div>
                        </td>
                        <td class="px-3 whitespace-nowrap py-2">
                          <div class="flex flex-wrap gap-1">
                            <span
                              v-for="source in getGroupSources(group)"
                              :key="source"
                              class="px-2 py-1 text-sm bg-blue-50 text-blue-700 rounded-full"
                            >
                              {{ source }}
                            </span>
                          </div>
                        </td>
                      </tr>
                      <!-- 展开详情 -->
                      <tr v-if="expandedRow === group.key" :key="`${group.key}-detail`">
                        <td colspan="4" class="px-3 py-3 py-2 bg-gray-50">
                          <DictCardGroup :entries="group.entries" :show-details="false" />
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
            <div class="mb-6 p-3 border-l-4 bg-blue-50 border-blue-400 rounded-r-lg flex items-center gap-2 shadow-sm" :class="{ 'mt-12': isTextSearch && displayedGroupedResults.exactMatches.length > 0 }">
              <svg class="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span v-if="isTextSearch && sortBy === 'relevance'" class="text-blue-800 text-sm font-semibold">
                {{ t('common.otherResultsLabel') }} <span class="ml-1 px-1.5 py-0.5 bg-blue-100 rounded text-blue-900">{{ groupedResults.otherResults.length }}</span> {{ t('common.remainingSuffix') }}
              </span>
              <span v-else class="text-blue-800 text-sm font-semibold">
                {{ t('common.searchHeader') }} <span class="ml-1 px-1.5 py-0.5 bg-blue-100 rounded text-blue-900">{{ groupedResults.otherResults.length }}</span> {{ t('common.remainingSuffix') }}
              </span>
            </div>
            <div class="bg-white rounded-lg shadow-md overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-50 border-b border-gray-400">
                    <tr>
                      <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2">
                        {{ t('common.wordColumn') }}
                      </th>
                      <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2">
                        {{ t('common.jyutpingColumn') }}
                      </th>
                      <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2">
                        {{ t('common.definitionColumn') }}
                      </th>
                      <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2">
                        {{ t('common.sourceColumn') }}
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200 ">
                    <template v-for="group in displayedGroupedResults.otherResults" :key="group.key">
                      <tr
                        class="hover:bg-gray-50 cursor-pointer transition-colors"
                        @click="expandedRow = expandedRow === group.key ? null : group.key"
                      >
                        <td class="px-3 whitespace-nowrap py-2">
                          <div class="text-base font-semibold text-gray-900">
                            {{ group.primary.headword.display }}
                          </div>
                        </td>
                        <td class="px-3 whitespace-nowrap py-2">
                          <div class="text-base font-mono font-semibold text-blue-600">
                            {{ getGroupJyutping(group) || '-' }}
                          </div>
                        </td>
                        <td class="px-3 py-2">
                          <div class="text-base text-gray-700 line-clamp-2">
                            {{ getGroupDefinitions(group) || '-' }}
                          </div>
                        </td>
                        <td class="px-3 whitespace-nowrap py-2">
                          <div class="flex flex-wrap gap-1">
                            <span
                              v-for="source in getGroupSources(group)"
                              :key="source"
                              class="px-2 py-1 text-sm bg-blue-50 text-blue-700 rounded-full"
                            >
                              {{ source }}
                            </span>
                          </div>
                        </td>
                      </tr>
                      <!-- 展开详情 -->
                      <tr v-if="expandedRow === group.key" :key="`${group.key}-detail`">
                        <td colspan="4" class="px-3 py-3 py-2 bg-gray-50">
                          <DictCardGroup :entries="group.entries" :show-details="false" />
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
          <a href="https://github.com/jyutjyucom/jyutjyu" class="text-blue-600 hover:underline" target="_blank">
            {{ t('common.github') }}
          </a>
          · 
          <NuxtLink to="/about" class="text-blue-600 hover:underline">
            {{ t('common.aboutProject') }}
          </NuxtLink>
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

interface AggregatedEntry {
  key: string
  primary: DictionaryEntry
  entries: DictionaryEntry[]
}

const route = useRoute()
const router = useRouter()
const { searchBasic, getSuggestions, getMode } = useSearch()
const { t, locale } = useI18n()
const { getAllVariants, ensureInitialized } = useChineseConverter()

// 开发时显示当前模式
if (process.dev) {
  console.log(`🔍 搜索模式: ${getMode()}`)
}

// 状态
const searchQuery = ref(route.query.q as string || '') // 输入框中的查询词
const actualSearchQuery = ref(route.query.q as string || '') // 实际已搜索的查询词
const allResults = ref<DictionaryEntry[]>([]) // 所有搜索结果
const displayedResults = ref<AggregatedEntry[]>([]) // 当前显示的结果（聚合后）
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
const sortBy = ref<'relevance' | 'jyutping' | 'headword' | 'dictionary'>('relevance') // 排序方式
const showDictDropdown = ref(false) // 词典下拉菜单显示状态
const showDialectDropdown = ref(false) // 方言下拉菜单显示状态
const showTypeDropdown = ref(false) // 类型下拉菜单显示状态
const showSortDropdown = ref(false) // 排序下拉菜单显示状态

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

const selectSort = (sort: 'relevance' | 'jyutping' | 'headword' | 'dictionary') => {
  sortBy.value = sort
  showSortDropdown.value = false
  currentPage.value = 1
  updateDisplayedResults()
}

const clearFilters = () => {
  selectedDict.value = null
  selectedDialect.value = null
  selectedType.value = null
  sortBy.value = 'relevance'
  currentPage.value = 1
  updateDisplayedResults()
}

// 聚合：将相同词头（display + normalized）的结果合并展示
const getAggregationKey = (entry: DictionaryEntry): string => {
  const headwordDisplay = entry.headword.display?.trim() || ''
  const headwordNormalized = entry.headword.normalized?.trim() || ''
  return [headwordDisplay, headwordNormalized].join('||')
}

const aggregateEntries = (entries: DictionaryEntry[]): AggregatedEntry[] => {
  const keyInfo = new Map<string, DictionaryEntry[]>()

  for (const entry of entries) {
    const key = getAggregationKey(entry)
    const list = keyInfo.get(key) || []
    list.push(entry)
    keyInfo.set(key, list)
  }

  const results: AggregatedEntry[] = []
  const seenKeys = new Set<string>()

  for (const entry of entries) {
    const key = getAggregationKey(entry)
    const grouped = keyInfo.get(key)
    if (!grouped) continue
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      results.push({
        key,
        primary: grouped[0],
        entries: grouped
      })
    }
  }

  return results
}

const getGroupSources = (group: AggregatedEntry): string[] => {
  const sources = new Set<string>()
  group.entries.forEach(entry => {
    if (entry.source_book) sources.add(entry.source_book)
  })
  return Array.from(sources)
}

const getGroupJyutping = (group: AggregatedEntry): string => {
  const seen = new Set<string>()
  const result: string[] = []
  group.entries.forEach(entry => {
    const jps = entry.phonetic?.jyutping || []
    jps.forEach(jp => {
      const value = jp?.trim()
      if (!value) return
      if (!seen.has(value)) {
        seen.add(value)
        result.push(value)
      }
    })
  })
  return result.join('; ')
}

const getGroupDefinitions = (group: AggregatedEntry): string => {
  const seen = new Set<string>()
  const result: string[] = []
  group.entries.forEach(entry => {
    const senses = entry.senses || []
    senses.forEach(sense => {
      const value = sense?.definition?.trim()
      if (!value) return
      if (!seen.has(value)) {
        seen.add(value)
        result.push(value)
      }
    })
  })
  return result.join('; ')
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
    const code = entry.dialect?.region_code?.toUpperCase()
    if (code) dialects.add(code)
  })
  // 优先固定顺序，剩余按字母排序
  const preferredOrder = ['YUE', 'HK', 'GZ']
  return Array.from(dialects).sort((a, b) => {
    const ai = preferredOrder.indexOf(a)
    const bi = preferredOrder.indexOf(b)
    if (ai !== -1 || bi !== -1) {
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    }
    return a.localeCompare(b)
  })
})

// 方言显示名：使用地区代码映射（便于 i18n）
const getDialectLabel = (code: string) => {
  const normalized = code?.toUpperCase()
  if (normalized === 'GZ' || normalized === 'HK' || normalized === 'YUE' || normalized === 'QZ' || normalized === 'KP') {
    return t(`dictCard.dialect.${normalized}`)
  }
  return normalized || code
}

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

const getSortLabel = (sort: string) => {
  switch (sort) {
    case 'relevance': return t('common.sortByRelevance')
    case 'jyutping': return t('common.sortByJyutping')
    case 'headword': return t('common.sortByHeadword')
    case 'dictionary': return t('common.sortByDictionary')
    default: return sort
  }
}

// 筛选后的原始结果（未聚合）
const filteredEntries = computed(() => {
  let results = allResults.value
  if (selectedDict.value) {
    results = results.filter(e => e.source_book === selectedDict.value)
  }
  if (selectedDialect.value) {
    results = results.filter(e => e.dialect?.region_code?.toUpperCase() === selectedDialect.value)
  }
  if (selectedType.value) {
    results = results.filter(e => e.entry_type === selectedType.value)
  }
  return results
})

// 排序后的原始结果
const sortedEntries = computed(() => {
  const results = [...filteredEntries.value]
  
  if (sortBy.value === 'relevance') {
    // 保持原样 (allResults 已经是按相关度排序的)
    return results
  }
  
  return results.sort((a, b) => {
    switch (sortBy.value) {
      case 'jyutping': {
        const ja = a.phonetic.jyutping[0] || ''
        const jb = b.phonetic.jyutping[0] || ''
        return ja.localeCompare(jb)
      }
      case 'headword': {
        const ha = a.headword.normalized || a.headword.display || ''
        const hb = b.headword.normalized || b.headword.display || ''
        return ha.localeCompare(hb, locale.value || undefined)
      }
      case 'dictionary': {
        const da = a.source_book || ''
        const db = b.source_book || ''
        return da.localeCompare(db, locale.value || undefined)
      }
      default:
        return 0
    }
  })
})

// 聚合后的结果（用于展示）
const aggregatedResults = computed(() => aggregateEntries(sortedEntries.value))

// 未筛选的聚合总数（用于顶部总数显示）
const allAggregatedCount = computed(() => aggregateEntries(allResults.value).length)

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
  // 反查、粤拼搜索、非默认排序或没有查询词时，不分组
  if (!isTextSearch.value || sortBy.value !== 'relevance') {
    return {
      exactMatches: [] as AggregatedEntry[],
      otherResults: aggregatedResults.value
    }
  }
  
  const exactMatches: AggregatedEntry[] = []
  const otherResults: AggregatedEntry[] = []
  
  // 按照后端返回的顺序遍历，保持顺序
  for (const group of aggregatedResults.value) {
    if (isExactMatch(group.primary, actualSearchQuery.value)) {
      exactMatches.push(group)
    } else {
      otherResults.push(group)
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
      otherResults: [] as AggregatedEntry[],
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
    results = results.filter(e => e.dialect?.region_code?.toUpperCase() === selectedDialect.value)
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
  const code = dialect?.toUpperCase()
  return results.filter(e => e.dialect?.region_code?.toUpperCase() === code).length
}

const getTypeCount = (type: string): number => {
  let results = allResults.value
  if (selectedDict.value) {
    results = results.filter(e => e.source_book === selectedDict.value)
  }
  if (selectedDialect.value) {
    results = results.filter(e => e.dialect?.region_code?.toUpperCase() === selectedDialect.value)
  }
  return results.filter(e => e.entry_type === type).length
}

// 基于筛选结果的分页
const hasMore = computed(() => {
  const totalDisplayed = displayedGroupedResults.value.exactMatches.length + displayedGroupedResults.value.otherResults.length
  return totalDisplayed < aggregatedResults.value.length
})
const totalCount = computed(() => aggregatedResults.value.length)

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
        // 新搜索时筛选已重置，所以 filteredEntries 等于 allResults
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
