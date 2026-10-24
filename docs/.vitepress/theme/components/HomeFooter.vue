<script setup lang="ts">
import { useData, withBase } from "vitepress";

type Link = { text: string; link: string };
defineProps<{
  footer: {
    statement: string;
    legal: string;
    navTitle: string;
    nav: Link[];
    langTitle: string;
    imageTitle: string;
    issue: Link;
  };
  prefix: string;
}>();

const { localeIndex } = useData();
const langs = [
  { key: "root", text: "English", link: "/", lang: "en" },
  { key: "es", text: "Español", link: "/es/", lang: "es" },
  { key: "uk", text: "Українська", link: "/uk/", lang: "uk" },
];
const href = (l: string) => (/^https?:/.test(l) ? l : withBase(l));
const external = (l: string) => /^https?:/.test(l);
</script>

<template>
  <footer class="hp-foot" aria-label="HytalePanel">
    <div class="hp-frame board">
      <div class="tile statement">
        <p class="say">{{ footer.statement }}</p>
        <p class="legal">{{ footer.legal }}</p>
      </div>

      <nav class="tile nav" :aria-label="footer.navTitle">
        <h2 class="label">{{ footer.navTitle }}</h2>
        <ul>
          <li v-for="item in footer.nav" :key="item.link">
            <a :href="href(item.link)" :target="external(item.link) ? '_blank' : undefined" :rel="external(item.link) ? 'noopener' : undefined">{{ item.text }}</a>
          </li>
        </ul>
      </nav>

      <nav class="tile langs" :aria-label="footer.langTitle">
        <h2 class="label">{{ footer.langTitle }}</h2>
        <ul>
          <li v-for="l in langs" :key="l.key">
            <a :href="withBase(l.link)" :hreflang="l.lang" :lang="l.lang" :aria-current="localeIndex === l.key ? 'page' : undefined">
              <span class="sq" aria-hidden="true" />{{ l.text }}
            </a>
          </li>
        </ul>
      </nav>

      <div class="tile image">
        <h2 class="label">{{ footer.imageTitle }}</h2>
        <ul>
          <li><a class="mono" href="https://hub.docker.com/r/ketbom/hytale-panel" target="_blank" rel="noopener">ketbom/hytale-panel</a></li>
          <li><a class="mono" href="https://hub.docker.com/r/ketbom/hytale-server" target="_blank" rel="noopener">ketbom/hytale-server</a></li>
        </ul>
      </div>

      <div class="tile word" aria-hidden="true">
        <span>HytalePanel</span>
      </div>

      <a class="tile issue" :href="footer.issue.link" target="_blank" rel="noopener">
        <span class="issue-text">{{ footer.issue.text }}</span>
        <svg class="arrow" width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M8 36 34 10M14 10h20v20" /></svg>
      </a>
    </div>
  </footer>
</template>

<style scoped>
.hp-foot {
  padding: 8px 0 var(--hp-gutter);
}

.board {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 20px;
  border-radius: var(--hp-radius-3);
  background: var(--hp-bg-1);
}

.word {
  grid-column: 1 / -1;
  order: -2;
  justify-content: flex-end;
  min-height: 160px;
  background: var(--hp-bg-1);
}

.word span {
  font-family: var(--hp-font-display);
  font-size: min(11.5vw, 108px);
  font-weight: 500;
  line-height: 0.9;
  letter-spacing: -0.045em;
  color: var(--hp-fg-1);
  white-space: nowrap;
}

.issue {
  grid-column: 1 / -1;
  order: -1;
  justify-content: space-between;
  min-height: 140px;
  background: var(--hp-bg-2);
  color: var(--hp-fg-1) !important;
  transition:
    background-color var(--hp-dur-hover) ease,
    transform var(--hp-dur-press) var(--hp-ease-out);
}

.issue-text {
  max-width: 14ch;
  font-size: clamp(20px, 1.8vw, 24px);
  font-weight: 500;
  line-height: 1.3;
}

.arrow {
  align-self: flex-end;
  color: var(--hp-accent);
  transition: transform var(--hp-dur-ui) var(--hp-ease-out);
}

.issue:active {
  transform: scale(0.99);
}

.statement {
  grid-column: 1 / -1;
  justify-content: space-between;
}

.image {
  grid-column: 1 / -1;
}

.say {
  margin: 0;
  max-width: 26ch;
  font-size: clamp(20px, 1.8vw, 24px);
  font-weight: 500;
  line-height: 1.3;
  color: var(--hp-fg-1);
}

.legal {
  margin: 0;
  max-width: 48ch;
  font-size: 14px;
  line-height: 20px;
  color: var(--hp-fg-2);
}

.label {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: var(--hp-fg-3);
}

ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.nav a,
.langs a {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  line-height: 26px;
  color: var(--hp-fg-1);
  transition: color var(--hp-dur-hover) ease;
}

.langs .sq {
  width: 6px;
  height: 6px;
  background: transparent;
  box-shadow: inset 0 0 0 1.5px var(--hp-fg-3);
}

.langs a[aria-current="page"] .sq {
  background: var(--hp-accent);
  box-shadow: none;
}

.mono {
  margin: 0;
  font-family: var(--hp-font-mono);
  font-size: 13px;
  line-height: 20px;
  color: var(--hp-fg-1);
  overflow-wrap: anywhere;
}

.image a {
  transition: color var(--hp-dur-hover) ease;
}

@media (min-width: 960px) {
  .board {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 8px;
  }

  .tile {
    padding: 24px;
  }

  .statement {
    grid-column: 1 / 6;
    min-height: 220px;
  }

  .nav {
    grid-column: 6 / 9;
  }

  .langs {
    grid-column: 9 / 11;
  }

  .image {
    grid-column: 11 / -1;
  }

  .word {
    grid-column: 1 / 9;
    order: 0;
    min-height: 300px;
  }

  .word span {
    font-size: min(7.4vw, 124px);
  }

  .issue {
    grid-column: 9 / -1;
    order: 0;
    min-height: 300px;
  }
}

@media (hover: hover) and (pointer: fine) {
  .nav a:hover,
  .langs a:hover,
  .image a:hover {
    color: var(--hp-accent);
  }

  .issue:hover {
    background: var(--hp-bg-3);
  }

  .issue:hover .arrow {
    transform: translate(4px, -4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .issue:active,
  .issue:hover .arrow {
    transform: none;
  }
}
</style>
