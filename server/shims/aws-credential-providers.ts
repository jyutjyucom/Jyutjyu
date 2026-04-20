const unsupported = () => {
  throw new Error(
    'MONGODB-AWS authentication is not supported in this Cloudflare Workers build.',
  )
}

export const fromNodeProviderChain = unsupported
export const fromTemporaryCredentials = unsupported
export const fromEnv = unsupported
export const fromIni = unsupported
export const fromProcess = unsupported
export const fromSSO = unsupported
export const fromTokenFile = unsupported
export const fromContainerMetadata = unsupported
export const fromInstanceMetadata = unsupported
