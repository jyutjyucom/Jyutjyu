<template>
  <div
    class="min-h-screen bg-parchment dark:bg-stone-950 transition-colors duration-200"
  >
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-kapok focus:text-white focus:text-sm"
    >
      {{ t("common.skipToContent") }}
    </a>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import "@fontsource-variable/inter";
import "~/styles/chiron-hei-ui.css";
import "~/styles/chiron-sung-ui.css";
import {
  buildSeoAlternateLinkDefinitions,
  buildSeoRoutePath,
  type RouteQueryLike,
  withSiteUrl,
} from "~/utils/route-paths";

const { initTheme } = useTheme();
const route = useRoute();
const runtimeConfig = useRuntimeConfig();
const { locale, t } = useI18n();
const localeHead = useLocaleHead({
  addSeoAttributes: true,
  addDirAttribute: false,
});

const normalizedSiteUrl = computed(() =>
  String(runtimeConfig.public.siteUrl || ""),
);
const currentQuery = computed(() => route.query as RouteQueryLike);
const seoHead = computed(() => {
  const i18nLinkEntries = localeHead.value.link as Array<{ hid?: string }>;
  const i18nMetaEntries = localeHead.value.meta as Array<{ hid?: string }>;
  const canonicalHref = withSiteUrl(
    normalizedSiteUrl.value,
    buildSeoRoutePath(route.path, currentQuery.value, locale.value),
  );

  return {
    htmlAttrs: localeHead.value.htmlAttrs,
    link: [
      ...i18nLinkEntries.filter((entry) => {
        return typeof entry.hid !== "string" || !entry.hid.startsWith("i18n-");
      }),
      ...buildSeoAlternateLinkDefinitions(
        route.path,
        normalizedSiteUrl.value,
        currentQuery.value,
      ).map((entry) => ({
        hid: entry.id,
        rel: "alternate",
        href: entry.href,
        hreflang: entry.hreflang,
      })),
      {
        hid: "i18n-can",
        rel: "canonical",
        href: canonicalHref,
      },
    ],
    meta: [
      ...i18nMetaEntries.filter((entry) => entry.hid !== "i18n-og-url"),
      {
        hid: "i18n-og-url",
        property: "og:url",
        content: canonicalHref,
      },
    ],
  };
});

useHead(() => seoHead.value);

// 全局配置
useHead({
  link: [
    {
      rel: "preload",
      href: "/fonts/chiron-hei-hk-ui.woff2",
      as: "font",
      type: "font/woff2",
      crossorigin: "",
    },
    {
      rel: "preload",
      href: "/fonts/chiron-sung-hk-ui.woff2",
      as: "font",
      type: "font/woff2",
      crossorigin: "",
    },
  ],
  meta: [{ name: "theme-color", content: "#ffffff" }],
});

// 初始化主题
onMounted(() => {
  initTheme();
});
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  color-scheme: light dark;
}

html.dark {
  color-scheme: dark;
}

body {
  font-family: "Inter Variable", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 平滑过渡 */
.transition-theme {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}
</style>
