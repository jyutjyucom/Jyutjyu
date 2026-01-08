<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header with Search Bar -->
    <header class="bg-white shadow-sm sticky top-0 z-10">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center gap-4">
          <NuxtLink to="/" class="text-xl font-bold text-blue-600 whitespace-nowrap">
            粤语辞丛
          </NuxtLink>
          <div class="flex-1 max-w-2xl relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索词语或粤拼..."
              class="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              @keyup.enter="handleSearch"
              @input="handleInput"
            >
            <button
              class="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
              @click="handleSearch"
            >
              搜索
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
            <span class="text-sm text-gray-600">反查</span>
          </label>
        </div>
      </div>
      
      <!-- 筛选栏 -->
      <div v-if="actualSearchQuery && allResults.length > 0" class="border-t border-gray-100 bg-gray-50/80">
        <div class="container mx-auto px-4 py-3">
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-sm text-gray-500 font-medium">筛选:</span>
            
            <!-- 词典筛选 -->
            <div class="relative">
              <button
                class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors"
                :class="selectedDict ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'"
                @click="showDictDropdown = !showDictDropdown"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>{{ selectedDict || '全部词典' }}</span>
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
                  全部词典
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
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{{ selectedDialect || '全部方言' }}</span>
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
                  全部方言
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
          <p class="text-gray-600 mt-4">搜索中...</p>
        </div>

        <!-- Results Info -->
        <div v-else-if="actualSearchQuery" class="mb-6">
        <h2 class="text-2xl font-semibold text-gray-900">
          {{ enableReverseSearch ? '反查' : '搜索' }}结果: "{{ actualSearchQuery }}"
        </h2>
        <p class="text-gray-600 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span v-if="enableReverseSearch" class="text-blue-500 text-sm">从释义中搜索</span>
          <span>
            找到 <span class="font-semibold">{{ allResults.length }}</span> 个结果
          </span>
          <!-- 筛选状态 -->
          <template v-if="selectedDict || selectedDialect">
            <span class="text-gray-400">→</span>
            <span class="text-blue-600">
              筛选后 <span class="font-semibold">{{ filteredResults.length }}</span> 条
            </span>
            <button
              class="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              @click="clearFilters"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              清除
            </button>
          </template>
          <span v-if="!isSearchComplete" class="text-sm text-blue-500">
            <span class="inline-block animate-pulse">搜索中...</span>
          </span>
          <span v-else-if="searchTime > 0" class="text-sm text-gray-400">
            ({{ searchTime }}ms)
          </span>
          <span v-if="totalCount > PAGE_SIZE" class="text-sm text-gray-400">
            · 显示前 {{ displayedResults.length }} 条
          </span>
        </p>
      </div>

      <!-- No Results -->
      <div v-if="!loading && actualSearchQuery && allResults.length === 0" class="text-center py-16">
        <div class="text-6xl mb-4">🔍</div>
        <h3 class="text-2xl font-semibold text-gray-900 mb-2">
          没有找到相关结果
        </h3>
        <p class="text-gray-600 mb-6">
          试试其他关键词或粤拼
        </p>
        <div class="text-sm text-gray-500">
          <p class="font-semibold mb-2">搜索提示：</p>
          <ul class="space-y-1">
            <li>• 尝试使用繁体字或简体字</li>
            <li>• 尝试使用粤拼搜索（如: nei5 hou2）</li>
            <li>• 检查拼写是否正确</li>
            <li>• 尝试使用更简短的关键词</li>
          </ul>
        </div>
      </div>

      <!-- Results -->
      <div v-else-if="!loading && displayedResults.length > 0" class="space-y-4">
        <!-- 视图切换（桌面端） -->
        <div class="hidden md:flex justify-end mb-4">
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
                卡片
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
                列表
              </span>
            </button>
          </div>
        </div>

        <!-- 卡片视图 -->
        <div v-if="viewMode === 'card'" class="space-y-4">
          <DictCard
            v-for="entry in displayedResults"
            :key="entry.id"
            :entry="entry"
          />
          
          <!-- 加载更多按钮 -->
          <div v-if="hasMore" class="flex justify-center py-8">
            <button
              class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              :disabled="loadingMore"
              @click="loadMore"
            >
              <span v-if="loadingMore">加载中...</span>
              <span v-else>加载更多 ({{ totalCount - displayedResults.length }} 条)</span>
            </button>
          </div>
        </div>

        <!-- 列表视图（简洁） -->
        <div v-else class="space-y-4">
          <div class="bg-white rounded-lg shadow-md overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      词汇
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      粤拼
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      释义
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      来源
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <template v-for="entry in displayedResults" :key="entry.id">
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
          
          <!-- 加载更多按钮 -->
          <div v-if="hasMore" class="flex justify-center py-8">
            <button
              class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              :disabled="loadingMore"
              @click="loadMore"
            >
              <span v-if="loadingMore">加载中...</span>
              <span v-else>加载更多 ({{ totalCount - displayedResults.length }} 条)</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading" class="text-center py-16">
        <div class="text-6xl mb-4">📚</div>
        <h3 class="text-2xl font-semibold text-gray-900 mb-2">
          输入关键词开始搜索
        </h3>
        <p class="text-gray-600 mb-6">
          支持繁简体、粤拼搜索
        </p>
        <!-- 示例搜索 -->
        <div class="flex flex-wrap gap-2 justify-center">
          <span class="text-sm text-gray-500">试试搜索:</span>
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
          粤语辞丛 © 2025 · 
          <NuxtLink to="/about" class="text-blue-600 hover:underline">
            关于项目
          </NuxtLink>
          · 
          <a href="https://github.com/jyutjyucom/jyutjyu" class="text-blue-600 hover:underline" target="_blank">
            GitHub
          </a>
        </p>
        <p class="text-xs text-gray-500">
          收录内容遵循不同授权协议 · 
          <NuxtLink to="/about#license" class="text-blue-600 hover:underline">
            查看详情
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
const showDictDropdown = ref(false) // 词典下拉菜单显示状态
const showDialectDropdown = ref(false) // 方言下拉菜单显示状态

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

