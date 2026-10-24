<script setup lang="ts">
import { useData } from "vitepress";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import HomeClose from "./HomeClose.vue";
import HomeCompare from "./HomeCompare.vue";
import HomeFaq from "./HomeFaq.vue";
import HomeFooter from "./HomeFooter.vue";
import HomeHero from "./HomeHero.vue";
import HomeShowcase from "./HomeShowcase.vue";
import HomeSteps from "./HomeSteps.vue";

const { frontmatter, localeIndex } = useData();
const hp = computed(() => frontmatter.value.hp);
const prefix = computed(() => (localeIndex.value === "root" ? "" : `/${localeIndex.value}`));

const root = ref<HTMLElement>();
let io: IntersectionObserver | undefined;

// Section entrances: only what starts below the fold is hidden, so nothing visible ever blinks out.
onMounted(() => {
  const items = root.value?.querySelectorAll<HTMLElement>("[data-reveal]") ?? [];
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("hp-in");
        io?.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px" },
  );
  for (const el of items) {
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) continue;
    el.classList.add("hp-armed");
    io.observe(el);
  }
});

onBeforeUnmount(() => io?.disconnect());
</script>

<template>
  <div ref="root" class="hp-home">
    <HomeHero :hero="hp.hero" :con="hp.console" :prefix="prefix" />
    <HomeSteps :steps="hp.steps" :con="hp.console" />
    <HomeShowcase :showcase="hp.showcase" />
    <HomeCompare :compare="hp.compare" />
    <HomeFaq :faq="hp.faq" />
    <HomeClose :close="hp.close" />
    <HomeFooter :footer="hp.footer" :prefix="prefix" />
  </div>
</template>

<style>
.VPHome:has(.hp-home) {
  margin-bottom: 0 !important;
}

.hp-home {
  --hp-gutter: 24px;
  --hp-gap: 16px;
  overflow-x: clip;
  font-family: var(--hp-font-ui);
  color: var(--hp-fg-1);
}

@media (min-width: 768px) {
  .hp-home {
    --hp-gutter: max(32px, calc((100vw - 1376px) / 2));
    --hp-gap: 24px;
  }
}

.hp-frame {
  margin: 0 auto;
  padding: 0 var(--hp-gutter);
}

.hp-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  column-gap: var(--hp-gap);
}

.hp-home a {
  text-decoration: none;
}

/* Section headings: one size, one face, everywhere on the home */
.hp-h2 {
  margin: 0;
  font-family: var(--hp-font-display);
  font-size: clamp(26px, 3vw, 40px);
  font-weight: 500;
  line-height: 1.12;
  letter-spacing: -0.025em;
  color: var(--hp-fg-1);
  text-wrap: balance;
}

.hp-statement {
  margin: 0;
  font-size: clamp(20px, 1.8vw, 24px);
  font-weight: 500;
  line-height: 1.35;
  color: var(--hp-fg-1);
  text-wrap: pretty;
}

.hp-body {
  margin: 0;
  font-size: 17px;
  line-height: 26px;
  color: var(--hp-fg-1);
}

.hp-section {
  padding: 96px 0 0;
}

@media (min-width: 960px) {
  .hp-section {
    padding-top: 160px;
  }
}

/* Buttons shared by the home sections */
.hp-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 18px;
  border: 1px solid var(--hp-line-2);
  border-radius: var(--hp-radius-2);
  background: var(--hp-bg-2);
  font-size: 15px;
  font-weight: 600;
  color: var(--hp-fg-1) !important;
  white-space: nowrap;
  transition:
    background-color var(--hp-dur-hover) ease,
    border-color var(--hp-dur-hover) ease,
    transform var(--hp-dur-press) var(--hp-ease-out);
}

.hp-btn.primary {
  border-color: transparent;
  background: var(--hp-accent);
  color: var(--hp-accent-ink) !important;
}

.hp-btn.ink {
  border-color: transparent;
  background: var(--hp-bg-0);
  color: var(--hp-fg-1) !important;
}

.hp-btn:active {
  transform: scale(0.97);
}

@media (hover: hover) and (pointer: fine) {
  .hp-btn:hover {
    border-color: var(--hp-line-control);
    background: var(--hp-bg-3);
  }

  .hp-btn.primary:hover {
    border-color: transparent;
    background: var(--hp-accent-hover);
  }

  .hp-btn.ink:hover {
    border-color: transparent;
    background: var(--hp-bg-2);
  }
}

/* Entrances (armed by HomePage only for content below the fold) */
.hp-armed {
  opacity: 0;
  transform: translateY(24px);
}

.hp-armed.hp-in {
  opacity: 1;
  transform: none;
  transition:
    opacity 700ms var(--hp-ease-out),
    transform 700ms var(--hp-ease-out);
  transition-delay: var(--d, 0ms);
}

.hp-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .hp-armed {
    transform: none;
  }

  .hp-armed.hp-in {
    transition: opacity 200ms ease;
    transition-delay: 0ms;
  }

  .hp-btn:active {
    transform: none;
  }
}
</style>
