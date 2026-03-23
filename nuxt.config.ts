import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const loadDictionaryIds = (): string[] => {
  const candidates = [
    resolve(process.cwd(), "content/dictionaries/index.json"),
    resolve(process.cwd(), "public/dictionaries/index.json"),
  ];

  for (const filePath of candidates) {
    try {
      const raw = readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw) as {
        dictionaries?: Array<{ id?: string }>;
      };
      if (Array.isArray(parsed?.dictionaries)) {
        return parsed.dictionaries
          .map((dict) => String(dict?.id || "").trim())
          .filter((id) => id);
      }
    } catch {
      // Ignore missing or invalid files
    }
  }

  return [];
};

const dictionaryIds = loadDictionaryIds();
const resolveUseApi = (): boolean => {
  const explicit = process.env.NUXT_PUBLIC_USE_API;
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  // Auto mode: if MongoDB is configured, default to API search
  return Boolean(process.env.MONGODB_URI);
};

const resolvedUseApi = resolveUseApi();

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",

  devtools: { enabled: true },

  experimental: {
    watcher: "parcel",
  },

  devServer: {
    port: 3000,
  },

  modules: [
    "@nuxt/content",
    "@nuxt/image",
    "@nuxtjs/tailwindcss",
    "@nuxtjs/i18n",
    "@nuxtjs/critters",
  ],

  ignore: ["**/.vercel/**", "**/.output/**", "**/dist/**"],

  watchers: {
    chokidar: {
      ignored: ["**/.vercel/**", "**/.output/**", "**/dist/**"],
    },
  },

  i18n: {
    vueI18n: "./i18n.config.ts",
    defaultLocale: "yue-Hant",
    strategy: "no_prefix",
    detectBrowserLanguage: false,
    locales: [
      {
        code: "yue-Hant",
        name: "粵文",
      },
      {
        code: "yue-Hans",
        name: "简体粤文",
      },
      {
        code: "zh-Hant",
        name: "繁體普通話",
      },
      {
        code: "zh-Hans",
        name: "简体普通话",
      },
    ],
  },

  // Nuxt Content 配置
  content: {
    // 高亮配置
    highlight: {
      theme: "github-light",
    },
    // Markdown 配置
    markdown: {
      toc: {
        depth: 3,
        searchDepth: 3,
      },
    },
  },

  // App 配置
  app: {
    head: {
      title: "粵語辭叢 - The Yue Dictionary Collection",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "color-scheme", content: "light dark" },
        {
          name: "description",
          content:
            "開放粵語詞典聚合平台，多詞典統一搜尋查詢、粵拼搜索，粵語學習同研究者嘅便捷工具。 The Open Platform for Cantonese Dictionaries",
        },
        {
          name: "keywords",
          content: "粵語,廣州話,詞典,粵拼,Cantonese,Jyutping",
        },
        { name: "author", content: "Jyut Collection" },
        {
          name: "google-site-verification",
          content: "n6gCW8_c_OVeNtCgQLEdDxep5cZY5att-ikH1K_kLdw",
        },
        // Open Graph
        {
          property: "og:title",
          content: "粵語辭叢 - The Yue Dictionary Collection",
        },
        {
          property: "og:description",
          content:
            "開放粵語詞典聚合平台，多詞典統一搜尋查詢、粵拼搜索，粵語學習同研究者嘅便捷工具。 The Open Platform for Cantonese Dictionaries",
        },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://jyutjyu.com" },
        { property: "og:image", content: "https://jyutjyu.com/og.png" },
        { property: "og:image:type", content: "image/png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: "粵語辭叢" },
        { property: "og:locale", content: "zh_HK" },
        // Twitter
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: "https://jyutjyu.com/og.png" },
        { name: "twitter:image:alt", content: "粵語辭叢" },
      ],
      link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    },
  },

  image: {
    provider: "vercel",
  },

  // TypeScript 配置
  typescript: {
    strict: true,
    typeCheck: false,
  },

  // 运行时配置
  runtimeConfig: {
    // 服务端私有配置（从环境变量读取）
    mongodbUri: process.env.MONGODB_URI,
    mongodbDbName: process.env.MONGODB_DB_NAME || "jyutjyu",
    githubToken: process.env.GITHUB_TOKEN,
    githubRepo: process.env.GITHUB_REPO,
    enforceCanonicalHostRedirect:
      process.env.ENFORCE_CANONICAL_HOST_REDIRECT === "true",

    // 客户端公开配置
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || "https://jyutjyu.com",
      siteName: "粵語辭叢",
      siteDescription:
        "開放粵語詞典聚合平台，多詞典統一搜尋查詢、粵拼搜索，粵語學習同研究者嘅便捷工具。 The Open Platform for Cantonese Dictionaries",
      // 是否使用后端 API
      // - NUXT_PUBLIC_USE_API=true: 强制使用 API
      // - NUXT_PUBLIC_USE_API=false: 默认静态 JSON（客户端可在探测到 API 可用后自动切换）
      // - 未设置: 自动模式（检测到 MongoDB 配置时默认使用 API）
      useApi: resolvedUseApi,
    },
  },

  routeRules: {
    "/word/**": { swr: 86400 },
    "/browse/**": { swr: 86400 },
    "/": { prerender: true },
    "/about": { prerender: true },
  },

  // Nitro 配置（服务端）
  nitro: {
    // Vercel 自动检测 preset，无需显式指定（显式指定会导致本地 preview 失效）
    prerender: {
      crawlLinks: false,
      routes: [
        "/",
        "/browse",
        ...dictionaryIds.map((id) => `/browse/${encodeURIComponent(id)}`),
      ],
    },
  },

  // Vite 配置（解决 HMR 端口冲突）
  vite: {
    server: {
      watch: {
        ignored: [
          "**/.vercel/**",
          "**/.output/**",
          "**/.nuxt/**",
          "**/dist/**",
        ],
      },
      hmr: {
        port: 24679,
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            opencc: ["opencc-js"],
          },
        },
      },
    },
  },
});
