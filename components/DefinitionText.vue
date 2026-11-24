<template>
  <span>
    <template v-if="!linkify">{{ text }}</template>
    <template v-else>
      <template v-for="(segment, index) in segments" :key="index">
        <NuxtLink
          v-if="segment.type === 'word-link' && segment.word"
          :to="wordPath(segment.word)"
          class="text-kapok hover:text-kapok/80 underline decoration-1 underline-offset-2 font-medium"
          @click.stop
        >{{ segment.text }}</NuxtLink>
        <template v-else>{{ segment.text }}</template>
      </template>
    </template>
  </span>
</template>

<script setup lang="ts">
import { parseDefinitionLinkSegments } from "~/utils/definition-links";

interface Props {
  text: string;
  linkify?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  linkify: false,
});

const { wordPath } = useAppRoutes();

const segments = computed(() =>
  props.linkify ? parseDefinitionLinkSegments(props.text) : [],
);
</script>
