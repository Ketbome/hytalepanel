<script lang="ts">
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { createServer } from '$lib/services/api';
import { servers } from '$lib/stores/servers';
import { showToast } from '$lib/stores/ui';

let { onClose, onCreated }: { onClose: () => void; onCreated: () => void } = $props();

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

let machineIdVolumes = $derived(
  useMachineId
    ? `      - /etc/machine-id:/etc/machine-id:ro
      - /sys/class/dmi/id:/sys/class/dmi/id:ro`
    : ''
);

let dockerComposePreview = $derived(`services:
  hytale-server:
    image: ketbom/hytale-server:latest
    container_name: hytale-xxxxxxxx
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

<div class="modal-overlay animate-fade-in" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()} role="presentation">
  <div class="modal-content create-server-modal animate-scale-in" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
    <div class="modal-header">
      <h2>{$_('createServer')}</h2>
      <button class="modal-close transition-transform hover:scale-110" onclick={onClose}>×</button>
    </div>

    <form class="modal-body" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <div class="form-group">
        <label for="server-name">{$_('serverName')}</label>
        <input
          type="text"
          id="server-name"
          class="form-input"
          bind:value={name}
          placeholder="My Hytale Server"
          required
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="server-port">{$_('serverPort')}</label>
          <input
            type="number"
            id="server-port"
            class="form-input"
            bind:value={port}
            min="1024"
            max="65535"
          />
        </div>

        <div class="form-group">
          <label for="java-xms">{$_('minMemory')}</label>
          <select id="java-xms" class="form-select" bind:value={javaXms}>
            <option value="1G">1 GB</option>
            <option value="2G">2 GB</option>
            <option value="4G">4 GB</option>
            <option value="6G">6 GB</option>
            <option value="8G">8 GB</option>
          </select>
        </div>

        <div class="form-group">
          <label for="java-xmx">{$_('maxMemory')}</label>
          <select id="java-xmx" class="form-select" bind:value={javaXmx}>
            <option value="2G">2 GB</option>
            <option value="4G">4 GB</option>
            <option value="6G">6 GB</option>
            <option value="8G">8 GB</option>
            <option value="12G">12 GB</option>
            <option value="16G">16 GB</option>
          </select>
        </div>
      </div>

      <div class="form-checkboxes">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={autoDownload} />
          <span>Auto Download</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={useG1gc} />
          <span>Use G1GC</span>
        </label>
        <label class="checkbox-label" title={$_('machineIdHint')}>
          <input type="checkbox" bind:checked={useMachineId} />
          <span>{$_('linuxNative')}</span>
        </label>
      </div>

      <button
        type="button"
        class="toggle-advanced"
        onclick={() => showAdvanced = !showAdvanced}
      >
        {showAdvanced ? '▼' : '▶'} Docker Compose Preview
      </button>

      {#if showAdvanced}
        <pre class="compose-preview">{dockerComposePreview}</pre>
      {/if}

      <div class="modal-actions">
        <button type="button" class="mc-btn" onclick={onClose} disabled={isCreating}>
          {$_('cancel')}
        </button>
        <button type="submit" class="mc-btn primary" disabled={isCreating}>
          {#if isCreating}
            <span class="spinner"></span>
          {:else}
            {$_('create')}
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>
