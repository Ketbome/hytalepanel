<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { serverStatus } from '$lib/stores/server';
  import { showToast } from '$lib/stores/ui';
  import { emit, socket, joinedServerId } from '$lib/services/socketClient';
  import { formatSize } from '$lib/utils/formatters';

  interface BackupInfo {
    id: string;
    filename: string;
    createdAt: string;
    size: number;
  }

  interface BackupConfig {
    enabled: boolean;
    intervalMinutes: number;
    maxBackups: number;
    maxAgeDays: number;
    onServerStart: boolean;
  }

  let backupsList = $state<BackupInfo[]>([]);
  let isLoading = $state(false);
  let isCreating = $state(false);
  let isRestoring = $state(false);

  // Config form state
  let enabled = $state(false);
  let intervalMinutes = $state(60);
  let maxBackups = $state(10);
  let maxAgeDays = $state(7);
  let onServerStart = $state(true);
  let hasConfigChanges = $state(false);
  let isSavingConfig = $state(false);

  // Load backups when socket is joined to server (not just activeServerId)
  $effect(() => {
    if ($joinedServerId) {
      loadBackups();
      loadConfig();
    }
  });

  // Socket event listeners
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

    const handleConfigResult = (result: { success: boolean; config?: BackupConfig; error?: string }) => {
      isSavingConfig = false;
      if (result.success && result.config) {
        enabled = result.config.enabled;
        intervalMinutes = result.config.intervalMinutes;
        maxBackups = result.config.maxBackups;
        maxAgeDays = result.config.maxAgeDays;
        onServerStart = result.config.onServerStart;
        hasConfigChanges = false;
      }
    };

    s.on('backup:list-result', handleListResult);
    s.on('backup:create-result', handleCreateResult);
    s.on('backup:restore-result', handleRestoreResult);
    s.on('backup:delete-result', handleDeleteResult);
    s.on('backup:config-result', handleConfigResult);

    return () => {
      s.off('backup:list-result', handleListResult);
      s.off('backup:create-result', handleCreateResult);
      s.off('backup:restore-result', handleRestoreResult);
      s.off('backup:delete-result', handleDeleteResult);
      s.off('backup:config-result', handleConfigResult);
    };
  });

  function loadBackups(): void {
    isLoading = true;
    emit('backup:list');
  }

  function loadConfig(): void {
    emit('backup:config');
  }

  function handleCreateBackup(): void {
    isCreating = true;
    emit('backup:create');
  }

  function handleRestore(backup: BackupInfo): void {
    if ($serverStatus.running) {
      showToast($_('serverMustBeStopped'), 'error');
      return;
    }

    if (confirm($_('confirmRestore'))) {
      isRestoring = true;
      emit('backup:restore', backup.id);
    }
  }

  function handleDelete(backup: BackupInfo): void {
    if (confirm($_('confirmDelete') + ` "${backup.filename}"?`)) {
      emit('backup:delete', backup.id);
    }
  }

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
      onServerStart,
    };
    emit('backup:config', config);
  }

  function formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString();
  }
</script>

