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

<div class="dashboard animate-fade-in">
  <div class="dashboard-header">
    <div class="dashboard-logo">
      <img src="/images/logo.png" alt="HytalePanel" class="logo-img" />
      <div class="logo-text">
        <h1>HYTALEPANEL</h1>
        <span class="subtitle">{$_('serverPanel')}</span>
      </div>
    </div>
    <div class="header-links">
      <a href="https://hytalepanel.ketbome.com/" target="_blank" class="docs-link" title={$_('documentation')}>
        📚 {$_('docs')}
      </a>
      <a href="https://github.com/ketbome/hytalepanel/issues" target="_blank" class="docs-link" title={$_('reportIssue')}>
        🐛 {$_('issues')}
      </a>
    </div>
  </div>

  <div class="dashboard-content">
    {#if $serversLoading}
      <div class="dashboard-empty">
        <div class="servers-grid">
          <Skeleton type="card" />
          <Skeleton type="card" />
          <Skeleton type="card" />
        </div>
      </div>
    {:else if $servers.length === 0}
      <div class="dashboard-empty">
        <img src="/images/hytale.png" alt="Hytale" class="empty-icon" />
        <h2>{$_('noServers')}</h2>
        <p>{$_('createServerHint')}</p>
        <Button variant="primary" onclick={() => showCreateModal = true}>
          + {$_('createServer')}
        </Button>
      </div>
    {:else}
      <div class="servers-grid">
        {#each $servers as server (server.id)}
          <ServerCard
            {server}
            onEnter={() => handleEnterServer(server)}
            onStart={() => handleStartServer(server)}
            onStop={() => handleStopServer(server)}
            onDelete={() => handleDeleteServer(server)}
          />
        {/each}
      </div>
      
      <button class="create-fab" onclick={() => showCreateModal = true} title={$_('createServer')}>
        +
      </button>
    {/if}
  </div>
</div>

{#if showCreateModal}
  <CreateServerModal
    onClose={() => showCreateModal = false}
    onCreated={handleServerCreated}
  />
{/if}
