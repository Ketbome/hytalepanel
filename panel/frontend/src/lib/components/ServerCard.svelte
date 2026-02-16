<script lang="ts">
import { _ } from 'svelte-i18n';
import type { Server } from '$lib/stores/servers';

let {
  server,
  onEnter,
  onStart,
  onStop,
  onDelete
}: {
  server: Server;
  onEnter: () => void;
  onStart: () => void;
  onStop: () => void;
  onDelete: () => void;
} = $props();

let isRunning = $derived(server.status === 'running');
</script>

<div class="server-card" class:running={isRunning}>
  <div class="server-card-header">
    <div class="server-icon">
      <img src="/images/favicon.ico" alt="Server" />
    </div>
    <div class="server-info">
      <h3 class="server-name">{server.name}</h3>
      <div class="server-meta">
        <span class="server-port">:{server.port}/UDP</span>
        <span class="server-container">{server.containerName}</span>
      </div>
    </div>
    <div class="server-status">
      <span class="status-dot" class:online={isRunning}></span>
      <span class="status-text">{isRunning ? $_('online') : $_('offline')}</span>
    </div>
  </div>

  <div class="server-card-config">
    <div class="config-item">
      <span class="config-label">RAM</span>
      <span class="config-value">{server.config.javaXms} - {server.config.javaXmx}</span>
    </div>
    <div class="config-item">
      <span class="config-label">G1GC</span>
      <span class="config-value">{server.config.useG1gc ? 'ON' : 'OFF'}</span>
    </div>
  </div>

  <div class="server-card-actions">
    <button class="mc-btn small primary" onclick={onEnter}>
      {$_('enter')}
    </button>
    {#if isRunning}
      <button class="mc-btn small warning" onclick={onStop}>
        {$_('stop')}
      </button>
    {:else}
      <button class="mc-btn small" onclick={onStart}>
        {$_('start')}
      </button>
    {/if}
    <button class="mc-btn small danger" onclick={onDelete}>
      {$_('delete')}
    </button>
  </div>
</div>
