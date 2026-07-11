<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import { emit, joinedServerId, socket } from '$lib/services/socketClient';
import { confirmDialog } from '$lib/stores/confirm';
import { serverStatus } from '$lib/stores/server';
import { showToast } from '$lib/stores/ui';
import { formatSize } from '$lib/utils/formatters';

interface BackupInfo {
  id: string;
  filename: string;
  createdAt: string;
  size: number;
}

type BackupStatus = 'idle' | 'creating' | 'restoring' | 'error';

let backupsList = $state<BackupInfo[]>([]);
let isLoading = $state(false);
let isCreating = $state(false);
let isRestoring = $state(false);
let backupStatus = $state<BackupStatus>('idle');
let backupStatusError = $state('');

// svelte-ignore non_reactive_update
let backupsListEl: HTMLElement | null = null;
let prevBackupCount = 0;
let listMaxHeight = $state('400px');
const isBusy = $derived(backupStatus === 'creating' || backupStatus === 'restoring' || isCreating || isRestoring);

$effect(() => {
  if ($joinedServerId) {
    loadBackups();
  }
});

// Update list max-height and scroll when backups change
$effect(() => {
  const count = backupsList.length;
  // compute max height: each item ~84px, cap at 480px
  const max = Math.min(Math.max(count * 84, 120), 480);
  listMaxHeight = `${max}px`;

  // if items increased, scroll to top to reveal newest at top
  if (backupsListEl && count > prevBackupCount) {
    backupsListEl.scrollTop = 0;
  }

  prevBackupCount = count;
});

$effect(() => {
  const s = $socket;
  if (!s) return;

  const handleListResult = (result: { success: boolean; backups: BackupInfo[]; error?: string }) => {
    isLoading = false;
    if (result.success) {
      backupsList = result.backups;
    } else {
      showToast(result.error || 'Error loading backups', 'error');
    }
  };

  const handleCreateResult = (result: { success: boolean; backup?: BackupInfo; error?: string }) => {
    isCreating = false;
    if (result.success) {
      showToast($_('backupCreated'));
      loadBackups();
    } else {
      showToast(result.error || 'Error creating backup', 'error');
    }
  };

  const handleRestoreResult = (result: { success: boolean; error?: string }) => {
    isRestoring = false;
    if (result.success) {
      showToast($_('backupRestored'));
    } else {
      showToast(result.error || 'Error restoring backup', 'error');
    }
  };

  const handleDeleteResult = (result: { success: boolean; error?: string }) => {
    if (result.success) {
      showToast($_('backupDeleted'));
      loadBackups();
    } else {
      showToast(result.error || 'Error deleting backup', 'error');
    }
  };

  const handleBackupStatus = (result: { status: BackupStatus; error?: string }) => {
    backupStatus = result.status;
    backupStatusError = result.error || '';
    if (result.status === 'error' && result.error) {
      showToast(result.error, 'error');
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
  if ($serverStatus.running) {
    showToast($_('serverMustBeStopped'), 'error');
    return;
  }

  if (await confirmDialog($_('confirmRestore'), { danger: true })) {
    isRestoring = true;
    emit('backup:restore', backup.id);
  }
}

async function handleDelete(backup: BackupInfo): Promise<void> {
  if (await confirmDialog(`${$_('confirmDelete')} "${backup.filename}"?`, { danger: true })) {
    emit('backup:delete', backup.id);
  }
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString();
}
</script>

<div class="mc-panel">
  <div class="mc-panel-header">
    <span>{$_('backups')}</span>
    <Button size="small" onclick={handleCreateBackup} disabled={isBusy}>
      {isCreating ? $_('creating') : $_('createBackup')}
    </Button>
  </div>
  <div class="mc-panel-body">
    {#if backupStatus !== 'idle'}
      <div
        class="mb-3 px-3 py-2.5 rounded-lg border text-sm
               {backupStatus === 'error' ? 'border-error/50 text-error' : 'border-panel-border text-text-muted'}"
        aria-live="polite"
      >
        {#if backupStatus === 'creating'}
          {$_('backupStatusCreating')}
        {:else if backupStatus === 'restoring'}
          {$_('backupStatusRestoring')}
        {:else if backupStatus === 'error'}
          {backupStatusError || $_('backupStatusError')}
        {/if}
      </div>
    {/if}

    {#if isLoading}
      <div class="text-center py-8 text-text-muted">{$_('loading')}...</div>
    {:else if backupsList.length === 0}
      <div class="text-center py-8 text-text-muted">{$_('noBackups')}</div>
    {:else}
      <div class="flex flex-col gap-2 overflow-y-auto pr-1" bind:this={backupsListEl} style="max-height: {listMaxHeight};">
        {#each backupsList as backup}
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-panel-light border border-panel-border">
            <div class="flex flex-col gap-1 min-w-0">
              <span class="font-code text-sm truncate">{backup.filename}</span>
              <span class="text-xs text-text-muted">
                {formatDate(backup.createdAt)} • {formatSize(backup.size)}
              </span>
            </div>
            <div class="flex gap-2 justify-end shrink-0">
              <Button
                size="small"
                onclick={() => handleRestore(backup)}
                disabled={isRestoring || $serverStatus.running}
                title={$serverStatus.running ? $_('serverMustBeStopped') : $_('restoreBackup')}
              >
                ↩ {$_('restoreBackup')}
              </Button>
              <Button
                size="small"
                variant="danger"
                onclick={() => handleDelete(backup)}
                aria-label="{$_('confirmDelete')} {backup.filename}"
              >
                ✕
              </Button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
