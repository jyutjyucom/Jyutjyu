// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  devtools: { enabled: true },

  devServer: {
    port: 3002
  },

  modules: [
    '@nuxt/content',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n'
  ],

  i18n: {
    vueI18n: './i18n.config.ts',
    defaultLocale: 'yue-Hant',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'jyutjyu_i18n_lang',
      redirectOn: 'root'
    },
    locales: [
      {
        code: 'yue-Hant',
        name: '粵文'
      },
      {
        code: 'yue-Hans',
        name: '简体粤文'
      },
      {
        code: 'zh-Hans',
        name: '简体中文'
      },
      {
        code: 'zh-Hant',
        name: '繁體中文'
      },


    ]
  },

  // Nuxt Content 配置
  content: {
    // 高亮配置
    highlight: {
      theme: 'github-light'
    },
    // Markdown 配置
    markdown: {
      toc: {
        depth: 3,
        searchDepth: 3
      }
    }
  },

  // App 配置
  app: {
    head: {
      title: '粵語辭叢 | The Yue Dictionary Collection',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'color-scheme', content: 'light dark' },
        {
          name: 'description',
          content: '開放粵語詞典聚合平台，多詞典統一搜尋查詢、粵拼搜索，粵語學習同研究者嘅便捷工具。 The Open Platform for Cantonese Dictionaries'
        },
        { name: 'keywords', content: '粵語,廣州話,詞典,粵拼,Cantonese,Jyutping' },
        { name: 'author', content: 'Jyut Collection' },
        // Open Graph
        { property: 'og:title', content: '粵語辭叢 | The Yue Dictionary Collection' },
        { property: 'og:description', content: '開放粵語詞典聚合平台，多詞典統一搜尋查詢、粵拼搜索，粵語學習同研究者嘅便捷工具。 The Open Platform for Cantonese Dictionaries' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://jyutjyu.com' },
        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Chiron+Hei+HK:ital,wght@0,200..900;1,200..900&family=Chiron+Sung+HK:ital,wght@0,200..900;1,200..900&display=swap' }
      ]
    }
  },

  // TypeScript 配置
  typescript: {
    strict: true,
    typeCheck: true
  },

  // 运行时配置
  runtimeConfig: {
    // 服务端私有配置（从环境变量读取）
    mongodbUri: process.env.MONGODB_URI,
    mongodbDbName: process.env.MONGODB_DB_NAME || 'jyutjyu',
    githubToken: process.env.GITHUB_TOKEN,
    githubRepo: process.env.GITHUB_REPO,

    // 客户端公开配置
    public: {
      siteUrl: 'https://jyutjyu.com',
      siteName: '粵語辭叢',
      siteDescription: '開放粵語詞典聚合平台，多詞典統一搜尋查詢、粵拼搜索，粵語學習同研究者嘅便捷工具。 The Open Platform for Cantonese Dictionaries',
      // 是否使用后端 API（false 时回退到静态 JSON）
      useApi: process.env.NUXT_PUBLIC_USE_API === 'true'
    }
  },

  // Nitro 配置（服务端）
  nitro: {
    // Vercel 部署时自动检测，但显式指定更可靠
    preset: 'vercel',
    prerender: {
      crawlLinks: true,
      routes: ['/']
    }
  },

  // Vite 配置（解决 HMR 端口冲突）
  vite: {
    server: {
      hmr: {
        port: 24679
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'opencc': ['opencc-js']
          }
        }
      }
    }
  }
})
