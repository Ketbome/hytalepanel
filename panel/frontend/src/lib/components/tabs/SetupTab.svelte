<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import { emit } from '$lib/services/socketClient';
import { confirmDialog } from '$lib/stores/confirm';
import {
  downloaderAuth,
  downloadProgress,
  filesReady,
  isCheckingFiles,
  serverStatus,
  updateInfo
} from '$lib/stores/server';
import { showToast } from '$lib/stores/ui';
import type { DownloadStep } from '$lib/types';

function handleDownload(): void {
  if (!$serverStatus.running) {
    showToast($_('downloadRequiresRunningServer'), 'warning');
    return;
  }
  downloadProgress.update((p) => ({ ...p, authUrl: null, authCode: null }));
  emit('download');
}

function checkForUpdate(): void {
  if (!$serverStatus.running) {
    showToast($_('downloadRequiresRunningServer'), 'warning');
    return;
  }
  updateInfo.update((u) => ({ ...u, isChecking: true }));
  emit('update:check');
}

async function applyUpdate(): Promise<void> {
  if (await confirmDialog($_('confirmUpdate'))) {
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

function getStepState(step: DownloadStep, currentStep: DownloadStep): 'active' | 'done' | '' {
  const steps: DownloadStep[] = ['auth', 'download', 'extract', 'complete'];
  const stepIndex = steps.indexOf(step);
  const currentIndex = steps.indexOf(currentStep);

  if (stepIndex === currentIndex) return 'active';
  if (stepIndex < currentIndex) return 'done';
  return '';
}

const stepStates = $derived({
  auth: getStepState('auth', $downloadProgress.step),
  download: getStepState('download', $downloadProgress.step),
  extract: getStepState('extract', $downloadProgress.step),
  complete: $downloadProgress.step === 'complete' ? 'done' : ''
});

function formatLastUpdate(lastUpdate: string | null, daysSince: number | null): string {
  if (!lastUpdate) return $_('never');
  if (daysSince === 0) return $_('today');
  if (daysSince === 1) return $_('yesterday');
  if (daysSince !== null) return $_('daysAgo', { values: { days: daysSince } });
  return new Date(lastUpdate).toLocaleDateString();
}

// Check for update info on mount
$effect(() => {
  if ($serverStatus.running && $filesReady.ready && !$updateInfo.lastUpdate && !$updateInfo.isChecking) {
    checkForUpdate();
  }
});
</script>

<div class="space-y-4">
  <!-- File Status -->
  <div class="flex items-center justify-between p-4 bg-panel-light border-4 transition-all
              {$filesReady.ready ? 'border-grass' : $isCheckingFiles ? 'border-hytale-gold' : 'border-error/70'}">
    <div class="flex items-center gap-3">
      {#if $isCheckingFiles}
        <span class="w-6 h-6 border-4 border-t-grass border-r-grass/30 border-b-grass/30 border-l-grass/30 animate-spin"></span>
        <span class="font-mono text-text-muted">{$_('checking')}</span>
      {:else}
        <span class="text-2xl">{$filesReady.ready ? '✓' : '⚠'}</span>
        <span class="font-mono text-lg" class:text-grass-light={$filesReady.ready} class:text-error={!$filesReady.ready}>
          {$filesReady.ready ? $_('filesReady') : $_('missingFiles')}
        </span>
      {/if}
    </div>
    <Button
      size="small"
      onclick={recheckFiles}
      disabled={$isCheckingFiles || $downloadProgress.active}
      title={$_('recheckFiles')}
      aria-label={$_('recheckFiles')}
    >
      ↻
    </Button>
  </div>

  <!-- File Checks -->
  <div class="grid grid-cols-2 gap-3">
    <div class="flex items-center gap-3 p-3 bg-panel-light border-3 transition-all
                {$filesReady.hasJar ? 'border-grass/50' : 'border-error/50'}">
      <span class="w-8 h-8 flex items-center justify-center font-mono text-xl border-2 transition-all
                   {$filesReady.hasJar ? 'bg-grass/30 border-grass text-grass-light' : 'bg-error/30 border-error text-error'}">
        {$filesReady.hasJar ? '✓' : '✗'}
      </span>
      <span class="font-mono text-sm text-text">Server.jar</span>
    </div>
    <div class="flex items-center gap-3 p-3 bg-panel-light border-3 transition-all
                {$filesReady.hasAssets ? 'border-grass/50' : 'border-error/50'}">
      <span class="w-8 h-8 flex items-center justify-center font-mono text-xl border-2 transition-all
                   {$filesReady.hasAssets ? 'bg-grass/30 border-grass text-grass-light' : 'bg-error/30 border-error text-error'}">
        {$filesReady.hasAssets ? '✓' : '✗'}
      </span>
      <span class="font-mono text-sm text-text">Assets.zip</span>
    </div>
  </div>

  <!-- Auth Status -->
  <div class="flex items-center gap-3 p-3 bg-panel-light border-3 transition-all
              {$downloaderAuth ? 'border-grass/50 bg-grass/5' : $isCheckingFiles ? 'border-hytale-gold/50' : 'border-stone'}">
    {#if $isCheckingFiles}
      <span class="w-5 h-5 border-3 border-t-grass border-r-grass/30 border-b-grass/30 border-l-grass/30 animate-spin"></span>
      <span class="font-mono text-sm text-text-muted">{$_('checking')}</span>
    {:else}
      <span class="text-xl">{$downloaderAuth ? '🔑' : '🔒'}</span>
      <span class="font-mono text-sm" class:text-grass-light={$downloaderAuth} class:text-text-dim={!$downloaderAuth}>
        {$downloaderAuth ? $_('credentialsSaved') : $_('noCredentials')}
      </span>
    {/if}
  </div>

  <!-- Auth Box -->
  {#if $downloadProgress.authUrl || $downloadProgress.authCode}
    <div class="p-4 bg-hytale-gold/10 border-4 border-hytale-gold animate-bounce-in">
      <h3 class="font-mono text-lg text-hytale-gold mb-3 pb-2 border-b-2 border-hytale-gold/30">
        🔐 {$_('authRequired')}
      </h3>
      {#if $downloadProgress.authUrl}
        <p class="font-mono text-sm text-text-muted mb-2">{$_('openLink')}</p>
        <a 
          href={$downloadProgress.authUrl} 
          target="_blank"
          class="block p-3 font-mono text-sm bg-panel-bg border-2 border-panel-border text-grass-light
                 hover:border-grass hover:text-grass break-all transition-colors"
        >
          {$downloadProgress.authUrl}
        </a>
      {/if}
      {#if $downloadProgress.authCode}
        <p class="font-mono text-sm text-text-muted mb-2 mt-3">{$_('code')}</p>
        <div class="p-3 font-mono text-2xl text-center bg-panel-bg border-3 border-hytale-gold/50 text-hytale-gold tracking-wider">
          {$downloadProgress.authCode}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Progress Section -->
  {#if $downloadProgress.active || $downloadProgress.percentage > 0}
    <div class="p-4 bg-panel-light border-4 border-grass/50 animate-fade-in">
      <!-- Progress Header -->
      <div class="flex items-center justify-between mb-3 font-mono text-sm" aria-live="polite">
        <span class="text-grass-light">{$downloadProgress.status}</span>
        <span class="text-text-dim">{$downloadProgress.time}</span>
      </div>
      
      <!-- Progress Bar -->
      <div class="h-8 mb-4 bg-panel-bg border-3 border-panel-border overflow-hidden relative">
        <div 
          class="h-full bg-grass transition-all duration-300 relative overflow-hidden"
          style="width: {$downloadProgress.percentage}%"
        >
          <div class="absolute inset-0 bg-grass-light/30 animate-pulse"></div>
        </div>
        <span class="absolute inset-0 flex items-center justify-center font-mono text-sm text-text font-bold">
          {$downloadProgress.percentage}%
        </span>
      </div>
      
      <!-- Progress Steps -->
      <div class="grid grid-cols-4 gap-2">
        <div class="flex flex-col items-center gap-2 p-2 border-2 transition-all
                    {stepStates.auth === 'done' ? 'bg-grass/20 border-grass' : 
                     stepStates.auth === 'active' ? 'bg-hytale-gold/20 border-hytale-gold animate-pulse' : 
                     'bg-panel-bg border-panel-border'}">
          <span class="text-2xl transition-all">
            {stepStates.auth === 'done' ? '✓' : stepStates.auth === 'active' ? '●' : '○'}
          </span>
          <span class="font-mono text-xs text-center">{$_('auth')}</span>
        </div>
        <div class="flex flex-col items-center gap-2 p-2 border-2 transition-all
                    {stepStates.download === 'done' ? 'bg-grass/20 border-grass' : 
                     stepStates.download === 'active' ? 'bg-hytale-gold/20 border-hytale-gold animate-pulse' : 
                     'bg-panel-bg border-panel-border'}">
          <span class="text-2xl transition-all">
            {stepStates.download === 'done' ? '✓' : stepStates.download === 'active' ? '●' : '○'}
          </span>
          <span class="font-mono text-xs text-center">{$_('download')}</span>
        </div>
        <div class="flex flex-col items-center gap-2 p-2 border-2 transition-all
                    {stepStates.extract === 'done' ? 'bg-grass/20 border-grass' : 
                     stepStates.extract === 'active' ? 'bg-hytale-gold/20 border-hytale-gold animate-pulse' : 
                     'bg-panel-bg border-panel-border'}">
          <span class="text-2xl transition-all">
            {stepStates.extract === 'done' ? '✓' : stepStates.extract === 'active' ? '●' : '○'}
          </span>
          <span class="font-mono text-xs text-center">{$_('extract')}</span>
        </div>
        <div class="flex flex-col items-center gap-2 p-2 border-2 transition-all
                    {stepStates.complete === 'done' ? 'bg-grass/20 border-grass' : 
                     stepStates.complete === 'active' ? 'bg-hytale-gold/20 border-hytale-gold animate-pulse' : 
                     'bg-panel-bg border-panel-border'}">
          <span class="text-2xl transition-all">
            {stepStates.complete === 'done' ? '✓' : stepStates.complete === 'active' ? '●' : '○'}
          </span>
          <span class="font-mono text-xs text-center">{$_('done')}</span>
        </div>
      </div>
    </div>
  {/if}

  <!-- Download Button -->
  <Button
    variant="primary"
    class="w-full !py-4 !text-base"
    onclick={handleDownload}
    disabled={$downloadProgress.active && $downloadProgress.status !== 'waitingAuth'}
  >
    {#if $downloadProgress.active}
      <span class="inline-block w-5 h-5 border-2 border-current border-t-transparent animate-spin mr-2"></span>
      {$downloadProgress.status}
    {:else}
      {$filesReady.ready ? '⟳ ' + $_('redownload') : '⬇ ' + $_('downloadFiles')}
    {/if}
  </Button>
  <p class="font-mono text-sm text-center text-text-dim">{$_('downloadHint')}</p>
  {#if !$serverStatus.running}
    <p class="font-mono text-xs text-center text-warning">{$_('downloadStartServerHint')}</p>
  {/if}

  <!-- Update Section -->
  {#if $filesReady.ready}
    <div class="p-4 bg-panel-light border-4 border-panel-border">
      <h3 class="font-mono text-lg text-hytale-gold mb-4 pb-2 border-b-2 border-panel-border">
        🔄 {$_('serverUpdates')}
      </h3>
      
      <!-- Update Info -->
      <div class="flex items-center justify-between mb-3 p-3 rounded-lg bg-panel-bg/50 border border-panel-border">
        <span class="text-sm text-text-dim">{$_('lastUpdate')}:</span>
        <div class="flex items-center gap-2">
          <span class="text-sm text-text">
            {formatLastUpdate($updateInfo.lastUpdate, $updateInfo.daysSinceUpdate)}
          </span>
          {#if $updateInfo.isChecking}
            <span class="w-4 h-4 border-2 border-hytale-orange border-t-transparent animate-spin"></span>
          {/if}
        </div>
      </div>

      <!-- Version Info -->
      {#if $updateInfo.currentVersion || $updateInfo.latestVersion}
        <div class="flex flex-col gap-2 mb-3 p-3 rounded-lg bg-panel-bg/50 border border-panel-border text-sm" aria-live="polite">
          {#if $updateInfo.currentVersion}
            <div class="flex items-center justify-between">
              <span class="text-text-dim">{$_('installedVersion')}:</span>
              <span class="font-code text-text">{$updateInfo.currentVersion}</span>
            </div>
          {/if}
          {#if $updateInfo.latestVersion}
            <div class="flex items-center justify-between">
              <span class="text-text-dim">{$_('latestVersionLabel')}:</span>
              <span class="font-code text-text">{$updateInfo.latestVersion}</span>
            </div>
          {/if}
          {#if $updateInfo.updateAvailable === true}
            <span class="mc-badge mc-badge-warning self-start">⬆ {$_('updateAvailable')}</span>
          {:else if $updateInfo.updateAvailable === false}
            <span class="mc-badge mc-badge-success self-start">✓ {$_('upToDate')}</span>
          {/if}
        </div>
      {/if}
      
      <!-- Update Status -->
      {#if $updateInfo.isUpdating}
        <div class="mb-3 p-3 bg-hytale-gold/10 border-2 border-hytale-gold/50 font-mono text-sm text-hytale-gold">
          {$updateInfo.updateStatus}
        </div>
      {/if}
      
      <!-- Update Actions -->
      <div class="flex gap-3">
        <Button
          class="flex-1"
          onclick={checkForUpdate}
          disabled={!$serverStatus.running || $updateInfo.isChecking || $updateInfo.isUpdating}
        >
          🔍 {$_('checkUpdate')}
        </Button>
        <Button
          variant="warning"
          class="flex-1"
          onclick={applyUpdate}
          disabled={$updateInfo.isUpdating || $downloadProgress.active}
        >
          ⚡ {$_('forceUpdate')}
        </Button>
      </div>
      <p class="mt-3 font-mono text-xs text-center text-text-dim">{$_('updateHint')}</p>
    </div>
  {/if}
</div>
