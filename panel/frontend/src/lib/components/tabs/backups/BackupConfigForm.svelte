<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import Input from '$lib/components/ui/Input.svelte';
import { emit, joinedServerId, socket } from '$lib/services/socketClient';
import { showToast } from '$lib/stores/ui';

interface BackupConfig {
  enabled: boolean;
  intervalMinutes: number;
  maxBackups: number;
  maxAgeDays: number;
  onServerStart: boolean;
}

let enabled = $state(false);
let intervalMinutes = $state(60);
let maxBackups = $state(10);
let maxAgeDays = $state(7);
let onServerStart = $state(true);
let hasConfigChanges = $state(false);
let isSavingConfig = $state(false);

$effect(() => {
  if ($joinedServerId) {
    emit('backup:config');
  }
});

$effect(() => {
  const s = $socket;
  if (!s) return;

  const handleConfigResult = (result: { success: boolean; config?: BackupConfig; error?: string }) => {
    isSavingConfig = false;
    if (result.success && result.config) {
      enabled = result.config.enabled;
      intervalMinutes = result.config.intervalMinutes;
      maxBackups = result.config.maxBackups;
      maxAgeDays = result.config.maxAgeDays;
      onServerStart = result.config.onServerStart;
      hasConfigChanges = false;
    } else {
      showToast(result.error || $_('backupConfigInvalid'), 'error');
    }
  };

  s.on('backup:config-result', handleConfigResult);
  return () => {
    s.off('backup:config-result', handleConfigResult);
  };
});

function markConfigChanged(): void {
  hasConfigChanges = true;
}

function handleSaveConfig(): void {
  isSavingConfig = true;
  const config: BackupConfig = {
    enabled,
    intervalMinutes,
    maxBackups,
    maxAgeDays,
    onServerStart
  };
  emit('backup:config', config);
}
</script>

<div class="mc-panel">
  <div class="mc-panel-header">{$_('backupConfig')}</div>
  <div class="mc-panel-body flex flex-col gap-3">
    <label class="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" class="w-4 h-4 accent-hytale-orange" bind:checked={enabled} onchange={markConfigChanged} />
      {$_('backupEnabled')}
    </label>

    <label class="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" class="w-4 h-4 accent-hytale-orange" bind:checked={onServerStart} onchange={markConfigChanged} />
      {$_('backupOnStart')}
    </label>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="flex flex-col gap-1">
        <label for="intervalMinutes" class="text-xs text-text-dim uppercase">{$_('backupInterval')}</label>
        <Input type="number" id="intervalMinutes" bind:value={intervalMinutes} oninput={markConfigChanged} min={0} max={1440} />
        <span class="text-xs text-text-dim">0 = {$_('disabled')}</span>
      </div>

      <div class="flex flex-col gap-1">
        <label for="maxBackups" class="text-xs text-text-dim uppercase">{$_('maxBackups')}</label>
        <Input type="number" id="maxBackups" bind:value={maxBackups} oninput={markConfigChanged} min={0} max={100} />
        <span class="text-xs text-text-dim">0 = {$_('unlimited')}</span>
      </div>

      <div class="flex flex-col gap-1">
        <label for="maxAgeDays" class="text-xs text-text-dim uppercase">{$_('maxAgeDays')}</label>
        <Input type="number" id="maxAgeDays" bind:value={maxAgeDays} oninput={markConfigChanged} min={0} max={365} />
        <span class="text-xs text-text-dim">0 = {$_('unlimited')}</span>
      </div>
    </div>

    <div>
      <Button variant="primary" onclick={handleSaveConfig} disabled={!hasConfigChanges || isSavingConfig}>
        {isSavingConfig ? $_('saving') : $_('save')}
      </Button>
    </div>
  </div>
</div>
