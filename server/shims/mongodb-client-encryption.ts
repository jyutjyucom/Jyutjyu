import { UnsupportedMongoDependency } from './mongodb-optional'

export class MongoCrypt extends UnsupportedMongoDependency {
  constructor() {
    super('mongodb-client-encryption')
  }
}

export class ClientEncryption extends UnsupportedMongoDependency {
  constructor() {
    super('mongodb-client-encryption')
  }
}

export default {
  MongoCrypt,
  ClientEncryption,
}
