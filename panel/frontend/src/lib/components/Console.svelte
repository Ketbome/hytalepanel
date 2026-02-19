<script lang="ts">
import { tick } from 'svelte';
import { _ } from 'svelte-i18n';
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
import { serverStatus } from '$lib/stores/server';

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

let consoleEl: HTMLDivElement | undefined = $state();
let cmdInput = $state('');
let lastCmdTime = 0;
let suggestions = $state<typeof COMMANDS>([]);
let selectedIndex = $state(-1);
let showSuggestions = $state(false);
let filterType = $state<'all' | 'info' | 'warning' | 'error' | 'cmd'>('all');

let filteredLogs = $derived(() => {
  if (filterType === 'all') return $logs;
  return $logs.filter((log) => log.type === filterType);
});

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

function handleClear(): void {
  clearLogs();
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

<div class="card">
  <div class="card-header">
    <span>{$_('console')}</span>
    <div class="console-filters">
      <button 
        class="filter-btn" 
        class:active={filterType === 'all'} 
        onclick={() => filterType = 'all'}
        title="All logs"
      >
        All
      </button>
      <button 
        class="filter-btn" 
        class:active={filterType === 'info'} 
        onclick={() => filterType = 'info'}
        title="Info logs"
      >
        Info
      </button>
      <button 
        class="filter-btn" 
        class:active={filterType === 'warning'} 
        onclick={() => filterType = 'warning'}
        title="Warning logs"
      >
        Warn
      </button>
      <button 
        class="filter-btn" 
        class:active={filterType === 'error'} 
        onclick={() => filterType = 'error'}
        title="Error logs"
      >
        Error
      </button>
      <button 
        class="filter-btn" 
        class:active={filterType === 'cmd'} 
        onclick={() => filterType = 'cmd'}
        title="Command logs"
      >
        Cmd
      </button>
    </div>
    <button class="console-clear-btn" title={$_('clearConsole')} onclick={handleClear}>✕</button>
  </div>
  <div class="console" bind:this={consoleEl} onscroll={handleScroll}>
    {#each filteredLogs() as log}
      <div class="log-line {log.type}">
        <span class="log-time">{log.timestamp} </span>{log.text}
      </div>
    {/each}
  </div>
  <div class="command-bar">
    <div class="input-wrapper">
      <input
        type="text"
        placeholder={$serverStatus.running ? $_('enterCommand') : $_('offline')}
        autocomplete="off"
        bind:value={cmdInput}
        oninput={handleInput}
        onkeydown={handleKeydown}
        onblur={handleBlur}
        onfocus={handleFocus}
        disabled={!$serverStatus.running}
      />
      {#if showSuggestions && suggestions.length > 0}
        <div class="suggestions">
          {#each suggestions as suggestion, i}
            <button
              class="suggestion"
              class:selected={i === selectedIndex}
              onmousedown={() => selectSuggestion(suggestion)}
            >
              <span class="cmd">{suggestion.cmd}</span>
              <span class="desc">{suggestion.desc}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
    <button onclick={sendCommand} disabled={!$serverStatus.running}>{$_('send')}</button>
  </div>
</div>

<style>
  .card-header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .console-filters {
    display: flex;
    gap: 0.25rem;
    margin-left: auto;
  }

  .filter-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    background: var(--mc-panel);
    border: 1px solid var(--mc-border-light);
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s;
  }

  .filter-btn:hover {
    background: var(--mc-panel-light);
    color: var(--hytale-yellow);
  }

  .filter-btn.active {
    background: var(--mc-panel-light);
    color: var(--hytale-orange);
    border-color: var(--hytale-orange);
  }

  .command-bar {
    display: flex;
    gap: 0.5rem;
  }

  .input-wrapper {
    flex: 1;
    position: relative;
  }

  .input-wrapper input {
    width: 100%;
  }

  .suggestions {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    background: #1a1a1a;
    border: 2px solid #444;
    border-bottom: none;
    max-height: 280px;
    overflow-y: auto;
    z-index: 100;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.5);
  }

  .suggestion {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: #1a1a1a;
    border: none;
    border-bottom: 1px solid #333;
    color: #e0e0e0;
    font-family: inherit;
    font-size: 0.9rem;
    cursor: pointer;
    text-align: left;
  }

  .suggestion:hover,
  .suggestion.selected {
    background: #2a2a2a;
  }

  .suggestion .cmd {
    color: #5f5;
    font-family: monospace;
    font-weight: bold;
  }

  .suggestion .desc {
    color: #aaa;
    font-size: 0.8rem;
    margin-left: 1rem;
  }
</style>
