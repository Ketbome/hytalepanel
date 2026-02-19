<script lang="ts">
import { toasts } from '$lib/stores/ui';
</script>

<div class="toast-container" role="region" aria-live="polite" aria-label="Notifications">
  {#each $toasts as toast (toast.id)}
    <div class="toast {toast.type}" role="alert">
      {toast.message}
    </div>
  {/each}
</div>
