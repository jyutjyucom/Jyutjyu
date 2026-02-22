<template>
  <div
    class="sticky z-[8] bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/90 supports-[backdrop-filter]:dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-700 -mx-4 px-4"
    :style="stickyStyle"
  >
    <div
      class="overflow-x-auto py-2"
      role="tablist"
      :aria-label="ariaLabel"
    >
      <div class="flex flex-nowrap items-center gap-2 min-w-max">
        <button
          v-for="(tab, index) in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          class="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors whitespace-nowrap"
          :class="tab.id === modelValue
            ? 'bg-blue-600 text-white'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20'"
          :aria-selected="tab.id === modelValue"
          @click="$emit('update:modelValue', tab.id)"
          @keydown="onTabKeydown($event, index)"
        >
          <span class="font-mono font-semibold">{{ tab.label }}</span>
          <span
            class="text-xs px-1.5 py-0.5 rounded-full"
            :class="tab.id === modelValue
              ? 'bg-white/20 text-white'
              : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'"
          >
            {{ tab.dictionaryCount }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface PronunciationTab {
  id: string
  label: string
  dictionaryCount: number
}

interface Props {
  modelValue: string
  tabs: PronunciationTab[]
  stickyOffset?: number
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  stickyOffset: 0,
  ariaLabel: 'Pronunciation tabs'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const stickyStyle = computed(() => ({
  top: `${Math.max(0, props.stickyOffset)}px`
}))

const onTabKeydown = (event: KeyboardEvent, currentIndex: number) => {
  if (props.tabs.length <= 1) return

  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') {
    return
  }

  event.preventDefault()

  let nextIndex = currentIndex
  if (event.key === 'ArrowRight') {
    nextIndex = (currentIndex + 1) % props.tabs.length
  } else if (event.key === 'ArrowLeft') {
    nextIndex = (currentIndex - 1 + props.tabs.length) % props.tabs.length
  } else if (event.key === 'Home') {
    nextIndex = 0
  } else if (event.key === 'End') {
    nextIndex = props.tabs.length - 1
  }

  const nextTab = props.tabs[nextIndex]
  if (nextTab) {
    emit('update:modelValue', nextTab.id)
  }
}
</script>
