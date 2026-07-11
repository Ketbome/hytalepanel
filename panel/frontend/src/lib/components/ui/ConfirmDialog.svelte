<script lang="ts">
import { _ } from 'svelte-i18n';
import { confirmState, resolveConfirm } from '$lib/stores/confirm';
import Modal from './Modal.svelte';
</script>

<Modal open={$confirmState.open} title={$confirmState.title ?? $_('confirmTitle')} onclose={() => resolveConfirm(false)}>
  <p class="text-sm text-text-muted whitespace-pre-line">{$confirmState.message}</p>
  <div class="mt-5 flex justify-end gap-3">
    <button type="button" class="mc-btn mc-btn-sm" onclick={() => resolveConfirm(false)}>
      {$confirmState.cancelLabel ?? $_('cancel')}
    </button>
    <button
      type="button"
      class="mc-btn mc-btn-sm {$confirmState.danger ? 'mc-btn-danger' : 'mc-btn-primary'}"
      onclick={() => resolveConfirm(true)}
    >
      {$confirmState.confirmLabel ?? $_('confirmOk')}
    </button>
  </div>
</Modal>
