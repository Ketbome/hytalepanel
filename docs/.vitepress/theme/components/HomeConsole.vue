<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";

type Kind = "info" | "warn" | "cmd" | "error";
type Line = { id: number; time: string; text: string; kind: Kind };
type Status = "offline" | "starting" | "online" | "stopping";

const props = defineProps<{
  s: {
    online: string;
    offline: string;
    starting: string;
    stopping: string;
    up: string;
    placeholder: string;
    offlinePlaceholder: string;
    send: string;
    start: string;
    stop: string;
    log: string;
    command: string;
  };
}>();

const COMMANDS = ["/help", "/who", "/say", "/stop"];

const BOOT: [number, Kind, string][] = [
  [0, "info", "[HYTALE] Using host machine-id"],
  [240, "info", "[HYTALE] Files detected!"],
  [480, "info", "[HYTALE] Starting server (RAM: 4G-8G, Port: 5520/udp)"],
  [1050, "info", '[HytaleServer] Loading world "default"...'],
  [1650, "warn", "WARN Chunk 12,-4 took 812ms to generate"],
  [2150, "info", "Loaded 214 assets in 1.82s"],
  [2550, "info", "Server started on 0.0.0.0:5520"],
  [3700, "info", "Player Aleksandra joined (uuid 3f2b-11ee)"],
];

// Server-rendered state: the finished boot, so the fragment reads without JS.
let seq = 0;
const ssrTimes = ["21:04:09", "21:04:09", "21:04:10", "21:04:10", "21:04:11", "21:04:11", "21:04:12", "21:04:13"];
const lines = ref<Line[]>([
  ...BOOT.map(([, kind, text], i) => ({ id: seq++, time: ssrTimes[i], text, kind })),
  { id: seq++, time: "21:04:15", text: "› /who", kind: "cmd" as Kind },
  { id: seq++, time: "21:04:15", text: "Online players (1): Aleksandra", kind: "info" as Kind },
]);
const status = ref<Status>("online");
const players = ref<string[]>(["Aleksandra"]);
const pending = ref(true);
const input = ref("");
const upSince = ref(0);
const now = ref(0);

const well = ref<HTMLElement>();
const field = ref<HTMLInputElement>();
let timers: number[] = [];
let ticker = 0;
let typing = false;

