<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import Input from '$lib/components/ui/Input.svelte';
import { updateServer } from '$lib/services/api';
import { serverStatus } from '$lib/stores/server';
import {
  activeServer,
  activeServerId,
  type ServerConfig,
  updateServer as updateServerStore
} from '$lib/stores/servers';
import { showToast } from '$lib/stores/ui';
import MachineIdCard from '../MachineIdCard.svelte';
import ReleaseChannelSelector from '../ReleaseChannelSelector.svelte';

// Form state - initialized from activeServer
let javaXms = $state('2G');
let javaXmx = $state('4G');
let port = $state(5520);
let bindAddr = $state('0.0.0.0');
let autoDownload = $state(true);
let releaseChannel = $state<'stable' | 'pre-release'>('stable');
let useG1gc = $state(true);
let extraArgs = $state('');
let useMachineId = $state(false);

let isSaving = $state(false);
let hasChanges = $state(false);
let lastLoadedServerId = $state<string | null>(null);

// Load config only when server ID changes (not on every status poll)
$effect(() => {
  if ($activeServer && $activeServer.id !== lastLoadedServerId) {
    lastLoadedServerId = $activeServer.id;
    javaXms = $activeServer.config.javaXms;
    javaXmx = $activeServer.config.javaXmx;
    port = $activeServer.port;
    bindAddr = $activeServer.config.bindAddr;
    autoDownload = $activeServer.config.autoDownload;
    releaseChannel = $activeServer.config.releaseChannel || 'stable';
    useG1gc = $activeServer.config.useG1gc;
    extraArgs = $activeServer.config.extraArgs;
    useMachineId = $activeServer.config.useMachineId;
    hasChanges = false;
  }
});

function markChanged(): void {
  hasChanges = true;
}

async function handleSave(): Promise<void> {
  if (!$activeServerId || $serverStatus.running) return;

  isSaving = true;

  const config: ServerConfig = {
    javaXms,
    javaXmx,
    bindAddr,
    autoDownload,
    releaseChannel,
    useG1gc,
    extraArgs,
    useMachineId
  };

  const result = await updateServer($activeServerId, { port, config });

  isSaving = false;

  if (result.success && result.server) {
    updateServerStore($activeServerId, result.server);
    showToast($_('configSaved'));
    hasChanges = false;
  } else {
    showToast(result.error || 'Error', 'error');
  }
}
</script>

<div class="flex flex-col h-full gap-4">
  <h3 class="font-display text-xs uppercase tracking-wider text-hytale-orange">{$_('serverConfig')}</h3>

  {#if $serverStatus.running}
    <div class="mc-badge mc-badge-warning !flex gap-2 !px-4 !py-2.5 !rounded-lg text-sm">
      <span>⚠</span>
      {$_('stopServerToEdit')}
    </div>
  {/if}

  <div class="flex-1 overflow-y-auto flex flex-col gap-4" class:opacity-60={$serverStatus.running} class:pointer-events-none={$serverStatus.running}>
    <div class="flex flex-col gap-1">
      <label for="port" class="text-xs text-text-dim uppercase">{$_('serverPort')}</label>
      <Input type="number" id="port" bind:value={port} oninput={markChanged} disabled={$serverStatus.running} min={1024} max={65535} />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="javaXms" class="text-xs text-text-dim uppercase">{$_('minMemory')}</label>
        <Input type="text" id="javaXms" bind:value={javaXms} oninput={markChanged} disabled={$serverStatus.running} placeholder="2G" />
      </div>

      <div class="flex flex-col gap-1">
        <label for="javaXmx" class="text-xs text-text-dim uppercase">{$_('maxMemory')}</label>
        <Input type="text" id="javaXmx" bind:value={javaXmx} oninput={markChanged} disabled={$serverStatus.running} placeholder="4G" />
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <label for="bindAddr" class="text-xs text-text-dim uppercase">{$_('bindAddress')}</label>
      <Input type="text" id="bindAddr" bind:value={bindAddr} oninput={markChanged} disabled={$serverStatus.running} placeholder="0.0.0.0" />
    </div>

    <div class="flex flex-col gap-1">
      <label for="extraArgs" class="text-xs text-text-dim uppercase">{$_('extraArgs')}</label>
      <Input type="text" id="extraArgs" bind:value={extraArgs} oninput={markChanged} disabled={$serverStatus.running} placeholder="--world-seed 12345" />
    </div>

    <label class="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" class="w-4 h-4 accent-hytale-orange" bind:checked={autoDownload} onchange={markChanged} disabled={$serverStatus.running} />
      {$_('autoDownloadFiles')}
    </label>

    {#if $activeServerId}
      <ReleaseChannelSelector
        serverId={$activeServerId}
        selectedChannel={releaseChannel}
        disabled={$serverStatus.running}
        onChannelChange={(channel) => {
          releaseChannel = channel;
          markChanged();
        }}
      />
    {/if}

    <label class="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" class="w-4 h-4 accent-hytale-orange" bind:checked={useG1gc} onchange={markChanged} disabled={$serverStatus.running} />
      {$_('useG1GC')}
    </label>

    <label class="flex items-center gap-2 text-sm cursor-pointer" title={$_('machineIdHint')}>
      <input type="checkbox" class="w-4 h-4 accent-hytale-orange" bind:checked={useMachineId} onchange={markChanged} disabled={$serverStatus.running} />
      {$_('linuxNative')}
      <span class="text-xs text-text-dim ml-auto">{$_('machineIdHint')}</span>
    </label>
  </div>

  {#if $activeServerId}
    <MachineIdCard serverId={$activeServerId} />
  {/if}

  <div class="flex justify-between items-center pt-3 border-t border-panel-border">
    <span class="text-xs text-text-dim">{$_('configHint')}</span>
    <Button variant="primary" size="small" onclick={handleSave} disabled={$serverStatus.running || isSaving || !hasChanges}>
      {isSaving ? '...' : $_('save')}
    </Button>
  </div>
</div>
