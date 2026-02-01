<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
    <!-- Hero Section -->
    <div class="container mx-auto px-4 py-4">
      <!-- Top bar: theme toggle and language switcher -->
      <div class="flex justify-end items-center gap-3 my-12">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>

      <!-- Logo & Title -->
      <div class="text-center mb-12" :class="isSimplified ? '' : 'font-r'">
        <h1 class="text-4xl md:text-6xl text-blue-600 mb-4">
          {{ t('common.siteName') }}
        </h1>
        <h2 class="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-2">
          {{ t('common.siteSubtitle') }}
        </h2>
        <p class="text-base md:text-lg text-gray-500 dark:text-gray-400">
          {{ t('common.siteDescription') }}
        </p>
      </div>

      <!-- Search Bar -->
      <div class="max-w-3xl mx-auto mb-12">
        <div class="relative">
          <input v-model="searchQuery" type="text" :placeholder="t('common.searchPlaceholder')"
            class="w-full px-6 py-4 text-lg border-2 border-blue-200 dark:border-blue-800 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:border-blue-500"
            @keyup.enter="handleSearch">
          <button
            class="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            @click="handleSearch">
            {{ t('common.searchButton') }}
          </button>
        </div>
        <!-- 反查开关和提示 -->
        <div class="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('common.examplesPrefix') }}
            <template v-if="enableReverseSearch">
              <span class="text-blue-600 cursor-pointer hover:underline" @click="searchExample('為什麼')">為什麼</span>、
              <span class="text-blue-600 cursor-pointer hover:underline" @click="searchExample('奇怪')">奇怪</span>
            </template>
            <template v-else>
              <span class="text-blue-600 cursor-pointer hover:underline" @click="searchExample('阿Sir')">阿Sir</span>、
              <span class="text-blue-600 cursor-pointer hover:underline" @click="searchExample('aa3 soe4')">aa3
                soe4</span>
            </template>
          </div>
          <label class="flex items-center gap-2 cursor-pointer select-none" :title="t('common.reverseSearchTitle')">
            <input v-model="enableReverseSearch" type="checkbox"
              class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
            <span class="text-sm text-gray-600 dark:text-gray-300">{{ t('common.reverseSearch') }}</span>
          </label>
        </div>
      </div>

      <!-- Random Entries -->
      <div class="max-w-5xl mx-auto mb-16">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-semibold text-blue-700">{{ t('common.recommendedEntries') }}</h3>
          <button @click="refreshRandomEntries" :disabled="loadingRandomEntries"
            class="text-blue-600 hover:text-blue-700 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
            <svg v-if="loadingRandomEntries" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor"
              viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ t('common.changeBatch') }}
          </button>
        </div>

        <!-- Loading state when refreshing -->
        <div v-if="loadingRandomEntries && randomEntries.length > 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p class="text-gray-600 dark:text-gray-300 mt-4">{{ t('common.loading') }}</p>
        </div>

        <!-- Desktop: 3 cards in grid -->
        <div v-if="!loadingRandomEntries && randomEntries.length > 0" class="hidden md:grid md:grid-cols-3 gap-6">
          <div v-for="entry in randomEntries" :key="entry.id" @click="searchEntry(entry.headword.display)"
            class="cursor-pointer bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-8 group relative overflow-hidden">
            <!-- Decorative accent -->
            <div class="absolute top-0 left-0 w-1 h-full bg-blue-500 transition-opacity">
            </div>

            <div class="flex flex-col h-full items-center text-center">
              <div class="w-full">
                <h4 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 group-hover:text-blue-600 transition-colors">
                  {{ entry.headword.display }}
                </h4>

                <p class="text-base font-mono text-blue-600 font-semibold">
                  {{ entry.phonetic.jyutping[0] }}
                </p>

              </div>

              <div class="w-16 h-0.5 bg-blue-100 dark:bg-blue-800 my-4"></div>

              <p class="text-gray-600 dark:text-gray-300 text-base leading-relaxed line-clamp-3 mb-6">
                {{ entry.senses[0]?.definition || t('common.noDefinition') }}
              </p>

              <div class="mt-auto w-full pt-4 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center text-sm">
                <span class="text-gray-400 dark:text-gray-500 font-medium">{{ entry.source_book }}</span>
                <span
                  class="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  {{ t('common.clickToView') }}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3">
                    </path>
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile: 1 card with navigation -->
        <div v-if="!loadingRandomEntries && randomEntries.length > 0" class="md:hidden">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 overflow-hidden relative">
            <!-- Decorative accent -->
            <div class="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <!-- Card content - clickable to search -->
            <div @click="searchEntry(randomEntries[mobileIndex].headword.display)"
              class="cursor-pointer p-7 active:bg-gray-50 dark:active:bg-gray-700 transition-colors">
              <div class="flex flex-col h-full items-center text-center">
                <div class="w-full">
                  <h4 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {{ randomEntries[mobileIndex].headword.display }}
                  </h4>
                  <p class="text-base font-mono text-blue-600 font-medium">
                    {{ randomEntries[mobileIndex].phonetic.jyutping[0] }}
                  </p>
                </div>

                <div class="w-16 h-0.5 bg-blue-100 dark:bg-blue-800 my-4"></div>

                <p class="text-gray-600 dark:text-gray-300 text-base leading-relaxed line-clamp-4 mb-1">
                  {{ randomEntries[mobileIndex].senses[0]?.definition || t('common.noDefinition') }}
                </p>
              </div>
            </div>

            <!-- Bottom bar - clickable to go next -->
            <div class="border-t border-gray-50 dark:border-gray-700">
              <button @click="nextMobileEntry"
                class="w-full px-7 py-4 flex justify-between items-center active:bg-blue-50 dark:active:bg-blue-900/20 transition-colors">
                <span class="text-sm text-gray-400 dark:text-gray-500 font-medium">{{ randomEntries[mobileIndex].source_book }}</span>
                <span class="text-blue-500 font-medium flex items-center gap-1 text-sm">
                  {{ t('common.next') }}
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
              <button v-for="(_, idx) in randomEntries" :key="idx" @click="mobileIndex = idx"
                class="w-2 h-2 rounded-full transition-all"
                :class="idx === mobileIndex ? 'bg-blue-600 w-6' : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'"
                :aria-label="t('common.switchEntryAria', { index: Number(idx) + 1 })" />
            </div>
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="randomEntries.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
          <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3">
          </div>
          <p>{{ t('common.loading') }}</p>
        </div>
      </div>

      <!-- Dictionary Status -->
      <div class="max-w-5xl mx-auto mb-16">
        <div class="flex flex-col items-center mb-6">
          <div class="flex justify-between items-center w-full mb-2">
            <h3 class="text-2xl font-semibold text-blue-700">{{ t('common.includedDictionaries') }}</h3>
          </div>
          <p class="text-lg text-gray-600 dark:text-gray-300">
            {{ t('common.totalEntriesPrefix') }}
            <span class="text-blue-600 font-semibold text-lg">{{ totalEntriesCount.toLocaleString() }}</span>
            {{ t('common.totalEntriesSuffix') }}
          </p>
        </div>

        <!-- Dictionary Grid -->
        <div v-if="dictionariesData" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="dict in sortedDictionaries" :key="dict.id"
            class="bg-slate-50 dark:bg-gray-800 rounded-lg border border-blue-100 dark:border-blue-800 hover:border hover:border-blue-300 dark:hover:border-blue-600 transition-all p-0 overflow-hidden flex flex-col h-full group">
            <!-- Header with colored top border -->
            <!-- <div class="h-1.5 w-full bg-gradient-to-r from-blue-400 to-indigo-500"></div> -->

            <div class="p-6 flex-1 flex flex-col">
              <div class="flex items-start mb-4">
                <!-- Cover Image (Left) -->
                <div class="flex-shrink-0 mr-4 relative group-hover:scale-105 transition-transform duration-300">
                  <div class="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" v-if="!dict.cover">
                  </div>
                  <img v-if="dict.cover" :src="dict.cover" :alt="dict.name"
                    class="w-16 h-20 object-contain bg-white dark:bg-gray-700 rounded-md shadow-md border border-gray-100 dark:border-gray-700" />
                  <div v-else
                    class="w-16 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-md flex items-center justify-center text-blue-300 dark:text-blue-600 shadow-sm border border-blue-100 dark:border-blue-800">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253">
                      </path>
                    </svg>
                  </div>
                </div>

                <!-- Title & Metadata (Right) -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <h4
                      class="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight group-hover:text-blue-700 transition-colors">
                      {{ dict.lName }}
                    </h4>
                    <span :class="{
                      'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800': dict.entries_count > 0,
                      'bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800': dict.entries_count === 0
                    }" class="flex-shrink-0 px-2 py-0.5 rounded text-sm font-semibold whitespace-nowrap">
                      {{ dict.entries_count > 0 ? `${dict.entries_count.toLocaleString()}
                      ${t('common.entriesCountSuffix')}` : t('common.inProgress') }}
                    </span>
                  </div>

                  <p class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-0.5 truncate">
                    {{ dict.lAuthor }}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {{ dict.lPublisher }} · {{ dict.year }}
                  </p>
                </div>
              </div>

              <p v-if="dict.lDescription" class="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
                {{ dict.lDescription }}
              </p>

              <!-- Footer with License -->
              <div v-if="dict.license" class="pt-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
                <div class="flex items-start gap-2">
                  <svg class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div class="flex-1">
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ dict.lLicense }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 text-center">
          <p class="text-gray-500 dark:text-gray-400 text-sm mb-3">{{ t('common.moreDictionariesComing') }}</p>
          <NuxtLink to="/about"
            class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium">
            {{ t('common.viewLicense') }}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </NuxtLink>
        </div>
      </div>

      <!-- Call to Action -->
      <div class="mt-16 text-center">
        <h3 class="text-2xl font-semibold mb-4">{{ t('common.contribute') }}</h3>
        <p class="text-gray-600 dark:text-gray-300 mb-6">
          {{ t('common.contributeDescription') }}
        </p>
        <div class="flex gap-4 justify-center flex-wrap">
          <a href="https://github.com/jyutjyucom/jyutjyu" target="_blank"
            class="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors">
            <Github class="w-4 h-4" aria-hidden="true" />
            {{ t('common.github') }}
          </a>
          <a href="https://github.com/jyutjyucom/jyutjyu/blob/main/docs/CSV_GUIDE.md" target="_blank"
            class="inline-flex items-center gap-2 px-6 py-3 border-2 border-green-600 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
            <Database class="w-4 h-4" aria-hidden="true" />
            {{ t('common.contributeData') }}
          </a>
          <FeedbackButton
            button-class="px-6 py-3 border-2 border-amber-600 dark:border-amber-800 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
            label-class="text-base"
          />
          <NuxtLink to="/about"
            class="inline-flex items-center gap-2 px-6 py-3 border-2 border-blue-600 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
            <Info class="w-4 h-4" aria-hidden="true" />
            {{ t('common.aboutProject') }}
          </NuxtLink>
        </div>
      </div>
    </div>

    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
