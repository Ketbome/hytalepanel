<script lang="ts">
import { tick } from 'svelte';
import { _ } from 'svelte-i18n';
import BlockLoader from '$lib/components/ui/BlockLoader.svelte';
import Button from '$lib/components/ui/Button.svelte';
import Icon from '$lib/components/ui/Icon.svelte';
import Input from '$lib/components/ui/Input.svelte';
import Menu, { type MenuEntry } from '$lib/components/ui/Menu.svelte';
import Segmented from '$lib/components/ui/Segmented.svelte';
import { startServer } from '$lib/services/lifecycle';
import { emit } from '$lib/services/socketClient';
import {
  addLog,
  autoScroll,
  clearLogs,
  hasMoreHistory,
  initialLoadDone,
  isLoadingMore,
  loadedCount,
  logs
} from '$lib/stores/console';
import { pendingAction, serverStatus } from '$lib/stores/server';
import { sidebarHidden, toolsDrawerOpen } from '$lib/stores/ui';
import { workspaceStatus } from '$lib/utils/status';

const { toolsButton = false }: { toolsButton?: boolean } = $props();

// Command definitions for autocomplete
const COMMANDS = [
  // Auth & Server
  { cmd: '/auth login device', desc: 'Start OAuth authentication' },
  { cmd: '/auth status', desc: 'Check auth status' },
  { cmd: '/auth logout', desc: 'Logout from authentication' },
  { cmd: '/auth persistence Encrypted', desc: 'Save credentials encrypted' },
  { cmd: '/help', desc: 'Show all commands' },
  { cmd: '/stop', desc: 'Stop the server' },
  { cmd: '/version', desc: 'Show server version' },
  { cmd: '/backup', desc: 'Create server backup' },
  { cmd: '/who', desc: 'List online players' },
  { cmd: '/maxplayers', desc: 'Get/set max players' },
  { cmd: '/kick', desc: 'Kick a player' },
  { cmd: '/ban', desc: 'Ban a player' },
  { cmd: '/unban', desc: 'Unban a player' },
  { cmd: '/say', desc: 'Broadcast message to all' },
  { cmd: '/notify', desc: 'Send notification to all' },
  // Player
  { cmd: '/gamemode creative', desc: 'Set Creative mode' },
  { cmd: '/gamemode adventure', desc: 'Set Adventure mode' },
  { cmd: '/gamemode survival', desc: 'Set Survival mode' },
  { cmd: '/kill', desc: 'Kill player' },
  { cmd: '/damage', desc: 'Deal damage to player' },
  { cmd: '/whereami', desc: 'Show current location' },
  { cmd: '/whoami', desc: 'Show player identity' },
  { cmd: '/player stats dump', desc: 'Show all player stats' },
  { cmd: '/player stats get health', desc: 'Get health stat' },
  { cmd: '/player stats set health', desc: 'Set health stat' },
  { cmd: '/player stats settomax health', desc: 'Set health to max' },
  { cmd: '/player effect apply', desc: 'Apply effect to player' },
  { cmd: '/player effect clear', desc: 'Clear all effects' },
  { cmd: '/player camera reset', desc: 'Reset camera view' },
  { cmd: '/player camera topdown', desc: 'Top-down camera' },
  { cmd: '/player respawn', desc: 'Force respawn' },
  { cmd: '/player reset', desc: 'Reset player data' },
  { cmd: '/player zone', desc: 'Show current zone/biome' },
  // Teleportation
  { cmd: '/tp', desc: 'Teleport to coords/player' },
  { cmd: '/tp home', desc: 'Teleport to spawn' },
  { cmd: '/tp top', desc: 'Teleport to surface' },
  { cmd: '/tp back', desc: 'Return to previous location' },
  { cmd: '/tp world', desc: 'Teleport to world spawn' },
  { cmd: '/spawn', desc: 'Go to spawn point' },
  { cmd: '/warp', desc: 'Teleport to warp point' },
  { cmd: '/warp set', desc: 'Create warp point' },
  { cmd: '/warp list', desc: 'List warp points' },
  // Time & Weather
  { cmd: '/time', desc: 'Get/set time' },
  { cmd: '/time Dawn', desc: 'Set time to dawn' },
  { cmd: '/time Midday', desc: 'Set time to midday' },
  { cmd: '/time Dusk', desc: 'Set time to dusk' },
  { cmd: '/time Midnight', desc: 'Set time to midnight' },
  { cmd: '/time pause', desc: 'Pause time' },
  { cmd: '/weather set Clear', desc: 'Set clear weather' },
  { cmd: '/weather set Rain', desc: 'Set rain' },
  { cmd: '/weather set Storm', desc: 'Set storm' },
  { cmd: '/weather reset', desc: 'Reset to natural weather' },
  // Inventory & Items
  { cmd: '/give', desc: 'Give item to player' },
  { cmd: '/give armor', desc: 'Give armor set' },
  { cmd: '/inventory clear', desc: 'Clear inventory' },
  { cmd: '/inventory backpack', desc: 'Get/set backpack size' },
  { cmd: '/spawnitem', desc: 'Spawn item entity' },
  // Entity
  { cmd: '/entity clone', desc: 'Clone entity' },
  { cmd: '/entity remove', desc: 'Remove entity' },
  { cmd: '/entity clean', desc: 'Remove all entities' },
  { cmd: '/entity count', desc: 'Count entities' },
  { cmd: '/entity invulnerable', desc: 'Make entity invulnerable' },
  // NPC
  { cmd: '/npc spawn', desc: 'Spawn NPC' },
  { cmd: '/npc freeze', desc: 'Freeze NPC AI' },
  { cmd: '/npc thaw', desc: 'Unfreeze NPC' },
  { cmd: '/npc clean', desc: 'Remove all NPCs' },
  // World
  { cmd: '/world list', desc: 'List worlds' },
  { cmd: '/world save', desc: 'Save world' },
  { cmd: '/world save --all', desc: 'Save all worlds' },
  { cmd: '/world tps', desc: 'Get/set tick rate' },
  { cmd: '/world config setspawn', desc: 'Set spawn point' },
  { cmd: '/world config pvp true', desc: 'Enable PvP' },
  { cmd: '/world config pvp false', desc: 'Disable PvP' },
  // Chunk
  { cmd: '/chunk info', desc: 'Chunk information' },
  { cmd: '/chunk regenerate', desc: 'Regenerate chunk' },
  { cmd: '/chunk resend', desc: 'Resend chunks to player' },
  // Builder Tools (Creative)
  { cmd: '/pos1', desc: 'Set selection corner 1' },
  { cmd: '/pos2', desc: 'Set selection corner 2' },
  { cmd: '/copy', desc: 'Copy selection' },
  { cmd: '/cut', desc: 'Cut selection' },
  { cmd: '/paste', desc: 'Paste clipboard' },
  { cmd: '/set', desc: 'Fill selection with block' },
  { cmd: '/replace', desc: 'Replace blocks in selection' },
  { cmd: '/undo', desc: 'Undo last operation' },
  { cmd: '/redo', desc: 'Redo operation' },
  { cmd: '/rotate', desc: 'Rotate selection' },
  { cmd: '/flip', desc: 'Flip selection' },
  { cmd: '/stack', desc: 'Stack selection' },
  { cmd: '/hollow', desc: 'Hollow out selection' },
  { cmd: '/walls', desc: 'Create walls' },
  { cmd: '/deselect', desc: 'Clear selection' },
  // Whitelist
  { cmd: '/whitelist add', desc: 'Add to whitelist' },
  { cmd: '/whitelist remove', desc: 'Remove from whitelist' },
  { cmd: '/whitelist enable', desc: 'Enable whitelist' },
  { cmd: '/whitelist disable', desc: 'Disable whitelist' },
  { cmd: '/whitelist list', desc: 'List whitelisted' },
  // Debug
  { cmd: '/ping', desc: 'Show ping/latency' },
  { cmd: '/server stats memory', desc: 'Memory statistics' },
  { cmd: '/server stats cpu', desc: 'CPU statistics' },
  { cmd: '/server gc', desc: 'Force garbage collection' },
  { cmd: '/log global', desc: 'Get/set log level' },
  // Worldmap
  { cmd: '/worldmap discover all', desc: 'Discover all zones' },
  { cmd: '/worldmap undiscover all', desc: 'Undiscover all zones' },
  // Lighting
  { cmd: '/lighting info', desc: 'Lighting system info' },
  { cmd: '/lighting calculation FLOOD', desc: 'Normal lighting' },
  { cmd: '/lighting calculation FULLBRIGHT', desc: 'Full brightness' },
  // Plugin
  { cmd: '/plugin list', desc: 'List plugins' },
  { cmd: '/plugin load', desc: 'Load plugin' },
  { cmd: '/plugin unload', desc: 'Unload plugin' },
  { cmd: '/plugin reload', desc: 'Reload plugin' }
];