<div class="backups-container">
  <!-- Config Section -->
  <div class="config-section">
    <div class="config-header">
      <h3>{$_('backupConfig')}</h3>
    </div>

    <div class="config-form">
      <div class="form-group checkbox-group">
        <label>
          <input type="checkbox" bind:checked={enabled} onchange={markConfigChanged} />
          {$_('backupEnabled')}
        </label>
      </div>

      <div class="form-group checkbox-group">
        <label>
          <input type="checkbox" bind:checked={onServerStart} onchange={markConfigChanged} />
          {$_('backupOnStart')}
        </label>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="intervalMinutes">{$_('backupInterval')}</label>
          <input 
            type="number" 
            id="intervalMinutes"
            bind:value={intervalMinutes}
            onchange={markConfigChanged}
            min="0"
            max="1440"
          />
          <span class="hint">0 = {$_('disabled')}</span>
        </div>

        <div class="form-group">
          <label for="maxBackups">{$_('maxBackups')}</label>
          <input 
            type="number" 
            id="maxBackups"
            bind:value={maxBackups}
            onchange={markConfigChanged}
            min="0"
            max="100"
          />
          <span class="hint">0 = {$_('unlimited')}</span>
        </div>

        <div class="form-group">
          <label for="maxAgeDays">{$_('maxAgeDays')}</label>
          <input 
            type="number" 
            id="maxAgeDays"
            bind:value={maxAgeDays}
            onchange={markConfigChanged}
            min="0"
            max="365"
          />
          <span class="hint">0 = {$_('unlimited')}</span>
        </div>
      </div>

      <button 
        class="mc-btn primary" 
        onclick={handleSaveConfig}
        disabled={!hasConfigChanges || isSavingConfig}
      >
        {isSavingConfig ? $_('saving') : $_('save')}
      </button>
    </div>
  </div>

  <!-- Backups List Section -->
  <div class="backups-section">
    <div class="backups-header">
      <h3>{$_('backups')}</h3>
      <button 
        class="mc-btn" 
        onclick={handleCreateBackup}
        disabled={isCreating}
      >
        {isCreating ? $_('creating') : $_('createBackup')}
      </button>
    </div>

    {#if isLoading}
      <div class="loading">{$_('loading')}...</div>
    {:else if backupsList.length === 0}
      <div class="empty-state">{$_('noBackups')}</div>
    {:else}
      <div class="backups-list">
        {#each backupsList as backup}
          <div class="backup-item">
            <div class="backup-info">
              <span class="backup-name">{backup.filename}</span>
              <span class="backup-meta">
                {formatDate(backup.createdAt)} • {formatSize(backup.size)}
              </span>
            </div>
            <div class="backup-actions">
              <button 
                class="mc-btn small" 
                onclick={() => handleRestore(backup)}
                disabled={isRestoring || $serverStatus.running}
                title={$serverStatus.running ? $_('serverMustBeStopped') : $_('restoreBackup')}
              >
                ↩ {$_('restoreBackup')}
              </button>
              <button 
                class="mc-btn small danger" 
                onclick={() => handleDelete(backup)}
              >
                ✕
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .backups-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .config-section, .backups-section {
    background: var(--mc-bg-dark);
    border: 2px solid var(--mc-border);
    padding: 1rem;
  }

  .config-header, .backups-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--mc-border);
  }

  .config-header h3, .backups-header h3 {
    margin: 0;
    font-size: 1rem;
  }

  .config-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .form-group label {
    font-size: 0.85rem;
    color: var(--mc-text-secondary);
  }

  .form-group input[type="number"] {
    background: var(--mc-bg);
    border: 1px solid var(--mc-border);
    color: var(--mc-text);
    padding: 0.5rem;
    font-family: inherit;
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .checkbox-group input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
  }

  .hint {
    font-size: 0.75rem;
    color: var(--mc-text-muted);
  }

  .backups-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 400px;
    overflow-y: auto;
  }

  .backup-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--mc-bg);
    border: 1px solid var(--mc-border);
  }

  .backup-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .backup-name {
    font-family: monospace;
    font-size: 0.9rem;
  }

  .backup-meta {
    font-size: 0.75rem;
    color: var(--mc-text-secondary);
  }

  .backup-actions {
    display: flex;
    gap: 0.5rem;
  }

  .loading, .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--mc-text-secondary);
  }

  .mc-btn.danger {
    background: var(--mc-red);
    border-color: var(--mc-red-dark);
  }

  .mc-btn.danger:hover {
    background: var(--mc-red-dark);
  }

  .mc-btn.primary {
    background: var(--mc-green);
    border-color: var(--mc-green-dark);
  }

  .mc-btn.primary:hover {
    background: var(--mc-green-dark);
  }

  .mc-btn.primary:disabled {
    background: var(--mc-bg);
    border-color: var(--mc-border);
    opacity: 0.6;
  }

  @media (max-width: 600px) {
    .form-row {
      grid-template-columns: 1fr;
    }

    .backup-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .backup-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>