import { Database, Github, Info } from 'lucide-vue-next'
import type { DictionaryEntry } from '~/types/dictionary'

const { t, locale } = useI18n()
const { localizeDictionary } = useLocalizedDictionary()

// 判断是否为简体中文（简体中文或简体粤文）
const isSimplified = computed(() => {
  return locale.value === 'zh-Hans' || locale.value === 'yue-Hans'
})

const searchQuery = ref('')
const enableReverseSearch = ref(false)
const router = useRouter()

// 通过 Nuxt Content 加载词典索引，避免直接 import JSON 触发 i18n 插件处理
const { data: dictionariesData } = await useAsyncData('dictionaries-index', () =>
  queryContent('/dictionaries').findOne()
)

// 使用 useState 来保持状态在页面导航时不丢失
const randomEntries = useState<DictionaryEntry[]>('home-random-entries', () => [])
const mobileIndex = useState<number>('home-mobile-index', () => 0)
const loadingRandomEntries = ref(false)

const { getRandomRecommendedEntries } = useSearch()

// 计算总词条数
const totalEntriesCount = computed(() => {
  if (!dictionariesData.value) return 0
  return dictionariesData.value.dictionaries.reduce(
    (sum: number, dict: any) => sum + (dict.entries_count || 0),
    0
  )
})

