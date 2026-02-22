<template>
  <nav class="flex items-center justify-between gap-2" aria-label="Pagination">
    <NuxtLink
      v-if="page > 1"
      :to="pageLink(page - 1)"
      class="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
    >
      {{ t('browse.prevPage') }}
    </NuxtLink>
    <span
      v-else
      class="px-3 py-1.5 text-sm font-medium text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 rounded-lg cursor-not-allowed"
    >
      {{ t('browse.prevPage') }}
    </span>
    <span class="text-sm text-gray-500 dark:text-gray-400 px-1">
      {{ t('browse.pageInfo', { page, total: totalPages }) }}
    </span>
    <NuxtLink
      v-if="page < totalPages"
      :to="pageLink(page + 1)"
      class="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800"
    >
      {{ t('browse.nextPage') }}
    </NuxtLink>
    <span
      v-else
      class="px-3 py-1.5 text-sm font-medium text-gray-400 dark:text-gray-500 bg-blue-50 dark:bg-blue-950 rounded-lg cursor-not-allowed"
    >
      {{ t('browse.nextPage') }}
    </span>
  </nav>
</template>

<script setup lang="ts">
const { t } = useI18n()
type BrowseSort = 'headword' | 'jyutping'

const props = defineProps<{
  page: number
  totalPages: number
  basePath?: string
  pageSize?: number
  sortBy?: BrowseSort
}>()

const DEFAULT_PAGE_SIZE = 100
const DEFAULT_SORT_BY: BrowseSort = 'headword'

const pageLink = (p: number) => {
  const path = props.basePath || '/browse'
  const query = new URLSearchParams()

  if (p > 1) {
    query.set('page', String(p))
  }

  if (props.pageSize && props.pageSize !== DEFAULT_PAGE_SIZE) {
    query.set('size', String(props.pageSize))
  }

  if (props.sortBy && props.sortBy !== DEFAULT_SORT_BY) {
    query.set('sort', props.sortBy)
  }

  const suffix = query.toString()
  return suffix ? `${path}?${suffix}` : path
}
</script>
