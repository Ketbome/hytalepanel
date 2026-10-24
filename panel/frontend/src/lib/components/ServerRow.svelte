<script lang="ts">
import { _ } from 'svelte-i18n';
import type { Server } from '$lib/stores/servers';
import { listStatus, type PendingAction } from '$lib/utils/status';
import Button from './ui/Button.svelte';
import Menu, { type MenuEntry } from './ui/Menu.svelte';
import StatusBadge from './ui/StatusBadge.svelte';

const {
  server,
  pending,
  onOpen,
  onStart,
  onStop,
  onDelete
}: {
  server: Server;
  pending: PendingAction;
  onOpen: () => void;
  onStart: () => void;
  onStop: () => void;
  onDelete: () => void;
} = $props();

const status = $derived(listStatus(server, pending));
const memory = $derived(`${server.config.javaXms}–${server.config.javaXmx}`);
const menu = $derived<MenuEntry[]>([
  { label: $_('deleteServerEllipsis'), icon: 'trash-2', danger: true, onselect: onDelete }
]);

function handleRowClick(e: MouseEvent): void {
  if ((e.target as Element).closest('button, a, [role="menu"]')) return;
  onOpen();
}
</script>

{#snippet lifecycle()}
  {#if status === 'online'}
    <Button variant="secondary" size="sm" icon="power" onclick={onStop}>{$_('stop')}</Button>
  {:else if status === 'starting' || status === 'stopping'}
    <Button variant="secondary" size="sm" loading disabled>
      {status === 'starting' ? $_('statusStarting') : $_('statusStopping')}
    </Button>
  {:else}
    <Button
      variant="secondary"
      size="sm"
      icon="play"
      onclick={onStart}
      disabled={status === 'unknown'}
      title={status === 'unknown' ? $_('statusUnknownHint') : undefined}
    >
      {$_('start')}
    </Button>
  {/if}
{/snippet}

{#snippet more()}
  <Menu items={menu} label={$_('serverActions', { values: { name: server.name } })} align="end" minWidth="180px">
    {#snippet trigger(props)}
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        icon="ellipsis"
        aria-label={$_('serverActions', { values: { name: server.name } })}
        {...props}
      />
    {/snippet}
  </Menu>
{/snippet}

<!-- The name button is the keyboard target; the whole row is a pointer convenience -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
<div role="row" class="hp-row cursor-pointer sm:col-span-full sm:grid sm:grid-cols-subgrid" onclick={handleRowClick}>
  <div class="col-span-full grid h-14 grid-cols-subgrid items-center px-4 max-sm:hidden">
    <span role="cell"><StatusBadge {status} /></span>
    <span role="cell" class="min-w-0">
      <button type="button" class="max-w-full truncate text-left text-sm font-semibold text-fg-1 hover:underline" title={server.name} onclick={onOpen}>
        {server.name}
      </button>
    </span>
    <span role="cell" class="text-right font-mono text-[13px] tabular-nums text-fg-1">{server.port}/udp</span>
    <span role="cell" class="text-right font-mono text-[13px] text-fg-1">{memory}</span>
    <span role="cell" class="truncate font-mono text-[13px] text-fg-3 max-md:hidden" title={server.containerName}>
      {server.containerName}
    </span>
    <span role="cell" class="flex items-center justify-end gap-1">
      {@render lifecycle()}
      <Button variant="ghost" size="sm" trailingIcon="arrow-right" onclick={onOpen}>{$_('open')}</Button>
      {@render more()}
    </span>
  </div>

  <div class="flex min-h-14 items-center gap-3 px-4 py-2 sm:hidden">
    <div class="flex min-w-0 flex-1 flex-col gap-0.5" role="cell">
      <button type="button" class="min-w-0 truncate text-left text-sm font-semibold text-fg-1" title={server.name} onclick={onOpen}>
        {server.name}
      </button>
      <span class="flex min-w-0 items-center gap-2 text-fg-3">
        <StatusBadge {status} />
        <span class="truncate font-mono text-xs">{server.port}/udp · {memory} · {server.containerName}</span>
      </span>
    </div>
    <span role="cell" class="flex shrink-0 items-center gap-1">
      {@render lifecycle()}
      {@render more()}
    </span>
  </div>
</div>

<style>
  .hp-row {
    transition: background-color var(--hp-dur-hover) ease;
  }

  .hp-row:hover {
    background: var(--hp-bg-2);
  }
</style>
