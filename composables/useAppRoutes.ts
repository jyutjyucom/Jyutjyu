import {
  buildBrowseRoutePath,
  buildSearchRouteQuery,
  buildWordRoutePath
} from '~/utils/route-paths'

interface BrowsePathOptions {
  page?: number
  pageSize?: number
  sortBy?: string
  defaultPageSize?: number
  defaultSortBy?: string
}

type RouteQueryValue = string | number | undefined | null

export const useAppRoutes = () => {
  const localePath = useLocalePath()
  const config = useRuntimeConfig()

  const siteUrl = computed(() =>
    String(config.public.siteUrl || '').replace(/\/+$/, '')
  )

  const localizedPath = (
    path: string,
    query?: Record<string, RouteQueryValue>
  ): string => {
    const sanitizedQuery = Object.fromEntries(
      Object.entries(query || {}).filter(([, value]) => {
        if (value === undefined || value === null) return false
        if (typeof value === 'string') return value.trim() !== ''
        return true
      })
    )

    if (Object.keys(sanitizedQuery).length === 0) {
      return localePath(path)
    }

    return localePath({ path, query: sanitizedQuery })
  }

  const homePath = () => localePath('/')

  const wordPath = (headword: string) => {
    return localizedPath(buildWordRoutePath(headword))
  }

  const browsePath = (dictId?: string, options: BrowsePathOptions = {}) => {
    return localizedPath(buildBrowseRoutePath(dictId), {
      page: options.page && options.page > 1 ? options.page : undefined,
      size:
        options.pageSize !== undefined &&
        options.pageSize !== options.defaultPageSize
          ? options.pageSize
          : undefined,
      sort:
        options.sortBy && options.sortBy !== options.defaultSortBy
          ? options.sortBy
          : undefined
    })
  }

  const searchPath = (query = '', reverse = false) => {
    return localizedPath('/search', buildSearchRouteQuery(query, reverse))
  }

  const absoluteUrl = (path: string) => {
    if (!siteUrl.value) return ''
    if (/^https?:\/\//.test(path)) return path
    return new URL(path || '/', `${siteUrl.value}/`).toString()
  }

  return {
    localePath,
    siteUrl,
    localizedPath,
    homePath,
    wordPath,
    browsePath,
    searchPath,
    absoluteUrl
  }
}
