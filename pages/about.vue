<template>
  <div class="min-h-screen bg-parchment dark:bg-stone-950">
    <div class="max-w-4xl mx-auto px-6 md:px-8 py-16 font-cjk-ui">
      <!-- 页面标题 -->
      <div class="mb-12">
        <div class="flex justify-end items-center gap-3 mb-6">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
        <h1 class="text-4xl font-headline font-bold text-ink dark:text-parchment mb-4">
          {{ t('about.title') }}
        </h1>
        <p class="text-xl text-graphite dark:text-stone-400">
          {{ t('about.subtitle') }}
        </p>
      </div>

      <!-- 项目介绍 -->
      <div class="mb-12">
        <div class="bg-surface-low dark:bg-stone-900 p-8">
          <h2 class="text-2xl font-headline font-semibold mb-4 text-ink dark:text-parchment">
            {{ t('about.missionTitle') }}
          </h2>
          <p class="text-ink/80 dark:text-stone-300 mb-4">
            {{ t('about.missionP1') }}
          </p>
          <p class="text-ink/80 dark:text-stone-300 mb-4">
            {{ t('about.missionP2') }}
          </p>
          <div class="flex flex-wrap gap-4 mt-6">
            <a href="https://github.com/jyutjyucom/jyutjyu" target="_blank"
              class="inline-flex items-center gap-2 px-4 py-2 bg-ink dark:bg-stone-700 text-white hover:bg-ink/80 dark:hover:bg-stone-600 transition-colors whitespace-nowrap flex-shrink-0">
              <Github class="w-5 h-5" aria-hidden="true" />
              GitHub
            </a>
            <FeedbackButton
              button-class="inline-flex items-center gap-2 px-4 py-2 border border-archive-green text-archive-green hover:bg-archive-green/10 transition-colors whitespace-nowrap flex-shrink-0"
              label-class="text-base" />
            <NuxtLink to="/"
              class="inline-flex items-center gap-2 px-4 py-2 border border-kapok text-kapok hover:bg-kapok/10 transition-colors whitespace-nowrap flex-shrink-0">
              <Home class="w-5 h-5" aria-hidden="true" />
              {{ t('about.backHome') }}
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- 内容授权政策 -->
      <div class="mb-12">
        <div class="bg-surface-low dark:bg-stone-900 p-8">
          <h2 class="text-2xl font-headline font-semibold mb-6 flex items-center gap-2 text-ink dark:text-parchment">
            <svg class="w-6 h-6 text-archive-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {{ t('about.licenseSectionTitle') }}
          </h2>

          <p class="text-ink/80 dark:text-stone-300 mb-6">
            {{ t('about.licenseIntro') }}
          </p>

          <!-- 出版词典 -->
          <div class="mb-8 border-l-4 border-muted-gold pl-6 py-2 bg-muted-gold/5 dark:bg-muted-gold/10">
            <h3 class="text-xl font-semibold mb-3 text-ink dark:text-parchment">
              {{ t('about.published.title') }}
            </h3>
            <p class="text-ink/80 dark:text-stone-300 mb-4">
              {{ t('about.published.examples') }}
            </p>

            <div class="bg-white dark:bg-stone-800 p-4 mb-4">
              <h4 class="font-semibold text-ink dark:text-parchment mb-2">
                {{ t('about.published.copyrightTitle') }}
              </h4>
              <p class="text-sm text-ink/80 dark:text-stone-300 mb-3">
                {{ t('about.published.copyright') }}
              </p>

              <h4 class="font-semibold text-ink dark:text-parchment mb-2">
                {{ t('about.published.disclaimerTitle') }}
              </h4>
              <p class="text-sm text-ink/80 dark:text-stone-300 mb-3">
                {{ t('about.published.disclaimer') }}
                <a href="https://github.com/jyutjyucom/jyutjyu/issues"
                  class="text-kapok hover:text-kapok/80 hover:underline" target="_blank">GitHub Issue</a>
              </p>

              <h4 class="font-semibold text-ink dark:text-parchment mb-2">
                {{ t('about.published.currentUseTitle') }}
              </h4>
              <ul class="text-sm text-ink/80 dark:text-stone-300 list-disc list-inside space-y-1 mb-3">
                <li>{{ t('about.published.currentUse1') }}</li>
                <li>{{ t('about.published.currentUse2') }}</li>
                <li>{{ t('about.published.currentUse3') }}</li>
              </ul>

              <h4 class="font-semibold text-ink dark:text-parchment mb-2">
                {{ t('about.published.limitTitle') }}
              </h4>
              <ul class="text-sm text-ink/80 dark:text-stone-300 list-disc list-inside space-y-1 mb-3">
                <li>{{ t('about.published.limit1') }}</li>
                <li>{{ t('about.published.limit2') }}</li>
                <li>{{ t('about.published.limit3') }}</li>
              </ul>

              <div class="bg-kapok/5 dark:bg-kapok/10 border-l-2 border-kapok/40 p-3 mt-4">
                <p class="text-sm text-ink/80 dark:text-stone-300">
                  {{ t('about.published.supportOriginal') }}
                </p>
              </div>
            </div>
          </div>

          <!-- 社区协作词典 -->
          <div class="mb-8 border-l-4 border-archive-green pl-6 py-2 bg-archive-green/5 dark:bg-archive-green/10">
            <h3 class="text-xl font-semibold mb-3 text-ink dark:text-parchment">
              {{ t('about.community.title') }}
            </h3>
            <p class="text-ink/80 dark:text-stone-300 mb-4">
              {{ t('about.community.intro') }}
            </p>

            <div class="bg-muted-gold/5 dark:bg-muted-gold/10 border-l-2 border-muted-gold/40 p-4 mb-4">
              <p class="text-sm text-ink/80 dark:text-stone-300">
                {{ t('about.community.disclaimer') }}
              </p>
            </div>

            <!-- 粵典 -->
            <div class="bg-white dark:bg-stone-800 p-4 mb-4">
              <h4 class="font-semibold text-ink dark:text-parchment mb-2">
                {{ t('about.community.wordsTitle', { count: wordsCountDisplay }) }}
              </h4>
              <p class="text-sm text-ink/80 dark:text-stone-300 mb-3">
                {{ t('about.community.wordsDesc') }}
              </p>

              <h5 class="font-semibold text-ink dark:text-parchment text-sm mb-2">
                {{ t('about.community.licenseTitle') }}
              </h5>
              <p class="text-sm text-ink/80 dark:text-stone-300 mb-3">
                <a href="https://words.hk/base/hoifong/"
                  class="text-kapok hover:text-kapok/80 hover:underline font-medium" target="_blank">Non-Commercial
                  Open Data License 1.0</a>（非商业开放资料授权协议）
              </p>

              <h5 class="font-semibold text-ink dark:text-parchment text-sm mb-2">
                {{ t('about.community.allowedTitle') }}
              </h5>
              <ul class="text-sm text-ink/80 dark:text-stone-300 list-disc list-inside space-y-1 mb-3">
                <li>{{ t('about.community.allowed1') }}</li>
                <li>{{ t('about.community.allowed2') }}</li>
              </ul>

              <h5 class="font-semibold text-ink dark:text-parchment text-sm mb-2">
                {{ t('about.community.commercialTitle') }}
              </h5>
              <p class="text-sm text-ink/80 dark:text-stone-300 mb-3">
                {{ t('about.community.commercialDesc') }}
              </p>

              <p class="text-xs text-graphite/60 dark:text-stone-200">
                {{ t('about.community.wordsCopyright') }}
              </p>
            </div>

            <!-- Wiktionary -->
            <div class="bg-white dark:bg-stone-800 p-4 mb-4">
              <h4 class="font-semibold text-ink dark:text-parchment mb-2">
                {{ t('about.community.wiktTitle', { count: wiktCountDisplay }) }}
              </h4>
              <p class="text-sm text-ink/80 dark:text-stone-300 mb-3">
                {{ t('about.community.wiktDesc') }}
              </p>

              <h5 class="font-semibold text-ink dark:text-parchment text-sm mb-2">
                {{ t('about.community.licenseTitle') }}
              </h5>
              <p class="text-sm text-ink/80 dark:text-stone-300 mb-3">
                <a href="https://creativecommons.org/licenses/by-sa/4.0/"
                  class="text-kapok hover:text-kapok/80 hover:underline font-medium" target="_blank">CC BY-SA
                  4.0</a>（知识共享 署名-相同方式共享 4.0 国际许可协议）
              </p>

              <h5 class="font-semibold text-ink dark:text-parchment text-sm mb-2">
                {{ t('about.community.allowedTitle') }}
              </h5>
              <ul class="text-sm text-ink/80 dark:text-stone-300 list-disc list-inside space-y-1 mb-3">
                <li>{{ t('about.community.wiktAllowed1') }}</li>
                <li>{{ t('about.community.wiktAllowed2') }}</li>
                <li>{{ t('about.community.wiktAllowed3') }}</li>
              </ul>

              <h5 class="font-semibold text-ink dark:text-parchment text-sm mb-2">
                {{ t('about.community.conditionsTitle') }}
              </h5>
              <ul class="text-sm text-ink/80 dark:text-stone-300 list-disc list-inside space-y-1 mb-3">
                <li>{{ t('about.community.wiktCond1') }}</li>
                <li>{{ t('about.community.wiktCond2') }}</li>
              </ul>

              <p class="text-xs text-graphite/60 dark:text-stone-200">
                {{ t('about.community.wiktCopyright') }}
              </p>
            </div>
          </div>

          <!-- 社区原创词表 -->
          <div class="mb-6 border-l-4 border-kapok pl-6 py-2 bg-kapok/5 dark:bg-kapok/10">
            <h3 class="text-xl font-semibold mb-3 text-ink dark:text-parchment">
              {{ t('about.original.title') }}
            </h3>
            <p class="text-ink/80 dark:text-stone-300 mb-4">
              {{ t('about.original.intro') }}
            </p>

            <div class="bg-white dark:bg-stone-800 p-4 mb-4">
              <h4 class="font-semibold text-ink dark:text-parchment mb-2">
                {{ t('about.original.licenseTitle') }}
              </h4>
              <p class="text-sm text-ink/80 dark:text-stone-300 mb-3">
                {{ t('about.original.licenseDesc') }}
                <a href="https://creativecommons.org/licenses/by-nc/4.0/"
                  class="text-kapok hover:text-kapok/80 hover:underline font-medium" target="_blank">CC BY-NC 4.0</a>
              </p>

              <h4 class="font-semibold text-ink dark:text-parchment mb-2">
                {{ t('about.original.allowedTitle') }}
              </h4>
              <ul class="text-sm text-ink/80 dark:text-stone-300 list-disc list-inside space-y-1 mb-3">
                <li>{{ t('about.original.allowed1') }}</li>
                <li>{{ t('about.original.allowed2') }}</li>
                <li>{{ t('about.original.allowed3') }}</li>
              </ul>

              <h4 class="font-semibold text-ink dark:text-parchment mb-2">
                {{ t('about.original.conditionsTitle') }}
              </h4>
              <ul class="text-sm text-ink/80 dark:text-stone-300 list-disc list-inside space-y-1 mb-3">
                <li>{{ t('about.original.conditions1') }}</li>
                <li>{{ t('about.original.conditions2') }}</li>
                <li>{{ t('about.original.conditions3') }}</li>
              </ul>

              <div class="bg-archive-green/5 dark:bg-archive-green/10 border-l-2 border-archive-green/40 p-3 mt-4">
                <p class="text-sm text-ink/80 dark:text-stone-300">
                  {{ t('about.original.attributionExample') }}
                  <br>
                  <code class="text-xs bg-surface-highest dark:bg-stone-700 px-2 py-1">
                    {{ t('about.original.attributionCode') }}
                  </code>
                </p>
              </div>
            </div>

            <!-- 欽州粵拼 -->
            <div class="bg-white dark:bg-stone-800 p-4 mb-4">
              <h4 class="font-semibold text-ink dark:text-parchment mb-2">
                {{ t('about.original.qzTitle', { count: qzCountDisplay }) }}
              </h4>
              <p class="text-sm text-ink/80 dark:text-stone-300 mb-3">
                {{ t('about.original.qzDesc') }}
              </p>

              <h5 class="font-semibold text-ink dark:text-parchment text-sm mb-2">
                {{ t('about.original.licenseTitle') }}
              </h5>
              <p class="text-sm text-ink/80 dark:text-stone-300 mb-3">
                <a href="https://www.gnu.org/licenses/gpl-3.0.html"
                  class="text-kapok hover:text-kapok/80 hover:underline font-medium" target="_blank">GPL-3.0</a>（GNU
                通用公共许可证 3.0）
              </p>

              <h5 class="font-semibold text-ink dark:text-parchment text-sm mb-2">
                {{ t('about.original.allowedTitle') }}
              </h5>
              <ul class="text-sm text-ink/80 dark:text-stone-300 list-disc list-inside space-y-1 mb-3">
                <li>{{ t('about.original.qzAllowed1') }}</li>
                <li>{{ t('about.original.qzAllowed2') }}</li>
                <li>{{ t('about.original.qzAllowed3') }}</li>
              </ul>

              <h5 class="font-semibold text-ink dark:text-parchment text-sm mb-2">
                {{ t('about.original.conditionsTitle') }}
              </h5>
              <ul class="text-sm text-ink/80 dark:text-stone-300 list-disc list-inside space-y-1 mb-3">
                <li>{{ t('about.original.qzConditions1') }}</li>
                <li>{{ t('about.original.qzConditions2') }}</li>
              </ul>

              <p class="text-xs text-graphite/60 dark:text-stone-200">
                {{ t('about.original.qzCopyright') }}
              </p>
            </div>
          </div>

          <!-- 网络公开词典（协议不明） -->
          <div class="mb-6 border-l-4 border-graphite/30 dark:border-stone-600 pl-6 py-2 bg-surface-high/50 dark:bg-stone-800/50">
            <h3 class="text-xl font-semibold mb-3 text-ink dark:text-parchment">
              {{ t('about.webDict.title') }}
            </h3>
            <p class="text-ink/80 dark:text-stone-300 mb-4">
              {{ t('about.webDict.intro') }}
            </p>

            <div class="bg-white dark:bg-stone-800 p-4 mb-4">
              <h4 class="font-semibold text-ink dark:text-parchment mb-2">
                {{ t('about.webDict.tsTitle', { count: tsCountDisplay }) }}
              </h4>
              <p class="text-sm text-ink/80 dark:text-stone-300 mb-3">
                {{ t('about.webDict.tsDesc') }}
              </p>

              <h5 class="font-semibold text-ink dark:text-parchment text-sm mb-2">
                {{ t('about.webDict.tsLicense') }}
              </h5>
              <p class="text-sm text-ink/80 dark:text-stone-300 mb-3">
                {{ t('about.webDict.tsNotice') }}
              </p>

              <p class="text-xs text-graphite/60 dark:text-stone-200">
                {{ t('about.webDict.tsCopyright') }}
              </p>
            </div>
          </div>

          <!-- 权利声明 -->
          <div class="bg-surface-high dark:bg-stone-800 border border-outline-soft/20 dark:border-stone-700 p-6 mt-6">
            <h3 class="text-lg font-semibold mb-3 text-ink dark:text-parchment">
              {{ t('about.rights.title') }}
            </h3>
            <p class="text-sm text-ink/80 dark:text-stone-300 mb-4">
              {{ t('about.rights.intro') }}
            </p>
            <div class="space-y-2 text-sm text-ink/80 dark:text-stone-300">
              <p>
                {{ t('about.rights.contactIntro') }}
              </p>
              <ul class="list-disc list-inside pl-4 space-y-1">
                <li>
                  GitHub Issues:
                  <a href="https://github.com/jyutjyucom/jyutjyu/issues"
                    class="text-kapok hover:text-kapok/80 hover:underline" target="_blank">
                    github.com/jyutjyucom/jyutjyu/issues
                  </a>
                </li>
                <li>
                  GitHub Discussions:
                  <a href="https://github.com/jyutjyucom/jyutjyu/discussions"
                    class="text-kapok hover:text-kapok/80 hover:underline" target="_blank">
                    github.com/jyutjyucom/jyutjyu/discussions
                  </a>
                </li>
              </ul>
              <p class="pt-2 text-graphite dark:text-stone-400">
                {{ t('about.rights.response') }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 技术栈 -->
      <div class="mb-12">
        <div class="bg-surface-low dark:bg-stone-900 p-8">
          <h2 class="text-2xl font-headline font-semibold mb-4 text-ink dark:text-parchment">
            {{ t('about.tech.title') }}
          </h2>
          <div class="grid md:grid-cols-2 gap-4 text-sm text-ink/80 dark:text-stone-300">
            <div>
              <h3 class="font-semibold mb-2 text-ink dark:text-parchment">
                {{ t('about.tech.frontendTitle') }}
              </h3>
              <ul class="list-disc list-inside space-y-1">
                <li>Vue 3 + Nuxt 3</li>
                <li>TypeScript</li>
                <li>Tailwind CSS</li>
              </ul>
            </div>
            <div>
              <h3 class="font-semibold mb-2 text-ink dark:text-parchment">
                {{ t('about.tech.dataTitle') }}
              </h3>
              <ul class="list-disc list-inside space-y-1">
                <li>Node.js</li>
                <li>{{ t('about.tech.csvParsing') }}</li>
                <li>{{ t('about.tech.openccConversion') }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- 贡献指南 -->
      <div>
        <div class="bg-surface-low dark:bg-stone-900 p-8 text-center">
          <h2 class="text-2xl font-headline font-semibold mb-4 text-ink dark:text-parchment">
            {{ t('about.contribute.title') }}
          </h2>
          <p class="text-ink/80 dark:text-stone-300 mb-6">
            {{ t('about.contribute.intro') }}
          </p>
          <div class="flex flex-wrap gap-4 justify-center">
            <a href="https://github.com/jyutjyucom/jyutjyu/blob/main/CONTRIBUTING.md" target="_blank"
              class="px-6 py-3 bg-kapok text-white hover:bg-kapok/90 transition-colors font-medium">
              {{ t('about.contribute.guide') }}
            </a>
            <a href="https://github.com/jyutjyucom/jyutjyu/blob/main/docs/CSV_GUIDE.md" target="_blank"
              class="px-6 py-3 border border-kapok text-kapok hover:bg-kapok/10 transition-colors font-medium">
              {{ t('about.contribute.csvGuide') }}
            </a>
          </div>
        </div>
      </div>

    </div>

    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
import { Github, Home } from 'lucide-vue-next'

const { t } = useI18n()
const { dictionariesData } = useLocalizedDictionary()

const wordsCountDisplay = computed(() => {
  const data = dictionariesData.value as any
  if (!data?.dictionaries) return '0'
  const dict = data.dictionaries.find((d: any) => d.id === 'hk-cantowords')
  return (dict?.entries_count || 0).toLocaleString()
})

const wiktCountDisplay = computed(() => {
  const data = dictionariesData.value as any
  if (!data?.dictionaries) return '0'
  const dict = data.dictionaries.find((d: any) => d.id === 'wiktionary-cantonese')
  return (dict?.entries_count || 0).toLocaleString()
})

const qzCountDisplay = computed(() => {
  const data = dictionariesData.value as any
  if (!data?.dictionaries) return '0'
  const dict = data.dictionaries.find((d: any) => d.id === 'qz-jyutping')
  return (dict?.entries_count || 0).toLocaleString()
})

const tsCountDisplay = computed(() => {
  const data = dictionariesData.value as any
  if (!data?.dictionaries) return '0'
  const dict = data.dictionaries.find((d: any) => d.id === 'ts-english-dict')
  return (dict?.entries_count || 0).toLocaleString()
})

// SEO
const config = useRuntimeConfig()
const siteUrl = computed(() => String(config.public.siteUrl || '').replace(/\/+$/, ''))

useHead({
  title: computed(() => `${t('about.pageTitle')} | ${t('common.siteName')}`),
  meta: [
    {
      name: 'description',
      content: computed(() => t('about.metaDescription'))
    }
  ],
  link: computed(() => siteUrl.value
    ? [{ rel: 'canonical', href: `${siteUrl.value}/about` }]
    : []
  )
})
</script>
