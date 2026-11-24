<template>
  <progress :aria-label="resolvedLabel" class="mwg-spinner" :style="spinnerStyle" />
</template>

<script setup lang="ts">
interface Props {
  label?: string;
  size?: "sm" | "md" | "lg";
}

const props = withDefaults(defineProps<Props>(), {
  label: undefined,
  size: "md",
});

const { t } = useI18n();

const resolvedLabel = computed(() => props.label || t("common.loading"));

const spinnerStyle = computed(() => {
  if (props.size === "sm") {
    return { "--size": "1.5rem", "--thickness": "2px" };
  }
  if (props.size === "lg") {
    return { "--size": "3rem", "--thickness": "4px" };
  }
  return { "--size": "2.25rem", "--thickness": "3px" };
});
</script>
