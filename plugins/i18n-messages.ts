import messagesEn from "~/locales/en.source.mjs";
import messagesYueHans from "~/locales/yue-Hans.generated.ts";
import messagesYueHant from "~/locales/yue-Hant.source.mjs";
import messagesZhHans from "~/locales/zh-Hans.generated.ts";
import messagesZhHant from "~/locales/zh-Hant.source.mjs";

/**
 * 在執行時註冊五個語系的訊息。
 *
 * 不放進 i18n.config.ts 是因為 Nitro prerender 會把該檔的相對 import
 * 外部化成錯誤的絕對路徑；改用 Nuxt plugin 走一般的 app 打包流程。
 */
export default defineNuxtPlugin((nuxtApp) => {
  const i18n = nuxtApp.$i18n as {
    mergeLocaleMessage: (locale: string, message: Record<string, unknown>) => void;
  };

  i18n.mergeLocaleMessage("en", messagesEn);
  i18n.mergeLocaleMessage("yue-Hans", messagesYueHans);
  i18n.mergeLocaleMessage("yue-Hant", messagesYueHant);
  i18n.mergeLocaleMessage("zh-Hant", messagesZhHant);
  i18n.mergeLocaleMessage("zh-Hans", messagesZhHans);
});