type Filter = 'all' | 'info' | 'warn' | 'error' | 'cmd';

let consoleEl: HTMLDivElement | undefined = $state();
let cmdInput = $state('');
let lastCmdTime = 0;
let suggestions = $state<typeof COMMANDS>([]);
let selectedIndex = $state(-1);
let showSuggestions = $state(false);
let filterType = $state<Filter>('all');

const status = $derived(workspaceStatus($serverStatus, $pendingAction));
const filteredLogs = $derived(filterType === 'all' ? $logs : $logs.filter((log) => log.type === filterType));
const errorCount = $derived($logs.reduce((n, log) => (log.type === 'error' ? n + 1 : n), 0));

const filterLabels = $derived<Record<Filter, string>>({
  all: $_('filterAll'),
  info: $_('filterInfo'),
  warn: $_('filterWarn'),
  error: $_('filterError'),
  cmd: $_('filterCmd')
});
const filterValues: Filter[] = ['all', 'info', 'warn', 'error', 'cmd'];
const filterOptions = $derived(
  filterValues.map((value) => ({
    value,
    label: filterLabels[value],
    count: value === 'error' && errorCount > 0 ? errorCount : undefined
  }))
);
const filterMenu = $derived<MenuEntry[]>(
  filterValues.map((value) => ({
    label: filterLabels[value],
    meta: value === 'error' && errorCount > 0 ? String(errorCount) : undefined,
    checked: filterType === value,
    onselect: () => (filterType = value)
  }))
);

