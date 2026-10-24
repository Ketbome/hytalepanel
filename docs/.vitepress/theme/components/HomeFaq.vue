<script setup lang="ts">
import { ref } from "vue";

defineProps<{ faq: { title: string; items: { q: string; a: string }[] } }>();

const active = ref(0);
</script>

<template>
  <section class="hp-section hp-faq" aria-labelledby="hp-faq-title">
    <div class="hp-frame hp-grid">
      <div class="index">
        <h2 id="hp-faq-title" class="hp-h2" data-reveal>{{ faq.title }}</h2>
        <ul class="list" data-reveal style="--d: 80ms">
          <li v-for="(item, i) in faq.items" :key="i" class="item" :class="{ on: active === i }">
            <button
              :id="`hp-faq-q${i}`"
              type="button"
              class="q"
              :aria-expanded="active === i"
              :aria-controls="`hp-faq-a${i}`"
              @click="active = i"
              @mouseenter="active = i"
              @focus="active = i"
            >
              <span class="sq" aria-hidden="true" />{{ item.q }}
            </button>
            <div
              :id="`hp-faq-a${i}`"
              class="inline"
              role="region"
              :aria-labelledby="`hp-faq-q${i}`"
              :hidden="active !== i"
              v-html="item.a"
            />
          </li>
        </ul>
      </div>
      <div class="pane" aria-hidden="true">
        <Transition name="hp-fade" mode="out-in">
          <p :key="active" class="answer" v-html="faq.items[active].a" />
        </Transition>
      </div>
    </div>
  </section>
</template>

<style scoped>
.index {
  grid-column: 1 / -1;
}

.list {
  margin: 32px 0 0;
  padding: 0;
  list-style: none;
}

.item + .item {
  margin-top: 4px;
}

.q {
  display: flex;
  align-items: baseline;
  gap: 14px;
  width: 100%;
  padding: 10px 0;
  font-size: 18px;
  font-weight: 500;
  line-height: 26px;
  text-align: left;
  color: var(--hp-fg-2);
  cursor: pointer;
  transition: color var(--hp-dur-hover) ease;
}

.sq {
  flex: none;
  width: 8px;
  height: 8px;
  transform: translateY(-2px);
  background: var(--hp-fg-3);
  transition: background-color var(--hp-dur-hover) ease;
}

.on .q {
  color: var(--hp-fg-1);
}

.on .sq {
  background: var(--hp-accent);
}

.q:focus-visible {
  outline-offset: 0;
}

.inline {
  padding: 0 0 16px 22px;
  font-size: 17px;
  line-height: 26px;
  color: var(--hp-fg-1);
}

.inline :deep(code),
.answer :deep(code) {
  padding: 1px 5px;
  border-radius: var(--hp-radius-1);
  background: var(--hp-bg-2);
  font-family: var(--hp-font-mono);
  font-size: 0.82em;
}

.pane {
  display: none;
}

@media (min-width: 960px) {
  .index {
    grid-column: 1 / 7;
  }

  .inline {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  .inline[hidden] {
    display: none;
  }

  .pane {
    display: block;
    grid-column: 8 / -1;
    align-self: start;
    position: sticky;
    top: 120px;
    margin-top: 88px;
    min-height: 240px;
    padding: 32px 0 0;
  }

  .answer {
    margin: 0;
    max-width: 34ch;
    font-size: clamp(20px, 1.8vw, 24px);
    font-weight: 400;
    line-height: 1.4;
    color: var(--hp-fg-1);
    text-wrap: pretty;
  }
}

@media (hover: hover) and (pointer: fine) {
  .q:hover {
    color: var(--hp-fg-1);
  }
}

.hp-fade-enter-active,
.hp-fade-leave-active {
  transition: opacity 150ms ease;
}

.hp-fade-enter-from,
.hp-fade-leave-to {
  opacity: 0;
}
</style>
