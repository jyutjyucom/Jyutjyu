import {
  UnsupportedMongoDependency,
  unsupportedMongoDependency,
} from './mongodb-optional'

export class SnappyCompressor extends UnsupportedMongoDependency {
  constructor() {
    super('snappy')
  }
}

export const compress = () => unsupportedMongoDependency('snappy')
export const uncompress = () => unsupportedMongoDependency('snappy')

export default {
  SnappyCompressor,
  compress,
  uncompress,
}
