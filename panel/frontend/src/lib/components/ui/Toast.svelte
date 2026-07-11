<script lang="ts">
import { toasts } from '$lib/stores/ui';

const typeClasses: Record<string, string> = {
  success: 'border-success/50 text-grass-light',
  warning: 'border-warning/50 text-hytale-gold',
  error: 'border-error/50 text-[#f4a3a3]',
  '': 'border-panel-border-light text-text'
};
</script>

<div class="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none" role="region" aria-live="polite" aria-label="Notifications">
  {#each $toasts as toast, i (toast.id)}
    <div
      class="pointer-events-auto animate-slide-down w-[320px] max-w-[calc(100vw-2rem)]
             px-4 py-3 rounded-lg border bg-[#221d16] shadow-pixel-sm
             text-sm leading-snug break-words {typeClasses[toast.type ?? '']}"
      style="animation-delay: {i * 50}ms"
      role="alert"
    >
      {toast.message}
    </div>
  {/each}
</div>
