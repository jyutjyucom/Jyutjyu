import { unsupportedMongoDependency } from './mongodb-optional'

export const isAvailable = async () =>
  unsupportedMongoDependency('gcp-metadata')

export const instance = async () =>
  unsupportedMongoDependency('gcp-metadata')

export default {
  isAvailable,
  instance,
}
