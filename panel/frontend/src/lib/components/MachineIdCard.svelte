<script lang="ts">
import { _ } from 'svelte-i18n';
import { apiUrl } from '$lib/stores/config';
import { showToast } from '$lib/stores/ui';

let { serverId }: { serverId: string } = $props();

interface MachineIdStatus {
  exists: boolean;
  value: string | null;
  hash: string | null;
  valid: boolean;
  changedSinceLastCheck: boolean;
  recommendation: string;
}

let status = $state<MachineIdStatus | null>(null);
let checking = $state(false);
let regenerating = $state(false);
let error = $state<string | null>(null);

async function checkStatus(): Promise<void> {
  if (!serverId) return;

  checking = true;
  error = null;

  try {
    const response = await fetch(apiUrl(`/api/servers/${serverId}/machine-id`));
    const result = await response.json();

    if (result.success && result.status) {
      status = result.status;
    } else {
      error = result.error || 'Failed to check machine-id';
    }
  } catch (e) {
    error = (e as Error).message;
  } finally {
    checking = false;
  }
}

async function regenerate(): Promise<void> {
  if (!serverId) return;

  if (!confirm($_('machineIdRegenerateConfirm'))) {
    return;
  }

  regenerating = true;
  error = null;

  try {
    const response = await fetch(apiUrl(`/api/servers/${serverId}/machine-id/regenerate`), {
      method: 'POST'
    });
    const result = await response.json();

    if (result.success) {
      showToast($_('machineIdRegenerated'));
      await checkStatus(); // Refresh status
    } else {
      const errorMsg = result.error || 'Failed to regenerate machine-id';
      error = errorMsg;
      showToast(errorMsg, 'error');
    }
  } catch (e) {
    const errorMsg = (e as Error).message;
    error = errorMsg;
    showToast(errorMsg, 'error');
  } finally {
    regenerating = false;
  }
}

// Auto-check on mount
$effect(() => {
  if (serverId) {
    checkStatus();
  }
});
</script>

<div class="machine-id-card">
  <div class="card-header">
    <h4>{$_('machineIdTitle')}</h4>
    <button 
      class="mc-btn small" 
      onclick={checkStatus} 
      disabled={checking}
    >
      {checking ? $_('checking') : $_('refresh')}
    </button>
  </div>

  {#if error}
    <div class="alert error">
      <span class="icon">⚠</span>
      <span>{error}</span>
    </div>
  {/if}

  {#if status}
    <div class="status-section">
      <div class="status-badge" class:valid={status.valid} class:invalid={!status.valid}>
        <span class="status-icon">{status.valid ? '✓' : '⚠'}</span>
        <span class="status-text">
          {status.valid ? $_('machineIdValid') : $_('machineIdInvalid')}
        </span>
      </div>

      {#if status.value}
        <div class="machine-id-value">
          <span class="label">{$_('machineIdValue')}</span>
          <code>{status.value}</code>
        </div>
      {/if}

      {#if status.changedSinceLastCheck}
        <div class="alert warning">
          <span class="icon">⚠</span>
          <div>
            <strong>{$_('machineIdChanged')}</strong>
            <p>{$_('machineIdAuthDataLost')}</p>
          </div>
        </div>
      {/if}

      <div class="recommendation">
        <p>{status.recommendation}</p>
      </div>

      <div class="actions">
        <button 
          class="mc-btn small warning" 
          onclick={regenerate} 
          disabled={regenerating}
        >
          {regenerating ? $_('saving') : $_('machineIdRegenerate')}
        </button>
      </div>
    </div>
  {:else if checking}
    <div class="loading">{$_('checking')}</div>
  {/if}

  <div class="info-text">
    <p>{$_('machineIdInfo')}</p>
  </div>
</div>

<style>
  .machine-id-card {
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid #666;
    padding: 16px;
    margin-bottom: 16px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .card-header h4 {
    margin: 0;
    font-size: 16px;
    color: #fff;
  }

  .status-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 2px solid;
    width: fit-content;
  }

  .status-badge.valid {
    border-color: #4caf50;
    background: rgba(76, 175, 80, 0.1);
  }

  .status-badge.invalid {
    border-color: #ff9800;
    background: rgba(255, 152, 0, 0.1);
  }

  .status-icon {
    font-size: 18px;
  }

  .status-badge.valid .status-icon {
    color: #4caf50;
  }

  .status-badge.invalid .status-icon {
    color: #ff9800;
  }

  .status-text {
    font-family: 'Press Start 2P', monospace;
    font-size: 12px;
    color: #fff;
  }

  .machine-id-value {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .machine-id-value .label {
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    color: #aaa;
  }

  .machine-id-value code {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #555;
    padding: 8px;
    font-family: monospace;
    font-size: 12px;
    color: #0f0;
    word-break: break-all;
  }

  .alert {
    display: flex;
    gap: 12px;
    padding: 12px;
    border: 2px solid;
  }

  .alert.warning {
    border-color: #ff9800;
    background: rgba(255, 152, 0, 0.1);
  }

  .alert.error {
    border-color: #f44336;
    background: rgba(244, 67, 54, 0.1);
  }

  .alert .icon {
    font-size: 20px;
    color: #ff9800;
  }

  .alert.error .icon {
    color: #f44336;
  }

  .alert strong {
    color: #fff;
    display: block;
    margin-bottom: 4px;
  }

  .alert p {
    margin: 0;
    font-size: 12px;
    color: #ddd;
  }

  .recommendation {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #555;
    padding: 12px;
  }

  .recommendation p {
    margin: 0;
    font-size: 12px;
    color: #ddd;
    line-height: 1.5;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .info-text {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #555;
  }

  .info-text p {
    margin: 0;
    font-size: 11px;
    color: #888;
    line-height: 1.5;
  }

  .loading {
    text-align: center;
    padding: 20px;
    color: #aaa;
  }
</style>
