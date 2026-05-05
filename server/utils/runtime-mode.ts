interface ServerApiModeOptions {
  publicUseApi?: unknown;
  mongodbUri?: unknown;
  nodeEnv?: unknown;
}

const isEnabledFlag = (value: unknown): boolean => {
  return value === true || String(value).trim().toLowerCase() === 'true'
}

const isDisabledFlag = (value: unknown): boolean => {
  return value === false || String(value).trim().toLowerCase() === 'false'
}

const isProductionEnv = (value: unknown): boolean => {
  return String(value || process.env.NODE_ENV || '')
    .trim()
    .toLowerCase() === 'production'
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

  if (isEnabledFlag(options.publicUseApi)) {
    return true
  }

  if (isDisabledFlag(options.publicUseApi)) {
    return false
  }

  // 生产环境：优先使用API mode（如果有MongoDB），否则fallback到JSON mode
  if (isProductionEnv(options.nodeEnv)) {
    const runtimeMongoUri = getRuntimeMongoUri()
    if (runtimeMongoUri) {
      return true
    }
    if (String(options.mongodbUri || '').trim()) {
      return true
    }
    return false
  }

  // 开发环境：检查MongoDB可用性
  const runtimeMongoUri = getRuntimeMongoUri()
  if (runtimeMongoUri) {
    return true
  }

  if (String(options.mongodbUri || '').trim()) {
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
