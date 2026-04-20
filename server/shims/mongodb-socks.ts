import {
  UnsupportedMongoDependency,
  unsupportedMongoDependency,
} from './mongodb-optional'

export class SocksClient extends UnsupportedMongoDependency {
  constructor() {
    super('socks')
  }

  static createConnection() {
    return unsupportedMongoDependency('socks')
  }
}

export default {
  SocksClient,
}
