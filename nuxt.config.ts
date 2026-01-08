// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  
  devtools: { enabled: true },
  
  devServer: {
    port: 3002
  },
  
  modules: [
    '@nuxt/content',
    '@nuxtjs/tailwindcss'
  ],

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
      title: '粤语辞丛 | The Jyut Collection',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'color-scheme', content: 'light only' },
        { 
          name: 'description', 
          content: '开放的粤语词典聚合平台，支持多词典统一查询、粤拼搜索，为粤语学习者和研究者提供便捷的工具。' 
        },
        { name: 'keywords', content: '粤语,广州话,词典,粤拼,Cantonese,Jyutping' },
        { name: 'author', content: 'Jyut Collection' },
        // Open Graph
        { property: 'og:title', content: '粤语辞丛 | The Jyut Collection' },
        { property: 'og:description', content: '开放的粤语词典聚合平台' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://jyutjyu.com' },
        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
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
    
    // 客户端公开配置
    public: {
      siteUrl: 'https://jyutjyu.com',
      siteName: '粤语辞丛',
      siteDescription: '开放的粤语词典聚合平台',
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
  }
})

