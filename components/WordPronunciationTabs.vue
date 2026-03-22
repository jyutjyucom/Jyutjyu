<template>
  <div
    class="sticky z-[8] bg-parchment/95 dark:bg-stone-950/95 backdrop-blur supports-[backdrop-filter]:bg-parchment/90 supports-[backdrop-filter]:dark:bg-stone-950/90 -mx-6 md:-mx-8 px-6 md:px-8"
    :style="stickyStyle"
  >
    <div
      class="overflow-x-auto py-2"
      role="tablist"
      :aria-label="ariaLabel"
    >
      <div class="flex flex-nowrap items-center gap-1.5 min-w-max bg-surface-low dark:bg-stone-900 p-1.5 rounded-lg w-fit">
        <button
          v-for="(tab, index) in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          class="inline-flex items-center gap-2 px-5 py-2 rounded-md text-base transition-all whitespace-nowrap"
          :class="tab.id === modelValue
            ? 'bg-kapok text-white font-bold shadow-lg shadow-kapok/20'
            : 'text-graphite dark:text-stone-400 hover:text-ink dark:hover:text-stone-200 font-medium'"
          :aria-selected="tab.id === modelValue"
          @click="$emit('update:modelValue', tab.id)"
          @keydown="onTabKeydown($event, index)"
        >
          <span class="font-semibold">{{ tab.label }}</span>
          <span
            class="text-xs px-1.5 py-0.5 rounded-full"
            :class="tab.id === modelValue
              ? 'bg-white/20 text-white'
              : 'bg-kapok/10 dark:bg-kapok/20 text-kapok'"
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
