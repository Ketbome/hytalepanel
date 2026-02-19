<script lang="ts">
import { _ } from 'svelte-i18n';
import type { Server } from '$lib/stores/servers';
import Button from './ui/Button.svelte';

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

<div class="server-card transition-all duration-300 hover:scale-105 hover:shadow-lg" class:running={isRunning}>
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
      <span class="status-dot transition-all duration-300" class:online={isRunning}></span>
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
    <Button size="small" variant="primary" onclick={onEnter}>
      {$_('enter')}
    </Button>
    {#if isRunning}
      <Button size="small" variant="warning" onclick={onStop}>
        {$_('stop')}
      </Button>
    {:else}
      <Button size="small" onclick={onStart}>
        {$_('start')}
      </Button>
    {/if}
    <Button size="small" variant="danger" onclick={onDelete}>
      {$_('delete')}
    </Button>
  </div>
</div>
