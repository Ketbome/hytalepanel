<script setup lang="ts">
import { withBase } from "vitepress";
import { ref } from "vue";

const props = defineProps<{
  close: {
    title: string[];
    text: string;
    action: { text: string; link: string };
    copy: string;
    copied: string;
    comment: string;
  };
}>();

const RAW = "https://raw.githubusercontent.com/ketbome/hytalepanel/main";
const commands = [
  "mkdir hytale && cd hytale",
  `curl -O ${RAW}/docker-compose.yml`,
  `curl -O ${RAW}/.env.example`,
  "cp .env.example .env",
  "docker compose up -d",
];

const done = ref(false);
let timer = 0;

async function copy() {
  try {
    await navigator.clipboard.writeText(commands.join("\n"));
    done.value = true;
    clearTimeout(timer);
    timer = window.setTimeout(() => (done.value = false), 1800);
  } catch {
    done.value = false;
  }
}
</script>

<template>
  <section class="hp-close" aria-labelledby="hp-close-title">
    <div class="hp-frame hp-grid layout">
      <div class="words">
        <h2 id="hp-close-title" class="title" data-reveal>
          <span v-for="(line, i) in close.title" :key="i">{{ line }}</span>
        </h2>
        <p class="text" data-reveal style="--d: 80ms">{{ close.text }}</p>
        <div class="action" data-reveal style="--d: 140ms">
          <a class="hp-btn ink" :href="withBase(close.action.link)">
            {{ close.action.text }}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M3 8h9M8.5 4l4 4-4 4" /></svg>
          </a>
        </div>
      </div>

      <div class="term" data-ui data-reveal style="--d: 120ms">
        <div class="bar">
          <span class="path">~/hytale</span>
          <button type="button" class="copy" :class="{ done }" @click="copy">
            <span class="sq" aria-hidden="true" />
            <span aria-live="polite">{{ done ? close.copied : close.copy }}</span>
          </button>
        </div>
        <pre class="code"><code><template v-for="(cmd, i) in commands" :key="i"><span class="ln"><span class="pr" aria-hidden="true">$ </span>{{ cmd }}<span v-if="i === 3" class="cm">  # {{ close.comment }}</span></span>
</template></code></pre>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hp-close {
  margin-top: 96px;
  padding: 64px 0 24px;
  background: var(--hp-accent);
  color: var(--hp-accent-ink);
}

.layout {
  row-gap: 40px;
}

.words {
  grid-column: 1 / -1;
}

.title {
  margin: 0;
  font-family: var(--hp-font-display);
  font-size: clamp(36px, 5.6vw, 84px);
  font-weight: 500;
  line-height: 0.98;
  letter-spacing: -0.04em;
  color: var(--hp-accent-ink);
}

.title span {
  display: block;
}

.text {
  margin: 24px 0 0;
  max-width: 34ch;
  font-size: 17px;
  line-height: 26px;
  color: var(--hp-accent-ink);
}

.action {
  margin-top: 28px;
}

.term {
  grid-column: 1 / -1;
  margin: 0 calc(-1 * var(--hp-gutter)) 0;
  overflow: hidden;
  border-radius: 0;
  background: var(--hp-bg-sunken);
  color: var(--hp-fg-1);
}

.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 8px 0 16px;
  border-bottom: 1px solid var(--hp-line-1);
  background: var(--hp-bg-1);
}

.path {
  font-family: var(--hp-font-mono);
  font-size: 12px;
  color: var(--hp-fg-3);
}

.copy {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--hp-line-2);
  border-radius: var(--hp-radius-2);
  background: var(--hp-bg-2);
  font-size: 13px;
  font-weight: 500;
  color: var(--hp-fg-1);
  cursor: pointer;
  transition:
    background-color var(--hp-dur-hover) ease,
    border-color var(--hp-dur-hover) ease,
    transform var(--hp-dur-press) var(--hp-ease-out);
}

.copy .sq {
  width: 8px;
  height: 8px;
  box-shadow: inset 0 0 0 1.5px var(--hp-fg-3);
  transition: background-color var(--hp-dur-hover) ease;
}

.copy.done .sq {
  background: var(--hp-positive);
  box-shadow: none;
}

.copy.done {
  color: var(--hp-positive);
}

.copy:active {
  transform: scale(0.97);
}

@media (hover: hover) and (pointer: fine) {
  .copy:hover {
    border-color: var(--hp-line-control);
    background: var(--hp-bg-3);
  }
}

.code {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  font-family: var(--hp-font-mono);
  font-size: 13px;
  line-height: 24px;
  scrollbar-width: thin;
  scrollbar-color: var(--hp-line-2) transparent;
}

.code code {
  font: inherit;
}

.pr {
  color: var(--hp-accent);
  user-select: none;
}

.cm {
  color: var(--hp-fg-3);
}

@media (min-width: 640px) {
  .term {
    margin: 0;
    border-radius: var(--hp-radius-3);
  }
}

@media (min-width: 960px) {
  .hp-close {
    margin-top: 160px;
    padding: 0;
  }

  .layout {
    align-items: end;
    min-height: 600px;
    padding-top: 120px;
    padding-bottom: 96px;
  }

  .words {
    grid-column: 1 / 6;
  }

  .term {
    grid-column: 6 / -1;
    align-self: center;
  }

  .code {
    padding: 20px 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .copy:active {
    transform: none;
  }
}
</style>
