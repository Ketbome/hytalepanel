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
let isExpanded = $state(false);

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

<div class="machine-id-card" class:expanded={isExpanded}>
  <div 
    class="card-header-btn" 
    onclick={() => isExpanded = !isExpanded}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === 'Enter' && (isExpanded = !isExpanded)}
  >
    <div class="header-left">
      <span class="expand-icon">{isExpanded ? '▼' : '▶'}</span>
      <h4>{$_('machineIdTitle')}</h4>
      {#if status && !isExpanded}
        <span class="status-badge-mini" class:valid={status.valid}>
          {status.valid ? '✓' : '⚠'}
        </span>
      {/if}
    </div>
    <button 
      class="mc-btn small" 
      onclick={(e) => { e.stopPropagation(); checkStatus(); }} 
      disabled={checking}
      type="button"
    >
      {checking ? $_('checking') : $_('refresh')}
    </button>
  </div>

  {#if isExpanded}
    <div class="card-content">
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
  {/if}
</div>

<style>
  .machine-id-card {
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid #666;
    margin-bottom: 12px;
    transition: all 0.3s;
  }

  .machine-id-card.expanded {
    border-color: var(--hytale-orange);
  }

  .card-header-btn {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    text-align: left;
    transition: background 0.2s;
  }

  .card-header-btn:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .expand-icon {
    font-size: 10px;
    color: var(--text-dim);
    transition: transform 0.2s;
  }

  .card-header-btn h4 {
    margin: 0;
    font-size: 13px;
    color: #fff;
  }

  .status-badge-mini {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    font-size: 10px;
    background: rgba(255, 152, 0, 0.2);
    border: 1px solid #ff9800;
    color: #ff9800;
  }

  .status-badge-mini.valid {
    background: rgba(76, 175, 80, 0.2);
    border-color: #4caf50;
    color: #4caf50;
  }

  .card-content {
    padding: 0 12px 12px;
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      max-height: 0;
    }
    to {
      opacity: 1;
      max-height: 1000px;
    }
  }

  .status-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border: 2px solid;
    width: fit-content;
    font-size: 11px;
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
    font-size: 14px;
  }

  .status-badge.valid .status-icon {
    color: #4caf50;
  }

  .status-badge.invalid .status-icon {
    color: #ff9800;
  }

  .status-text {
    font-family: var(--font-ui);
    font-size: 11px;
    color: #fff;
  }

  .machine-id-value {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .machine-id-value .label {
    font-family: var(--font-ui);
    font-size: 10px;
    color: #aaa;
  }

  .machine-id-value code {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #555;
    padding: 6px;
    font-family: monospace;
    font-size: 11px;
    color: #0f0;
    word-break: break-all;
  }

  .alert {
    display: flex;
    gap: 10px;
    padding: 10px;
    border: 2px solid;
    font-size: 11px;
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
    font-size: 16px;
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
    font-size: 11px;
    color: #ddd;
  }

  .recommendation {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #555;
    padding: 10px;
  }

  .recommendation p {
    margin: 0;
    font-size: 11px;
    color: #ddd;
    line-height: 1.5;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .info-text {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #555;
  }

  .info-text p {
    margin: 0;
    font-size: 10px;
    color: #888;
    line-height: 1.5;
  }

  .loading {
    text-align: center;
    padding: 16px;
    color: #aaa;
    font-size: 11px;
  }
</style>
