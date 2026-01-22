<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-50 to-white">
    <div class="container mx-auto px-4 py-16">
      <!-- 页面标题 -->
      <div class="max-w-4xl mx-auto mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">
          {{ t('about.title') }}
        </h1>
        <p class="text-xl text-gray-600">
          {{ t('about.subtitle') }}
        </p>
      </div>

      <!-- 项目介绍 -->
      <div class="max-w-4xl mx-auto mb-12">
        <div class="bg-white rounded-lg shadow-md p-8">
          <h2 class="text-2xl font-semibold mb-4">
            {{ t('about.missionTitle') }}
          </h2>
          <p class="text-gray-700 mb-4">
            {{ t('about.missionP1') }}
          </p>
          <p class="text-gray-700 mb-4">
            {{ t('about.missionP2') }}
          </p>
          <div class="flex flex-wrap gap-4 mt-6">
            <a
              href="https://github.com/jyutjyucom/jyutjyu"
              target="_blank"
              class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap flex-shrink-0"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
              </svg>
              GitHub
            </a>
            <FeedbackButton
              button-class="inline-flex items-center gap-2 px-4 py-2 border-2 border-amber-600 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors whitespace-nowrap flex-shrink-0"
            />
            <NuxtLink
              to="/"
              class="inline-flex items-center gap-2 px-4 py-2 border-2 border-gray-900 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap flex-shrink-0"
            >
              {{ t('about.backHome') }}
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- 内容授权政策 -->
      <div class="max-w-4xl mx-auto mb-12">
        <div class="bg-white rounded-lg shadow-md p-8">
          <h2 class="text-2xl font-semibold mb-6 flex items-center gap-2">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            📚 {{ t('about.licenseSectionTitle') }}
          </h2>
          
          <p class="text-gray-700 mb-6">
            {{ t('about.licenseIntro') }}
          </p>

          <!-- 出版词典 -->
          <div class="mb-8 border-l-4 border-amber-400 pl-6 py-2 bg-amber-50 rounded-r-lg">
            <h3 class="text-xl font-semibold mb-3 flex items-center gap-2">
              📖 {{ t('about.published.title') }}
            </h3>
            <p class="text-gray-700 mb-4">
              {{ t('about.published.examples') }}
            </p>
            
            <div class="bg-white rounded-lg p-4 mb-4">
              <h4 class="font-semibold text-gray-900 mb-2">
                ⚠️ {{ t('about.published.copyrightTitle') }}
              </h4>
              <p class="text-sm text-gray-700 mb-3">
                {{ t('about.published.copyright') }}
              </p>
              
              <h4 class="font-semibold text-gray-900 mb-2">
                📝 {{ t('about.published.disclaimerTitle') }}
              </h4>
              <p class="text-sm text-gray-700 mb-3">
                {{ t('about.published.disclaimer') }}
                <a href="https://github.com/jyutjyucom/jyutjyu/issues" class="text-blue-600 hover:underline" target="_blank">GitHub Issue</a>
              </p>
              
              <h4 class="font-semibold text-gray-900 mb-2">
                🎯 {{ t('about.published.currentUseTitle') }}
              </h4>
              <ul class="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                <li>{{ t('about.published.currentUse1') }}</li>
                <li>{{ t('about.published.currentUse2') }}</li>
                <li>{{ t('about.published.currentUse3') }}</li>
              </ul>
              
              <h4 class="font-semibold text-gray-900 mb-2">
                ❌ {{ t('about.published.limitTitle') }}
              </h4>
              <ul class="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                <li>{{ t('about.published.limit1') }}</li>
                <li>{{ t('about.published.limit2') }}</li>
                <li>{{ t('about.published.limit3') }}</li>
              </ul>
              
              <div class="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
                <p class="text-sm text-blue-900">
                  {{ t('about.published.supportOriginal') }}
                </p>
              </div>
            </div>
          </div>

          <!-- 社区协作词典 -->
          <div class="mb-8 border-l-4 border-green-400 pl-6 py-2 bg-green-50 rounded-r-lg">
            <h3 class="text-xl font-semibold mb-3 flex items-center gap-2">
              🌐 {{ t('about.community.title') }}
            </h3>
            <p class="text-gray-700 mb-4">
              {{ t('about.community.intro') }}
            </p>
            
            <div class="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
              <p class="text-sm text-amber-900">
                {{ t('about.community.disclaimer') }}
              </p>
            </div>
            
            <!-- 粵典 -->
            <div class="bg-white rounded-lg p-4 mb-4">
              <h4 class="font-semibold text-gray-900 mb-2">
                📚 {{ t('about.community.wordsTitle') }}
              </h4>
              <p class="text-sm text-gray-700 mb-3">
                {{ t('about.community.wordsDesc') }}
              </p>
              
              <h5 class="font-semibold text-gray-900 text-sm mb-2">
                📜 {{ t('about.community.licenseTitle') }}
              </h5>
              <p class="text-sm text-gray-700 mb-3">
                <a href="https://words.hk/base/hoifong/" class="text-blue-600 hover:underline font-medium" target="_blank">Non-Commercial Open Data License 1.0</a>（非商业开放资料授权协议）
              </p>
              
              <h5 class="font-semibold text-gray-900 text-sm mb-2">
                ✅ {{ t('about.community.allowedTitle') }}
              </h5>
              <ul class="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                <li>{{ t('about.community.allowed1') }}</li>
                <li>{{ t('about.community.allowed2') }}</li>
              </ul>
              
              <h5 class="font-semibold text-gray-900 text-sm mb-2">
                ⚠️ {{ t('about.community.commercialTitle') }}
              </h5>
              <p class="text-sm text-gray-700 mb-3">
                {{ t('about.community.commercialDesc') }}
              </p>
              
              <p class="text-xs text-gray-600">
                {{ t('about.community.wordsCopyright') }}
              </p>
            </div>
            
            <!-- Wiktionary -->
            <div class="bg-white rounded-lg p-4 mb-4">
              <h4 class="font-semibold text-gray-900 mb-2">
                📖 {{ t('about.community.wiktTitle') }}
              </h4>
              <p class="text-sm text-gray-700 mb-3">
                {{ t('about.community.wiktDesc') }}
              </p>
              
              <h5 class="font-semibold text-gray-900 text-sm mb-2">
                📜 {{ t('about.community.licenseTitle') }}
              </h5>
              <p class="text-sm text-gray-700 mb-3">
                <a href="https://creativecommons.org/licenses/by-sa/4.0/" class="text-blue-600 hover:underline font-medium" target="_blank">CC BY-SA 4.0</a>（知识共享 署名-相同方式共享 4.0 国际许可协议）
              </p>
              
              <h5 class="font-semibold text-gray-900 text-sm mb-2">
                ✅ {{ t('about.community.allowedTitle') }}
              </h5>
              <ul class="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                <li><strong>商业使用</strong>：允许用于商业目的</li>
                <li><strong>复制与分发</strong>：可以自由复制、分发、传播</li>
                <li><strong>修改与演绎</strong>：可以修改、混合、转换或基于该作品创作</li>
              </ul>
              
              <h5 class="font-semibold text-gray-900 text-sm mb-2">
                📝 {{ t('about.community.conditionsTitle') }}
              </h5>
              <ul class="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                <li><strong>署名</strong>：必须给予适当的署名，提供指向许可协议的链接</li>
                <li><strong>相同方式共享</strong>：如对本作品进行修改，必须以相同许可协议分发</li>
              </ul>
              
              <p class="text-xs text-gray-600">
                {{ t('about.community.wiktCopyright') }}
              </p>
            </div>
          </div>

          <!-- 社区原创词表 -->
          <div class="mb-6 border-l-4 border-blue-400 pl-6 py-2 bg-blue-50 rounded-r-lg">
            <h3 class="text-xl font-semibold mb-3 flex items-center gap-2">
              ✍️ {{ t('about.original.title') }}
            </h3>
            <p class="text-gray-700 mb-4">
              {{ t('about.original.intro') }}
            </p>
            
            <div class="bg-white rounded-lg p-4 mb-4">
              <h4 class="font-semibold text-gray-900 mb-2">
                📜 {{ t('about.original.licenseTitle') }}
              </h4>
              <p class="text-sm text-gray-700 mb-3">
                {{ t('about.original.licenseDesc') }}
                <a href="https://creativecommons.org/licenses/by-nc/4.0/" class="text-blue-600 hover:underline font-medium" target="_blank">CC BY-NC 4.0</a>
              </p>
              
              <h4 class="font-semibold text-gray-900 mb-2">
                ✅ {{ t('about.original.allowedTitle') }}
              </h4>
              <ul class="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                <li>{{ t('about.original.allowed1') }}</li>
                <li>{{ t('about.original.allowed2') }}</li>
                <li>{{ t('about.original.allowed3') }}</li>
              </ul>
              
              <h4 class="font-semibold text-gray-900 mb-2">
                📝 {{ t('about.original.conditionsTitle') }}
              </h4>
              <ul class="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                <li>{{ t('about.original.conditions1') }}</li>
                <li>{{ t('about.original.conditions2') }}</li>
                <li>{{ t('about.original.conditions3') }}</li>
              </ul>
              
              <div class="bg-green-50 border border-green-200 rounded p-3 mt-4">
                <p class="text-sm text-green-900">
                  {{ t('about.original.attributionExample') }}
                  <br>
                  <code class="text-xs bg-white px-2 py-1 rounded">
                    {{ t('about.original.attributionCode') }}
                  </code>
                </p>
              </div>
            </div>
            
            <!-- 欽州粵拼 -->
            <div class="bg-white rounded-lg p-4 mb-4">
              <h4 class="font-semibold text-gray-900 mb-2">
                📚 {{ t('about.original.qzTitle') }}
              </h4>
              <p class="text-sm text-gray-700 mb-3">
                {{ t('about.original.qzDesc') }}
              </p>
              
              <h5 class="font-semibold text-gray-900 text-sm mb-2">
                📜 {{ t('about.original.licenseTitle') }}
              </h5>
              <p class="text-sm text-gray-700 mb-3">
                <a href="https://www.gnu.org/licenses/gpl-3.0.html" class="text-blue-600 hover:underline font-medium" target="_blank">GPL-3.0</a>（GNU 通用公共许可证 3.0）
              </p>
              
              <h5 class="font-semibold text-gray-900 text-sm mb-2">
                ✅ {{ t('about.original.allowedTitle') }}
              </h5>
              <ul class="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                <li>{{ t('about.original.qzAllowed1') }}</li>
                <li>{{ t('about.original.qzAllowed2') }}</li>
                <li>{{ t('about.original.qzAllowed3') }}</li>
              </ul>
              
              <h5 class="font-semibold text-gray-900 text-sm mb-2">
                📝 {{ t('about.original.conditionsTitle') }}
              </h5>
              <ul class="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                <li>{{ t('about.original.qzConditions1') }}</li>
                <li>{{ t('about.original.qzConditions2') }}</li>
              </ul>
              
              <p class="text-xs text-gray-600">
                {{ t('about.original.qzCopyright') }}
              </p>
            </div>
          </div>

          <!-- 权利声明 -->
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-6">
            <h3 class="text-lg font-semibold mb-3">
              ⚖️ {{ t('about.rights.title') }}
            </h3>
            <p class="text-sm text-gray-700 mb-4">
              {{ t('about.rights.intro') }}
            </p>
            <div class="space-y-2 text-sm text-gray-700">
              <p>
                {{ t('about.rights.contactIntro') }}
              </p>
              <ul class="list-disc list-inside pl-4 space-y-1">
                <li>
                  GitHub Issues: 
                  <a href="https://github.com/jyutjyucom/jyutjyu/issues" class="text-blue-600 hover:underline" target="_blank">
                    github.com/jyutjyucom/jyutjyu/issues
                  </a>
                </li>
                <li>
                  GitHub Discussions: 
                  <a href="https://github.com/jyutjyucom/jyutjyu/discussions" class="text-blue-600 hover:underline" target="_blank">
                    github.com/jyutjyucom/jyutjyu/discussions
                  </a>
                </li>
              </ul>
              <p class="pt-2 text-gray-600">
                {{ t('about.rights.response') }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 技术栈 -->
      <div class="max-w-4xl mx-auto mb-12">
        <div class="bg-white rounded-lg shadow-md p-8">
          <h2 class="text-2xl font-semibold mb-4">
            {{ t('about.tech.title') }}
          </h2>
          <div class="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <h3 class="font-semibold mb-2">
                {{ t('about.tech.frontendTitle') }}
              </h3>
              <ul class="list-disc list-inside space-y-1">
                <li>Vue 3 + Nuxt 3</li>
                <li>TypeScript</li>
                <li>Tailwind CSS</li>
              </ul>
            </div>
            <div>
              <h3 class="font-semibold mb-2">
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
      <div class="max-w-4xl mx-auto">
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-8 text-center">
          <h2 class="text-2xl font-semibold mb-4">
            {{ t('about.contribute.title') }}
          </h2>
          <p class="text-gray-700 mb-6">
            {{ t('about.contribute.intro') }}
          </p>
          <div class="flex flex-wrap gap-4 justify-center">
            <a
              href="https://github.com/jyutjyucom/jyutjyu/blob/main/CONTRIBUTING.md"
              target="_blank"
              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {{ t('about.contribute.guide') }}
            </a>
            <a
              href="https://github.com/jyutjyucom/jyutjyu/blob/main/docs/CSV_GUIDE.md"
              target="_blank"
              class="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              {{ t('about.contribute.csvGuide') }}
            </a>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

// SEO
useHead({
  title: computed(() => `${t('about.pageTitle')} | ${t('common.siteName')}`),
  meta: [
    {
      name: 'description',
      content: computed(() => t('about.metaDescription'))
    }
  ]
})
</script>

