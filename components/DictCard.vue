<template>
  <div class="dict-card bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
    <!-- 头部：词头 + 粤拼 -->
    <div class="card-header px-6 py-4 border-b border-gray-100">
      <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
        <!-- 词头部分 -->
        <div class="flex-1 min-w-0">
          <h3 class="text-2xl font-bold text-gray-900 mb-1 break-words">
            {{ entry.headword.display }}
            <!-- 开天窗字标记 -->
            <span
              v-if="entry.headword.is_placeholder"
              class="ml-2 text-xs text-orange-600 font-normal"
              :title="t('dictCard.placeholderWord')"
            >
              {{ t('dictCard.placeholderWord') }}
            </span>
            <!-- 同形异义标记 -->
            <sup
              v-if="entry.meta?.variant_number"
              class="ml-1 text-sm text-gray-500"
            >
              {{ entry.meta.variant_number }}
            </sup>
          </h3>
          
          <!-- 粤拼 + 原书注音（紧跟在词头下方） -->
          <div class="mt-2">
            <!-- 多个粤拼读音 -->
            <div
              v-for="(jp, idx) in entry.phonetic.jyutping"
              :key="idx"
              class="flex items-center gap-1.5 flex-wrap"
            >
              <!-- 粤拼 -->
              <div class="font-mono text-lg text-blue-600 font-semibold break-words">
                {{ jp }}
              </div>
              <!-- 原书注音（始终在粤拼右边，空间不足时换行） -->
              <div
                v-if="getOriginalPhonetic(entry, idx)"
                class="text-xs text-gray-500 break-words"
              >
                <span class="text-gray-400">{{ t('dictCard.originalPhonetic') }}</span>{{ getOriginalPhonetic(entry, idx) }}
              </div>
            </div>
          </div>
          
          <!-- 异形词 -->
          <p
            v-if="entry.meta?.headword_variants && entry.meta.headword_variants.length > 0"
            class="text-sm text-gray-600 break-words mt-2"
          >
            {{ t('dictCard.variantWords') }}{{ entry.meta.headword_variants.join('、') }}
          </p>
          <!-- 如果显示词和标准词不同，显示标准词 -->
          <p
            v-if="entry.headword.display !== entry.headword.normalized"
            class="text-sm text-gray-500 break-words mt-1"
          >
            {{ t('dictCard.standardWriting') }}{{ entry.headword.normalized }}
          </p>
        </div>

        <!-- 标签：来源、分类等（大屏幕右上角，移动端下方） -->
        <div class="flex flex-wrap gap-2 md:justify-end md:mt-0 md:ml-4 md:max-w-[40%]">
          <!-- 来源词典: ID -->
          <span class="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm whitespace-nowrap">
            {{ entry.source_book }}<template v-if="entry.source_id">: {{ entry.source_id }}</template>
          </span>

          <!-- 方言 -->
          <span class="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm whitespace-nowrap">
            {{ dialectLabel }}
          </span>

          <!-- 词条类型 -->
          <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm whitespace-nowrap">
            {{ entryTypeLabel }}
          </span>

          <!-- 语域标签（口语、书面、俚语等） -->
          <span
            v-if="entry.meta?.register"
            class="px-3 py-1 bg-orange-50 text-orange-700 rounded-lg text-sm whitespace-nowrap"
          >
            {{ entry.meta.register }}
          </span>

          <!-- 分类（如果有） -->
          <span
            v-if="entry.meta?.category"
            class="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm break-words max-w-full"
          >
            {{ entry.meta.category }}
          </span>
        </div>
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

            <!-- 子义项（A) B) C) 等） -->
            <div
              v-if="sense.sub_senses && sense.sub_senses.length > 0"
              class="space-y-3 mt-3"
            >
              <div
                v-for="(subSense, subIdx) in sense.sub_senses"
                :key="subIdx"
                class="pl-4 border-l-2 border-blue-200"
              >
                <!-- 子义项标签和释义 -->
                <div class="mb-2">
                  <span class="inline-block font-semibold text-blue-700 mr-2">
                    {{ subSense.label }})
                  </span>
                  <span class="text-gray-800">
                    {{ subSense.definition }}
                  </span>
                </div>
                
                <!-- 子义项的例句 -->
                <div
                  v-if="subSense.examples && subSense.examples.length > 0"
                  class="space-y-2"
                >
                  <div
                    v-for="(example, exIdx) in subSense.examples"
                    :key="exIdx"
                    class="pl-4 border-l-2 border-gray-200"
                  >
                    <p
                      v-if="isCantoDict"
                      class="text-gray-700 text-base"
                      v-html="formatDefinitionWithLinks(example.text)"
                    ></p>
                    <p
                      v-else
                      class="text-gray-700 text-base"
                    >
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

            <!-- 例句（仅在没有子义项时显示） -->
            <div
              v-if="(!sense.sub_senses || sense.sub_senses.length === 0) && sense.examples && sense.examples.length > 0"
              class="space-y-2"
            >
              <div
                v-for="(example, exIdx) in sense.examples"
                :key="exIdx"
                class="pl-4 border-l-2 border-gray-200"
              >
                <p
                  v-if="isCantoDict"
                  class="text-gray-700 text-base"
                  v-html="formatDefinitionWithLinks(example.text)"
                ></p>
                <p
                  v-else
                  class="text-gray-700 text-base"
                >
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
        v-if="entry.meta?.notes"
        class="mt-4 p-3 border-l-4 text-sm"
        :class="entry.meta?.note_type === 'proofreader' 
          ? 'bg-blue-50 border-blue-400 text-gray-700' 
          : 'bg-yellow-50 border-yellow-400 text-gray-700'"
      >
        <span 
          class="font-semibold"
          :class="entry.meta?.note_type === 'proofreader' ? 'text-blue-700' : 'text-yellow-700'"
        >
          {{ entry.meta?.note_type === 'proofreader' ? t('dictCard.proofreaderNote') : t('dictCard.note') }}
        </span>
        {{ entry.meta.notes }}
      </div>

      <!-- 词源（用于 wiktionary 等真正的词源说明） -->
      <div
        v-if="entry.meta?.etymology && typeof entry.meta.etymology === 'string'"
        class="mt-4 p-3 border-l-4 bg-purple-50 border-purple-400 text-sm text-gray-700"
      >
        <span class="font-semibold text-purple-700">{{ t('dictCard.etymology') }}</span>
        {{ entry.meta.etymology }}
      </div>

      <!-- 参考文献（用于 gz-word-origins 的文献引用） -->
      <div
        v-if="entry.meta?.references && entry.meta.references.length > 0"
        class="mt-4 p-3 border-l-4 bg-amber-50 border-amber-400 text-sm text-gray-700"
      >
        <span class="font-semibold text-amber-700">{{ t('dictCard.references') }}</span>
        <ul class="mt-2 space-y-2">
          <li
            v-for="(ref, refIdx) in entry.meta.references"
            :key="refIdx"
          >
            <!-- 作者和作品 -->
            <span v-if="ref.author" class="font-medium">{{ ref.author }}</span>
            <span v-if="ref.work">《{{ ref.work }}》</span>
            <span v-if="ref.author || ref.work">：</span>
            <!-- 引文（用 ～ 代替词头） -->
            <span v-if="ref.quote">{{ ref.quote }}</span>
            <!-- 出处 -->
            <span v-if="ref.source" class="text-gray-500">（{{ ref.source }}）</span>
          </li>
        </ul>
      </div>

      <!-- 参见 -->
      <div
        v-if="entry.refs && entry.refs.length > 0"
        class="mt-4 text-sm"
      >
        <span class="text-gray-500">{{ t('dictCard.seeAlso') }}</span>
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
        <span>{{ detailsExpanded ? t('dictCard.collapse') : t('dictCard.expand') }} {{ t('dictCard.details') }}</span>
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
        <p v-if="entry.meta?.usage">
          <span class="font-semibold">{{ t('dictCard.usage') }}</span> {{ entry.meta.usage }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DictionaryEntry } from '~/types/dictionary'

