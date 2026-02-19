<script lang="ts">
import { _ } from 'svelte-i18n';
import { type Channel, fetchChannels } from '$lib/services/api';
import { showToast } from '$lib/stores/ui';

// Props using $props()
const {
  serverId,
  selectedChannel: initialChannel,
  disabled = false,
  onChannelChange
}: {
  serverId: string;
  selectedChannel: 'stable' | 'pre-release';
  disabled?: boolean;
  onChannelChange: (channel: 'stable' | 'pre-release') => void;
} = $props();

// Reactive state using $state() rune
let channels = $state<Channel[]>([]);
// svelte-ignore state_referenced_locally
let selectedChannel = $state<'stable' | 'pre-release'>(initialChannel);
let loadingChannels = $state(false);
let error = $state<string | null>(null);

// Derived state using $derived()
const hasPreRelease = $derived(channels.some((c) => c.id === 'pre-release' && c.available));
const isPreReleaseSelected = $derived(selectedChannel === 'pre-release');

// Load channels on mount using $effect()
$effect(() => {
  if (serverId) {
    loadChannels(serverId);
  }
});

// Sync with external selected channel changes
$effect(() => {
  selectedChannel = initialChannel;
});

// Feature disabled: downloader doesn't support --channel yet
const featureDisabled = true;

// Functions
async function loadChannels(serverId: string): Promise<void> {
  if (featureDisabled) {
    loadingChannels = false;
    return;
  }

  loadingChannels = true;
  error = null;

  const response = await fetchChannels(serverId);

  if (response.success && response.channels) {
    channels = response.channels;
    selectedChannel = response.current || 'stable';
  } else {
    error = response.error || 'Failed to load channels';
    showToast(error, 'error');
  }

  loadingChannels = false;
}

function handleChannelChange(channelId: 'stable' | 'pre-release'): void {
  if (disabled || featureDisabled) return;

  selectedChannel = channelId;
  onChannelChange(channelId);
}
</script>

<div class="channel-selector">
  <div class="section-header">
    <h3>{$_('releaseChannel')}</h3>
  </div>

  {#if featureDisabled}
    <div class="coming-soon-banner">
      <span class="icon">🚧</span>
      <div class="message">
        <strong>{$_('comingSoon')}</strong>
        <p>{$_('channelFeatureDisabled')}</p>
      </div>
    </div>
  {:else if loadingChannels}
    <div class="loading-state">
      <span class="spinner"></span>
      <span>{$_('loading')}...</span>
    </div>
  {:else if error}
    <div class="error-state">
      <span class="icon">⚠</span>
      <span>{error}</span>
    </div>
  {:else if channels.length > 0}
    <div class="channel-options">
      {#each channels as channel (channel.id)}
        <button
          class="channel-btn"
          class:active={selectedChannel === channel.id}
          class:recommended={channel.recommended}
          class:disabled={!channel.available || disabled || featureDisabled}
          onclick={() => handleChannelChange(channel.id)}
          disabled={!channel.available || disabled || featureDisabled}
          type="button"
        >
          <div class="channel-icon" class:warning={channel.id === 'pre-release'}>
            {#if channel.recommended}
              ✓
            {:else}
              ⚠
            {/if}
          </div>

          <div class="channel-info">
            <div class="channel-name">
              {channel.name}
              {#if channel.recommended}
                <span class="badge recommended">{$_('recommended')}</span>
              {/if}
            </div>
            <div class="channel-desc">{channel.description}</div>
          </div>

          {#if selectedChannel === channel.id}
            <div class="selected-indicator">●</div>
          {/if}
        </button>
      {/each}
    </div>

    {#if isPreReleaseSelected}
      <div class="warning-box">
        <div class="warning-icon">⚠</div>
        <div class="warning-content">
          <strong>{$_('warning')}</strong>
          <p>{$_('preReleaseWarning')}</p>
          <p class="warning-note">{$_('channelChangedNote')}</p>
        </div>
      </div>
    {/if}
  {:else}
    <div class="empty-state">
      <p>{$_('noChannelsAvailable')}</p>
    </div>
  {/if}
</div>

<style>
  .channel-selector {
    margin-bottom: 24px;
  }
  .coming-soon-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(255, 165, 0, 0.1);
    border: 2px solid var(--hytale-orange);
    border-radius: 2px;
    margin-bottom: 12px;
  }

  .coming-soon-banner .icon {
    font-size: 24px;
  }

  .coming-soon-banner .message {
    flex: 1;
  }

  .coming-soon-banner strong {
    display: block;
    color: var(--hytale-orange);
    font-size: 13px;
    margin-bottom: 4px;
    text-transform: uppercase;
  }

  .coming-soon-banner p {
    margin: 0;
    font-size: 12px;
    color: var(--text-dim);
    line-height: 1.4;
  }
  .section-header h3 {
    margin: 0 0 8px 0;
    font-size: 14px;
    text-transform: uppercase;
    color: var(--text);
  }

  .loading-state,
  .error-state,
  .empty-state {
    padding: 16px;
    text-align: center;
    background: var(--bg-dark);
    border: 1px solid var(--border);
    color: var(--text-dim);
  }

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-state {
    color: var(--error);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .channel-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .channel-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--bg-dark);
    border: 2px solid var(--border);
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    position: relative;
  }

  .channel-btn:hover:not(:disabled):not(.disabled) {
    border-color: var(--accent);
    background: var(--bg);
    transform: translateY(-1px);
  }

  .channel-btn.active {
    border-color: var(--accent);
    background: var(--accent-dark);
  }

  .channel-btn:disabled,
  .channel-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .channel-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    background: var(--bg);
    border: 1px solid var(--border);
    flex-shrink: 0;
  }

  .channel-icon.warning {
    color: var(--warning);
  }

  .channel-info {
    flex: 1;
    min-width: 0;
  }

  .channel-name {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    font-weight: bold;
    flex-wrap: wrap;
  }

  .channel-desc {
    font-size: 9px;
    color: var(--text-dim);
    line-height: 1.4;
  }

  .badge {
    padding: 2px 6px;
    font-size: 8px;
    font-weight: bold;
    border: 1px solid;
  }

  .badge.recommended {
    background: var(--success);
    color: var(--bg-dark);
    border-color: var(--success);
  }

  .selected-indicator {
    color: var(--accent);
    font-size: 16px;
    margin-left: auto;
  }

  .warning-box {
    margin-top: 12px;
    padding: 12px;
    background: rgba(255, 165, 0, 0.1);
    border: 2px solid var(--warning);
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .warning-icon {
    font-size: 24px;
    color: var(--warning);
    flex-shrink: 0;
  }

  .warning-content {
    flex: 1;
  }

  .warning-content strong {
    display: block;
    margin-bottom: 4px;
    color: var(--warning);
  }

  .warning-content p {
    margin: 4px 0;
    font-size: 10px;
    line-height: 1.5;
    color: var(--text-dim);
  }

  .warning-note {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 165, 0, 0.3);
    font-style: italic;
  }
</style>
