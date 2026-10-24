<script lang="ts">
import { _ } from 'svelte-i18n';
import BlockLoader from '$lib/components/ui/BlockLoader.svelte';
import Button from '$lib/components/ui/Button.svelte';
import Icon from '$lib/components/ui/Icon.svelte';
import InlineNotice from '$lib/components/ui/InlineNotice.svelte';
import Section from '$lib/components/ui/Section.svelte';
import SegmentedProgress from '$lib/components/ui/SegmentedProgress.svelte';
import Tag from '$lib/components/ui/Tag.svelte';
import { startServer } from '$lib/services/lifecycle';
import { emit } from '$lib/services/socketClient';
import { confirmDialog } from '$lib/stores/confirm';
import {
  downloaderAuth,
  downloadProgress,
  filesReady,
  isCheckingFiles,
  pendingAction,
  serverStatus,
  updateInfo
} from '$lib/stores/server';
import type { DownloadStep } from '$lib/types';

let copiedKey = $state<'url' | 'code' | null>(null);

function handleDownload(): void {
  if (!$serverStatus.running) return;
  downloadProgress.update((p) => ({ ...p, authUrl: null, authCode: null }));
  emit('download');
}

function checkForUpdate(): void {
  if (!$serverStatus.running) return;
  updateInfo.update((u) => ({ ...u, isChecking: true }));
  emit('update:check');
}

async function applyUpdate(): Promise<void> {
  if (
    await confirmDialog($_('confirmUpdate'), {
      title: $_('confirmUpdateTitle'),
      confirmLabel: $_('update')
    })
  ) {
    updateInfo.update((u) => ({
      ...u,
      isUpdating: true,
      updateStatus: $_('starting')
    }));
    emit('update:apply');
  }
}

function recheckFiles(): void {
  isCheckingFiles.set(true);
  emit('check-files');
}

async function copy(text: string, key: 'url' | 'code'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    copiedKey = key;
    setTimeout(() => (copiedKey = null), 1500);
  } catch {
    // Clipboard blocked: the value stays selectable
  }
}

const STEPS: DownloadStep[] = ['auth', 'download', 'extract', 'complete'];
const stepLabels: Record<DownloadStep, string> = {
  auth: 'auth',
  download: 'download',
  extract: 'extract',
  complete: 'done'
};

function stepState(step: DownloadStep, current: DownloadStep): 'done' | 'active' | 'todo' {
  if (current === 'complete') return 'done';
  const i = STEPS.indexOf(step);
  const c = STEPS.indexOf(current);
  return i < c ? 'done' : i === c ? 'active' : 'todo';
}

function formatLastUpdate(lastUpdate: string | null, daysSince: number | null): string {
  if (!lastUpdate) return $_('never');
  if (daysSince === 0) return $_('today');
  if (daysSince === 1) return $_('yesterday');
  if (daysSince !== null) return $_('daysAgo', { values: { days: daysSince } });
  return new Date(lastUpdate).toLocaleDateString();
}

const showProgress = $derived($downloadProgress.active || $downloadProgress.percentage > 0);

// Check for update info on mount
$effect(() => {
  if ($serverStatus.running && $filesReady.ready && !$updateInfo.lastUpdate && !$updateInfo.isChecking) {
    checkForUpdate();
  }
});
</script>

