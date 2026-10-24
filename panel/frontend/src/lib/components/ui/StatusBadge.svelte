<script lang="ts">
import { _ } from 'svelte-i18n';
import type { UiStatus } from '$lib/utils/status';
import StatusSquare from './StatusSquare.svelte';

const { status, live = false }: { status: UiStatus; live?: boolean } = $props();

const labelKey: Record<UiStatus, string> = {
  online: 'online',
  offline: 'offline',
  starting: 'statusStarting',
  stopping: 'statusStopping',
  unknown: 'unknown'
};
</script>

<span class="inline-flex items-center gap-2 whitespace-nowrap" aria-live={live ? 'polite' : undefined}>
  <StatusSquare {status} />
  <span
    class="text-[13px] leading-[18px] font-medium"
    class:text-positive={status === 'online'}
    class:text-fg-2={status === 'offline'}
    class:text-warning={status === 'starting' || status === 'stopping'}
    class:text-fg-3={status === 'unknown'}
  >
    {$_(labelKey[status])}
  </span>
</span>
