<template>
  <div class="dict-card bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
    <!-- 头部：词头 + 粤拼 -->
    <div class="card-header px-6 py-4 border-b border-gray-100">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
        <!-- 词头 -->
        <div class="flex-1 min-w-0">
          <h3 class="text-2xl font-bold text-gray-900 mb-1 break-words">
            {{ entry.headword.display }}
            <!-- 开天窗字标记 -->
            <span
              v-if="entry.headword.is_placeholder"
              class="ml-2 text-xs text-orange-600 font-normal"
              title="有音无字"
            >
              有音无字
            </span>
            <!-- 同形异义标记 -->
            <sup
              v-if="entry.meta.variant_number"
              class="ml-1 text-sm text-gray-500"
            >
              {{ entry.meta.variant_number }}
            </sup>
          </h3>
          <!-- 异体字 -->
          <p
            v-if="entry.meta.headword_variants && entry.meta.headword_variants.length > 0"
            class="text-sm text-gray-600 break-words"
          >
            异体字: {{ entry.meta.headword_variants.join('、') }}
          </p>
          <!-- 如果显示词和标准词不同，显示标准词 -->
          <p
            v-if="entry.headword.display !== entry.headword.normalized"
            class="text-sm text-gray-500 break-words"
          >
            参考标准写法: {{ entry.headword.normalized }}
          </p>
        </div>

        <!-- 粤拼 -->
        <div class="sm:text-right">
          <div
            v-for="(jp, idx) in entry.phonetic.jyutping"
            :key="idx"
            class="font-mono text-lg text-blue-600 font-semibold break-words"
          >
            {{ jp }}
          </div>
          <!-- 原书注音（如果不同） -->
          <div
            v-if="shouldShowOriginalPhonetic(entry)"
            class="text-xs text-gray-400 mt-1 break-words"
          >
            原书: {{ entry.phonetic.original }}
          </div>
        </div>
      </div>

      <!-- 标签：来源、分类等 -->
      <div class="flex flex-wrap gap-2 mt-3">
        <!-- 来源词典: ID -->
        <span class="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
          {{ entry.source_book }}：{{ entry.source_id }}
        </span>

        <!-- 方言 -->
        <span class="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
          {{ entry.dialect.name }}
        </span>

        <!-- 词条类型 -->
        <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
          {{ entryTypeLabel }}
        </span>

        <!-- 分类（如果有） -->
        <span
          v-if="entry.meta.category"
          class="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm"
        >
          {{ entry.meta.category }}
        </span>
      </div>
    </div>

    <!-- 内容：释义 -->
    <div class="card-body px-6 py-4">
      <!-- 多义项 -->
      <div
        v-for="(sense, senseIdx) in entry.senses"
        :key="senseIdx"
        class="mb-4 last:mb-0"
      >
        <!-- 义项编号（如果有多个） -->
        <div class="flex items-start gap-3">
          <span
            v-if="entry.senses.length > 1"
            class="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-sm flex items-center justify-center font-semibold"
          >
            {{ senseIdx + 1 }}
          </span>

          <div class="flex-1">
            <!-- 词性标签 -->
            <span
              v-if="sense.label"
              class="inline-block text-xs text-gray-500 mb-1"
            >
              {{ sense.label }}
            </span>

            <!-- 释义 -->
            <p
              v-if="isCantoDict"
              class="text-gray-800 text-base leading-relaxed mb-2"
              v-html="formatDefinitionWithLinks(sense.definition)"
            ></p>
            <p
              v-else
              class="text-gray-800 text-base leading-relaxed mb-2"
            >
              {{ sense.definition }}
            </p>

            <!-- 例句 -->
            <div
              v-if="sense.examples && sense.examples.length > 0"
              class="space-y-2"
            >
              <div
                v-for="(example, exIdx) in sense.examples"
                :key="exIdx"
                class="pl-4 border-l-2 border-gray-200"
              >
                <p class="text-gray-700 text-base">
                  {{ example.text }}
                </p>
                <!-- 例句粤拼 -->
                <p
                  v-if="example.jyutping"
                  class="text-sm text-blue-600 font-mono mt-1"
                >
                  {{ example.jyutping }}
                </p>
                <!-- 例句翻译 -->
                <p
                  v-if="example.translation"
                  class="text-base text-gray-500 mt-1"
                >
                  → {{ example.translation }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 备注 -->
      <div
        v-if="entry.meta.notes"
        class="mt-4 p-3 border-l-4 text-sm"
        :class="entry.meta.note_type === 'proofreader' 
          ? 'bg-blue-50 border-blue-400 text-gray-700' 
          : 'bg-yellow-50 border-yellow-400 text-gray-700'"
      >
        <span 
          class="font-semibold"
          :class="entry.meta.note_type === 'proofreader' ? 'text-blue-700' : 'text-yellow-700'"
        >
          {{ entry.meta.note_type === 'proofreader' ? '校对者备注：' : '备注：' }}
        </span>
        {{ entry.meta.notes }}
      </div>

      <!-- 参见 -->
      <div
        v-if="entry.refs && entry.refs.length > 0"
        class="mt-4 text-sm"
      >
        <span class="text-gray-500">参见：</span>
        <span
          v-for="(ref, refIdx) in entry.refs"
          :key="refIdx"
          class="ml-2"
        >
          <NuxtLink
            v-if="ref.type === 'word'"
            :to="`/search?q=${encodeURIComponent(ref.target)}`"
            class="text-blue-600 hover:underline"
          >
            {{ ref.target }}
          </NuxtLink>
          <span
            v-else
            class="text-gray-600"
          >
            {{ ref.target }}
          </span>
          <span
            v-if="refIdx < entry.refs.length - 1"
            class="text-gray-400"
          >
            、
          </span>
        </span>
      </div>
    </div>

    <!-- 底部：额外信息（可折叠） -->
    <div
      v-if="showDetails && hasExtraInfo"
      class="card-footer px-6 py-3 bg-gray-50 border-t border-gray-100"
    >
      <button
        class="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        @click="detailsExpanded = !detailsExpanded"
      >
        <span>{{ detailsExpanded ? '收起' : '展开' }}详情</span>
        <svg
          class="w-4 h-4 transition-transform"
          :class="{ 'rotate-180': detailsExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        v-show="detailsExpanded"
        class="mt-3 text-sm text-gray-600 space-y-1"
      >
        <p v-if="entry.meta.etymology">
          <span class="font-semibold">词源:</span> {{ entry.meta.etymology }}
        </p>
        <p v-if="entry.meta.usage">
          <span class="font-semibold">用法:</span> {{ entry.meta.usage }}
        </p>
        <p v-if="entry.meta.register">
          <span class="font-semibold">语域:</span> {{ entry.meta.register }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DictionaryEntry } from '~/types/dictionary'

interface Props {
  entry: DictionaryEntry
  showDetails?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: true
})