{#snippet fileState(present: boolean)}
  {#if $isCheckingFiles}
    <span class="flex items-center gap-2 text-[13px] text-fg-3"><BlockLoader />{$_('checking')}</span>
  {:else if present}
    <span class="flex items-center gap-1.5 text-[13px] text-positive"><Icon name="check" size={14} />{$_('present')}</span>
  {:else}
    <span class="flex items-center gap-1.5 text-[13px] text-negative"><Icon name="x" size={14} />{$_('missing')}</span>
  {/if}
{/snippet}

<div class="flex flex-col gap-6">
  <Section title={$_('gameFiles')}>
    {#snippet actions()}
      <Button
        variant="ghost"
        size="sm"
        icon="refresh-cw"
        playIcon={$isCheckingFiles}
        onclick={recheckFiles}
        disabled={$isCheckingFiles || $downloadProgress.active}
        title={$_('recheckFiles')}
      >
        {$_('recheck')}
      </Button>
    {/snippet}
    <dl class="hp-kv">
      <div>
        <dt class="font-mono">HytaleServer.jar</dt>
        <dd>{@render fileState($filesReady.hasJar)}</dd>
      </div>
      <div>
        <dt class="font-mono">Assets.zip</dt>
        <dd>{@render fileState($filesReady.hasAssets)}</dd>
      </div>
      <div>
        <dt>{$_('downloaderLogin')}</dt>
        <dd>
          {#if $isCheckingFiles}
            <span class="flex items-center gap-2 text-[13px] text-fg-3"><BlockLoader />{$_('checking')}</span>
          {:else if $downloaderAuth}
            <span class="flex items-center gap-1.5 text-[13px] text-positive"><Icon name="key-round" size={14} />{$_('credentialsSaved')}</span>
          {:else}
            <span class="text-[13px] text-fg-3">{$_('noCredentials')}</span>
          {/if}
        </dd>
      </div>
    </dl>

    <div class="mt-4 flex flex-col gap-2">
      <Button
        variant={$filesReady.ready ? 'secondary' : 'primary'}
        icon="download"
        class="w-full"
        loading={$downloadProgress.active}
        onclick={handleDownload}
        disabled={!$serverStatus.running}
        title={$serverStatus.running ? undefined : $_('downloadRequiresRunningServer')}
      >
        {#if $downloadProgress.active}
          {$downloadProgress.status}
        {:else}
          {$filesReady.ready ? $_('redownload') : $_('downloadFiles')}
        {/if}
      </Button>
      <p class="text-xs text-fg-3">{$_('downloadHint')}</p>
      {#if !$serverStatus.running}
        <InlineNotice kind="warning">
          {$_('downloadStartServerHint')}
          {#snippet action()}
            <Button variant="ghost" size="sm" onclick={startServer} disabled={$pendingAction !== null}>{$_('start')}</Button>
          {/snippet}
        </InlineNotice>
      {/if}
    </div>
  </Section>

  {#if $downloadProgress.authUrl || $downloadProgress.authCode}
    <Section title={$_('authRequired')}>
      <ol class="flex flex-col gap-4 text-sm text-fg-1">
        {#if $downloadProgress.authUrl}
          <li class="flex flex-col gap-2">
            <span class="text-fg-2">1. {$_('openLink')}</span>
            <div class="flex items-center gap-1">
              <a
                href={$downloadProgress.authUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="min-w-0 flex-1 truncate font-mono text-[13px] text-fg-1 underline decoration-1 underline-offset-3"
                title={$downloadProgress.authUrl}
              >
                {$downloadProgress.authUrl}
              </a>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={copiedKey === 'url' ? 'check' : 'copy'}
                playIcon={copiedKey === 'url'}
                aria-label={copiedKey === 'url' ? $_('copied') : $_('copyLink')}
                title={copiedKey === 'url' ? $_('copied') : $_('copyLink')}
                onclick={() => copy($downloadProgress.authUrl ?? '', 'url')}
              />
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon="external-link"
                href={$downloadProgress.authUrl}
                external
                aria-label={$_('openInNewTab')}
                title={$_('openInNewTab')}
              />
            </div>
          </li>
        {/if}
        {#if $downloadProgress.authCode}
          <li class="flex flex-col gap-2">
            <span class="text-fg-2">{$downloadProgress.authUrl ? '2. ' : ''}{$_('enterCode')}</span>
            <div class="flex items-center justify-between gap-3 rounded-md bg-sunken px-4 py-3">
              <span class="font-mono text-2xl leading-8 font-medium tracking-[0.08em] text-fg-1 select-all">
                {$downloadProgress.authCode}
              </span>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={copiedKey === 'code' ? 'check' : 'copy'}
                playIcon={copiedKey === 'code'}
                aria-label={copiedKey === 'code' ? $_('copied') : $_('copyCode')}
                title={copiedKey === 'code' ? $_('copied') : $_('copyCode')}
                onclick={() => copy($downloadProgress.authCode ?? '', 'code')}
              />
            </div>
          </li>
        {/if}
      </ol>
    </Section>
  {/if}

  {#if showProgress}
    <section class="flex flex-col gap-3" aria-live="polite">
      <div class="flex items-center justify-between gap-3 text-[13px]">
        <span class="text-fg-1">{$downloadProgress.status}</span>
        <span class="font-mono text-xs text-fg-3">{$downloadProgress.time}</span>
      </div>
      <SegmentedProgress value={$downloadProgress.percentage} label={$_('downloadProgress')} />
      <ol class="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
        {#each STEPS as step}
          {@const state = stepState(step, $downloadProgress.step)}
          <li
            class="flex items-center gap-1.5"
            class:text-positive={state === 'done'}
            class:text-accent={state === 'active'}
            class:text-fg-3={state === 'todo'}
            aria-current={state === 'active' ? 'step' : undefined}
          >
            {#if state === 'done'}
              <Icon name="check" size={14} />
            {:else if state === 'active'}
              <span class="h-1.5 w-1.5 bg-accent" aria-hidden="true"></span>
            {:else}
              <span class="h-1.5 w-1.5 shadow-[inset_0_0_0_1px_var(--hp-fg-3)]" aria-hidden="true"></span>
            {/if}
            {$_(stepLabels[step])}
          </li>
        {/each}
      </ol>
    </section>
  {/if}

  {#if $filesReady.ready}
    <Section title={$_('serverUpdates')}>
      <dl class="hp-kv" aria-live="polite">
        <div>
          <dt>{$_('installedVersion')}</dt>
          <dd class="font-mono text-[13px]">{$updateInfo.currentVersion ?? '—'}</dd>
        </div>
        <div>
          <dt>{$_('latestVersionLabel')}</dt>
          <dd>
            {#if $updateInfo.updateAvailable === true}
              <Tag kind="warning">{$_('updateAvailable')}</Tag>
            {:else if $updateInfo.updateAvailable === false}
              <Tag kind="positive">{$_('upToDate')}</Tag>
            {/if}
            <span class="font-mono text-[13px]" class:text-fg-3={!$updateInfo.latestVersion}>{$updateInfo.latestVersion ?? '—'}</span>
          </dd>
        </div>
        <div>
          <dt>{$_('lastUpdate')}</dt>
          <dd class="text-[13px]">
            {#if $updateInfo.isChecking}<BlockLoader />{/if}
            {formatLastUpdate($updateInfo.lastUpdate, $updateInfo.daysSinceUpdate)}
          </dd>
        </div>
      </dl>

      {#if $updateInfo.isUpdating}
        <p class="mt-3 flex items-center gap-2 text-[13px] text-fg-1" aria-live="polite">
          <BlockLoader />{$updateInfo.updateStatus}
        </p>
      {/if}

      <div class="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          icon="refresh-cw"
          playIcon={$updateInfo.isChecking}
          loading={$updateInfo.isChecking}
          onclick={checkForUpdate}
          disabled={!$serverStatus.running || $updateInfo.isUpdating}
          title={$serverStatus.running ? undefined : $_('downloadRequiresRunningServer')}
        >
          {$_('checkUpdate')}
        </Button>
        <Button
          variant={$updateInfo.updateAvailable && $serverStatus.running ? 'primary' : 'secondary'}
          icon="download"
          onclick={applyUpdate}
          disabled={$updateInfo.isUpdating || $downloadProgress.active}
        >
          {$updateInfo.updateAvailable ? $_('updateNow') : $_('forceUpdate')}
        </Button>
      </div>
      <p class="mt-2 text-xs text-fg-3">{$_('updateHint')}</p>
    </Section>
  {/if}
</div>
