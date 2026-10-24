<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps<{
  steps: { title: string; running: string; downloading: string; players: string; items: string[] };
  con: { online: string; offline: string; up: string };
}>();

// Download cells fill by count (never by width) once the card is on screen.
const CELLS = 24;
const TARGET = 17;
const filled = ref(TARGET);
const card = ref<HTMLElement>();
let io: IntersectionObserver | undefined;
let timer = 0;

onMounted(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !card.value) return;
  if (card.value.getBoundingClientRect().top < window.innerHeight) return;
  filled.value = 0;
  io = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      io?.disconnect();
      timer = window.setInterval(() => {
        filled.value++;
        if (filled.value >= TARGET) clearInterval(timer);
      }, 55);
    },
    { threshold: 0.6 },
  );
  io.observe(card.value);
});

onBeforeUnmount(() => {
  io?.disconnect();
  clearInterval(timer);
});

const pct = () => Math.round((filled.value / CELLS) * 100);
</script>

<template>
  <section class="hp-steps" aria-labelledby="hp-steps-title">
    <ol class="fields">
      <li class="field f1">
        <h2 id="hp-steps-title" class="hp-h2 heading">{{ steps.title }}</h2>
        <div class="cardwrap" data-reveal>
          <div class="card" data-ui>
          <p class="row"><span class="mono name">hytale-panel</span></p>
          <p class="row meta"><span class="status on"><span class="sq" aria-hidden="true" />{{ steps.running }}</span><span class="dot">·</span><span class="mono">:3000/tcp</span></p>
          <p class="row cmd mono"><span class="pr">$</span> docker compose up -d</p>
          </div>
        </div>
        <p class="clause">{{ steps.items[0] }}</p>
      </li>
      <li class="field f2">
        <div class="cardwrap" data-reveal style="--d: 80ms">
          <div class="card" data-ui>
          <p class="row"><span class="name">Survival-01</span></p>
          <p class="row meta"><span class="status off"><span class="sq" aria-hidden="true" />{{ con.offline }}</span><span class="dot">·</span><span class="mono">5520/udp</span><span class="dot">·</span><span class="mono">4G–8G</span></p>
          <p class="row cmd mono">hytale-a1b2c3d4</p>
          </div>
        </div>
        <p class="clause">{{ steps.items[1] }}</p>
      </li>
      <li class="field f3">
        <div class="cardwrap" data-reveal style="--d: 160ms">
          <div ref="card" class="card" data-ui>
          <p class="row"><span class="name">Survival-01</span></p>
          <p class="row meta"><span class="status busy"><span class="sq" aria-hidden="true" />{{ steps.downloading }}</span></p>
          <p class="row progress">
            <span class="cells" aria-hidden="true"><span v-for="i in CELLS" :key="i" class="cell" :class="{ lit: i <= filled }" /></span>
            <span class="mono pct">{{ pct() }}%</span>
          </p>
          </div>
        </div>
        <p class="clause">{{ steps.items[2] }}</p>
      </li>
      <li class="field f4">
        <div class="cardwrap" data-reveal style="--d: 240ms">
          <div class="card" data-ui>
          <p class="row"><span class="name">Survival-01</span></p>
          <p class="row meta"><span class="status on"><span class="sq" aria-hidden="true" />{{ con.online }}</span><span class="dot">·</span><span class="mono">{{ con.up.replace("{time}", "3h 12m") }}</span></p>
          <p class="row cmd">{{ steps.players.replace("{n}", "4") }}<span class="dot">·</span><span class="mono">5520/udp</span></p>
          </div>
        </div>
        <p class="clause">{{ steps.items[3] }}</p>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.hp-steps {
  margin-top: 0;
}

.fields {
  display: grid;
  grid-template-columns: 1fr;
  margin: 0;
  padding: 0;
  list-style: none;
}

.field {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 40px 24px 48px;
}

.f1 {
  background: var(--hp-bg-sunken);
}

.f2 {
  background: var(--hp-bg-1);
}

.f3 {
  background: var(--hp-bg-2);
}

.f4 {
  background: var(--hp-bg-3);
}

.heading {
  margin-bottom: -8px;
}

.clause {
  order: -1;
  margin: 0;
  max-width: 22ch;
  font-size: clamp(20px, 1.7vw, 24px);
  font-weight: 500;
  line-height: 1.3;
  color: var(--hp-fg-1);
  text-wrap: balance;
}

.heading {
  order: -2;
}

.card {
  width: 100%;
  max-width: 280px;
  padding: 14px 16px;
  border: 1px solid var(--hp-line-2);
  border-radius: var(--hp-radius-3);
  background: var(--hp-bg-0);
  font-size: 13px;
  line-height: 20px;
  color: var(--hp-fg-2);
  transition: transform var(--hp-dur-ui) var(--hp-ease-out);
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.row + .row {
  margin-top: 4px;
}

.name {
  font-size: 14px;
  font-weight: 600;
  color: var(--hp-fg-1);
}

.mono {
  font-family: var(--hp-font-mono);
  font-size: 12px;
}

.mono.name {
  font-size: 13px;
  font-weight: 500;
}

.cmd {
  margin-top: 10px !important;
  padding-top: 10px;
  border-top: 1px solid var(--hp-line-1);
  color: var(--hp-fg-3);
}

.cmd.mono {
  color: var(--hp-fg-2);
}

.pr {
  color: var(--hp-accent);
}

.dot {
  color: var(--hp-fg-3);
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.sq {
  width: 8px;
  height: 8px;
  background: currentColor;
}

.status.on {
  color: var(--hp-positive);
}

.status.off {
  color: var(--hp-fg-2);
}

.status.off .sq {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px var(--hp-fg-3);
}

.status.busy {
  color: var(--hp-warning);
}

.status.busy .sq {
  animation: hp-blink 1.2s steps(2, jump-none) infinite;
}

@keyframes hp-blink {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0.35;
  }
}

.progress {
  flex-wrap: nowrap;
  margin-top: 10px !important;
  padding-top: 10px;
  border-top: 1px solid var(--hp-line-1);
}

.cells {
  display: flex;
  gap: 2px;
}

.cell {
  width: 6px;
  height: 8px;
  background: var(--hp-bg-2);
}

.cell.lit {
  background: var(--hp-accent);
}

.pct {
  min-width: 4ch;
  text-align: right;
  color: var(--hp-fg-2);
  font-variant-numeric: tabular-nums;
}

@media (min-width: 640px) {
  .fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field {
    min-height: 400px;
    padding: 48px 32px;
  }
}

@media (min-width: 1100px) {
  .fields {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .field {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto 104px;
    gap: 32px;
    min-height: 540px;
    padding: 40px max(28px, calc(var(--hp-gutter) / 2)) 40px 28px;
  }

  .f1 {
    padding-left: var(--hp-gutter);
  }

  .heading {
    grid-row: 1;
    align-self: start;
  }

  .cardwrap {
    grid-row: 2;
  }

  .clause {
    grid-row: 3;
    align-self: start;
  }
}

@media (hover: hover) and (pointer: fine) {
  .field:hover .card {
    transform: translateY(-6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .status.busy .sq {
    animation: none;
  }

  .field:hover .card {
    transform: none;
  }
}
</style>