const busy = computed(() => status.value === "starting" || status.value === "stopping");
const label = computed(() => props.s[status.value]);
const uptime = computed(() => {
  if (status.value !== "online" || !upSince.value) return "";
  const sec = Math.max(0, Math.floor((now.value - upSince.value) / 1000));
  const m = Math.floor(sec / 60);
  const t = m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${sec % 60}s`;
  return props.s.up.replace("{time}", t);
});

function clock() {
  return new Date().toTimeString().slice(0, 8);
}

function push(kind: Kind, text: string) {
  lines.value.push({ id: seq++, time: clock(), text, kind });
  if (lines.value.length > 40) lines.value.splice(0, lines.value.length - 40);
  nextTick(() => {
    if (well.value) well.value.scrollTop = well.value.scrollHeight;
  });
}

function later(ms: number, fn: () => void) {
  timers.push(window.setTimeout(fn, ms));
}

function clearTimers() {
  for (const id of timers) clearTimeout(id);
  timers = [];
  typing = false;
}

function boot(withDemo: boolean) {
  clearTimers();
  status.value = "starting";
  for (const [ms, kind, text] of BOOT) {
    later(ms, () => {
      push(kind, text);
      if (text.startsWith("Server started")) {
        status.value = "online";
        upSince.value = Date.now();
      }
      if (text.startsWith("Player Aleksandra")) players.value = ["Aleksandra"];
    });
  }
  if (withDemo) {
    later(4900, () => typeDemo("/who"));
    later(11000, () => {
      if (status.value !== "online") return;
      players.value = [...players.value, "Jo"];
      push("info", "Player Jo joined (uuid 9c41-07ab)");
    });
  }
}

function typeDemo(cmd: string) {
  if (document.activeElement === field.value) return;
  typing = true;
  let i = 0;
  const step = () => {
    if (!typing) return;
    input.value = cmd.slice(0, ++i);
    if (i < cmd.length) later(85, step);
    else
      later(380, () => {
        typing = false;
        send();
      });
  };
  step();
}

function run(raw: string) {
  const [name, ...rest] = raw.replace(/^\//, "").split(/\s+/);
  const cmd = name.toLowerCase();
  if (cmd === "help") {
    push("info", "Commands: /help, /who, /say <message>, /stop");
  } else if (cmd === "who") {
    push(
      "info",
      players.value.length
        ? `Online players (${players.value.length}): ${players.value.join(", ")}`
        : "No players online.",
    );
  } else if (cmd === "say") {
    const msg = rest.join(" ").slice(0, 80);
    push("info", msg ? `[Server] ${msg}` : "Usage: /say <message>");
  } else if (cmd === "stop") {
    stop();
  } else {
    push("error", `Unknown command "${raw.slice(0, 40)}". Type /help for a list.`);
  }
}

function send() {
  const raw = input.value.trim();
  input.value = "";
  if (!raw || status.value !== "online") return;
  push("cmd", `› ${raw}`);
  run(raw);
}

function stop() {
  clearTimers();
  status.value = "stopping";
  push("info", "Stopping server...");
  later(600, () => push("info", 'Saving world "default"...'));
  later(1400, () => {
    push("info", "Server stopped.");
    status.value = "offline";
    players.value = [];
    upSince.value = 0;
  });
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Tab" && input.value.startsWith("/")) {
    const match = COMMANDS.find((c) => c.startsWith(input.value) && c !== input.value);
    if (match) {
      e.preventDefault();
      input.value = match;
    }
  }
}

function onFocus() {
  if (typing) {
    clearTimers();
    input.value = "";
  }
}

function toggle() {
  if (status.value === "online") stop();
  else if (status.value === "offline") {
    push("info", "[HYTALE] Starting container hytale-a1b2c3d4");
    boot(false);
  }
}

onMounted(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  now.value = Date.now();
  upSince.value = Date.now() - 134_000;
  ticker = window.setInterval(() => (now.value = Date.now()), 1000);
  if (reduce) {
    const t = clock();
    for (const line of lines.value) line.time = t;
    pending.value = false;
    return;
  }
  lines.value = [];
  players.value = [];
  upSince.value = 0;
  pending.value = false;
  boot(true);
});

onBeforeUnmount(() => {
  clearTimers();
  clearInterval(ticker);
});
</script>

<template>
  <div class="hp-console" data-ui :data-pending="pending ? '' : undefined">
    <div class="head">
      <div class="who">
        <span class="name">Survival-01</span>
        <span class="meta" aria-live="polite">
          <span class="status" :class="status">
            <span class="sq" :class="{ blink: busy }" aria-hidden="true" />{{ label }}
          </span>
          <template v-if="uptime"><span class="dot">·</span><span class="mono">{{ uptime }}</span></template>
          <span class="dot">·</span><span class="mono">:5520/udp</span>
        </span>
      </div>
      <button
        type="button"
        class="btn"
        :class="{ primary: status === 'offline' }"
        :disabled="busy"
        @click="toggle"
      >
        {{ busy ? label : status === "online" ? s.stop : s.start }}
      </button>
    </div>

    <div ref="well" class="well" role="log" aria-live="off" :aria-label="s.log" tabindex="0">
      <p v-for="line in lines" :key="line.id" class="line" :class="line.kind">
        <span class="time">{{ line.time }}</span><span class="msg">{{ line.text }}</span>
      </p>
    </div>

    <form class="bar" @submit.prevent="send">
      <span class="prompt" aria-hidden="true">›</span>
      <input
        ref="field"
        v-model="input"
        class="input"
        type="text"
        autocomplete="off"
        spellcheck="false"
        :aria-label="s.command"
        :placeholder="status === 'online' ? s.placeholder : s.offlinePlaceholder"
        :disabled="status !== 'online'"
        @keydown="onKey"
        @focus="onFocus"
      />
      <button type="submit" class="btn" :disabled="status !== 'online'">{{ s.send }}</button>
    </form>
  </div>
</template>

<style scoped>
.hp-console {
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid var(--hp-line-1);
  border-radius: var(--hp-radius-3);
  background: var(--hp-bg-1);
  overflow: hidden;
  font-family: var(--hp-font-ui);
  color: var(--hp-fg-1);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 60px;
  padding: 10px 12px 10px 16px;
  border-bottom: 1px solid var(--hp-line-1);
}

.who {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  min-width: 0;
}

.name {
  font-family: var(--hp-font-display);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.meta {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  line-height: 18px;
  color: var(--hp-fg-2);
}

.mono {
  font-family: var(--hp-font-mono);
  font-size: 12px;
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

.status.online {
  color: var(--hp-positive);
}

.status.starting,
.status.stopping {
  color: var(--hp-warning);
}

.sq {
  width: 8px;
  height: 8px;
  background: currentColor;
}

.status.offline .sq {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px var(--hp-fg-3);
}

.sq.blink {
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

.btn {
  flex: none;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--hp-line-2);
  border-radius: var(--hp-radius-2);
  background: var(--hp-bg-2);
  font-family: var(--hp-font-ui);
  font-size: 14px;
  font-weight: 500;
  color: var(--hp-fg-1);
  cursor: pointer;
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

.btn:active:not(:disabled) {
  transform: scale(0.97);
}

.btn:disabled {
  border-color: var(--hp-line-1);
  color: var(--hp-fg-3);
  cursor: not-allowed;
}

@media (hover: hover) and (pointer: fine) {
  .btn:hover:not(:disabled) {
    border-color: var(--hp-line-control);
    background: var(--hp-bg-3);
  }

  .btn.primary:hover:not(:disabled) {
    border-color: transparent;
    background: var(--hp-accent-hover);
  }
}

.well {
  height: 296px;
  padding: 12px 16px;
  overflow-y: auto;
  background: var(--hp-bg-sunken);
  font-family: var(--hp-font-mono);
  font-size: 13px;
  line-height: 20px;
  scrollbar-width: thin;
  scrollbar-color: var(--hp-line-2) transparent;
}

.well:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--hp-accent);
}

/* JS replays the boot; hide the server-rendered log until it starts (unhides on its own if JS never runs). */
:global(.hp-js .hp-console[data-pending] .well > *) {
  visibility: hidden;
  animation: hp-unhide 0s 2.5s forwards;
}

@keyframes hp-unhide {
  to {
    visibility: visible;
  }
}

.line {
  display: grid;
  grid-template-columns: 8ch minmax(0, 1fr);
  column-gap: 12px;
  margin: 0;
  color: var(--hp-fg-2);
}

.time {
  color: var(--hp-fg-3);
}

.msg {
  overflow-wrap: anywhere;
}

.line.warn {
  color: var(--hp-warning);
}

.line.cmd {
  color: var(--hp-accent);
}

.line.error {
  margin: 0 -16px;
  padding: 0 16px;
  background: var(--hp-negative-bg);
  color: var(--hp-negative);
}

.bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--hp-line-1);
}

.prompt {
  margin-right: -32px;
  padding-left: 12px;
  width: 24px;
  position: relative;
  z-index: 1;
  font-family: var(--hp-font-mono);
  font-size: 13px;
  color: var(--hp-accent);
  pointer-events: none;
}

.input {
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 10px 0 28px;
  border: 1px solid var(--hp-line-control);
  border-radius: var(--hp-radius-2);
  background: var(--hp-bg-sunken);
  font-family: var(--hp-font-mono);
  font-size: 13px;
  color: var(--hp-fg-1);
}

.input::placeholder {
  color: var(--hp-fg-3);
}

.input:hover:not(:disabled) {
  border-color: var(--hp-fg-3);
}

.input:focus-visible {
  outline: none;
  border-color: var(--hp-accent);
  box-shadow: 0 0 0 1px var(--hp-accent);
}

.input:disabled {
  border-color: var(--hp-line-1);
  background: var(--hp-bg-1);
}

@media (max-width: 639px) {
  .well {
    height: 260px;
    padding: 10px 12px;
    font-size: 12px;
  }

  .line {
    grid-template-columns: minmax(0, 1fr);
  }

  .line .time {
    display: none;
  }

  .line.error {
    margin: 0 -12px;
    padding: 0 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sq.blink {
    animation: none;
  }

  .btn:active:not(:disabled) {
    transform: none;
  }
}
</style>
