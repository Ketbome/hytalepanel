<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import Checkbox from '$lib/components/ui/Checkbox.svelte';
import InlineNotice from '$lib/components/ui/InlineNotice.svelte';
import Input from '$lib/components/ui/Input.svelte';
import Section from '$lib/components/ui/Section.svelte';
import Switch from '$lib/components/ui/Switch.svelte';
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
let configError = $state<string | null>(null);

$effect(() => {
  if ($joinedServerId) {
    emit('backup:config');
  }
});

$effect(() => {
  const s = $socket;
  if (!s) return;

  const handleConfigResult = (result: { success: boolean; config?: BackupConfig; error?: string }) => {
    const wasSaving = isSavingConfig;
    isSavingConfig = false;
    if (result.success && result.config) {
      configError = null;
      enabled = result.config.enabled;
      intervalMinutes = result.config.intervalMinutes;
      maxBackups = result.config.maxBackups;
      maxAgeDays = result.config.maxAgeDays;
      onServerStart = result.config.onServerStart;
      hasConfigChanges = false;
      if (wasSaving) showToast($_('backupConfigSaved'));
    } else {
      configError = result.error || $_('backupConfigInvalid');
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

<Section title={$_('backupEnabled')}>
  {#snippet actions()}
    <Switch
      checked={enabled}
      label={$_('backupEnabled')}
      onchange={(value) => {
        enabled = value;
        markConfigChanged();
      }}
    />
  {/snippet}

  <div class="flex flex-col gap-4">
    {#if configError}
      <InlineNotice kind="negative">{configError}</InlineNotice>
    {/if}

    <!-- Retention also applies to manual and pre-start backups, so only the interval depends on the switch -->
    <div class="grid grid-cols-1 gap-4 {enabled ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}">
      {#if enabled}
        <div class="hp-field-group">
          <label for="intervalMinutes">{$_('backupInterval')}</label>
          <Input
            type="number"
            id="intervalMinutes"
            mono
            suffix={$_('unitMin')}
            bind:value={intervalMinutes}
            oninput={markConfigChanged}
            min={0}
            max={1440}
          />
        </div>
      {/if}
      <div class="hp-field-group">
        <label for="maxBackups">{$_('maxBackups')}</label>
        <Input type="number" id="maxBackups" mono bind:value={maxBackups} oninput={markConfigChanged} min={0} max={100} />
      </div>
      <div class="hp-field-group">
        <label for="maxAgeDays">{$_('maxAgeDays')}</label>
        <Input
          type="number"
          id="maxAgeDays"
          mono
          suffix={$_('unitDays')}
          bind:value={maxAgeDays}
          oninput={markConfigChanged}
          min={0}
          max={365}
        />
      </div>
    </div>
    <p class="-mt-2 text-xs text-fg-3">{$_('backupZeroHint')}</p>

    <Checkbox bind:checked={onServerStart} onchange={markConfigChanged}>{$_('backupOnStart')}</Checkbox>

    <div class="flex justify-end">
      <Button
        variant={hasConfigChanges ? 'primary' : 'secondary'}
        loading={isSavingConfig}
        onclick={handleSaveConfig}
        disabled={!hasConfigChanges}
      >
        {$_('save')}
      </Button>
    </div>
  </div>
</Section>
