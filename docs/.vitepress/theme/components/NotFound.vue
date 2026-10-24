<script setup lang="ts">
import { useRoute, withBase } from "vitepress";
import { computed, onMounted, ref, watch } from "vue";
import { localeFromPath, t } from "../i18n";

const route = useRoute();
const path = ref("");
const time = ref("21:04:11");

function sync() {
  path.value = decodeURIComponent(route.path);
  time.value = new Date().toTimeString().slice(0, 8);
}

onMounted(sync);
watch(() => route.path, sync);

const locale = computed(() => localeFromPath(path.value));
const s = computed(() => t(locale.value).notFound);
const prefix = computed(() => (locale.value === "root" ? "" : `/${locale.value}`));

function openSearch() {
  document.querySelector<HTMLButtonElement>(".VPNavBarSearch button")?.click();
}
</script>

<template>
  <div class="hp-404">
    <div class="text">
      <h1 class="title">{{ s.title }}</h1>
      <p class="lead">{{ s.lead }}</p>
      <ul class="links">
        <li>
          <a class="btn primary" :href="withBase(`${prefix}/`)">{{ s.home }}</a>
        </li>
        <li>
          <a class="btn" :href="withBase(`${prefix}/guide/getting-started`)">{{ s.guide }}</a>
        </li>
        <li>
          <button type="button" class="btn" @click="openSearch">{{ s.search }}</button>
        </li>
      </ul>
    </div>

    <div class="well" data-ui role="log" aria-live="off">
      <p class="line"><span class="time">{{ time }}</span><span>GET <span class="path">{{ path || "/" }}</span></span></p>
      <p class="line warn"><span class="time">{{ time }}</span><span>404 · {{ s.log }}</span></p>
      <p class="line cursor"><span class="time" />›<span class="caret" aria-hidden="true" /></p>
    </div>
  </div>
</template>

<style scoped>
.hp-404 {
  display: grid;
  gap: 48px;
  margin: 0 auto;
  padding: 72px 24px 120px;
  max-width: 1376px;
}

@media (min-width: 768px) {
  .hp-404 {
    padding: 120px 32px 160px;
  }
}

@media (min-width: 960px) {
  .hp-404 {
    grid-template-columns: minmax(0, 6fr) minmax(0, 6fr);
    align-items: center;
    gap: 64px;
    min-height: calc(100vh - var(--vp-nav-height) - 160px);
    padding-top: 64px;
    padding-bottom: 96px;
  }
}

.title {
  font-family: var(--hp-font-display);
  font-size: clamp(30px, 4vw, 52px);
  font-weight: 500;
  line-height: 1.08;
  letter-spacing: -0.03em;
  color: var(--hp-fg-1);
  text-wrap: balance;
}

.lead {
  margin-top: 24px;
  max-width: 44ch;
  font-size: 17px;
  line-height: 26px;
  color: var(--hp-fg-1);
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 32px 0 0;
  padding: 0;
  list-style: none;
}

.btn {
  display: inline-flex;
  align-items: center;
  height: 40px;
  padding: 0 16px;
  border: 1px solid var(--hp-line-2);
  border-radius: var(--hp-radius-2);
  background: var(--hp-bg-2);
  font-size: 14px;
  font-weight: 600;
  color: var(--hp-fg-1);
  text-decoration: none;
  transition:
    background-color var(--hp-dur-hover) ease,
    border-color var(--hp-dur-hover) ease,
    transform var(--hp-dur-press) var(--hp-ease-out);
}

.btn.primary {
  border-color: transparent;
  background: var(--hp-accent);
  color: var(--hp-accent-ink);
}

.btn:active {
  transform: scale(0.97);
}

@media (hover: hover) and (pointer: fine) {
  .btn:hover {
    border-color: var(--hp-line-control);
    background: var(--hp-bg-3);
  }

  .btn.primary:hover {
    border-color: transparent;
    background: var(--hp-accent-hover);
  }
}

.well {
  padding: 20px 20px 24px;
  border: 1px solid var(--hp-line-1);
  border-radius: var(--hp-radius-3);
  background: var(--hp-bg-sunken);
  font-family: var(--hp-font-mono);
  font-size: 13px;
  line-height: 24px;
  color: var(--hp-fg-2);
}

.line {
  display: grid;
  grid-template-columns: 8ch minmax(0, 1fr);
  column-gap: 12px;
  margin: 0;
  overflow-wrap: anywhere;
}

.time {
  color: var(--hp-fg-3);
}

.path {
  color: var(--hp-fg-1);
}

.warn {
  color: var(--hp-warning);
}

.cursor {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--hp-accent);
}

.cursor .time {
  width: 8ch;
  margin-right: 4px;
}

.caret {
  display: inline-block;
  width: 8px;
  height: 15px;
  background: var(--hp-fg-2);
  animation: hp-caret 1.1s steps(2, jump-none) infinite;
}

@keyframes hp-caret {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .caret {
    animation: none;
  }
}
</style>
