<template>
  <div class="bg-parchment dark:bg-stone-900 p-6 w-full">
    <div class="flex items-start justify-between gap-3 mb-6">
      <div class="flex items-center gap-3 min-w-0">
        <div
          class="w-10 h-10 bg-archive-green/10 dark:bg-archive-green/20 flex items-center justify-center shrink-0"
        >
          <svg
            class="w-5 h-5 text-archive-green"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <div class="min-w-0">
          <h1
            :id="resolvedTitleId"
            class="text-lg font-semibold text-ink dark:text-parchment"
          >
            {{ t("feedback.title") }}
          </h1>
          <p class="text-sm text-graphite dark:text-stone-400">
            {{ t("feedback.subtitle") }}
          </p>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex items-center justify-center w-9 h-9 text-graphite dark:text-stone-400 hover:text-kapok hover:bg-surface-low dark:hover:bg-stone-800 transition-colors shrink-0"
        :aria-label="t('feedback.cancel')"
        @click="$emit('close')"
      >
        <X class="w-5 h-5" aria-hidden="true" />
      </button>
    </div>

    <form class="space-y-4" @submit.prevent="submitFeedback">
      <!-- 反馈类型 -->
      <fieldset class="border-0 p-0 m-0">
        <legend
          class="block text-sm font-medium text-ink/80 dark:text-stone-300 mb-2"
        >
          {{ t("feedback.type.label") }}
        </legend>
        <div class="grid grid-cols-3 gap-1.5 sm:gap-2">
          <label
            v-for="type in feedbackTypes"
            :key="type.value"
            class="relative flex cursor-pointer border-2 bg-surface-low dark:bg-stone-800 px-1.5 py-2 sm:px-2 sm:py-2.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-kapok"
            :class="
              feedbackType === type.value
                ? 'border-kapok'
                : 'border-outline-soft/20 dark:border-stone-700'
            "
          >
            <input
              v-model="feedbackType"
              type="radio"
              :value="type.value"
              name="feedback-type"
              class="sr-only"
            />
            <span class="flex flex-1 items-center justify-center">
              <span
                class="text-sm font-medium text-ink dark:text-stone-100 text-center leading-tight"
                >{{ type.label }}</span
              >
            </span>
          </label>
        </div>
      </fieldset>

      <!-- 标题 -->
      <div>
        <label
          :for="titleFieldId"
          class="block text-sm font-medium text-ink/80 dark:text-stone-300 mb-2"
        >
          {{ t("feedback.titleField.label") }}
        </label>
        <input
          :id="titleFieldId"
          ref="titleInputEl"
          v-model="title"
          type="text"
          autofocus
          :placeholder="t('feedback.titleField.placeholder')"
          :aria-invalid="titleInvalid ? 'true' : 'false'"
          :aria-describedby="titleInvalid ? titleErrorId : undefined"
          :class="[
            'mwg-field-control w-full px-3 py-2 border-none bg-surface-low dark:bg-stone-800 text-ink dark:text-stone-100 focus:ring-1 focus:ring-kapok/30 transition-colors',
            titleFallbackInvalid && 'user-invalid-fallback',
          ]"
          required
          @input="syncFieldValidity('title', 'input')"
          @blur="syncFieldValidity('title', 'blur')"
          @invalid="syncFieldValidity('title', 'invalid')"
        />
        <p
          :id="titleErrorId"
          class="mwg-field-error items-center gap-1.5 text-xs text-kapok mt-1.5"
        >
          <span aria-hidden="true">!</span>
          <span>{{ t("feedback.titleField.requiredError") }}</span>
        </p>
      </div>

      <!-- 描述 -->
      <div>
        <div class="flex items-center justify-between gap-3 mb-2">
          <label
            :for="descriptionFieldId"
            class="block text-sm font-medium text-ink/80 dark:text-stone-300"
          >
            {{ t("feedback.description.label") }}
          </label>
          <button
            type="button"
            class="text-sm font-medium text-graphite/60 dark:text-stone-200 hover:text-kapok underline underline-offset-2 disabled:no-underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            :disabled="!description"
            @click="clearDescription"
          >
            {{ t("feedback.description.clear") }}
          </button>
        </div>
        <textarea
          :id="descriptionFieldId"
          ref="descriptionInputEl"
          v-model="description"
          :placeholder="t('feedback.description.placeholder')"
          rows="8"
          :aria-invalid="descriptionInvalid ? 'true' : 'false'"
          :aria-describedby="descriptionInvalid ? descriptionErrorId : undefined"
          :class="[
            'mwg-field-control mwg-auto-textarea px-3 py-2 border-none bg-surface-low dark:bg-stone-800 text-ink dark:text-stone-100 focus:ring-1 focus:ring-kapok/30 transition-colors',
            descriptionFallbackInvalid && 'user-invalid-fallback',
          ]"
          required
          @input="syncFieldValidity('description', 'input')"
          @blur="syncFieldValidity('description', 'blur')"
          @invalid="syncFieldValidity('description', 'invalid')"
        ></textarea>
        <p
          :id="descriptionErrorId"
          class="mwg-field-error items-center gap-1.5 text-xs text-kapok mt-1.5"
        >
          <span aria-hidden="true">!</span>
          <span>{{ t("feedback.description.requiredError") }}</span>
        </p>
      </div>

      <!-- 词条相关信息（当反馈类型为词条错误时显示） -->
      <div v-if="feedbackType === 'entry-error'" class="space-y-3">
        <div>
          <label
            :for="entryWordFieldId"
            class="block text-sm font-medium text-ink/80 dark:text-stone-300 mb-2"
          >
            {{ t("feedback.entry.word.label") }}
          </label>
          <input
            :id="entryWordFieldId"
            v-model="entryWord"
            type="text"
            :placeholder="t('feedback.entry.word.placeholder')"
            class="w-full px-3 py-2 border-none bg-surface-low dark:bg-stone-800 text-ink dark:text-stone-100 focus:ring-1 focus:ring-kapok/30 transition-colors"
          />
        </div>
        <div>
          <label
            :for="entrySourceFieldId"
            class="block text-sm font-medium text-ink/80 dark:text-stone-300 mb-2"
          >
            {{ t("feedback.entry.source.label") }}
          </label>
          <select
            :id="entrySourceFieldId"
            v-model="entrySource"
            class="w-full px-3 py-2 border-none bg-surface-low dark:bg-stone-800 text-ink dark:text-stone-100 focus:ring-1 focus:ring-kapok/30 transition-colors"
          >
            <option value="">
              {{ t("feedback.entry.source.placeholder") }}
            </option>
            <option
              v-for="source in dictionarySources"
              :key="source.value"
              :value="source.value"
            >
              {{ source.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- 联系方式（可选） -->
      <div>
        <label
          :for="contactFieldId"
          class="block text-sm font-medium text-ink/80 dark:text-stone-300 mb-1"
        >
          {{ t("feedback.contact.label") }}
        </label>
        <p
          :id="contactHintId"
          class="text-xs text-graphite/60 dark:text-stone-200 mb-2"
        >
          {{ t("feedback.contact.hint") }}
        </p>
        <input
          :id="contactFieldId"
          v-model="contact"
          type="text"
          autocomplete="email"
          :aria-describedby="contactHintId"
          :placeholder="t('feedback.contact.placeholder')"
          class="w-full px-3 py-2 border-none bg-surface-low dark:bg-stone-800 text-ink dark:text-stone-100 focus:ring-1 focus:ring-kapok/30 transition-colors"
        />
      </div>

      <!-- 提交行：左侧提示，右侧按钮 -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-4">
        <div
          class="text-sm flex items-center gap-2 min-h-[28px] text-ink/80 dark:text-stone-300"
          role="status"
          aria-live="polite"
        >
          <template v-if="showSuccess && successUrl">
            <svg
              class="w-4 h-4 text-archive-green shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span class="text-archive-green">
              {{ t("feedback.success.message") }}
              <a
                :href="successUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="underline font-medium"
              >
                {{ t("feedback.success.linkText") }}
                {{ successIssueNumber ? `#${successIssueNumber}` : successUrl }}
              </a>
            </span>
          </template>
          <div
            v-else-if="errorMessage"
            role="alert"
            class="flex items-center gap-2"
          >
            <svg
              class="w-4 h-4 text-kapok shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m-6 4h8a2 2 0 002-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span class="text-kapok">{{ errorMessage }}</span>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-graphite dark:text-stone-400 bg-surface-low dark:bg-stone-800 hover:bg-surface-high dark:hover:bg-stone-700 transition-colors"
            @click="$emit('close')"
          >
            {{ t("feedback.cancel") }}
          </button>
          <button
            type="submit"
            :disabled="isSubmitting || showSuccess"
            :class="[
              'px-4 py-2 text-sm font-medium text-white flex items-center gap-2 transition-colors',
              isSubmitting
                ? 'bg-kapok'
                : showSuccess
                  ? 'bg-archive-green hover:bg-archive-green/90'
                  : 'bg-kapok hover:bg-kapok/90',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            ]"
          >
            <svg
              v-if="isSubmitting"
              class="w-4 h-4 animate-spin motion-reduce:animate-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span v-if="isSubmitting">{{ t("feedback.submitting") }}</span>
            <span v-else-if="showSuccess">{{
              t("feedback.success.buttonLabel")
            }}</span>
            <span v-else-if="errorMessage">{{
              t("feedback.error.buttonLabel")
            }}</span>
            <span v-else>{{ t("feedback.submit") }}</span>
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { X } from "lucide-vue-next";
import { LOCALE_ROUTE_DEFINITIONS } from "~/utils/route-paths";

const { t, locale } = useI18n();

const fallbackTitleId = useId();
const titleFieldId = useId();
const titleErrorId = useId();
const descriptionFieldId = useId();
const descriptionErrorId = useId();
const entryWordFieldId = useId();
const entrySourceFieldId = useId();
const contactFieldId = useId();
const contactHintId = useId();

// 根据当前语言获取词典名称
const getDictionaryName = (name: string | Record<string, string>): string => {
  if (typeof name === "string") {
    return name;
  }
  const fallbacks = new Set<string>();
  const currentLocale = String(locale.value || "").trim();

  if (currentLocale) {
    fallbacks.add(currentLocale);

    if (currentLocale.endsWith("Hans")) {
      fallbacks.add(currentLocale.replace(/Hans$/, "Hant"));
    } else if (currentLocale.endsWith("Hant")) {
      fallbacks.add(currentLocale.replace(/Hant$/, "Hans"));
    }
  }

  LOCALE_ROUTE_DEFINITIONS.forEach(({ code }) => fallbacks.add(code));

  for (const localeCode of fallbacks) {
    if (name[localeCode]) {
      return name[localeCode];
    }
  }
  const firstKey = Object.keys(name)[0];
  return firstKey ? name[firstKey] || "" : "";
};

interface Props {
  titleId?: string;
  entryData?: {
    word: string;
    source?: string;
    id?: string;
  };
  /**
   * 外部传入的初始描述内容
   * 用于在词条卡片中点击反馈时，自动填充当前词条的完整信息，方便用户直接修改
   */
  initialDescription?: string;
  initialType?: "bug" | "feature" | "entry-error";
}

const props = withDefaults(defineProps<Props>(), {
  titleId: undefined,
  entryData: undefined,
  initialDescription: undefined,
  initialType: undefined,
});

const resolvedTitleId = computed(() => props.titleId || fallbackTitleId);

interface DictionaryIndexItem {
  id: string;
  name: string | Record<string, string>;
}

interface DictionaryIndex {
  dictionaries: DictionaryIndexItem[];
}

const dictIndexUrl = "/dictionaries/index.json";

const { data: dictIndex } = await useAsyncData<DictionaryIndex>(
  "feedback-dictionaries",
  () => $fetch<DictionaryIndex>(dictIndexUrl),
);

defineEmits<{
  close: [];
  submitted: [];
}>();

const feedbackTypes = computed(() => [
  {
    value: "bug",
    label: t("feedback.type.bug"),
  },
  {
    value: "feature",
    label: t("feedback.type.feature"),
  },
  {
    value: "entry-error",
    label: t("feedback.type.entryError"),
  },
]);

const dictionarySources = computed(
  () =>
    dictIndex.value?.dictionaries?.map((dict) => ({
      value: dict.id,
      label: getDictionaryName(dict.name),
    })) ?? [],
);

type FeedbackType = "bug" | "feature" | "entry-error";

// 表单数据
const feedbackType = ref<FeedbackType>("bug");
const title = ref("");
const description = ref(props.initialDescription || "");
const entryWord = ref(props.entryData?.word || "");
const entrySource = ref("");
const contact = ref("");

// 表单验证与状态（同步 :user-invalid 与 aria-invalid）
const titleInputEl = ref<HTMLInputElement | null>(null);
const descriptionInputEl = ref<HTMLTextAreaElement | null>(null);
const titleInteracted = ref(false);
const titleCommitted = ref(false);
const titleInvalid = ref(false);
const titleFallbackInvalid = ref(false);
const descriptionInteracted = ref(false);
const descriptionCommitted = ref(false);
const descriptionInvalid = ref(false);
const descriptionFallbackInvalid = ref(false);

const supportsUserInvalid = () =>
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("selector(:user-invalid)");

const syncFieldValidity = (
  field: "title" | "description",
  trigger: "input" | "blur" | "invalid",
) => {
  const el =
    field === "title" ? titleInputEl.value : descriptionInputEl.value;
  if (!el) return;

  const isTitle = field === "title";
  const interacted = isTitle ? titleInteracted : descriptionInteracted;
  const committed = isTitle ? titleCommitted : descriptionCommitted;
  const invalidState = isTitle ? titleInvalid : descriptionInvalid;
  const fallbackInvalid = isTitle
    ? titleFallbackInvalid
    : descriptionFallbackInvalid;

  if (trigger === "input") {
    interacted.value = true;
  } else if (trigger === "blur") {
    committed.value = true;
  } else if (trigger === "invalid") {
    interacted.value = true;
    committed.value = true;
  }

  if (supportsUserInvalid()) {
    const isNowInvalid =
      trigger === "invalid" ? !el.validity.valid : el.matches(":user-invalid");
    invalidState.value = isNowInvalid;
    fallbackInvalid.value = false;
    return;
  }

  const shouldEvaluate =
    trigger === "invalid" || (interacted.value && committed.value);
  if (!shouldEvaluate) return;

  const isNowInvalid = !el.validity.valid;
  invalidState.value = isNowInvalid;
  fallbackInvalid.value = isNowInvalid;
};

const clearDescription = () => {
  description.value = "";
  nextTick(() => {
    syncFieldValidity("description", "input");
  });
};

// 提交状态
const isSubmitting = ref(false);
const showSuccess = ref(false);
const errorMessage = ref("");
const successUrl = ref<string | null>(null);
const successIssueNumber = ref<number | null>(null);

const normalizeEntrySource = (source?: string) => {
  if (!source) return "";
  const sources = dictionarySources.value;
  const dictionaries = dictIndex.value?.dictionaries || [];

  if (sources.some((s) => s.value === source)) return source;

  for (const dict of dictionaries) {
    const name = dict.name;
    if (typeof name === "string") {
      if (name === source) return dict.id;
    } else {
      for (const langKey of Object.keys(name)) {
        if (name[langKey] === source) return dict.id;
      }
    }
  }

  const matched = sources.find((s) => s.label === source);
  return matched?.value || "";
};

watchEffect(() => {
  if (props.initialType) {
    feedbackType.value = props.initialType;
  } else if (props.entryData) {
    feedbackType.value = "entry-error";
  }

  if (props.entryData?.word) entryWord.value = props.entryData.word;
  entrySource.value = normalizeEntrySource(props.entryData?.source);
});

const submitFeedback = async () => {
  if (isSubmitting.value || showSuccess.value) return;

  isSubmitting.value = true;
  errorMessage.value = "";
  showSuccess.value = false;

  try {
    const payload = {
      title: `[${feedbackType.value.toUpperCase()}] ${title.value}`,
      description: description.value,
      feedbackType: feedbackType.value,
      entryWord: entryWord.value,
      entrySource: entrySource.value,
      entryId: props.entryData?.id || "",
      contact: contact.value || "",
    };

    const res = await $fetch<{ url: string; number: number }>(
      "/api/feedback.issue",
      {
        method: "POST",
        body: payload,
      },
    );

    showSuccess.value = true;
    successUrl.value = res.url;
    successIssueNumber.value = res.number;
  } catch (error) {
    console.error("提交回饋失敗:", error);
    errorMessage.value = t("feedback.error.submitFailed");
  } finally {
    isSubmitting.value = false;
  }
};
</script>
