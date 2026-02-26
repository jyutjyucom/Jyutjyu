import assert from 'node:assert/strict'
import test from 'node:test'

import { ensureInitialized, getQueryVariants } from '../server/utils/opencc.ts'

test('simplified query expands to multiple traditional variants', async () => {
  await ensureInitialized()

  const variants = new Set(await getQueryVariants('过钟'))

  assert.ok(variants.has('过钟'))
  assert.ok(variants.has('過鍾'))
  assert.ok(variants.has('過鐘'))
})

test('traditional query still includes simplified and alternate traditional forms', async () => {
  await ensureInitialized()

  const variants = new Set(await getQueryVariants('過鐘'))

  assert.ok(variants.has('过钟'))
  assert.ok(variants.has('過鐘'))
  assert.ok(variants.has('過鍾'))
})
