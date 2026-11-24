import type { ComponentPublicInstance } from "vue";

interface UsePopoverMenuOptions {
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * Coordinate a native `popover="auto"` menu with a click-outside and Escape
 * fallback for browsers that lack the HTML Popover API (e.g. Safari <17).
 */
export function usePopoverMenu(options: UsePopoverMenuOptions = {}) {
  const popoverId = useId();
  const triggerEl = ref<HTMLButtonElement | null>(null);
  const popoverEl = ref<HTMLElement | null>(null);
  const isOpen = ref(false);

  const setPopoverEl = (el: Element | ComponentPublicInstance | null) => {
    popoverEl.value =
      typeof HTMLElement !== "undefined" && el instanceof HTMLElement
        ? el
        : null;
  };

  const supportsNativePopover = () =>
    typeof HTMLElement !== "undefined" &&
    typeof HTMLElement.prototype.showPopover === "function";

  const setFallbackOpen = (next: boolean) => {
    if (isOpen.value === next) return;
    isOpen.value = next;
    if (next) {
      options.onOpen?.();
    } else {
      options.onClose?.();
    }
  };

  const close = () => {
    if (supportsNativePopover()) {
      popoverEl.value?.hidePopover?.();
      return;
    }

    setFallbackOpen(false);
  };

  const toggle = () => {
    // Native popover="auto" handles trigger clicks through `:popovertarget`.
    if (supportsNativePopover()) return;

    setFallbackOpen(!isOpen.value);
  };

  const handleToggle = (event: ToggleEvent) => {
    const next = event.newState === "open";
    isOpen.value = next;
    if (next) {
      options.onOpen?.();
    } else {
      options.onClose?.();
    }
  };

  if (import.meta.client) {
    const handleDocumentClick = (event: MouseEvent) => {
      if (supportsNativePopover() || !isOpen.value) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (
        triggerEl.value?.contains(target) ||
        popoverEl.value?.contains(target)
      ) {
        return;
      }
      setFallbackOpen(false);
    };

    const handleDocumentKeydown = (event: KeyboardEvent) => {
      if (supportsNativePopover() || !isOpen.value) return;
      if (event.key === "Escape") {
        setFallbackOpen(false);
        triggerEl.value?.focus();
      }
    };

    onMounted(() => {
      document.addEventListener("click", handleDocumentClick);
      document.addEventListener("keydown", handleDocumentKeydown);
    });

    onBeforeUnmount(() => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleDocumentKeydown);
    });
  }

  return {
    popoverId,
    triggerEl,
    setPopoverEl,
    isOpen,
    toggle,
    close,
    handleToggle,
  };
}
