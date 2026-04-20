interface ServerApiModeOptions {
  publicUseApi?: unknown;
  mongodbUri?: unknown;
}

const isEnabledFlag = (value: unknown): boolean => {
  return value === true || String(value).trim().toLowerCase() === 'true'
}

const getRuntimeUseApiOverride = (): boolean | undefined => {
  const value = String(process.env.NUXT_PUBLIC_USE_API || '')
    .trim()
    .toLowerCase()

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return undefined
}

const getRuntimeMongoUri = (): string => {
  return String(process.env.MONGODB_URI || '').trim()
}

export const resolveServerUseApi = (
  options: ServerApiModeOptions,
): boolean => {
  const runtimeUseApi = getRuntimeUseApiOverride()
  if (typeof runtimeUseApi === 'boolean') {
    return runtimeUseApi
  }

  const runtimeMongoUri = getRuntimeMongoUri()
  if (runtimeMongoUri) {
    return true
  }

  if (String(options.mongodbUri || '').trim()) {
    return true
  }

  if (isEnabledFlag(options.publicUseApi)) {
    return true
  }

  return false
}

export const getIsServerApiEnabled = (): boolean => {
  const config = useRuntimeConfig()

  return resolveServerUseApi({
    publicUseApi: config.public.useApi,
    mongodbUri: config.mongodbUri,
  })
}
