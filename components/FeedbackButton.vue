<template>
  <div class="inline-flex">
    <!-- 反馈按钮（内联，不悬浮） -->
    <button
      type="button"
      @click="showFeedbackModal = true"
      class="inline-flex items-center gap-2"
      :class="buttonClass"
      :aria-label="t('feedback.buttonTitle')"
    >
      <MessageSquare class="w-4 h-4" aria-hidden="true" />
      <template v-if="iconOnly">
        <span class="sr-only">{{ t('feedback.buttonTitle') }}</span>
      </template>
      <template v-else>
        <span :class="labelClass">{{ t('feedback.buttonShort') }}</span>
      </template>
    </button>

    <!-- 反馈模态框 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-300"
        leave-active-class="transition-opacity duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showFeedbackModal"
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          @click.self="showFeedbackModal = false"
        >
          <Transition
            enter-active-class="transition-transform duration-300"
            leave-active-class="transition-transform duration-300"
            enter-from-class="scale-95 opacity-0"
            enter-to-class="scale-100 opacity-100"
            leave-from-class="scale-100 opacity-100"
            leave-to-class="scale-95 opacity-0"
          >
            <div
              v-if="showFeedbackModal"
              class="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <FeedbackForm
                :entry-data="entryData"
                :initial-description="initialDescription"
                :initial-type="initialType"
                @close="showFeedbackModal = false"
                @submitted="handleFeedbackSubmitted"
              />
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { MessageSquare } from 'lucide-vue-next'

const { t } = useI18n()

// Props
interface Props {
  entryData?: {
    word: string
    source?: string
    id?: string
  }
  /**
   * 外部提供的初始描述内容
   * 例如：从词条卡片传入完整词条信息，方便用户在反馈时直接修改
   */
  initialDescription?: string
  buttonClass?: string
  iconOnly?: boolean
  labelClass?: string
  initialType?: 'bug' | 'feature' | 'entry-error'
}

const props = withDefaults(defineProps<Props>(), {
  entryData: undefined,
  initialDescription: undefined,
  buttonClass: 'inline-flex items-center gap-2 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors',
  iconOnly: false,
  labelClass: 'text-base',
  initialType: undefined
})

// 状态
const showFeedbackModal = ref(false)

// 处理反馈提交
const handleFeedbackSubmitted = () => {
  showFeedbackModal.value = false
  // 可以在这里添加一些成功提示或统计
}
</script>