// 按名称排序词典
const sortedDictionaries = computed(() => {
  if (!dictionariesData.value) return []
  // 使用固定的 locale 'zh-CN' 来确保排序在 SSR 和客户端一致
  const sortLocale = 'zh-CN'
  return [...dictionariesData.value.dictionaries]
    .map(localizeDictionary)
    .sort((a, b) => {
    // 注意：某些 locale/敏感度设置下，localeCompare 可能把不同字符串判成"相等"(返回 0)，
    // 从而导致排序在不同运行/水合阶段出现不稳定的相对顺序。这里加二级排序保证稳定。
    const cmp = a.lName.localeCompare(b.lName, sortLocale)
    if (cmp !== 0) return cmp
    return String(a.id).localeCompare(String(b.id), sortLocale)
  })
})

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    const params = new URLSearchParams({ q: searchQuery.value })
    if (enableReverseSearch.value) {
      params.set('reverse', '1')
    }
    router.push(`/search?${params.toString()}`)
  }
}

const searchExample = (query: string) => {
  searchQuery.value = query
  handleSearch()
}

const searchEntry = (headword: string) => {
  // 清理零宽字符（Zero Width Characters）
  // U+200B: Zero Width Space
  // U+200C: Zero Width Non-Joiner
  // U+200D: Zero Width Joiner
  // U+FEFF: Zero Width No-Break Space (BOM)
  const cleanedHeadword = headword.replace(/[\u200B-\u200D\uFEFF]/g, '')
  router.push(`/search?q=${encodeURIComponent(cleanedHeadword)}`)
}

const refreshRandomEntries = async () => {
  if (loadingRandomEntries.value) return

  loadingRandomEntries.value = true
  try {
    const entries = await getRandomRecommendedEntries(3)
    if (entries.length > 0) {
      randomEntries.value = entries
      mobileIndex.value = 0
    }
  } catch (error) {
    console.error('加載隨機詞條失敗:', error)
  } finally {
    loadingRandomEntries.value = false
    // 确保 Vue 响应式更新完成
    await nextTick()
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
  title: computed(() => `${t('common.siteName')} | ${t('common.siteSubtitle')} - ${t('common.siteDescription')}`),
  meta: [
    {
      name: 'description',
      content: computed(
        () =>
          `${t('common.siteName')} ${t('common.siteDescription')}`
      )
    }
  ]
})
</script>
