<script lang="ts">
import { _ } from 'svelte-i18n';
import { deleteServer as apiDeleteServer, fetchServers, startServer, stopServer } from '$lib/services/api';
import { joinServer } from '$lib/services/socketClient';
import { confirmDialog } from '$lib/stores/confirm';
import { type Server, servers, serversLoading } from '$lib/stores/servers';
import { showToast } from '$lib/stores/ui';
import type { PendingAction } from '$lib/utils/status';
import AppBar from './AppBar.svelte';
import CreateServerModal from './CreateServerModal.svelte';
import ServerRow from './ServerRow.svelte';
import Button from './ui/Button.svelte';
import Skeleton from './ui/Skeleton.svelte';

let showCreateModal = $state(false);
let loadError = $state<string | null>(null);
let loadedOnce = $state(false);
let pending = $state<Record<string, PendingAction>>({});

async function loadServers(): Promise<void> {
  serversLoading.set(true);
  const result = await fetchServers();
  serversLoading.set(false);
  loadedOnce = true;

  if (result.success && result.servers) {
    loadError = null;
    servers.set(result.servers);
  } else {
    loadError = result.error || $_('error');
  }
}

async function runLifecycle(server: Server, action: 'starting' | 'stopping'): Promise<void> {
  pending = { ...pending, [server.id]: action };
  const result = action === 'starting' ? await startServer(server.id) : await stopServer(server.id);
  if (!result.success) {
    showToast(`${action === 'starting' ? $_('start') : $_('stop')}: ${result.error || $_('failed')}`, 'error');
  }
  await loadServers();
  pending = { ...pending, [server.id]: null };
}

async function handleDeleteServer(server: Server): Promise<void> {
  if (
    !(await confirmDialog($_('confirmDeleteServerMsg'), {
      title: $_('confirmDeleteServer', { values: { name: server.name } }),
      confirmLabel: $_('deleteServer'),
      danger: true
    }))
  )
    return;

  const result = await apiDeleteServer(server.id);
  if (result.success) {
    showToast($_('serverDeleted'));
    await loadServers();
  } else {
    showToast(result.error || $_('failed'), 'error');
  }
}

function handleServerCreated(): void {
  showCreateModal = false;
  loadServers();
}

$effect(() => {
  loadServers();
});

const firstLoad = $derived($serversLoading && !loadedOnce);
const empty = $derived(loadedOnce && !loadError && $servers.length === 0);
</script>

<div class="flex min-h-dvh flex-col">
  <AppBar />

  <main class="mx-auto w-full max-w-[1120px] px-4 pt-8 pb-16 sm:px-6">
    {#if !empty}
      <div class="mb-4 flex items-center gap-4">
        <h1 class="font-display text-xl leading-7 font-medium tracking-[-0.01em] text-fg-1">
          {$_('servers')}
          {#if loadedOnce && !loadError}
            <span class="ml-2 font-mono text-base font-normal tracking-normal text-fg-3">{$servers.length}</span>
          {/if}
        </h1>
        <Button variant="primary" icon="plus" class="ml-auto" onclick={() => (showCreateModal = true)}>{$_('newServer')}</Button>
      </div>
    {/if}

    <div class="rounded-md border border-line bg-surface">
      {#if empty}
        <div class="flex flex-col items-center px-6 py-16 text-center">
          <h1 class="font-display text-[28px] leading-9 font-medium tracking-[-0.02em] text-fg-1">{$_('noServers')}</h1>
          <p class="mt-3 max-w-[44ch] text-sm text-fg-2">{$_('createServerHint')}</p>
          <Button variant="primary" size="lg" icon="plus" class="mt-6" onclick={() => (showCreateModal = true)}>
            {$_('newServer')}
          </Button>
        </div>
      {:else if loadError}
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-6">
          <div class="min-w-0 flex-1">
            <p class="text-sm text-fg-1">{$_('serversLoadError')}</p>
            <p class="mt-1 text-[13px] text-fg-3 [overflow-wrap:anywhere]">{loadError}</p>
          </div>
          <Button variant="ghost" icon="refresh-cw" onclick={loadServers}>{$_('retry')}</Button>
        </div>
      {:else}
        <div role="table" aria-label={$_('servers')} class="hp-server-grid sm:grid">
          <div role="rowgroup" class="max-sm:hidden sm:contents">
            <div role="row" class="col-span-full grid h-8 grid-cols-subgrid items-center border-b border-line px-4 text-xs text-fg-3">
              <span role="columnheader">{$_('status')}</span>
              <span role="columnheader">{$_('name')}</span>
              <span role="columnheader" class="text-right">{$_('serverPort')}</span>
              <span role="columnheader" class="text-right">{$_('memory')}</span>
              <span role="columnheader" class="max-md:hidden">{$_('container')}</span>
              <span role="columnheader"><span class="hp-sr-only">{$_('actions')}</span></span>
            </div>
          </div>
          <div role="rowgroup" class="hp-rows sm:contents">
            {#if firstLoad}
              {#each Array(3) as _row}
                <div role="row" class="flex h-14 items-center gap-4 px-4 sm:col-span-full sm:grid sm:grid-cols-subgrid" aria-hidden="true">
                  <Skeleton width="64px" />
                  <Skeleton width="55%" />
                  <Skeleton width="56px" class="ml-auto" />
                  <Skeleton width="56px" class="ml-auto" />
                  <Skeleton width="70%" class="max-md:hidden" />
                  <span></span>
                </div>
              {/each}
            {:else}
              {#each $servers as server (server.id)}
                <ServerRow
                  {server}
                  pending={pending[server.id] ?? null}
                  onOpen={() => joinServer(server.id)}
                  onStart={() => runLifecycle(server, 'starting')}
                  onStop={() => runLifecycle(server, 'stopping')}
                  onDelete={() => handleDeleteServer(server)}
                />
              {/each}
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </main>
</div>

{#if showCreateModal}
  <CreateServerModal onClose={() => (showCreateModal = false)} onCreated={handleServerCreated} />
{/if}

<style>
  .hp-rows > :global(* + *) {
    border-top: 1px solid var(--hp-line-1);
  }

  /* One grid for the whole table; rows are subgrids, so every column fits its widest cell */
  .hp-server-grid {
    column-gap: 16px;
    grid-template-columns: max-content minmax(0, 1fr) max-content max-content minmax(0, 168px) max-content;
  }

  @media (max-width: 767px) {
    .hp-server-grid {
      grid-template-columns: max-content minmax(0, 1fr) max-content max-content max-content;
    }
  }
</style>
