<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import Section from '$lib/components/ui/Section.svelte';
import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
import { forceStopServer, wipeServer } from '$lib/services/lifecycle';
import { pendingAction, serverStatus } from '$lib/stores/server';
import { activeServer } from '$lib/stores/servers';
import { workspaceStatus } from '$lib/utils/status';

const status = $derived(workspaceStatus($serverStatus, $pendingAction));
let copied = $state(false);

async function copyContainer(): Promise<void> {
  if (!$activeServer) return;
  try {
    await navigator.clipboard.writeText($activeServer.containerName);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  } catch {
    // Clipboard blocked (insecure context): the value stays selectable
  }
}
</script>

<div class="flex flex-col gap-6">
  <Section title={$_('serverInfo')}>
    <dl class="hp-kv">
      <div>
        <dt>{$_('status')}</dt>
        <dd><StatusBadge {status} /></dd>
      </div>
      <div>
        <dt>{$_('gamePort')}</dt>
        <dd class="font-mono text-[13px]">{$activeServer?.port ?? 5520}/udp</dd>
      </div>
      <div>
        <dt>{$_('panelPort')}</dt>
        <dd class="font-mono text-[13px]">3000/tcp</dd>
      </div>
      <div>
        <dt>{$_('container')}</dt>
        <dd class="gap-1">
          <span class="truncate font-mono text-[13px] select-all" title={$activeServer?.containerName}>
            {$activeServer?.containerName ?? '—'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            icon={copied ? 'check' : 'copy'}
            playIcon={copied}
            aria-label={copied ? $_('copied') : $_('copyContainerName')}
            title={copied ? $_('copied') : $_('copyContainerName')}
            onclick={copyContainer}
          />
        </dd>
      </div>
      <div>
        <dt>{$_('memory')}</dt>
        <dd class="font-mono text-[13px]">
          {$activeServer ? `${$activeServer.config.javaXms} – ${$activeServer.config.javaXmx}` : '—'}
        </dd>
      </div>
    </dl>
  </Section>

  <Section title={$_('dangerZone')}>
    <div class="rounded-md border border-line">
      <div class="flex items-start gap-4 p-4">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-fg-1">{$_('forceStop')}</p>
          <p class="mt-1 text-xs text-fg-2">{$_('forceStopHint')}</p>
        </div>
        <Button
          variant="danger"
          size="sm"
          icon="zap"
          onclick={forceStopServer}
          disabled={!$serverStatus.running}
          title={$serverStatus.running ? $_('forceStopTooltip') : $_('needsRunningServer')}
        >
          {$_('forceStop')}
        </Button>
      </div>
      <div class="flex items-start gap-4 border-t border-line p-4">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-fg-1">{$_('wipeServerData')}</p>
          <p class="mt-1 text-xs text-fg-2">{$_('wipeHint')}</p>
        </div>
        <Button
          variant="danger"
          size="sm"
          icon="trash-2"
          onclick={wipeServer}
          disabled={status !== 'offline'}
          title={status !== 'offline' ? $_('stopServerToWipe') : undefined}
        >
          {$_('wipeDataEllipsis')}
        </Button>
      </div>
    </div>
  </Section>
</div>