const clearFilters = () => {
  selectedDict.value = null
  selectedDialect.value = null
  currentPage.value = 1
  updateDisplayedResults()
}

// 更新显示结果（基于筛选）
const updateDisplayedResults = () => {
  displayedResults.value = filteredResults.value.slice(0, currentPage.value * PAGE_SIZE)
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

// 筛选后的结果
const filteredResults = computed(() => {
  let results = allResults.value
  if (selectedDict.value) {
    results = results.filter(e => e.source_book === selectedDict.value)
  }
  if (selectedDialect.value) {
    results = results.filter(e => e.dialect?.name === selectedDialect.value)
  }
  return results
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
  return results.filter(e => e.dialect?.name === dialect).length
}

// 基于筛选结果的分页
const totalPages = computed(() => Math.ceil(filteredResults.value.length / PAGE_SIZE))
const hasMore = computed(() => currentPage.value < totalPages.value)
const totalCount = computed(() => filteredResults.value.length)

// 执行搜索
const performSearch = async (query: string) => {
  if (!query || query.trim() === '') {
    allResults.value = []
    displayedResults.value = []
    actualSearchQuery.value = ''
    currentPage.value = 1
    isSearchComplete.value = true
    return
  }

  // 更新实际搜索的查询词
  actualSearchQuery.value = query.trim()
  
  // 重置筛选状态
  selectedDict.value = null
  selectedDialect.value = null
  
  loading.value = true
  isSearchComplete.value = false
  searchTime.value = 0
  currentPage.value = 1
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
        displayedResults.value = entries.slice(0, currentPage.value * PAGE_SIZE)
        
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
    const endIndex = currentPage.value * PAGE_SIZE
    displayedResults.value = filteredResults.value.slice(0, endIndex)
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
onMounted(() => {
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.relative')) {
      showSuggestions.value = false
      showDictDropdown.value = false
      showDialectDropdown.value = false
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
    ? `${actualSearchQuery.value} - 搜索结果 | 粤语辞丛` 
    : '搜索 | 粤语辞丛'
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

