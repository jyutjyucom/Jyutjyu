import { UnsupportedMongoDependency } from './mongodb-optional'

export class Kerberos extends UnsupportedMongoDependency {
  constructor() {
    super('kerberos')
  }
}

export default {
  Kerberos,
}
