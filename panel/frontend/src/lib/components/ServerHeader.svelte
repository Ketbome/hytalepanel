<script lang="ts">
import { _ } from 'svelte-i18n';
import { forceStopServer, restartServer, startServer, stopServer } from '$lib/services/lifecycle';
import { pendingAction, serverStatus } from '$lib/stores/server';
import { activeServer } from '$lib/stores/servers';
import { formatUptime } from '$lib/utils/formatters';
import { workspaceStatus } from '$lib/utils/status';
import Button from './ui/Button.svelte';
import Menu, { type MenuEntry } from './ui/Menu.svelte';
import StatusBadge from './ui/StatusBadge.svelte';

const status = $derived(workspaceStatus($serverStatus, $pendingAction));
let uptime = $state('');

$effect(() => {
  const startedAt = $serverStatus.running ? $serverStatus.startedAt : null;
  uptime = formatUptime(startedAt);
  if (!startedAt) return;
  const timer = setInterval(() => (uptime = formatUptime(startedAt)), 1000);
  return () => clearInterval(timer);
});

const stopMenu = $derived<MenuEntry[]>([
  { label: $_('forceStop'), icon: 'zap', danger: true, onselect: forceStopServer }
]);
</script>

{#if $activeServer}
  <section class="flex shrink-0 flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4 lg:min-h-16">
    <div class="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-baseline md:gap-4">
      <h1
        class="min-w-0 truncate font-display text-lg leading-7 font-medium tracking-[-0.01em] text-fg-1 sm:text-xl"
        title={$activeServer.name}
      >
        {$activeServer.name}
      </h1>
      <p class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-[18px] text-fg-2 md:shrink-0 md:flex-nowrap">
        <StatusBadge {status} live />
        {#if status === 'online' && uptime}
          <span class="text-fg-3" aria-hidden="true">·</span>
          <span>{$_('upFor', { values: { time: uptime } })}</span>
        {/if}
        <span class="text-fg-3" aria-hidden="true">·</span>
        <span class="font-mono text-xs">:{$activeServer.port}/udp</span>
        <span class="text-fg-3" aria-hidden="true">·</span>
        <span class="font-mono text-xs">{$activeServer.config.javaXms}–{$activeServer.config.javaXmx}</span>
      </p>
    </div>

    <div class="flex shrink-0 gap-2 max-sm:[&>*]:flex-1">
      {#if status === 'offline'}
        <Button variant="primary" icon="play" onclick={startServer} class="max-sm:w-full">{$_('start')}</Button>
      {:else if status === 'online'}
        <Button variant="secondary" icon="rotate-cw" animateIcon onclick={restartServer} class="max-sm:w-full">
          {$_('restart')}
        </Button>
        <div class="flex">
          <Button variant="secondary" icon="power" onclick={stopServer} class="rounded-r-none max-sm:flex-1">{$_('stop')}</Button>
          <Menu items={stopMenu} label={$_('moreStopOptions')} align="end">
            {#snippet trigger(props)}
              <Button
                variant="secondary"
                iconOnly
                icon="chevron-down"
                aria-label={$_('moreStopOptions')}
                class="-ml-px rounded-l-none"
                {...props}
              />
            {/snippet}
          </Menu>
        </div>
      {:else if status === 'starting' || status === 'stopping'}
        <Button variant="secondary" loading disabled class="max-sm:w-full">
          {status === 'starting' ? $_('statusStarting') : $_('statusStopping')}
        </Button>
      {:else}
        <Button variant="primary" icon="play" disabled title={$_('statusUnknownHint')} class="max-sm:w-full">{$_('start')}</Button>
      {/if}
    </div>
  </section>
{/if}
