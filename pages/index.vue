<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-50 to-white" style="color-scheme: light; background-color: #ffffff;">
    <!-- Hero Section -->
    <div class="container mx-auto px-4 py-16 md:py-24">
      <!-- Logo & Title -->
      <div class="text-center mb-12">
        <h1 class="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
          粤语辞丛
        </h1>
        <h2 class="text-xl md:text-2xl text-gray-600 mb-2">
          The Jyut Collection
        </h2>
        <p class="text-base md:text-lg text-gray-500">
          开放的粤语词典聚合平台
        </p>
      </div>

      <!-- Search Bar -->
      <div class="max-w-3xl mx-auto mb-12">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索词语或粤拼..."
            class="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-full focus:outline-none focus:border-blue-500 shadow-lg"
            @keyup.enter="handleSearch"
          >
          <button
            class="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            @click="handleSearch"
          >
            搜索
          </button>
        </div>
        <div class="mt-4 text-sm text-gray-500 text-center">
          支持繁简体、粤拼及释义反查，如：<span class="text-blue-600 cursor-pointer hover:underline" @click="searchExample('阿Sir')">阿Sir</span>、
          <span class="text-blue-600 cursor-pointer hover:underline" @click="searchExample('aa3 soe4')">aa3 soe4</span>
        </div>
      </div>

      <!-- Random Entries -->
      <div class="max-w-5xl mx-auto mb-16">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-semibold">推荐词条</h3>
          <button
            @click="refreshRandomEntries"
            class="text-blue-600 hover:text-blue-700 flex items-center gap-2 text-sm"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            换一批
          </button>
        </div>

        <!-- Desktop: 3 cards in grid -->
        <div v-if="randomEntries.length > 0" class="hidden md:grid md:grid-cols-3 gap-6">
          <div
            v-for="entry in randomEntries"
            :key="entry.id"
            @click="searchEntry(entry.headword.display)"
            class="cursor-pointer bg-white rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all p-6 group"
          >
            <div class="flex flex-col h-full">
              <div class="mb-3">
                <h4 class="text-2xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {{ entry.headword.display }}
                </h4>
                <p class="text-sm font-mono text-blue-600">
                  {{ entry.phonetic.jyutping[0] }}
                </p>
              </div>
              <p class="text-gray-700 text-sm line-clamp-3 flex-1 group-hover:text-gray-900">
                {{ entry.senses[0]?.definition || '暂无释义' }}
              </p>
              <div class="mt-3 pt-3 border-t border-gray-100">
                <div class="flex justify-between items-center">
                  <span class="text-xs text-gray-500 group-hover:text-gray-700">{{ entry.source_book }}</span>
                  <span class="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    点击查看 →
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile: 1 card with navigation -->
        <div v-if="randomEntries.length > 0" class="md:hidden">
          <div class="bg-white rounded-lg shadow-md overflow-hidden">
            <!-- Card content - clickable to search -->
            <div
              @click="searchEntry(randomEntries[mobileIndex].headword.display)"
              class="cursor-pointer p-6 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <div class="flex flex-col">
                <div class="mb-3">
                  <h4 class="text-2xl font-bold text-gray-900 mb-1">
                    {{ randomEntries[mobileIndex].headword.display }}
                  </h4>
                  <p class="text-sm font-mono text-blue-600">
                    {{ randomEntries[mobileIndex].phonetic.jyutping[0] }}
                  </p>
                </div>
                <p class="text-gray-700 text-sm line-clamp-4">
                  {{ randomEntries[mobileIndex].senses[0]?.definition || '暂无释义' }}
                </p>
              </div>
            </div>
            
            <!-- Bottom bar - clickable to go next -->
            <div class="border-t-2 border-gray-200">
              <button
                @click="nextMobileEntry"
                class="w-full px-6 py-4 flex justify-between items-center hover:bg-blue-50 active:bg-blue-100 transition-colors"
              >
                <span class="text-xs text-gray-500">{{ randomEntries[mobileIndex].source_book }}</span>
                <span class="text-blue-600 font-medium flex items-center gap-1 text-sm">
                  下一个
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
          
          <!-- Indicators -->
          <div class="mt-4 text-center">
            <div class="flex justify-center gap-2">
              <button
                v-for="(_, idx) in randomEntries"
                :key="idx"
                @click="mobileIndex = idx"
                class="w-2 h-2 rounded-full transition-all"
                :class="idx === mobileIndex ? 'bg-blue-600 w-6' : 'bg-gray-300 hover:bg-gray-400'"
                :aria-label="`切换到第 ${idx + 1} 个词条`"
              />
            </div>
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="randomEntries.length === 0" class="text-center py-12 text-gray-500">
          <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p>加载中...</p>
        </div>
      </div>

      <!-- Dictionary Status -->
      <div class="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h3 class="text-2xl font-semibold mb-6 text-center">收录词典</h3>
        <div v-if="dictionariesData" class="space-y-4">
          <div 
            v-for="dict in dictionariesData.dictionaries" 
            :key="dict.id"
            class="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <h4 class="font-semibold text-lg">{{ dict.name }}</h4>
                <p class="text-sm text-gray-600">
                  {{ dict.author }} · {{ dict.publisher }} · {{ dict.year }}
                </p>
                <p v-if="dict.description" class="text-xs text-gray-500 mt-1">
                  {{ dict.description }}
                </p>
              </div>
              <span 
                :class="{
                  'bg-green-100 text-green-800': dict.entries_count > 0,
                  'bg-yellow-100 text-yellow-800': dict.entries_count === 0
                }"
                class="px-3 py-1 rounded-full text-sm whitespace-nowrap ml-4"
              >
                {{ dict.entries_count > 0 ? `${dict.entries_count.toLocaleString()} 条` : '整理中' }}
              </span>
            </div>
            
            <!-- 授权信息 -->
            <div v-if="dict.license" class="mt-3 pt-3 border-t border-gray-100">
              <div class="flex items-start gap-2">
                <svg class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div class="flex-1">
                  <p class="text-xs text-gray-600">
                    <span class="font-medium">许可:</span> {{ dict.license }}
                  </p>
                  <p v-if="dict.usage_restriction" class="text-xs text-gray-500 mt-1">
                    {{ dict.usage_restriction }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-6 text-center">
          <p class="text-gray-500 text-sm mb-3">更多词典陆续上架...</p>
          <NuxtLink 
            to="/about" 
            class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            查看完整授权说明
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </NuxtLink>
        </div>
      </div>

      <!-- Call to Action -->
      <div class="mt-16 text-center">
        <h3 class="text-2xl font-semibold mb-4">参与贡献</h3>
        <p class="text-gray-600 mb-6">
          这是一个开源项目，欢迎贡献数据、代码或建议
        </p>
        <div class="flex gap-4 justify-center flex-wrap">
          <a
            href="https://github.com/jyutjyucom/jyutjyu"
            target="_blank"
            class="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://github.com/jyutjyucom/jyutjyu/blob/main/docs/CSV_GUIDE.md"
            target="_blank"
            class="px-6 py-3 border-2 border-gray-900 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
          >
            贡献数据
          </a>
          <NuxtLink
            to="/about"
            class="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            关于项目
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="border-t border-gray-200 py-8 mt-16">
      <div class="container mx-auto px-4">
        <!-- 版权信息 -->
        <div class="text-center text-gray-600 text-sm">
          <p class="mb-2">
            粤语辞丛 © 2025 · 开源于
            <a href="https://github.com/jyutjyucom/jyutjyu" class="text-blue-600 hover:underline" target="_blank">
              GitHub
            </a>
          </p>
          <p>为粤语文化保育与传承贡献力量</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import dictionariesIndex from '~/content/dictionaries/index.json'
import type { DictionaryEntry } from '~/types/dictionary'

const searchQuery = ref('')
const router = useRouter()
const dictionariesData = ref(dictionariesIndex)

// 使用 useState 来保持状态在页面导航时不丢失
const randomEntries = useState<DictionaryEntry[]>('home-random-entries', () => [])
const mobileIndex = useState<number>('home-mobile-index', () => 0)

const { getAllEntries } = useDictionary()

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push(`/search?q=${encodeURIComponent(searchQuery.value)}`)
  }
}

