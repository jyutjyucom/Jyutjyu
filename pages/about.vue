<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-50 to-white">
    <div class="container mx-auto px-4 py-16">
      <!-- 页面标题 -->
      <div class="max-w-4xl mx-auto mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">关于粤语辞丛</h1>
        <p class="text-xl text-gray-600">
          The Jyut Collection - 开放的粤语词典聚合平台
        </p>
      </div>

      <!-- 项目介绍 -->
      <div class="max-w-4xl mx-auto mb-12">
        <div class="bg-white rounded-lg shadow-md p-8">
          <h2 class="text-2xl font-semibold mb-4">项目使命</h2>
          <p class="text-gray-700 mb-4">
            粤语辞丛致力于打造一个开放、包容、可持续的粤语词典聚合平台，通过数字化手段保育和传承粤语文化。
          </p>
          <p class="text-gray-700 mb-4">
            我们相信，语言是文化的载体，词典是文化的记忆。通过聚合多个来源的粤语词典，我们希望为粤语学习者、研究者和爱好者提供一个便捷、准确、全面的查询工具。
          </p>
          <div class="flex gap-4 mt-6">
            <a
              href="https://github.com/jyutjyucom/jyutjyu"
              target="_blank"
              class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
              </svg>
              GitHub
            </a>
            <NuxtLink
              to="/"
              class="inline-flex items-center gap-2 px-4 py-2 border-2 border-gray-900 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
            >
              返回首页
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
            📚 内容授权说明
          </h2>
          
          <p class="text-gray-700 mb-6">
            本平台所收录的词典内容根据来源分为两类，每类都有明确的授权和使用限制：
          </p>

          <!-- 出版词典 -->
          <div class="mb-8 border-l-4 border-amber-400 pl-6 py-2 bg-amber-50 rounded-r-lg">
            <h3 class="text-xl font-semibold mb-3 flex items-center gap-2">
              📖 出版词典
            </h3>
            <p class="text-gray-700 mb-4">
              如《实用广州话分类词典》（麦耘、谭步云编，广东人民出版社，1997年）、《广州话俗语词典》（欧阳觉亚、周无忌、饶秉才编，广东人民出版社，2010年）等。
            </p>
            
            <div class="bg-white rounded-lg p-4 mb-4">
              <h4 class="font-semibold text-gray-900 mb-2">⚠️ 版权状态</h4>
              <p class="text-sm text-gray-700 mb-3">
                这些词典内容受中华人民共和国著作权法保护，数据来源于互联网上的公开扫描资源。
              </p>
              
              <h4 class="font-semibold text-gray-900 mb-2">🎯 当前用途</h4>
              <ul class="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                <li>技术原型验证和演示</li>
                <li>学术研究和探讨</li>
                <li>粤语数字化技术开发</li>
              </ul>
              
              <h4 class="font-semibold text-gray-900 mb-2">❌ 使用限制</h4>
              <ul class="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                <li>不得用于商业用途</li>
                <li>不得进行二次分发或再授权</li>
                <li>不得用于正式出版或产品发布</li>
              </ul>
              
              <div class="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
                <p class="text-sm text-blue-900">
                  💡 <strong>我们鼓励用户支持正版</strong>：如需正式使用这些词典内容，请购买正版出版物或联系出版方获得授权。
                </p>
              </div>
            </div>
          </div>

          <!-- 社区协作词典 -->
          <div class="mb-8 border-l-4 border-green-400 pl-6 py-2 bg-green-50 rounded-r-lg">
            <h3 class="text-xl font-semibold mb-3 flex items-center gap-2">
              🌐 社区协作词典
            </h3>
            <p class="text-gray-700 mb-4">
              由开放社区协作编写的词典，采用开放授权协议。
            </p>
            
            <!-- 粵典 -->
            <div class="bg-white rounded-lg p-4 mb-4">
              <h4 class="font-semibold text-gray-900 mb-2">📚 粵典 (words.hk) - 59,019 词条</h4>
              <p class="text-sm text-gray-700 mb-3">
                香港话社区词典，收录大量日常用语、俚语及现代词汇，提供粤语和英语双语释义。
              </p>
              
              <h5 class="font-semibold text-gray-900 text-sm mb-2">📜 许可协议</h5>
              <p class="text-sm text-gray-700 mb-3">
                <a href="https://words.hk/base/hoifong/" class="text-blue-600 hover:underline font-medium" target="_blank">Non-Commercial Open Data License 1.0</a>（非商业开放资料授权协议）
              </p>
              
              <h5 class="font-semibold text-gray-900 text-sm mb-2">✅ 允许的使用</h5>
              <ul class="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                <li>非商业使用、复制、修改、发布</li>
                <li>必须保留署名和版权告示</li>
              </ul>
              
              <h5 class="font-semibold text-gray-900 text-sm mb-2">⚠️ 商业使用</h5>
              <p class="text-sm text-gray-700 mb-3">
                需获得授权（收入低于地区中位数 3 倍的小型个人业务可豁免）
              </p>
              
              <p class="text-xs text-gray-600">
                版权持有人：Hong Kong Lexicography Limited（香港辞书有限公司）
              </p>
            </div>
            
            <!-- Wiktionary -->
            <div class="bg-white rounded-lg p-4 mb-4">
              <h4 class="font-semibold text-gray-900 mb-2">📖 Wiktionary Cantonese - 102,195 词条</h4>
              <p class="text-sm text-gray-700 mb-3">
                来自维基词典的粤语词条，由全球志愿者协作编写，内容丰富全面。
              </p>
              
              <h5 class="font-semibold text-gray-900 text-sm mb-2">📜 许可协议</h5>
              <p class="text-sm text-gray-700 mb-3">
                <a href="https://creativecommons.org/licenses/by-sa/4.0/" class="text-blue-600 hover:underline font-medium" target="_blank">CC BY-SA 4.0</a>（知识共享 署名-相同方式共享 4.0 国际许可协议）
              </p>
              
              <h5 class="font-semibold text-gray-900 text-sm mb-2">✅ 允许的使用</h5>
              <ul class="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                <li><strong>商业使用</strong>：允许用于商业目的</li>
                <li><strong>复制与分发</strong>：可以自由复制、分发、传播</li>
                <li><strong>修改与演绎</strong>：可以修改、混合、转换或基于该作品创作</li>
              </ul>
              
              <h5 class="font-semibold text-gray-900 text-sm mb-2">📝 使用条件</h5>
              <ul class="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                <li><strong>署名</strong>：必须给予适当的署名，提供指向许可协议的链接</li>
                <li><strong>相同方式共享</strong>：如对本作品进行修改，必须以相同许可协议分发</li>
              </ul>
              
              <p class="text-xs text-gray-600">
                版权持有人：Wikimedia Foundation & Wiktionary contributors
              </p>
            </div>
          </div>

          <!-- 社区原创词表 -->
          <div class="mb-6 border-l-4 border-blue-400 pl-6 py-2 bg-blue-50 rounded-r-lg">
            <h3 class="text-xl font-semibold mb-3 flex items-center gap-2">
              ✍️ 社区原创词表
            </h3>
            <p class="text-gray-700 mb-4">
              由方言爱好者、语言学习者、研究者等个人原创整理并贡献的词表内容。
            </p>
            
            <div class="bg-white rounded-lg p-4 mb-4">
              <h4 class="font-semibold text-gray-900 mb-2">📜 默认许可协议</h4>
              <p class="text-sm text-gray-700 mb-3">
                采用 <a href="https://creativecommons.org/licenses/by-nc/4.0/" class="text-blue-600 hover:underline font-medium" target="_blank">CC BY-NC 4.0</a>（知识共享 署名-非商业性使用 4.0 国际许可协议）发布。
              </p>
              
              <h4 class="font-semibold text-gray-900 mb-2">✅ 允许的使用</h4>
              <ul class="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                <li><strong>复制与分享</strong>：可以自由复制、分发该内容</li>
                <li><strong>改编</strong>：可以基于该内容进行修改、演绎</li>
                <li><strong>非商业用途</strong>：仅限个人学习、研究等非盈利目的</li>
              </ul>
              
              <h4 class="font-semibold text-gray-900 mb-2">📝 使用条件</h4>
              <ul class="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                <li><strong>署名</strong>：必须给出适当的署名，提供指向许可协议的链接</li>
                <li><strong>标明修改</strong>：如进行了修改，需说明已作出的修改</li>
                <li><strong>非商业性</strong>：不得将该内容用于商业目的</li>
              </ul>
              
              <div class="bg-green-50 border border-green-200 rounded p-3 mt-4">
                <p class="text-sm text-green-900">
                  📋 <strong>署名格式示例</strong>：<br>
                  <code class="text-xs bg-white px-2 py-1 rounded">陈明. (2025). 四邑话日常用语词表. 粤语辞丛 (jyutjyu.com)</code>
                </p>
              </div>
            </div>
          </div>

          <!-- 权利声明 -->
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-6">
            <h3 class="text-lg font-semibold mb-3">⚖️ 权利声明与联系方式</h3>
            <p class="text-sm text-gray-700 mb-4">
              我们尊重知识产权，致力于在法律框架内推动粤语文化的保育与传承。
            </p>
            <div class="space-y-2 text-sm text-gray-700">
              <p>
                <strong>如您是权利人</strong>并对本平台收录的内容有任何疑问，或希望修改、下架相关内容，请通过以下方式联系我们：
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
                我们承诺在收到合理请求后的 7 个工作日内予以回应。
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 技术栈 -->
      <div class="max-w-4xl mx-auto mb-12">
        <div class="bg-white rounded-lg shadow-md p-8">
          <h2 class="text-2xl font-semibold mb-4">技术栈</h2>
          <div class="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <h3 class="font-semibold mb-2">前端</h3>
              <ul class="list-disc list-inside space-y-1">
                <li>Vue 3 + Nuxt 3</li>
                <li>TypeScript</li>
                <li>Tailwind CSS</li>
              </ul>
            </div>
            <div>
              <h3 class="font-semibold mb-2">数据处理</h3>
              <ul class="list-disc list-inside space-y-1">
                <li>Node.js</li>
                <li>CSV 解析与验证</li>
                <li>OpenCC 繁简转换</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- 贡献指南 -->
      <div class="max-w-4xl mx-auto">
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-8 text-center">
          <h2 class="text-2xl font-semibold mb-4">参与贡献</h2>
          <p class="text-gray-700 mb-6">
            这是一个开源项目，我们欢迎各种形式的贡献！
          </p>
          <div class="flex flex-wrap gap-4 justify-center">
            <a
              href="https://github.com/jyutjyucom/jyutjyu/blob/main/CONTRIBUTING.md"
              target="_blank"
              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              查看贡献指南（含授权政策）
            </a>
            <a
              href="https://github.com/jyutjyucom/jyutjyu/blob/main/docs/CSV_GUIDE.md"
              target="_blank"
              class="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              数据录入规范
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// SEO
useHead({
  title: '关于 - 粤语辞丛 | The Jyut Collection',
  meta: [
    {
      name: 'description',
      content: '了解粤语辞丛项目的使命、内容授权政策和技术架构。我们致力于打造开放、包容、可持续的粤语词典聚合平台。'
    }
  ]
})
</script>