const { t } = useI18n()

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
    character: t('dictCard.entryTypeCharacter'),
    word: t('dictCard.entryTypeWord'),
    phrase: t('dictCard.entryTypePhrase')
  }
  return labels[props.entry.entry_type] || props.entry.entry_type
})

// 方言标签：使用地区代码映射（便于 i18n）
const dialectLabel = computed(() => {
  const code = props.entry.dialect?.region_code?.toUpperCase()
  if (code === 'GZ' || code === 'HK' || code === 'YUE') {
    return t(`dictCard.dialect.${code}`)
  }
  // 回退：无地区代码时使用原始名称（兼容旧数据）
  return props.entry.dialect?.name || ''
})

// 是否有额外信息（不包括词源和语域，因为它们已在顶部展示）
const hasExtraInfo = computed(() => {
  return !!(
    props.entry.meta?.usage
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
  
  // 匹配以#开头的词组（仅汉字）
  // 使用排除法：排除 ASCII 字符、空格、中文标点、全角字符等
  // 这样可以自动支持所有汉字区块（包括未来的扩展区块）
  const regex = /#([^\u0000-\u007F\u3000-\u303F\uFF00-\uFFEF\s]+)/g
  
  return definition.replace(regex, (match, word) => {
    // 生成搜索链接
    const searchUrl = `/search?q=${encodeURIComponent(word)}`
    return `<a href="${searchUrl}" class="text-blue-600 hover:text-blue-800 hover:underline font-medium" onclick="event.stopPropagation()">${match}</a>`
  })
}

/**
 * 统一获取指定索引的原书注音
 * 原书注音始终显示在对应粤拼的右边，空间不足时自动换行
 * @param entry - 词条对象
 * @param idx - 粤拼索引
 * @returns 原书注音字符串或null
 */
const getOriginalPhonetic = (entry: any, idx: number): string | null => {
  const original = entry.phonetic.original
  const jyutpingArray = entry.phonetic.jyutping || []
  const currentJyutping = jyutpingArray[idx]
  
  if (!original || (Array.isArray(original) && original.length === 0)) {
    return null
  }
  
  // 如果 original 是数组
  if (Array.isArray(original)) {
    // 如果数组只有一个元素，只在第一个粤拼时显示
    if (original.length === 1) {
      if (idx === 0) {
        const singleOriginal = original[0]
        // 如果原书注音等于当前粤拼，不显示
        if (singleOriginal === currentJyutping) return null
        return singleOriginal
      }
      return null
    }
    // 数组有多个元素时，返回对应索引的值
    const matchedOriginal = original[idx]
    if (matchedOriginal && matchedOriginal !== currentJyutping) {
      return matchedOriginal
    }
    return null
  }
  
  // 如果 original 是单个值，只在第一个粤拼时显示
  if (idx === 0) {
    // 如果原书注音等于当前粤拼，不显示
    if (original === currentJyutping) return null
    
    // 检查是否是冒号分隔的多读音格式 (hk-cantowords)
    if (original.includes(':')) {
      const originalParts = original.split(':').map((p: string) => p.trim())
      const jyutpingSet = new Set(jyutpingArray)
      
      // 如果所有原始读音部分都在 jyutping 数组中，说明已经正确拆分显示，不显示
      if (originalParts.every((part: string) => jyutpingSet.has(part))) {
        return null
      }
    }
    
    // 检查是否是括号变体格式 (gz-practical-classified)
    // 例如: "baau6 (biu6, beu6)" 或 "dit1 (dik1) gam3 doe1 (do1)"
    if (original.includes('(') || original.includes('（')) {
      // 提取所有独立的读音：去掉括号，用空格和逗号分割
      const cleanedOriginal = original
        .replace(/[（(]/g, ' ')
        .replace(/[）)]/g, ' ')
        .replace(/[,，]/g, ' ')
      const allSyllables = cleanedOriginal.split(/\s+/).filter((s: string) => s.trim())
      
      // 检查 jyutping 数组是否覆盖了所有提取的读音
      const syllableSet = new Set(allSyllables)
      
      // 方法1：检查所有独立音节是否都出现在 jyutping 数组中（单字多音情况）
      const allSyllablesInJyutping = allSyllables.every((s: string) => 
        jyutpingArray.includes(s) || jyutpingArray.some((jp: string) => jp.includes(s))
      )
      
      // 方法2：检查 jyutping 数组中的所有项是否都由原始音节组成
      const allJyutpingFromSyllables = jyutpingArray.every((jp: string) => {
        const jpSyllables = jp.split(/\s+/)
        return jpSyllables.every((s: string) => syllableSet.has(s))
      })
      
      if (allSyllablesInJyutping || allJyutpingFromSyllables) {
        return null
      }
    }
    
    // 其他情况显示原书注音（如耶鲁拼音等不同的注音系统）
    return original
  }
  
  return null
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

