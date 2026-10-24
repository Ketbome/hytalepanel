<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import Checkbox from '$lib/components/ui/Checkbox.svelte';
import InlineNotice from '$lib/components/ui/InlineNotice.svelte';
import Input from '$lib/components/ui/Input.svelte';
import Section from '$lib/components/ui/Section.svelte';
import { updateServer } from '$lib/services/api';
import { stopServer } from '$lib/services/lifecycle';
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
let backupBeforeUpdate = $state(true);
let useG1gc = $state(true);
let extraArgs = $state('');
let useMachineId = $state(false);

let isSaving = $state(false);
let hasChanges = $state(false);
let lastLoadedServerId = $state<string | null>(null);

const locked = $derived($serverStatus.running);

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
    backupBeforeUpdate = $activeServer.config.backupBeforeUpdate !== false;
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
    backupBeforeUpdate,
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
    showToast(result.error || $_('saveFailed'), 'error');
  }
}
</script>

<div class="flex min-h-full flex-col">
  <div class="flex flex-1 flex-col gap-6 p-4">
    {#if locked}
      <InlineNotice kind="warning">
        {$_('stopServerToEdit')}
        {#snippet action()}
          <Button variant="ghost" size="sm" icon="power" onclick={stopServer}>{$_('stop')}</Button>
        {/snippet}
      </InlineNotice>
    {/if}

    <Section title={$_('network')}>
      <div class="flex flex-wrap gap-4">
        <div class="hp-field-group w-[120px]">
          <label for="port">{$_('serverPort')}</label>
          <Input type="number" id="port" mono bind:value={port} oninput={markChanged} disabled={locked} min={1024} max={65535} />
        </div>
        <div class="hp-field-group min-w-[160px] flex-1">
          <label for="bindAddr">{$_('bindAddress')}</label>
          <Input type="text" id="bindAddr" mono bind:value={bindAddr} oninput={markChanged} disabled={locked} placeholder="0.0.0.0" />
        </div>
      </div>
    </Section>

    <Section title={$_('memory')}>
      <div class="grid grid-cols-2 gap-4">
        <div class="hp-field-group">
          <label for="javaXms">{$_('minMemory')}</label>
          <Input
            type="text"
            id="javaXms"
            mono
            bind:value={javaXms}
            oninput={markChanged}
            disabled={locked}
            placeholder="2G"
            aria-describedby="mem-hint"
          />
        </div>
        <div class="hp-field-group">
          <label for="javaXmx">{$_('maxMemory')}</label>
          <Input
            type="text"
            id="javaXmx"
            mono
            bind:value={javaXmx}
            oninput={markChanged}
            disabled={locked}
            placeholder="4G"
            aria-describedby="mem-hint"
          />
        </div>
      </div>
      <p id="mem-hint" class="mt-1 text-xs text-fg-3">{$_('memoryHint')}</p>
    </Section>

    <Section title={$_('java')}>
      <div class="flex flex-col gap-4">
        <Checkbox bind:checked={useG1gc} onchange={markChanged} disabled={locked}>{$_('useG1GC')}</Checkbox>
        <div class="hp-field-group">
          <label for="extraArgs">{$_('extraArgs')}</label>
          <Input
            type="text"
            id="extraArgs"
            mono
            bind:value={extraArgs}
            oninput={markChanged}
            disabled={locked}
            placeholder="--world-seed 12345"
          />
        </div>
      </div>
    </Section>

    <Section title={$_('downloads')}>
      <div class="flex flex-col gap-4">
        <Checkbox bind:checked={autoDownload} onchange={markChanged} disabled={locked}>{$_('autoDownloadFiles')}</Checkbox>
        <Checkbox bind:checked={backupBeforeUpdate} onchange={markChanged} disabled={locked}>
          {$_('backupBeforeUpdate')}
        </Checkbox>
        {#if $activeServerId}
          <ReleaseChannelSelector
            serverId={$activeServerId}
            selectedChannel={releaseChannel}
            disabled={locked}
            onChannelChange={(channel) => {
              releaseChannel = channel;
              markChanged();
            }}
          />
        {/if}
      </div>
    </Section>

    <Section title={$_('host')}>
      <div class="flex flex-col gap-4">
        <Checkbox bind:checked={useMachineId} onchange={markChanged} disabled={locked} hint={$_('machineIdHint')}>
          {$_('linuxNative')}
        </Checkbox>
        {#if $activeServerId}
          <MachineIdCard serverId={$activeServerId} />
        {/if}
      </div>
    </Section>
  </div>

  <div class="sticky bottom-0 z-10 flex min-h-13 items-center justify-between gap-3 border-t border-line bg-surface px-4 py-2.5">
    {#if hasChanges}
      <span class="text-[13px] text-fg-2">{$_('unsavedChanges')}</span>
    {:else}
      <span class="text-xs text-fg-3">{$_('configHint')}</span>
    {/if}
    <Button
      variant={hasChanges && !locked ? 'primary' : 'secondary'}
      loading={isSaving}
      onclick={handleSave}
      disabled={locked || !hasChanges}
      title={locked ? $_('stopServerToEdit') : undefined}
    >
      {$_('save')}
    </Button>
  </div>
</div>
