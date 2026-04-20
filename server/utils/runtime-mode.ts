interface ServerApiModeOptions {
  publicUseApi?: unknown;
  mongodbUri?: unknown;
}

const isEnabledFlag = (value: unknown): boolean => {
  return value === true || String(value).trim().toLowerCase() === 'true'
}

export const resolveServerUseApi = (
  options: ServerApiModeOptions,
): boolean => {
  if (isEnabledFlag(options.publicUseApi)) {
    return true
  }

  return Boolean(String(options.mongodbUri || '').trim())
}

export const getIsServerApiEnabled = (): boolean => {
  const config = useRuntimeConfig()

  return resolveServerUseApi({
    publicUseApi: config.public.useApi,
    mongodbUri: config.mongodbUri,
  })
}
