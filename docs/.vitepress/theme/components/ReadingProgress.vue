<script setup lang="ts">
import { useData, useRoute } from "vitepress";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

// Reading progress as discrete cells (the panel's segmented progress), doc pages only.
const { frontmatter, page } = useData();
const route = useRoute();
const isDoc = computed(
  () =>
    !page.value.isNotFound &&
    (!frontmatter.value.layout || frontmatter.value.layout === "doc"),
);

const cells = ref(0);
const filled = ref(0);
let frame = 0;

function measure() {
  frame = 0;
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  cells.value = Math.floor(window.innerWidth / 8);
  const pct = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  filled.value = Math.round(pct * cells.value);
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(measure);
}

onMounted(() => {
  measure();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
});

watch(
  () => route.path,
  () => nextTick(schedule),
);

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  window.removeEventListener("scroll", schedule);
  window.removeEventListener("resize", schedule);
});
</script>

<template>
  <div v-if="isDoc" class="hp-progress" aria-hidden="true">
    <span v-for="i in filled" :key="i" class="cell" />
  </div>
</template>

<style scoped>
.hp-progress {
  position: fixed;
  top: 0;
  left: 0;
  z-index: calc(var(--vp-z-index-nav) + 1);
  display: flex;
  gap: 2px;
  height: 3px;
  pointer-events: none;
}

.cell {
  flex: none;
  width: 6px;
  height: 3px;
  background: var(--hp-accent);
}

@media (min-width: 960px) {
  .hp-progress {
    top: calc(var(--vp-nav-height) - 3px);
  }
}
</style>
