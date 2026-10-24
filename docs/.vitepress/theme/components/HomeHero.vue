<script setup lang="ts">
import { withBase } from "vitepress";
import { computed } from "vue";
import HomeConsole from "./HomeConsole.vue";

type Link = { text: string; link: string };
const props = defineProps<{
  hero: { title: string[]; lead: string; primary: Link; secondary: Link; hint: string };
  con: any;
  prefix: string;
}>();

const chars = computed(() => Math.max(...props.hero.title.map((l) => l.length)));
// Unbounded's Cyrillic runs wider than its Latin; the headline is sized so its longest line always fits.
const fit = computed(() => (/[\u0400-\u04ff]/.test(props.hero.title.join("")) ? 0.7 : 0.62));
const href = (l: string) => (/^https?:/.test(l) ? l : withBase(l));
</script>

<template>
  <section class="hp-hero">
    <div class="hp-frame hp-grid layout">
      <h1 class="title" :style="{ '--chars': chars, '--fit': fit }">
        <span v-for="(line, i) in hero.title" :key="i" class="line" :style="{ '--d': `${i * 70}ms` }">{{ line }}</span>
      </h1>
      <div class="side">
        <p class="lead">{{ hero.lead }}</p>
        <div class="actions">
          <a class="hp-btn primary" :href="href(hero.primary.link)">{{ hero.primary.text }}</a>
          <a class="hp-btn" :href="href(hero.secondary.link)" target="_blank" rel="noopener">
            {{ hero.secondary.text }}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M6 3H3v10h10v-3M9 3h4v4M13 3 7.5 8.5" /></svg>
          </a>
        </div>
        <p class="hint">{{ hero.hint }}</p>
      </div>
      <div class="stage">
        <div class="stage-inner">
          <HomeConsole :s="con" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hp-hero {
  padding-top: 48px;
}

.layout {
  row-gap: 0;
}

.title {
  grid-column: 1 / -1;
  margin: 0;
  font-family: var(--hp-font-display);
  font-size: min(40px, calc((100vw - 48px) / (var(--chars) * var(--fit))));
  font-weight: 500;
  line-height: 1.04;
  letter-spacing: -0.035em;
  color: var(--hp-fg-1);
}

.line {
  display: block;
  white-space: nowrap;
}

.side {
  grid-column: 1 / -1;
  padding-top: 20px;
}

.lead {
  margin: 0;
  max-width: 42ch;
  font-size: 17px;
  line-height: 26px;
  color: var(--hp-fg-1);
  text-wrap: pretty;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 28px;
}

.hint {
  margin: 20px 0 0;
  max-width: 40ch;
  font-size: 14px;
  line-height: 20px;
  color: var(--hp-fg-3);
}

/* The orange stage: one flat field with a single block missing from its corner */
.stage {
  grid-column: 1 / -1;
  margin: 40px calc(-1 * var(--hp-gutter)) 0;
  padding: 40px 16px 24px;
  background: var(--hp-accent);
  clip-path: polygon(24px 0, 100% 0, 100% 100%, 0 100%, 0 24px, 24px 24px);
}

.stage-inner {
  max-width: 640px;
}

@media (min-width: 640px) {
  .title {
    font-size: min(64px, calc((100vw - 64px) / (var(--chars) * var(--fit))));
  }

  .stage {
    padding: 56px 32px 40px;
    clip-path: polygon(40px 0, 100% 0, 100% 100%, 0 100%, 0 40px, 40px 40px);
  }
}

@media (min-width: 960px) {
  .hp-hero {
    padding-top: 72px;
  }

  .title {
    grid-column: 1 / 10;
    font-size: min(68px, calc(66vw / (var(--chars) * var(--fit))));
  }

  .side {
    grid-column: 1 / 5;
    padding-top: 48px;
  }

  .lead {
    font-size: 18px;
    line-height: 28px;
  }

  .stage {
    grid-column: 5 / -1;
    margin: 48px calc(-1 * var(--hp-gutter)) 0 0;
    padding: 56px 56px 56px 56px;
  }
}

/* Load entrance: headline lines, then the side column, then the stage opens from its left edge */
@media (prefers-reduced-motion: no-preference) {
  .line,
  .side {
    animation: hp-rise 800ms var(--hp-ease-out) both;
    animation-delay: var(--d, 0ms);
  }

  .side {
    --d: 160ms;
  }

  .stage {
    animation: hp-shutter 1100ms var(--hp-ease-in-out) 220ms both;
  }

  .stage-inner {
    animation: hp-settle 1100ms var(--hp-ease-out) 380ms both;
  }
}

@keyframes hp-rise {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
}

@keyframes hp-shutter {
  from {
    clip-path: polygon(40px 0, 40px 0, 40px 100%, 0 100%, 0 40px, 40px 40px);
  }
}

@keyframes hp-settle {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
}
</style>
