<script lang="ts">
import { _ } from 'svelte-i18n';
import { type Channel, fetchChannels } from '$lib/services/api';
import { confirmDialog } from '$lib/stores/confirm';
import BlockLoader from './ui/BlockLoader.svelte';
import Button from './ui/Button.svelte';
import InlineNotice from './ui/InlineNotice.svelte';
import Tag from './ui/Tag.svelte';

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

let channels = $state<Channel[]>([]);
// svelte-ignore state_referenced_locally
let selectedChannel = $state<'stable' | 'pre-release'>(initialChannel);
let loadingChannels = $state(false);
let error = $state<string | null>(null);
let groupEl = $state<HTMLDivElement | null>(null);

const isPreReleaseSelected = $derived(selectedChannel === 'pre-release');

const names: Record<Channel['id'], { name: string; desc: string }> = {
  stable: { name: 'stableChannel', desc: 'stableDesc' },
  'pre-release': { name: 'preReleaseChannel', desc: 'preReleaseDesc' }
};

$effect(() => {
  if (serverId) {
    loadChannels(serverId);
  }
});

// Sync with external selected channel changes
$effect(() => {
  selectedChannel = initialChannel;
});

async function loadChannels(serverId: string): Promise<void> {
  loadingChannels = true;
  error = null;

  const response = await fetchChannels(serverId);

  if (response.success && response.channels) {
    channels = response.channels;
    selectedChannel = response.current || 'stable';
  } else {
    error = response.error || $_('channelLoadError');
  }

  loadingChannels = false;
}

async function handleChannelChange(channelId: 'stable' | 'pre-release'): Promise<void> {
  if (disabled || channelId === selectedChannel) return;

  // World data upgrades are one-way: a world opened on pre-release may not load on stable again
  const confirmed =
    channelId === 'stable'
      ? await confirmDialog($_('channelDowngradeWarning'), {
          title: $_('channelDowngradeTitle'),
          confirmLabel: $_('switchChannel'),
          danger: true
        })
      : await confirmDialog($_('channelUpgradeNote'), {
          title: $_('channelUpgradeTitle'),
          confirmLabel: $_('switchChannel')
        });
  if (!confirmed) return;

  selectedChannel = channelId;
  onChannelChange(channelId);
}

// Arrow keys move focus between options; choosing still goes through the confirm dialog
function handleKeydown(e: KeyboardEvent): void {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const radios = Array.from(groupEl?.querySelectorAll<HTMLElement>('[role="radio"]') ?? []);
  const index = radios.indexOf(document.activeElement as HTMLElement);
  if (index < 0) return;
  e.preventDefault();
  const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
  radios[(index + step + radios.length) % radios.length]?.focus();
}
</script>

<div class="flex flex-col gap-2">
  <span id="channel-label" class="text-[13px] leading-[18px] font-medium text-fg-2">{$_('releaseChannel')}</span>

  {#if loadingChannels}
    <div class="flex h-10 items-center gap-2 text-[13px] text-fg-3"><BlockLoader />{$_('loadingChannels')}</div>
  {:else if error}
    <InlineNotice kind="negative" title={$_('channelLoadError')}>
      <span class="text-fg-3">{error}</span>
      {#snippet action()}
        <Button variant="ghost" size="sm" onclick={() => loadChannels(serverId)}>{$_('retry')}</Button>
      {/snippet}
    </InlineNotice>
  {:else if channels.length > 0}
    <div
      bind:this={groupEl}
      class="flex flex-col gap-2"
      role="radiogroup"
      aria-labelledby="channel-label"
      tabindex="-1"
      onkeydown={handleKeydown}
    >
      {#each channels as channel (channel.id)}
        {@const selected = selectedChannel === channel.id}
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          tabindex={selected ? 0 : -1}
          class="hp-channel flex min-h-10 items-start gap-3 rounded-md px-3 py-2.5 text-left"
          class:selected
          onclick={() => handleChannelChange(channel.id)}
          disabled={!channel.available || disabled}
          title={disabled ? $_('stopServerToEdit') : undefined}
        >
          <span class="hp-radio mt-0.5 grid h-3.5 w-3.5 shrink-0 place-content-center" aria-hidden="true">
            {#if selected}<span class="h-1.5 w-1.5 bg-accent"></span>{/if}
          </span>
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="flex flex-wrap items-center gap-2 text-sm font-medium text-fg-1">
              {names[channel.id] ? $_(names[channel.id].name) : channel.name}
              {#if channel.recommended}<Tag>{$_('recommended')}</Tag>{/if}
            </span>
            <span class="text-xs text-fg-2">{names[channel.id] ? $_(names[channel.id].desc) : channel.description}</span>
          </span>
        </button>
      {/each}
    </div>

    {#if isPreReleaseSelected}
      <InlineNotice kind="warning">
        <p>{$_('preReleaseWarning')}</p>
        <p class="mt-1 text-fg-2">{$_('channelChangedNote')}</p>
      </InlineNotice>
    {/if}
  {:else}
    <p class="text-[13px] text-fg-3">{$_('noChannelsAvailable')}</p>
  {/if}
</div>

<style>
  .hp-channel {
    box-shadow: inset 0 0 0 1px var(--hp-line-control);
    cursor: pointer;
    transition: background-color var(--hp-dur-hover) ease;
  }

  .hp-channel:hover:not(:disabled) {
    background: var(--hp-bg-2);
  }

  .hp-channel.selected {
    background: var(--hp-bg-3);
    box-shadow: inset 0 0 0 2px var(--hp-accent);
  }

  .hp-channel:disabled {
    cursor: not-allowed;
    box-shadow: inset 0 0 0 1px var(--hp-line-1);
  }

  .hp-channel.selected:disabled {
    box-shadow: inset 0 0 0 2px var(--hp-line-2);
  }

  .hp-radio {
    border: 1px solid var(--hp-line-control);
    background: var(--hp-bg-sunken);
  }
</style>
