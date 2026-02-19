<script lang="ts">
import { _ } from 'svelte-i18n';

interface Props {
  running: boolean;
}

const { running }: Props = $props();
</script>

<div class="mc-badge inline-flex items-center gap-2 px-3 py-2" class:mc-badge-success={running} class:mc-badge-error={!running}>
  <span 
    class="w-2.5 h-2.5 rounded-sm" 
    class:bg-grass-light={running}
    class:animate-pulse={running}
    class:bg-error={!running}
  ></span>
  <span class="font-mono text-sm uppercase tracking-wide">{running ? $_('online') : $_('offline')}</span>
</div>
