<script lang="ts">
import { _ } from 'svelte-i18n';
import BlockLoader from '$lib/components/ui/BlockLoader.svelte';
import Button from '$lib/components/ui/Button.svelte';
import Icon from '$lib/components/ui/Icon.svelte';
import InlineNotice from '$lib/components/ui/InlineNotice.svelte';
import Tag from '$lib/components/ui/Tag.svelte';
import { apiUrl } from '$lib/stores/config';
import { confirmDialog } from '$lib/stores/confirm';
import { showToast } from '$lib/stores/ui';

const { serverId }: { serverId: string } = $props();

interface MachineIdStatus {
  exists: boolean;
  value: string | null;
  hash: string | null;
  valid: boolean;
  changedSinceLastCheck: boolean;
  recommendation: string;
}

const uid = $props.id();
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
      error = result.error || $_('machineIdCheckFailed');
    }
  } catch (e) {
    error = (e as Error).message;
  } finally {
    checking = false;
  }
}

async function regenerate(): Promise<void> {
  if (!serverId) return;

  if (
    !(await confirmDialog($_('machineIdRegenerateConfirm'), {
      title: $_('machineIdRegenerateTitle'),
      confirmLabel: $_('machineIdRegenerate'),
      danger: true
    }))
  ) {
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
      error = result.error || $_('machineIdRegenerateFailed');
    }
  } catch (e) {
    error = (e as Error).message;
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

<div class="border-y border-line">
  <div class="flex h-10 items-center gap-2">
    <button
      type="button"
      class="flex h-full min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium text-fg-1"
      aria-expanded={isExpanded}
      aria-controls="{uid}-content"
      onclick={() => (isExpanded = !isExpanded)}
    >
      <span class="hp-chevron flex text-fg-3" class:open={isExpanded}><Icon name="chevron-right" /></span>
      <span class="truncate">{$_('machineIdTitle')}</span>
      {#if checking}
        <BlockLoader />
      {:else if status}
        <Tag kind={status.valid ? 'positive' : 'warning'}>{status.valid ? $_('machineIdValid') : $_('machineIdInvalid')}</Tag>
      {/if}
    </button>
    <Button
      variant="ghost"
      size="sm"
      iconOnly
      icon="refresh-cw"
      playIcon={checking}
      onclick={() => checkStatus()}
      disabled={checking}
      aria-label={$_('refresh')}
      title={$_('refresh')}
    />
  </div>

  <div id="{uid}-content" class="hp-disclosure" class:open={isExpanded} inert={!isExpanded}>
    <div class="overflow-hidden">
      <div class="flex flex-col gap-3 pb-4 pl-6">
        {#if error}
          <InlineNotice kind="negative">{error}</InlineNotice>
        {/if}

        {#if status}
          <dl class="hp-kv">
            <div>
              <dt>{$_('status')}</dt>
              <dd class="text-[13px]" class:text-positive={status.valid} class:text-warning={!status.valid}>
                {status.valid ? $_('machineIdValid') : $_('machineIdInvalid')}
              </dd>
            </div>
            <div>
              <dt>{$_('machineIdValue')}</dt>
              <dd class="font-mono text-xs">
                <span class="truncate select-all" title={status.value ?? undefined}>{status.value ?? '—'}</span>
              </dd>
            </div>
          </dl>

          {#if status.changedSinceLastCheck}
            <InlineNotice kind="warning" title={$_('machineIdChanged')}>{$_('machineIdAuthDataLost')}</InlineNotice>
          {/if}

          {#if status.recommendation}
            <p class="text-[13px] text-fg-2">{status.recommendation}</p>
          {/if}

          <div>
            <Button variant="secondary" size="sm" icon="rotate-cw" loading={regenerating} onclick={regenerate}>
              {$_('machineIdRegenerate')}
            </Button>
          </div>
        {:else if checking}
          <p class="flex items-center gap-2 text-[13px] text-fg-3"><BlockLoader />{$_('checking')}</p>
        {/if}

        <p class="text-xs text-fg-3">{$_('machineIdInfo')}</p>
      </div>
    </div>
  </div>
</div>
