<script lang="ts">
import { _, locale } from 'svelte-i18n';
import BlockLoader from '$lib/components/ui/BlockLoader.svelte';
import Button from '$lib/components/ui/Button.svelte';
import InlineNotice from '$lib/components/ui/InlineNotice.svelte';
import Section from '$lib/components/ui/Section.svelte';
import Skeleton from '$lib/components/ui/Skeleton.svelte';
import { emit, joinedServerId, socket } from '$lib/services/socketClient';
import { confirmDialog } from '$lib/stores/confirm';
import { serverStatus } from '$lib/stores/server';
import { showToast } from '$lib/stores/ui';
import { formatRelative, formatSize, toBcp47 } from '$lib/utils/formatters';

interface BackupInfo {
  id: string;
  filename: string;
  createdAt: string;
  size: number;
}

type BackupStatus = 'idle' | 'creating' | 'restoring' | 'error';

let backupsList = $state<BackupInfo[]>([]);
let isLoading = $state(false);
let loadError = $state<string | null>(null);
let isCreating = $state(false);
let isRestoring = $state(false);
let backupStatus = $state<BackupStatus>('idle');
let backupStatusError = $state('');
let loadedOnce = $state(false);

const isBusy = $derived(backupStatus === 'creating' || backupStatus === 'restoring' || isCreating || isRestoring);

$effect(() => {
  if ($joinedServerId) {
    loadBackups();
  }
});

$effect(() => {
  const s = $socket;
  if (!s) return;

  const handleListResult = (result: { success: boolean; backups: BackupInfo[]; error?: string }) => {
    isLoading = false;
    loadedOnce = true;
    if (result.success) {
      loadError = null;
      backupsList = result.backups;
    } else {
      loadError = result.error || $_('error');
    }
  };

  const handleCreateResult = (result: { success: boolean; backup?: BackupInfo; error?: string }) => {
    isCreating = false;
    if (result.success) {
      showToast($_('backupCreated'));
      loadBackups();
    } else {
      showToast(result.error || $_('backupStatusError'), 'error');
    }
  };

  const handleRestoreResult = (result: { success: boolean; error?: string }) => {
    isRestoring = false;
    if (result.success) {
      showToast($_('backupRestored'));
    } else {
      showToast(result.error || $_('backupStatusError'), 'error');
    }
  };

  const handleDeleteResult = (result: { success: boolean; error?: string }) => {
    if (result.success) {
      showToast($_('backupDeleted'));
      loadBackups();
    } else {
      showToast(result.error || $_('backupStatusError'), 'error');
    }
  };

  // The backend sends 'error' and then 'idle' right away: toast it and keep the notice until the next operation
  const handleBackupStatus = (result: { status: BackupStatus; error?: string }) => {
    backupStatus = result.status;
    if (result.status === 'error') {
      backupStatusError = result.error || $_('backupStatusError');
      showToast(backupStatusError, 'error');
    } else if (result.status !== 'idle') {
      backupStatusError = '';
    }
  };

  s.on('backup:list-result', handleListResult);
  s.on('backup:create-result', handleCreateResult);
  s.on('backup:restore-result', handleRestoreResult);
  s.on('backup:delete-result', handleDeleteResult);
  s.on('backup:status', handleBackupStatus);

  return () => {
    s.off('backup:list-result', handleListResult);
    s.off('backup:create-result', handleCreateResult);
    s.off('backup:restore-result', handleRestoreResult);
    s.off('backup:delete-result', handleDeleteResult);
    s.off('backup:status', handleBackupStatus);
  };
});

function loadBackups(): void {
  isLoading = true;
  emit('backup:list');
}

function handleCreateBackup(): void {
  if ($serverStatus.running) {
    showToast($_('backupRunningWarning'), 'warning');
  }
  isCreating = true;
  emit('backup:create');
}

async function handleRestore(backup: BackupInfo): Promise<void> {
  if ($serverStatus.running) return;

  if (
    await confirmDialog($_('confirmRestoreMsg'), {
      title: $_('confirmRestore', { values: { name: backup.filename } }),
      confirmLabel: $_('restoreBackup'),
      danger: true
    })
  ) {
    isRestoring = true;
    emit('backup:restore', backup.id);
  }
}

async function handleDelete(backup: BackupInfo): Promise<void> {
  if (
    await confirmDialog($_('confirmDeleteMsg'), {
      title: $_('confirmDelete', { values: { name: backup.filename } }),
      confirmLabel: $_('delete'),
      danger: true
    })
  ) {
    emit('backup:delete', backup.id);
  }
}
</script>

<Section title={$_('backups')} meta={loadedOnce && !loadError ? backupsList.length : undefined}>
  {#snippet actions()}
    <Button variant="primary" size="sm" icon="plus" loading={isCreating} onclick={handleCreateBackup} disabled={isBusy}>
      {$_('createBackup')}
    </Button>
  {/snippet}

  {#if backupStatus === 'creating' || backupStatus === 'restoring'}
    <p class="flex h-9 items-center gap-2 text-[13px] text-fg-1" aria-live="polite">
      <BlockLoader />
      {backupStatus === 'creating' ? $_('backupStatusCreating') : $_('backupStatusRestoring')}
    </p>
  {:else if backupStatusError}
    <InlineNotice kind="negative" class="mb-2">{backupStatusError}</InlineNotice>
  {/if}

  {#if loadError}
    <InlineNotice kind="negative" title={$_('backupsLoadError')}>
      <span class="text-fg-3">{loadError}</span>
      {#snippet action()}
        <Button variant="ghost" size="sm" onclick={loadBackups}>{$_('retry')}</Button>
      {/snippet}
    </InlineNotice>
  {:else if isLoading && !loadedOnce}
    <ul class="hp-list -mx-2">
      {#each Array(3) as _item}
        <li class="flex h-14 flex-col justify-center gap-2 px-2" aria-hidden="true">
          <Skeleton width="55%" /><Skeleton width="25%" height="8px" />
        </li>
      {/each}
    </ul>
  {:else if backupsList.length === 0}
    <div class="py-4">
      <p class="text-sm text-fg-2">{$_('noBackups')}</p>
      <p class="mt-1 text-xs text-fg-3">{$_('noBackupsHint')}</p>
    </div>
  {:else}
    <ul class="hp-list -mx-2">
      {#each backupsList as backup (backup.id)}
        <li class="hp-backup flex min-h-14 items-center gap-3 px-2 py-2">
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="truncate font-mono text-[13px] text-fg-1" title={backup.filename}>{backup.filename}</span>
            <span class="flex items-center gap-2 text-[13px] text-fg-2">
              <span title={new Date(backup.createdAt).toLocaleString(toBcp47($locale))}>
                {formatRelative(backup.createdAt, $locale)}
              </span>
              <span class="text-fg-3" aria-hidden="true">·</span>
              <span class="font-mono text-xs tabular-nums">{formatSize(backup.size)}</span>
            </span>
          </div>
          <span class="flex shrink-0 items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              onclick={() => handleRestore(backup)}
              disabled={isRestoring || $serverStatus.running}
              title={$serverStatus.running ? $_('serverMustBeStopped') : undefined}
            >
              {$_('restoreBackup')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon="trash-2"
              class="hover:!text-negative"
              aria-label={$_('deleteNamed', { values: { name: backup.filename } })}
              title={$_('delete')}
              onclick={() => handleDelete(backup)}
            />
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</Section>

<style>
  .hp-backup {
    transition: background-color var(--hp-dur-hover) ease;
  }

  .hp-backup:hover {
    background: var(--hp-bg-2);
  }
</style>
