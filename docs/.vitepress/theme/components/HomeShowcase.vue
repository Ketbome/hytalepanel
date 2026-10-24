<script setup lang="ts">
import { withBase } from "vitepress";

defineProps<{
  showcase: { title: string; text: string; alt: string; list: string; listAlt: string };
}>();
</script>

<template>
  <section class="hp-section hp-showcase" aria-labelledby="hp-showcase-title">
    <div class="hp-frame hp-grid">
      <h2 id="hp-showcase-title" class="hp-h2 title" data-reveal>{{ showcase.title }}</h2>
      <p class="hp-statement text" data-reveal style="--d: 80ms">{{ showcase.text }}</p>

      <figure class="shot" data-reveal="shutter">
        <img
          :src="withBase('/images/panel.png')"
          :alt="showcase.alt"
          width="2938"
          height="1614"
          loading="lazy"
          decoding="async"
        />
      </figure>

      <p class="hp-statement list" data-reveal>{{ showcase.list }}</p>
      <figure class="crop" data-reveal style="--d: 80ms">
        <img
          :src="withBase('/images/dashboard.png')"
          :alt="showcase.listAlt"
          width="2940"
          height="1618"
          loading="lazy"
          decoding="async"
        />
      </figure>
    </div>
  </section>
</template>

<style scoped>
.title {
  grid-column: 1 / -1;
}

.text {
  grid-column: 1 / -1;
  margin-top: 20px;
  max-width: 36ch;
}

/* The screenshot sits on a stage one tone up, bleeding off the right edge */
.shot {
  grid-column: 1 / -1;
  margin: 48px calc(-1 * var(--hp-gutter)) 0 0;
  padding: 16px 0 0 16px;
  overflow: hidden;
  border-radius: var(--hp-radius-3) 0 0 0;
  background: var(--hp-bg-2);
}

.shot img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: var(--hp-radius-2) 0 0 0;
}

.list {
  grid-column: 1 / -1;
  margin-top: 56px;
  max-width: 30ch;
}

/* The server list, cropped to its table */
.crop {
  grid-column: 1 / -1;
  margin: 24px 0 0;
  aspect-ratio: 3.84;
  overflow: hidden;
  border-radius: var(--hp-radius-3);
  background: var(--hp-bg-0);
}

.crop img {
  display: block;
  width: 131.6%;
  max-width: none;
  height: auto;
  margin: -5.1% 0 0 -15.8%;
}

/* On a phone the screenshots are cropped, not shrunk, so their text stays readable */
@media (max-width: 639px) {
  .shot {
    aspect-ratio: 1.1;
  }

  .shot img {
    width: 240%;
    max-width: none;
    margin-top: -7.8%;
  }

  .crop {
    aspect-ratio: 1.6;
  }

  .crop img {
    width: 340%;
    margin: -24% 0 0 -44%;
  }
}

@media (min-width: 960px) {
  .title {
    grid-column: 1 / 7;
    align-self: start;
  }

  .text {
    grid-column: 7 / 12;
    margin-top: 6px;
  }

  .shot {
    margin-top: 64px;
  }

  .list {
    grid-column: 1 / 5;
    align-self: center;
    margin-top: 64px;
  }

  .crop {
    grid-column: 5 / -1;
    margin-top: 64px;
  }
}

/* Signature move: the screenshot opens like a shutter and settles from 1.12 */
.shot.hp-armed {
  opacity: 1;
  transform: none;
  clip-path: inset(0 0 100% 0);
}

.shot.hp-armed img {
  transform: scale(1.12);
  transform-origin: 30% 0;
}

.shot.hp-armed.hp-in {
  clip-path: inset(0 0 0 0);
  transition: clip-path 1100ms var(--hp-ease-in-out);
}

.shot.hp-armed.hp-in img {
  transform: none;
  transition: transform 1400ms var(--hp-ease-out);
}

@media (prefers-reduced-motion: reduce) {
  .shot.hp-armed,
  .shot.hp-armed.hp-in {
    clip-path: none;
  }

  .shot.hp-armed img {
    transform: none;
  }
}
</style>
