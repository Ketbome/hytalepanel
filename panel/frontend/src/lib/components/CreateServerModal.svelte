<script lang="ts">
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { createServer } from '$lib/services/api';
import { servers } from '$lib/stores/servers';
import { showToast } from '$lib/stores/ui';

const { onClose, onCreated }: { onClose: () => void; onCreated: () => void } = $props();

let name = $state('');
let port = $state(5520);
let javaXms = $state('4G');
let javaXmx = $state('8G');
let autoDownload = $state(true);
let useG1gc = $state(true);
let useMachineId = $state(false); // For Linux native - disable for CasaOS/Windows
let isCreating = $state(false);
let showAdvanced = $state(false);

// Auto-increment port based on existing servers
$effect(() => {
  const existingServers = get(servers);
  if (existingServers.length > 0) {
    const maxPort = Math.max(...existingServers.map((s) => s.port));
    port = maxPort + 1;
  }
});

const machineIdVolumes = $derived(useMachineId ? `      - /etc/machine-id:/etc/machine-id:ro` : '');

// Use platform detection from backend (ARM64 gets x64 emulation for downloader)
const platformLine = '';
const dockerComposePreview = $derived(`services:
  hytale-server:
    image: ketbom/hytale-server:latest
${platformLine}    container_name: hytale-xxxxxxxx
    restart: on-failure
    ports:
      - "${port}:${port}/udp"
    environment:
      JAVA_XMS: ${javaXms}
      JAVA_XMX: ${javaXmx}
      BIND_PORT: ${port}
      AUTO_DOWNLOAD: ${autoDownload}
      USE_G1GC: ${useG1gc}
    volumes:
      - ./server:/opt/hytale${machineIdVolumes ? `\n${machineIdVolumes}` : ''}`);

async function handleSubmit(): Promise<void> {
  if (!name.trim()) {
    showToast($_('serverNameRequired'), 'error');
    return;
  }

  isCreating = true;

  const result = await createServer({
    name: name.trim(),
    port,
    config: {
      javaXms,
      javaXmx,
      bindAddr: '0.0.0.0',
      autoDownload,
      useG1gc,
      extraArgs: '',
      useMachineId
    }
  });

  isCreating = false;

  if (result.success) {
    showToast($_('serverCreated'));
    onCreated();
  } else {
    showToast(result.error || 'Failed to create server', 'error');
  }
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    onClose();
  }
}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()} role="presentation">
  <div class="w-full max-w-2xl max-h-[90vh] flex flex-col bg-panel-bg border-4 border-panel-border shadow-pixel animate-bounce-in" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
    <div class="flex items-center justify-between px-5 py-3 bg-gradient-to-b from-panel-border to-panel-light border-b-3 border-panel-bg">
      <h2 class="font-mono text-lg text-hytale-gold text-shadow-pixel">{$_('createServer')}</h2>
      <button class="text-4xl leading-none text-text-muted hover:text-text transition-transform hover:scale-110" onclick={onClose}>×</button>
    </div>

    <form class="flex-1 overflow-y-auto p-5 space-y-4" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <div class="flex flex-col gap-1">
        <label for="server-name" class="text-xs text-text-dim uppercase font-mono">{$_('serverName')}</label>
        <input
          type="text"
          id="server-name"
          class="mc-input"
          bind:value={name}
          placeholder="My Hytale Server"
          required
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="flex flex-col gap-1">
          <label for="server-port" class="text-xs text-text-dim uppercase font-mono">{$_('serverPort')}</label>
          <input
            type="number"
            id="server-port"
            class="mc-input"
            bind:value={port}
            min="1024"
            max="65535"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label for="java-xms" class="text-xs text-text-dim uppercase font-mono">{$_('minMemory')}</label>
          <select id="java-xms" class="mc-select" bind:value={javaXms}>
            <option value="1G">1 GB</option>
            <option value="2G">2 GB</option>
            <option value="4G">4 GB</option>
            <option value="6G">6 GB</option>
            <option value="8G">8 GB</option>
          </select>
        </div>

        <div class="flex flex-col gap-1">
          <label for="java-xmx" class="text-xs text-text-dim uppercase font-mono">{$_('maxMemory')}</label>
          <select id="java-xmx" class="mc-select" bind:value={javaXmx}>
            <option value="2G">2 GB</option>
            <option value="4G">4 GB</option>
            <option value="6G">6 GB</option>
            <option value="8G">8 GB</option>
            <option value="12G">12 GB</option>
            <option value="16G">16 GB</option>
          </select>
        </div>
      </div>

      <div class="flex flex-wrap gap-3 text-sm">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" bind:checked={autoDownload} class="w-4 h-4 accent-grass" />
          <span class="font-mono">Auto Download</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" bind:checked={useG1gc} class="w-4 h-4 accent-grass" />
          <span class="font-mono">Use G1GC</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer" title={$_('machineIdHint')}>
          <input type="checkbox" bind:checked={useMachineId} class="w-4 h-4 accent-grass" />
          <span class="font-mono">{$_('linuxNative')}</span>
        </label>
      </div>

      <button
        type="button"
        class="w-full px-3 py-2 text-left font-mono text-sm border-2 border-panel-border bg-panel-light hover:bg-panel-lighter transition-colors"
        onclick={() => showAdvanced = !showAdvanced}
      >
        {showAdvanced ? '▼' : '▶'} Docker Compose Preview
      </button>

      {#if showAdvanced}
        <pre class="p-3 bg-[#0a0805] border-2 border-panel-border text-xs text-text font-code overflow-x-auto">{dockerComposePreview}</pre>
      {/if}

      <div class="flex justify-end gap-2 pt-2 border-t-2 border-panel-border">
        <button type="button" class="mc-btn" onclick={onClose} disabled={isCreating}>
          {$_('cancel')}
        </button>
        <button type="submit" class="mc-btn primary" disabled={isCreating}>
          {#if isCreating}
            <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          {:else}
            {$_('create')}
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>
