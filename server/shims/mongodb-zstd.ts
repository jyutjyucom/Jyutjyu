import {
  UnsupportedMongoDependency,
  unsupportedMongoDependency,
} from './mongodb-optional'

export class ZstdCompressor extends UnsupportedMongoDependency {
  constructor() {
    super('@mongodb-js/zstd')
  }
}

export const compress = () => unsupportedMongoDependency('@mongodb-js/zstd')
export const decompress = () => unsupportedMongoDependency('@mongodb-js/zstd')

export default {
  ZstdCompressor,
  compress,
  decompress,
}