function shortTime(timestamp: string): string {
  return timestamp.match(/\d{2}:\d{2}:\d{2}/)?.[0] ?? timestamp;
}

function getSuggestions(input: string): typeof COMMANDS {
  if (!input || input.length < 1) return [];
  const lower = input.toLowerCase();
  return COMMANDS.filter((c) => c.cmd.toLowerCase().startsWith(lower)).slice(0, 8);
}

function handleInput(): void {
  suggestions = getSuggestions(cmdInput);
  showSuggestions = suggestions.length > 0;
  selectedIndex = -1;
}

function selectSuggestion(suggestion: (typeof COMMANDS)[0]): void {
  cmdInput = suggestion.cmd;
  showSuggestions = false;
  selectedIndex = -1;
}

function handleScroll(): void {
  if (!consoleEl) return;

  const nearTop = consoleEl.scrollTop < 100;
  const canScroll = consoleEl.scrollHeight > consoleEl.clientHeight;
  const nearBottom = consoleEl.scrollHeight - consoleEl.scrollTop - consoleEl.clientHeight < 50;

  autoScroll.set(nearBottom);

  if (nearTop && canScroll && $initialLoadDone && !$isLoadingMore && $hasMoreHistory && $loadedCount > 0) {
    isLoadingMore.set(true);
    emit('logs:more', {
      currentCount: $loadedCount,
      batchSize: 200
    });
  }
}

function jumpToLatest(): void {
  if (consoleEl) consoleEl.scrollTop = consoleEl.scrollHeight;
  autoScroll.set(true);
}

function sendCommand(): void {
  if (!$serverStatus.running) return;
  const cmd = cmdInput.trim();
  if (!cmd) return;

  if (Date.now() - lastCmdTime < 300) return;
  lastCmdTime = Date.now();

  addLog(`> ${cmd}`, 'cmd');
  emit('command', cmd);
  cmdInput = '';
  showSuggestions = false;
}

