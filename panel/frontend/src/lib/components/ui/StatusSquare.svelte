<script lang="ts">
import type { UiStatus } from '$lib/utils/status';

const { status }: { status: UiStatus } = $props();
</script>

<span
  class="relative inline-block w-2 h-2 shrink-0"
  class:bg-positive={status === 'online'}
  class:bg-warning={status === 'starting' || status === 'stopping'}
  class:hp-status-blink={status === 'starting' || status === 'stopping'}
  class:offline={status === 'offline'}
  class:unknown={status === 'unknown'}
  aria-hidden="true"
></span>

<style>
  .offline {
    box-shadow: inset 0 0 0 1.5px var(--hp-fg-3);
  }

  /* fg-3 square split by a 1px diagonal gap */
  .unknown::before,
  .unknown::after {
    content: "";
    position: absolute;
    inset: 0;
    background: var(--hp-fg-3);
  }
  .unknown::before {
    clip-path: polygon(0 0, calc(100% - 1.5px) 0, 0 calc(100% - 1.5px));
  }
  .unknown::after {
    clip-path: polygon(100% 1.5px, 100% 100%, 1.5px 100%);
  }
</style>
