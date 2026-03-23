<template>
  <div class="bg-parchment dark:bg-stone-900 p-6 w-full">
    <div class="flex items-center gap-3 mb-6">
      <div class="w-10 h-10 bg-archive-green/10 dark:bg-archive-green/20 flex items-center justify-center">
        <svg class="w-5 h-5 text-archive-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <div>
        <h3 class="text-lg font-semibold text-ink dark:text-parchment">{{ t('feedback.title') }}</h3>
        <p class="text-sm text-graphite dark:text-stone-400">{{ t('feedback.subtitle') }}</p>
      </div>
    </div>

    <form @submit.prevent="submitFeedback" class="space-y-4">
      <!-- 反馈类型 -->
      <div>
        <label class="block text-sm font-medium text-ink/80 dark:text-stone-300 mb-2">
          {{ t('feedback.type.label') }}
        </label>
        <div class="grid grid-cols-3 gap-1.5 sm:gap-2">
          <label
            v-for="type in feedbackTypes"
            :key="type.value"
            class="relative flex cursor-pointer border-2 bg-surface-low dark:bg-stone-800 px-1.5 py-2 sm:px-2 sm:py-2.5 focus:outline-none transition-colors"
            :class="feedbackType === type.value ? 'border-kapok' : 'border-outline-soft/20 dark:border-stone-700'"
          >
            <input
              v-model="feedbackType"
              type="radio"
              :value="type.value"
              name="feedback-type"
              class="sr-only"
            >
            <span class="flex flex-1 items-center justify-center">
              <span class="text-sm font-medium text-ink dark:text-stone-100 text-center leading-tight">{{ type.label }}</span>
            </span>
          </label>
        </div>
      </div>

      <!-- 标题 -->
      <div>
        <label for="title" class="block text-sm font-medium text-ink/80 dark:text-stone-300 mb-2">
          {{ t('feedback.titleField.label') }}
        </label>
        <input
          id="title"
          v-model="title"
          type="text"
          :placeholder="t('feedback.titleField.placeholder')"
          class="w-full px-3 py-2 border-none bg-surface-low dark:bg-stone-800 text-ink dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-kapok/30 transition-colors"
          required
        >
      </div>

      <!-- 描述 -->
      <div>
        <div class="flex items-center justify-between gap-3 mb-2">
          <label for="description" class="block text-sm font-medium text-ink/80 dark:text-stone-300">
            {{ t('feedback.description.label') }}
          </label>
          <button
            type="button"
            class="text-sm font-medium text-graphite/60 dark:text-stone-200 hover:text-kapok underline underline-offset-2 disabled:no-underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            :disabled="!description"
            @click="description = ''"
          >
            {{ t('feedback.description.clear') }}
          </button>
        </div>
        <textarea
          id="description"
          v-model="description"
          :placeholder="t('feedback.description.placeholder')"
          rows="10"
          class="w-full px-3 py-2 border-none bg-surface-low dark:bg-stone-800 text-ink dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-kapok/30 resize-vertical transition-colors"
          required
        ></textarea>
      </div>

      <!-- 词条相关信息（当反馈类型为词条错误时显示） -->
      <div v-if="feedbackType === 'entry-error'" class="space-y-3">
        <div>
          <label for="entry-word" class="block text-sm font-medium text-ink/80 dark:text-stone-300 mb-2">
            {{ t('feedback.entry.word.label') }}
          </label>
          <input
            id="entry-word"
            v-model="entryWord"
            type="text"
            :placeholder="t('feedback.entry.word.placeholder')"
            class="w-full px-3 py-2 border-none bg-surface-low dark:bg-stone-800 text-ink dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-kapok/30 transition-colors"
          >
        </div>
        <div>
          <label for="entry-source" class="block text-sm font-medium text-ink/80 dark:text-stone-300 mb-2">
            {{ t('feedback.entry.source.label') }}
          </label>
          <select
            id="entry-source"
            v-model="entrySource"
            class="w-full px-3 py-2 border-none bg-surface-low dark:bg-stone-800 text-ink dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-kapok/30 transition-colors"
          >
            <option value="">{{ t('feedback.entry.source.placeholder') }}</option>
            <option v-for="source in dictionarySources" :key="source.value" :value="source.value">
              {{ source.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- 联系方式（可选） -->
      <div>
        <label for="contact" class="block text-sm font-medium text-ink/80 dark:text-stone-300 mb-2">
          {{ t('feedback.contact.label') }}
        </label>
        <input
          id="contact"
          v-model="contact"
          type="text"
          :placeholder="t('feedback.contact.placeholder')"
          class="w-full px-3 py-2 border-none bg-surface-low dark:bg-stone-800 text-ink dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-kapok/30 transition-colors"
        >
        <p class="text-xs text-graphite/60 dark:text-stone-200 mt-1">{{ t('feedback.contact.hint') }}</p>
      </div>

      <!-- 提交行：左侧提示，右侧按钮 -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-4">
        <div class="text-sm flex items-center gap-2 min-h-[28px] text-ink/80 dark:text-stone-300">
          <template v-if="showSuccess && successUrl">
            <svg class="w-4 h-4 text-archive-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span class="text-archive-green">
              {{ t('feedback.success.message') }}
              <a :href="successUrl" target="_blank" class="underline font-medium">
                {{ t('feedback.success.linkText') }} {{ successIssueNumber ? `#${successIssueNumber}` : successUrl }}
              </a>
            </span>
          </template>
          <template v-else-if="errorMessage">
            <svg class="w-4 h-4 text-kapok" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m-6 4h8a2 2 0 002-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span class="text-kapok">{{ errorMessage }}</span>
          </template>
        </div>

        <div class="flex gap-3">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 text-sm font-medium text-graphite dark:text-stone-400 bg-surface-low dark:bg-stone-800 hover:bg-surface-high dark:hover:bg-stone-700 transition-colors"
          >
            {{ t('feedback.cancel') }}
          </button>
          <button
            type="submit"
            :disabled="isSubmitting || showSuccess"
            :class="[
              'px-4 py-2 text-sm font-medium text-white flex items-center gap-2 transition-colors',
              isSubmitting
                ? 'bg-kapok'
                : showSuccess
                  ? 'bg-archive-green hover:bg-archive-green/90'
                  : errorMessage
                    ? 'bg-kapok hover:bg-kapok/90'
                    : 'bg-kapok hover:bg-kapok/90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            ]"
          >
            <svg v-if="isSubmitting" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span v-if="isSubmitting">{{ t('feedback.submitting') }}</span>
            <span v-else-if="showSuccess">{{ t('feedback.success.buttonLabel') }}</span>
            <span v-else-if="errorMessage">{{ t('feedback.error.buttonLabel') }}</span>
            <span v-else>{{ t('feedback.submit') }}</span>
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()

// 根据当前语言获取词典名称
const getDictionaryName = (name: string | Record<string, string>): string => {
  if (typeof name === 'string') {
    return name
  }
  // 尝试匹配当前语言
  const currentLocale = locale.value
  if (name[currentLocale]) {
    return name[currentLocale]
  }
  // fallback 顺序：yue-Hant -> yue-Hans -> 第一个可用
  const fallbacks = ['yue-Hant', 'yue-Hans']
  for (const fb of fallbacks) {
    if (name[fb]) {
      return name[fb]
    }
  }
  // 最后尝试返回第一个可用的值
  const firstKey = Object.keys(name)[0]
  return firstKey ? (name[firstKey] || '') : ''
}

// Props
interface Props {
  entryData?: {
    word: string
    source?: string
    id?: string
  }
  /**
   * 外部传入的初始描述内容
   * 用于在词条卡片中点击反馈时，自动填充当前词条的完整信息，方便用户直接修改
   */
  initialDescription?: string
  initialType?: 'bug' | 'feature' | 'entry-error'
}

const props = withDefaults(defineProps<Props>(), {
  entryData: undefined,
  initialDescription: undefined,
  initialType: undefined
})

interface DictionaryIndexItem {
  id: string
  name: string | Record<string, string>
}

interface DictionaryIndex {
  dictionaries: DictionaryIndexItem[]
}

const dictIndexUrl: string = '/dictionaries/index.json'

const { data: dictIndex } = await useAsyncData<DictionaryIndex>('feedback-dictionaries', () =>
  $fetch<DictionaryIndex>(dictIndexUrl)
)

// Emits
const emit = defineEmits<{
  close: []
  submitted: []
}>()

// 反馈类型
const feedbackTypes = [
  {
    value: 'bug',
    label: t('feedback.type.bug')
  },
  {
    value: 'feature',
    label: t('feedback.type.feature')
  },
  {
    value: 'entry-error',
    label: t('feedback.type.entryError')
  }
]

// 词典来源（动态加载）
const dictionarySources = computed(() =>
  dictIndex.value?.dictionaries?.map((dict) => ({
    value: dict.id,
    label: getDictionaryName(dict.name)
  })) ?? []
)

type FeedbackType = 'bug' | 'feature' | 'entry-error'

// 表单数据
const feedbackType = ref<FeedbackType>('bug')
const title = ref('')
// 描述默认使用外部传入的初始内容（如果有），便于用户在此基础上直接修改
const description = ref(props.initialDescription || '')
const entryWord = ref(props.entryData?.word || '')
const entrySource = ref('')
const contact = ref('')

// 状态
const isSubmitting = ref(false)
const showSuccess = ref(false)
const errorMessage = ref('')

const normalizeEntrySource = (source?: string) => {
  if (!source) return ''
  const sources = dictionarySources.value
  const dictionaries = dictIndex.value?.dictionaries || []

  // 若传入的是 value（dict id），直接返回
  if (sources.some((s) => s.value === source)) return source

  // 若传入的是 name/label（任意语言版本），映射为 value
  // 优先检查所有语言版本的 name 字段（因为词条数据中的 source_book 可能是任意语言版本）
  for (const dict of dictionaries) {
    const name = dict.name
    if (typeof name === 'string') {
      if (name === source) return dict.id
    } else {
      // 检查所有语言版本的名称
      for (const langKey of Object.keys(name)) {
        if (name[langKey] === source) return dict.id
      }
    }
  }

  // 最后检查当前语言的 label（兼容性处理）
  const matched = sources.find((s) => s.label === source)
  return matched?.value || ''
}

// 初始化/同步：来自外部上下文时，默认切到"词条纠错"，并预填词语/来源
watchEffect(() => {
  if (props.initialType) {
    feedbackType.value = props.initialType
  } else if (props.entryData) {
    feedbackType.value = 'entry-error'
  }

  if (props.entryData?.word) entryWord.value = props.entryData.word
  entrySource.value = normalizeEntrySource(props.entryData?.source)
})

// 提交反馈
const submitFeedback = async () => {
  // 防止重复提交：如果正在提交或已经成功，直接返回
  if (isSubmitting.value || showSuccess.value) return

  isSubmitting.value = true
  errorMessage.value = ''
  showSuccess.value = false // 重置成功状态（如果之前有错误后重试）

  try {
    // 调用后端 API 创建 Issue
    const payload = {
      title: `[${feedbackType.value.toUpperCase()}] ${title.value}`,
      description: description.value,
      feedbackType: feedbackType.value,
      entryWord: entryWord.value,
      entrySource: entrySource.value,
      entryId: props.entryData?.id || '',
      contact: contact.value || ''
    }

    const res = await $fetch<{ url: string; number: number }>('/api/feedback.issue', {
      method: 'POST',
      body: payload
    })

    showSuccess.value = true
    successUrl.value = res.url
    successIssueNumber.value = res.number

  } catch (error) {
    console.error('提交回饋失敗:', error)
    errorMessage.value = t('feedback.error.submitFailed')
  } finally {
    isSubmitting.value = false
  }
}

const successUrl = ref<string | null>(null)
const successIssueNumber = ref<number | null>(null)
</script>
