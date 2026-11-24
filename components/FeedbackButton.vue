<template>
  <div class="inline-flex">
    <!-- 反馈按钮（内联，不悬浮） -->
    <button
      type="button"
      class="inline-flex items-center min-h-7"
      :class="[hideIcon ? 'gap-0' : 'gap-2', buttonClass]"
      :aria-label="t('feedback.buttonTitle')"
      @click="openFeedbackModal"
    >
      <MessageSquare v-if="!hideIcon" class="w-3.5 h-3.5" aria-hidden="true" />
      <template v-if="iconOnly">
        <span class="sr-only">{{ t("feedback.buttonTitle") }}</span>
      </template>
      <template v-else>
        <span :class="[labelClass, iconOnlyOnMobile && 'hidden sm:inline']">{{
          t("feedback.buttonShort")
        }}</span>
      </template>
    </button>

    <!-- 反馈模态框（原生 <dialog> top-layer） -->
    <dialog
      :id="dialogId"
      ref="dialogEl"
      closedby="any"
      :aria-labelledby="titleId"
      class="mwg-dialog w-[min(42rem,calc(100%-2rem))] max-h-[90dvh] overflow-y-auto"
      @close="handleDialogClose"
    >
      <FeedbackForm
        v-if="showFeedbackModal"
        :title-id="titleId"
        :entry-data="entryData"
        :initial-description="initialDescription"
        :initial-type="initialType"
        @close="closeFeedbackModal"
        @submitted="handleFeedbackSubmitted"
      />
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { MessageSquare } from "lucide-vue-next";

const { t } = useI18n();

interface Props {
  entryData?: {
    word: string;
    source?: string;
    id?: string;
  };
  /**
   * 外部提供的初始描述内容
   * 例如：从词条卡片传入完整词条信息，方便用户在反馈时直接修改
   */
  initialDescription?: string;
  buttonClass?: string;
  iconOnly?: boolean;
  /**
   * 为 true 时，移动端仅显示图标以节省空间；首页、关于页等大按钮场景不传即可
   */
  iconOnlyOnMobile?: boolean;
  labelClass?: string;
  initialType?: "bug" | "feature" | "entry-error";
  /** 为 true 时不显示图标，仅显示文字，便于内联链接样式使用 */
  hideIcon?: boolean;
}

withDefaults(defineProps<Props>(), {
  entryData: undefined,
  initialDescription: undefined,
  buttonClass:
    "inline-flex items-center gap-1.5 px-3 py-1 bg-archive-green/10 dark:bg-archive-green/40 text-archive-green rounded-md text-sm whitespace-nowrap hover:bg-archive-green/20 dark:hover:bg-archive-green/50 transition-colors",
  iconOnly: false,
  iconOnlyOnMobile: false,
  labelClass: "text-sm",
  initialType: undefined,
  hideIcon: false,
});

const dialogId = useId();
const titleId = useId();
const dialogEl = ref<HTMLDialogElement | null>(null);
const showFeedbackModal = ref(false);

const openFeedbackModal = async () => {
  showFeedbackModal.value = true;
  await nextTick();
  if (dialogEl.value && !dialogEl.value.open) {
    dialogEl.value.showModal();
  }
};

const closeFeedbackModal = () => {
  if (dialogEl.value?.open) {
    dialogEl.value.close();
    return;
  }
  showFeedbackModal.value = false;
};

const handleDialogClose = () => {
  if (dialogEl.value) {
    dialogEl.value.returnValue = "";
  }
  showFeedbackModal.value = false;
};

const handleFeedbackSubmitted = () => {
  closeFeedbackModal();
};

let removeBackdropListeners: (() => void) | null = null;

onMounted(() => {
  const dialog = dialogEl.value;
  if (!dialog || "closedBy" in HTMLDialogElement.prototype) {
    return;
  }

  // Fallback for browsers without <dialog closedby="any"> (e.g. Safari):
  // require both press and release outside the dialog box so drag-selection
  // ending on the backdrop does not dismiss the dialog.
  const isOutside = (event: PointerEvent) => {
    const rect = dialog.getBoundingClientRect();
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  };

  let pressedOutside = false;
  const onPointerDown = (event: PointerEvent) => {
    if (!dialog.open) return;
    pressedOutside = isOutside(event);
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!dialog.open) return;
    if (pressedOutside && isOutside(event)) {
      dialog.close();
    }
    pressedOutside = false;
  };

  dialog.addEventListener("pointerdown", onPointerDown);
  dialog.addEventListener("pointerup", onPointerUp);
  removeBackdropListeners = () => {
    dialog.removeEventListener("pointerdown", onPointerDown);
    dialog.removeEventListener("pointerup", onPointerUp);
  };
});

onUnmounted(() => {
  removeBackdropListeners?.();
  removeBackdropListeners = null;
});
</script>
