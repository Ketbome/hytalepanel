<script lang="ts">
import { _ } from 'svelte-i18n';
import { deleteServer as apiDeleteServer, fetchServers, startServer, stopServer } from '$lib/services/api';
import { joinServer } from '$lib/services/socketClient';
import { type Server, servers, serversLoading } from '$lib/stores/servers';
import { showToast } from '$lib/stores/ui';
import CreateServerModal from './CreateServerModal.svelte';
import ServerCard from './ServerCard.svelte';
import Button from './ui/Button.svelte';
import Skeleton from './ui/Skeleton.svelte';

let showCreateModal = $state(false);

async function loadServers(): Promise<void> {
  serversLoading.set(true);
  const result = await fetchServers();
  serversLoading.set(false);

  if (result.success && result.servers) {
    servers.set(result.servers);
  } else {
    showToast(result.error || 'Failed to load servers', 'error');
  }
}

function handleEnterServer(server: Server): void {
  joinServer(server.id);
}

async function handleStartServer(server: Server): Promise<void> {
  const result = await startServer(server.id);
  if (result.success) {
    showToast($_('started'));
    await loadServers();
  } else {
    showToast(result.error || 'Failed to start', 'error');
  }
}

async function handleStopServer(server: Server): Promise<void> {
  const result = await stopServer(server.id);
  if (result.success) {
    showToast($_('stopped'));
    await loadServers();
  } else {
    showToast(result.error || 'Failed to stop', 'error');
  }
}

async function handleDeleteServer(server: Server): Promise<void> {
  if (!confirm($_('confirmDeleteServer'))) return;

  const result = await apiDeleteServer(server.id);
  if (result.success) {
    showToast($_('serverDeleted'));
    await loadServers();
  } else {
    showToast(result.error || 'Failed to delete', 'error');
  }
}

function handleServerCreated(): void {
  showCreateModal = false;
  loadServers();
}

$effect(() => {
  loadServers();
});
</script>

<div class="min-h-screen p-6 animate-fade-in">
  <!-- Header -->
  <header class="mc-panel mb-8">
    <div class="flex items-center justify-between px-6 py-4">
      <div class="flex items-center gap-4">
        <img src="/images/logo.png" alt="HytalePanel" class="w-14 h-14 object-contain" />
        <div>
          <h1 class="font-display text-xl text-hytale-gold text-shadow-pixel tracking-wide">HYTALEPANEL</h1>
          <span class="font-mono text-base text-text-muted">{$_('serverPanel')}</span>
        </div>
      </div>
      <nav class="flex items-center gap-4">
        <a 
          href="https://hytalepanel.ketbome.com/" 
          target="_blank" 
          class="mc-btn mc-btn-sm mc-btn-wood !inline-flex"
          title={$_('documentation')}
        >
          📚 {$_('docs')}
        </a>
        <a 
          href="https://github.com/ketbome/hytalepanel/issues" 
          target="_blank" 
          class="mc-btn mc-btn-sm !inline-flex"
          title={$_('reportIssue')}
        >
          🐛 {$_('issues')}
        </a>
      </nav>
    </div>
  </header>

  <!-- Content -->
  <main class="max-w-6xl mx-auto">
    {#if $serversLoading}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Skeleton type="card" height="200px" />
        <Skeleton type="card" height="200px" />
        <Skeleton type="card" height="200px" />
      </div>
    {:else if $servers.length === 0}
      <!-- Empty state -->
      <div class="mc-panel">
        <div class="mc-panel-body flex flex-col items-center gap-6 py-12">
          <img src="/images/hytale.png" alt="Hytale" class="w-24 h-24 opacity-60" />
          <div class="text-center">
            <h2 class="font-display text-lg text-hytale-gold mb-2">{$_('noServers')}</h2>
            <p class="font-mono text-text-muted">{$_('createServerHint')}</p>
          </div>
          <Button variant="primary" onclick={() => showCreateModal = true}>
            <span class="text-xl">+</span>
            <span>{$_('createServer')}</span>
          </Button>
        </div>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each $servers as server, i (server.id)}
          <div class="animate-slide-up" style="animation-delay: {i * 100}ms">
            <ServerCard
              {server}
              onEnter={() => handleEnterServer(server)}
              onStart={() => handleStartServer(server)}
              onStop={() => handleStopServer(server)}
              onDelete={() => handleDeleteServer(server)}
            />
          </div>
        {/each}
      </div>

      <!-- FAB -->
      <button 
        class="fixed bottom-8 right-8 w-16 h-16 mc-btn mc-btn-primary !rounded-none flex items-center justify-center text-3xl shadow-pixel hover:scale-110 transition-transform"
        onclick={() => showCreateModal = true} 
        title={$_('createServer')}
      >
        +
      </button>
    {/if}
  </main>
</div>

{#if showCreateModal}
  <CreateServerModal
    onClose={() => showCreateModal = false}
    onCreated={handleServerCreated}
  />
{/if}