const searchExample = (query: string) => {
  searchQuery.value = query
  handleSearch()
}

const searchEntry = (headword: string) => {
  router.push(`/search?q=${encodeURIComponent(headword)}`)
}

const getRandomEntries = (entries: DictionaryEntry[], count: number): DictionaryEntry[] => {
  const shuffled = [...entries].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

const refreshRandomEntries = async () => {
  try {
    const allEntries = await getAllEntries()
    if (allEntries.length > 0) {
      randomEntries.value = getRandomEntries(allEntries, 3)
      mobileIndex.value = 0
    }
  } catch (error) {
    console.error('加载随机词条失败:', error)
  }
}

const nextMobileEntry = () => {
  mobileIndex.value = (mobileIndex.value + 1) % randomEntries.value.length
}

// 只在首次加载且没有缓存数据时加载推荐词条
onMounted(() => {
  if (randomEntries.value.length === 0) {
    refreshRandomEntries()
  }
})

// SEO
useHead({
  title: '粤语辞丛 | The Jyut Collection - 开放的粤语词典聚合平台',
  meta: [
    {
      name: 'description',
      content: '粤语辞丛是一个开放的粤语词典聚合平台，支持多词典统一查询、粤拼搜索，为粤语学习者和研究者提供便捷的工具。'
    }
  ]
})
</script>