function handleKeydown(e: KeyboardEvent): void {
  if (showSuggestions && suggestions.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % suggestions.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = selectedIndex <= 0 ? suggestions.length - 1 : selectedIndex - 1;
    } else if (e.key === 'Tab' || (e.key === 'Enter' && selectedIndex >= 0)) {
      e.preventDefault();
      if (selectedIndex >= 0) {
        selectSuggestion(suggestions[selectedIndex]);
      } else if (suggestions.length > 0) {
        selectSuggestion(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      // Autocomplete closes first; the key goes no further
      e.stopPropagation();
      showSuggestions = false;
      selectedIndex = -1;
    } else if (e.key === 'Enter' && selectedIndex < 0) {
      sendCommand();
    }
  } else if (e.key === 'Enter') {
    sendCommand();
  }
}

function handleBlur(): void {
  // Delay to allow click on suggestion
  setTimeout(() => {
    showSuggestions = false;
  }, 150);
}

function handleFocus(): void {
  if (cmdInput && suggestions.length > 0) {
    showSuggestions = true;
  }
}

$effect(() => {
  // Track logs changes
  $logs;
  // Scroll to bottom after DOM update
  tick().then(() => {
    if ($autoScroll && consoleEl) {
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
  });
});
</script>

<div class="flex h-full min-h-0 flex-col">
  <div class="flex h-11 shrink-0 items-center gap-3 border-b border-line px-3">
    <h2 class="text-sm font-semibold text-fg-1">{$_('console')}</h2>
    <Segmented
      class="max-sm:hidden"
      size="sm"
      label={$_('logFilter')}
      value={filterType}
      options={filterOptions}
      onchange={(v) => (filterType = v)}
    />
    <Menu items={filterMenu} label={$_('logFilter')} class="sm:hidden" minWidth="160px">
      {#snippet trigger(props)}
        <Button variant="ghost" size="sm" icon="list-filter" trailingIcon="chevron-down" {...props}>
          {filterLabels[filterType]}
        </Button>
      {/snippet}
    </Menu>
    <div class="ml-auto flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        icon="eraser"
        animateIcon
        aria-label={$_('clearConsole')}
        title={$_('clearConsole')}
        onclick={clearLogs}
      />
      {#if toolsButton}
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          icon="panel-left"
          aria-label={$_('layoutSplit')}
          title={$_('layoutSplit')}
          onclick={() => {
            toolsDrawerOpen.set(false);
            sidebarHidden.set(false);
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          icon="wrench"
          id="tools-drawer-trigger"
          aria-expanded={$toolsDrawerOpen}
          onclick={() => toolsDrawerOpen.update((v) => !v)}
        >
          {$_('tools')}
        </Button>
      {/if}
    </div>
  </div>

  <div class="relative min-h-0 flex-1 bg-sunken">
    <!-- Focusable so the log can be scrolled with the keyboard -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="hp-log h-full overflow-y-auto overflow-x-hidden px-4 py-3 font-mono text-[13px] leading-5"
      bind:this={consoleEl}
      onscroll={handleScroll}
      role="log"
      aria-live="off"
      aria-label={$_('consoleOutput')}
      tabindex="0"
    >
      {#if $isLoadingMore}
        <div class="flex h-7 items-center gap-2 font-sans text-[13px] text-fg-3">
          <BlockLoader />
          {$_('loadingEarlierOutput')}
        </div>
      {/if}

      {#if $logs.length === 0}
        <div class="flex h-full flex-col items-center justify-center gap-3 px-4 text-center font-sans">
          {#if status === 'online' || status === 'starting'}
            <p class="flex items-center gap-2 text-sm text-fg-3"><BlockLoader /> {$_('waitingForOutput')}</p>
          {:else}
            <p class="text-sm text-fg-2">{$_('consoleOffline')}</p>
            {#if status === 'offline'}
              <Button variant="secondary" icon="play" onclick={startServer}>{$_('start')}</Button>
            {/if}
          {/if}
        </div>
      {:else if filteredLogs.length === 0}
        <p class="py-2 font-sans text-[13px] text-fg-3">{$_('noLinesForFilter', { values: { filter: filterLabels[filterType] } })}</p>
      {/if}

      {#each filteredLogs as log}
        <div
          class="hp-line"
          class:text-fg-1={log.type === '' || log.type === 'auth'}
          class:text-fg-2={log.type === 'info'}
          class:text-warning={log.type === 'warn'}
          class:hp-error={log.type === 'error'}
          class:text-accent={log.type === 'cmd'}
        >
          <span class="text-fg-3 select-none" title={log.timestamp}>{shortTime(log.timestamp)}</span>
          <span class="min-w-0">
            {#if log.type === 'warn'}<Icon name="triangle-alert" size={12} class="mr-1.5 -mt-0.5 align-middle" />{/if}
            {#if log.parts && log.parts.length > 0}
              {#each log.parts as part}
                {#if part.type === 'url'}
                  <a href={part.url} target="_blank" rel="noopener noreferrer" class="hp-log-url">{part.value}</a>
                {:else if part.type === 'code'}
                  <span class="ml-[1ch] font-medium text-accent">{part.value}</span>
                {:else}
                  {part.value}
                {/if}
              {/each}
            {:else}
              {log.text}
            {/if}
          </span>
        </div>
      {/each}
    </div>

    {#if !$autoScroll && $logs.length > 0}
      <div class="absolute right-3 bottom-3">
        <Button variant="secondary" size="sm" icon="arrow-down-to-line" onclick={jumpToLatest}>{$_('jumpToLatest')}</Button>
      </div>
    {/if}

    {#if errorCount > 0}
      <span class="hp-sr-only" aria-live="polite">{$_('errorCount', { values: { count: errorCount } })}</span>
    {/if}
  </div>

  <div class="flex shrink-0 items-center gap-2 border-t border-line px-3 py-2.5">
    <div class="relative min-w-0 flex-1">
      <Input
        type="text"
        mono
        class="w-full"
        placeholder={$serverStatus.running ? $_('enterCommand') : $_('serverOfflinePlaceholder')}
        autocomplete="off"
        spellcheck={false}
        aria-label={$_('command')}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showSuggestions && suggestions.length > 0}
        aria-controls="cmd-suggestions"
        aria-activedescendant={selectedIndex >= 0 ? `cmd-opt-${selectedIndex}` : undefined}
        bind:value={cmdInput}
        oninput={handleInput}
        onkeydown={handleKeydown}
        onblur={handleBlur}
        onfocus={handleFocus}
        disabled={!$serverStatus.running}
      >
        {#snippet leading()}<span class="font-mono text-[13px] text-accent">›</span>{/snippet}
      </Input>
      {#if showSuggestions && suggestions.length > 0}
        <ul
          id="cmd-suggestions"
          role="listbox"
          aria-label={$_('commandSuggestions')}
          class="absolute right-0 bottom-full left-0 z-30 mb-1 flex flex-col rounded-md border border-line-2 bg-overlay p-1 shadow-menu"
        >
          {#each suggestions as suggestion, i}
            <li
              id="cmd-opt-{i}"
              role="option"
              aria-selected={i === selectedIndex}
              class="flex h-8 cursor-pointer items-center justify-between gap-4 rounded-sm px-2"
              class:bg-raised={i === selectedIndex}
              onmousedown={() => selectSuggestion(suggestion)}
            >
              <span class="truncate font-mono text-[13px] text-fg-1"
                ><span class="text-accent">{suggestion.cmd.slice(0, cmdInput.length)}</span>{suggestion.cmd.slice(cmdInput.length)}</span
              >
              <span class="truncate text-xs text-fg-3 max-sm:hidden">{suggestion.desc}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
    <Button variant="secondary" onclick={sendCommand} disabled={!$serverStatus.running} class="max-sm:hidden">
      {$_('send')}
    </Button>
    <Button
      variant="secondary"
      iconOnly
      icon="send-horizontal"
      aria-label={$_('send')}
      onclick={sendCommand}
      disabled={!$serverStatus.running}
      class="sm:hidden"
    />
  </div>
</div>

<style>
  .hp-log ::selection {
    background: var(--hp-accent-soft);
  }

  .hp-log:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--hp-accent);
  }

  .hp-line {
    display: grid;
    grid-template-columns: 8ch minmax(0, 1fr);
    column-gap: 12px;
    overflow-wrap: anywhere;
  }

  .hp-error {
    color: var(--hp-negative);
    background: var(--hp-negative-bg);
    margin-inline: -16px;
    padding-inline: 16px;
  }

  .hp-log-url {
    color: var(--hp-fg-1);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
  }
</style>
