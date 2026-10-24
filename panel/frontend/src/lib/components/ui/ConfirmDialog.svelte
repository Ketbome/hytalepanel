<script lang="ts">
import { _ } from 'svelte-i18n';
import { confirmState, resolveConfirm } from '$lib/stores/confirm';
import Button from './Button.svelte';
import Modal from './Modal.svelte';
</script>

<Modal
  open={$confirmState.open}
  title={$confirmState.title ?? $_('confirmTitle')}
  size="sm"
  initialFocus={$confirmState.danger ? '[data-confirm-cancel]' : '[data-confirm-ok]'}
  onclose={() => resolveConfirm(false)}
>
  <p class="text-sm text-fg-2 whitespace-pre-line">{$confirmState.message}</p>
  {#snippet footer()}
    <Button variant="secondary" data-confirm-cancel onclick={() => resolveConfirm(false)}>
      {$confirmState.cancelLabel ?? $_('cancel')}
    </Button>
    <Button
      variant={$confirmState.danger ? 'danger-fill' : 'primary'}
      data-confirm-ok
      onclick={() => resolveConfirm(true)}
    >
      {$confirmState.confirmLabel ?? $_('confirmOk')}
    </Button>
  {/snippet}
</Modal>
