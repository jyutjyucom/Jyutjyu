import messagesYueHans from './locales/yue-Hans.generated'
import messagesYueHant from './locales/yue-Hant.source.mjs'

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'yue-Hant',
  fallbackLocale: 'yue-Hant',
  messages: {
    'yue-Hans': messagesYueHans,
    'yue-Hant': messagesYueHant
  }
}))