const detailsExpanded = ref(false)

// 词条类型标签
const entryTypeLabel = computed(() => {
  const labels = {
    character: '字',
    word: '词',
    phrase: '短语'
  }
  return labels[props.entry.entry_type] || props.entry.entry_type
})

// 是否有额外信息
const hasExtraInfo = computed(() => {
  return !!(
    props.entry.meta.etymology ||
    props.entry.meta.usage ||
    props.entry.meta.register
  )
})

// 判断是否为粤典
const isCantoDict = computed(() => {
  return props.entry.source_book === '粵典 (words.hk)' || 
         props.entry.source_book === '粵典'
})

/**
 * 将释义中以#开头的词组转换为可点击的搜索链接
 * 仅用于粤典词条
 */
const formatDefinitionWithLinks = (definition: string): string => {
  if (!definition) return ''
  
  // 匹配以#开头的词组（中文字符、数字、字母）
  // 支持#后面跟中文、数字、字母、下划线等
  const regex = /#([^\s，。！？；：、）】」』]+)/g
  
  return definition.replace(regex, (match, word) => {
    // 生成搜索链接
    const searchUrl = `/search?q=${encodeURIComponent(word)}`
    return `<a href="${searchUrl}" class="text-blue-600 hover:text-blue-800 hover:underline font-medium" onclick="event.stopPropagation()">${match}</a>`
  })
}

/**
 * 判断是否应该显示"原书:"标签
 * 对于包含冒号分隔的多个读音变体的情况（如 hk-cantowords），
 * 如果这些读音都已在 jyutping 数组中，则不显示原书标签
 */
const shouldShowOriginalPhonetic = (entry: any): boolean => {
  if (!entry.phonetic.original) return false
  
  // 如果 original 等于 jyutping[0]，不显示
  if (entry.phonetic.original === entry.phonetic.jyutping[0]) return false
  
  // 检查是否是冒号分隔的多读音格式
  if (entry.phonetic.original.includes(':')) {
    const originalParts = entry.phonetic.original.split(':').map((p: string) => p.trim())
    const jyutpingSet = new Set(entry.phonetic.jyutping)
    
    // 如果所有原始读音部分都在 jyutping 数组中，说明已经正确拆分显示，不需要再显示原书
    if (originalParts.every((part: string) => jyutpingSet.has(part))) {
      return false
    }
  }
  
  // 其他情况显示原书标签（如耶鲁拼音等不同的注音系统）
  return true
}
</script>

<style scoped>
.dict-card {
  /* 卡片动画 */
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

