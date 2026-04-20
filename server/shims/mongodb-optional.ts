export const unsupportedMongoDependency = (feature: string) => {
  throw new Error(
    `${feature} is not supported in this Cloudflare Workers build.`,
  )
}

export class UnsupportedMongoDependency {
  constructor(feature: string) {
    unsupportedMongoDependency(feature)
  }
}
