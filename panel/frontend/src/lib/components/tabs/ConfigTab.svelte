<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { activeServerId, activeServer, updateServer as updateServerStore, type ServerConfig } from '$lib/stores/servers';
  import { serverStatus } from '$lib/stores/server';
  import { showToast } from '$lib/stores/ui';
  import { updateServer } from '$lib/services/api';

  // Form state - initialized from activeServer
  let javaXms = $state('2G');
  let javaXmx = $state('4G');
  let port = $state(5520);
  let bindAddr = $state('0.0.0.0');
  let autoDownload = $state(true);
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

<div class="config-section">
  <div class="config-header">
    <h3>{$_('serverConfig')}</h3>
  </div>

  {#if $serverStatus.running}
    <div class="offline-notice">
      <span>⚠</span> {$_('stopServerToEdit')}
    </div>
  {/if}

  <div class="config-form" class:disabled={$serverStatus.running}>
    <div class="form-group">
      <label for="port">{$_('serverPort')}</label>
      <input 
        type="number" 
        id="port"
        bind:value={port}
        onchange={markChanged}
        disabled={$serverStatus.running}
        min="1024"
        max="65535"
      />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="javaXms">{$_('minMemory')}</label>
        <input 
          type="text" 
          id="javaXms"
          bind:value={javaXms}
          onchange={markChanged}
          disabled={$serverStatus.running}
          placeholder="2G"
        />
      </div>

      <div class="form-group">
        <label for="javaXmx">{$_('maxMemory')}</label>
        <input 
          type="text" 
          id="javaXmx"
          bind:value={javaXmx}
          onchange={markChanged}
          disabled={$serverStatus.running}
          placeholder="4G"
        />
      </div>
    </div>

    <div class="form-group">
      <label for="bindAddr">{$_('bindAddress')}</label>
      <input 
        type="text" 
        id="bindAddr"
        bind:value={bindAddr}
        onchange={markChanged}
        disabled={$serverStatus.running}
        placeholder="0.0.0.0"
      />
    </div>

    <div class="form-group">
      <label for="extraArgs">{$_('extraArgs')}</label>
      <input 
        type="text" 
        id="extraArgs"
        bind:value={extraArgs}
        onchange={markChanged}
        disabled={$serverStatus.running}
        placeholder="--world-seed 12345"
      />
    </div>

    <div class="form-group checkbox-group">
      <label>
        <input 
          type="checkbox" 
          bind:checked={autoDownload}
          onchange={markChanged}
          disabled={$serverStatus.running}
        />
        {$_('autoDownloadFiles')}
      </label>
    </div>

    <div class="form-group checkbox-group">
      <label>
        <input 
          type="checkbox" 
          bind:checked={useG1gc}
          onchange={markChanged}
          disabled={$serverStatus.running}
        />
        {$_('useG1GC')}
      </label>
    </div>

    <div class="form-group checkbox-group">
      <label>
        <input 
          type="checkbox" 
          bind:checked={useMachineId}
          onchange={markChanged}
          disabled={$serverStatus.running}
        />
        {$_('linuxNative')}
      </label>
      <span class="hint">{$_('machineIdHint')}</span>
    </div>
  </div>

  <div class="config-footer">
    <span class="config-hint">{$_('configHint')}</span>
    <button 
      class="mc-btn primary small"
      onclick={handleSave}
      disabled={$serverStatus.running || isSaving || !hasChanges}
    >
      {isSaving ? '...' : $_('save')}
    </button>
  </div>
</div>

<style>
  .config-section {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 8px;
  }

  .config-header {
    margin-bottom: 12px;
  }

  .config-header h3 {
    font-size: 14px;
    color: var(--hytale-orange);
    margin: 0;
  }

  .config-form {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .config-form.disabled {
    opacity: 0.6;
    pointer-events: none;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-row {
    display: flex;
    gap: 12px;
  }

  .form-row .form-group {
    flex: 1;
  }

  .form-group label {
    font-size: 11px;
    color: var(--text-dim);
    text-transform: uppercase;
  }

  .form-group input[type="text"],
  .form-group input[type="number"] {
    background: var(--mc-darker);
    border: 2px solid var(--mc-border-light);
    color: var(--text);
    padding: 6px 8px;
    font-size: 12px;
    font-family: inherit;
  }

  .form-group input:focus {
    border-color: var(--hytale-orange);
    outline: none;
  }

  .form-group input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .checkbox-group {
    flex-direction: row;
    align-items: center;
  }

  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    text-transform: none;
    font-size: 12px;
    color: var(--text);
  }

  .checkbox-group input[type="checkbox"] {
    width: 14px;
    height: 14px;
    cursor: pointer;
  }

  .checkbox-group .hint {
    font-size: 10px;
    color: var(--text-dim);
    margin-left: auto;
  }

  .config-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid var(--mc-border-light);
  }

  .config-hint {
    font-size: 11px;
    color: var(--text-dim);
  }
</style>
