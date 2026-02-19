<script lang="ts">
import { toasts } from '$lib/stores/ui';
</script>

<div class="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none" role="region" aria-live="polite" aria-label="Notifications">
  {#each $toasts as toast, i (toast.id)}
    <div 
      class="mc-badge pointer-events-auto animate-slide-down min-w-[200px] max-w-[350px]"
      class:mc-badge-success={toast.type === 'success'}
      class:mc-badge-warning={toast.type === 'warning'}
      class:mc-badge-error={toast.type === 'error'}
      style="animation-delay: {i * 50}ms"
      role="alert"
    >
      <span class="text-base">{toast.message}</span>
    </div>
  {/each}
</div>
