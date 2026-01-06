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
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-16">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p class="text-gray-600 mt-4">搜索中...</p>
      </div>

      <!-- Results Info -->
      <div v-else-if="actualSearchQuery" class="mb-6">
        <h2 class="text-2xl font-semibold text-gray-900">
          搜索结果: "{{ actualSearchQuery }}"
        </h2>
        <p class="text-gray-600 mt-2">
          找到 <span class="font-semibold">{{ results.length }}</span> 个结果
          <span v-if="searchTime > 0" class="text-sm">
            (耗时 {{ searchTime }}ms)
          </span>
        </p>
      </div>

      <!-- No Results -->
      <div v-if="!loading && actualSearchQuery && results.length === 0" class="text-center py-16">
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
      <div v-else-if="!loading && results.length > 0" class="space-y-4">
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
            v-for="entry in results"
            :key="entry.id"
            :entry="entry"
          />
        </div>

        <!-- 列表视图（简洁） -->
        <div v-else class="bg-white rounded-lg shadow-md overflow-hidden">
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
                <template v-for="entry in results" :key="entry.id">
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
const { searchBasic, getSuggestions } = useDictionary()

// 状态
const searchQuery = ref(route.query.q as string || '') // 输入框中的查询词
const actualSearchQuery = ref(route.query.q as string || '') // 实际已搜索的查询词
const results = ref<DictionaryEntry[]>([])
const loading = ref(false)
const searchTime = ref(0)
const suggestions = ref<string[]>([])
const showSuggestions = ref(false)
const viewMode = ref<'card' | 'list'>('card')
const expandedRow = ref<string | null>(null)

// 示例搜索
const exampleSearches = ['我哋', '你哋', '佢', 'dei6', 'ngo5 dei6']

// 执行搜索
const performSearch = async (query: string) => {
  if (!query || query.trim() === '') {
    results.value = []
    actualSearchQuery.value = ''
    return
  }

  // 更新实际搜索的查询词
  actualSearchQuery.value = query.trim()
  
  loading.value = true
  searchTime.value = 0
  const startTime = Date.now()

  try {
    const entries = await searchBasic(query.trim())
    results.value = entries
    searchTime.value = Date.now() - startTime
  } catch (error) {
    console.error('搜索失败:', error)
    results.value = []
  } finally {
    loading.value = false
  }
}

// 处理搜索
const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push(`/search?q=${encodeURIComponent(searchQuery.value)}`)
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

// 监听 URL 变化
watch(() => route.query.q, (newQuery) => {
  searchQuery.value = newQuery as string || ''
  if (newQuery) {
    performSearch(newQuery as string)
  } else {
    results.value = []
  }
}, { immediate: true })

// 点击外部关闭建议
onMounted(() => {
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.relative')) {
      showSuggestions.value = false
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

