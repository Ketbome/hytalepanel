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

<div class="mc-panel transition-transform duration-200 hover:-translate-y-1" class:glow-grass={isRunning}>
  <!-- Header -->
  <div class="mc-panel-header">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-gradient-to-br from-dirt-light to-dirt-dark border-2 border-dirt-light border-r-dirt-dark border-b-dirt-dark flex items-center justify-center">
        <img src="/images/favicon.ico" alt="Server" class="w-6 h-6" />
      </div>
      <div>
        <h3 class="font-mono text-lg text-hytale-cream leading-tight">{server.name}</h3>
        <p class="font-mono text-sm text-text-dim">:{server.port}/UDP</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <span 
        class="w-3 h-3"
        class:bg-grass={isRunning}
        class:glow-grass={isRunning}
        class:animate-pulse={isRunning}
        class:bg-stone-dark={!isRunning}
      ></span>
      <span class="font-mono text-sm uppercase" class:text-grass-light={isRunning} class:text-stone={!isRunning}>
        {isRunning ? $_('online') : $_('offline')}
      </span>
    </div>
  </div>

  <!-- Config info -->
  <div class="px-5 py-4 border-b-2 border-panel-bg">
    <div class="grid grid-cols-2 gap-4">
      <div class="flex flex-col gap-1">
        <span class="font-mono text-xs text-text-dim uppercase tracking-wide">Container</span>
        <span class="font-mono text-sm text-text truncate">{server.containerName}</span>
      </div>
      <div class="flex flex-col gap-1">
        <span class="font-mono text-xs text-text-dim uppercase tracking-wide">RAM</span>
        <span class="font-mono text-sm text-text">{server.config.javaXms} - {server.config.javaXmx}</span>
      </div>
    </div>
    <div class="mt-3 flex items-center gap-4">
      <span class="mc-badge text-xs" class:mc-badge-success={server.config.useG1gc}>
        G1GC: {server.config.useG1gc ? 'ON' : 'OFF'}
      </span>
    </div>
  </div>

  <!-- Actions -->
  <div class="mc-panel-body">
    <div class="flex gap-3">
      <Button size="small" variant="primary" onclick={onEnter}>
        ⏵ {$_('enter')}
      </Button>
      {#if isRunning}
        <Button size="small" variant="warning" onclick={onStop}>
          ⏹ {$_('stop')}
        </Button>
      {:else}
        <Button size="small" onclick={onStart}>
          ⏵ {$_('start')}
        </Button>
      {/if}
      <Button size="small" variant="danger" onclick={onDelete}>
        ✕
      </Button>
    </div>
  </div>
</div>
