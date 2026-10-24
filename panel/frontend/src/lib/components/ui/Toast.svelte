<script lang="ts">
import { fly } from 'svelte/transition';
import { _ } from 'svelte-i18n';
import { toasts } from '$lib/stores/ui';
import type { ToastType } from '$lib/types';
import Icon, { type IconName } from './Icon.svelte';

const kinds: Record<ToastType, { icon: IconName; color: string }> = {
  '': { icon: 'circle-check', color: 'text-positive' },
  success: { icon: 'circle-check', color: 'text-positive' },
  info: { icon: 'info', color: 'text-info' },
  warning: { icon: 'triangle-alert', color: 'text-warning' },
  error: { icon: 'circle-alert', color: 'text-negative' }
};

const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const visible = $derived($toasts.slice(-3));
</script>

<div
  class="hp-toasts pointer-events-none fixed z-60 flex flex-col gap-2"
  role="region"
  aria-live="polite"
  aria-label={$_('notifications')}
>
  {#each visible as toast (toast.id)}
    <div
      class="hp-toast hp-motion-scale pointer-events-auto flex items-start gap-2.5 bg-overlay border border-line-2 rounded-md shadow-menu text-sm text-fg-1"
      role={toast.type === 'error' ? 'alert' : 'status'}
      out:fly={{ y: reduceMotion ? 0 : 8, duration: 180 }}
    >
      <span class="pt-0.5 {kinds[toast.type ?? ''].color}"><Icon name={kinds[toast.type ?? ''].icon} /></span>
      <span class="min-w-0 flex-1 [overflow-wrap:anywhere]">{toast.message}</span>
    </div>
  {/each}
</div>

<style>
  .hp-toasts {
    right: 16px;
    bottom: 16px;
    width: 360px;
    max-width: calc(100vw - 32px);
  }

  /* Phone: bottom-centre, above the Console | Tools switch */
  @media (max-width: 639px) {
    .hp-toasts {
      right: 16px;
      left: 16px;
      bottom: calc(16px + var(--hp-bottom-bar, 0px));
      width: auto;
      max-width: none;
    }
  }

  .hp-toast {
    padding: 12px 14px;
    transition:
      opacity var(--hp-dur-toast) ease,
      transform var(--hp-dur-toast) ease;
  }

  @starting-style {
    .hp-toast {
      opacity: 0;
      transform: translateY(8px);
    }
  }
</style>
