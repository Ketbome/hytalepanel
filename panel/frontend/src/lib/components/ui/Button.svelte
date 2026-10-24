<script lang="ts">
import type { Snippet } from 'svelte';
import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
import BlockLoader from './BlockLoader.svelte';
import Icon, { type IconName } from './Icon.svelte';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-fill';

interface ButtonProps {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  trailingIcon?: IconName;
  /** Square, icon-only button. Needs an aria-label. */
  iconOnly?: boolean;
  /** Play the icon motion on hover/press (deliberate feedback, never in lists) */
  animateIcon?: boolean;
  /** Play the icon motion each time this turns true */
  playIcon?: boolean;
  loading?: boolean;
  disabled?: boolean;
  href?: string;
  external?: boolean;
  type?: 'button' | 'submit' | 'reset';
  form?: string;
  title?: string;
  'aria-label'?: string;
  class?: string;
  onclick?: (e: MouseEvent) => void;
  onkeydown?: (e: KeyboardEvent) => void;
  children?: Snippet;
  [key: `aria-${string}` | `data-${string}`]: unknown;
  id?: string;
}

const {
  variant = 'secondary',
  size = 'md',
  icon,
  trailingIcon,
  iconOnly = false,
  animateIcon = false,
  playIcon,
  loading,
  disabled = false,
  href,
  external = false,
  type = 'button',
  title,
  class: className = '',
  onclick,
  children,
  ...rest
}: ButtonProps = $props();

let el = $state<HTMLElement | null>(null);

// Lock the width from the first render so a loading label never reflows its neighbours
$effect(() => {
  if (el && loading !== undefined && !el.style.minWidth) {
    el.style.minWidth = `${el.offsetWidth}px`;
  }
});

const sizes = {
  sm: 'h-7 px-2.5 text-[13px] font-medium',
  md: 'h-8 px-3 text-sm font-medium',
  lg: 'h-10 px-4 text-sm font-semibold'
};
const squares = { sm: 'h-7 w-7', md: 'h-8 w-8', lg: 'h-10 w-10' };
const iconSize = $derived(size === 'sm' ? 14 : 16);
const classes = $derived(
  [
    'hp-btn hp-motion-scale relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-sm whitespace-nowrap select-none',
    `hp-btn-${variant}`,
    iconOnly ? squares[size] : sizes[size],
    size === 'sm' ? 'hp-btn-sm' : '',
    className
  ].join(' ')
);
</script>

{#snippet content()}
  {#if loading}
    <BlockLoader />
  {:else if icon}
    <Icon name={icon} size={iconSize} hover={animateIcon} play={playIcon} />
  {/if}
  {#if !iconOnly}{@render children?.()}{/if}
  {#if trailingIcon && !iconOnly}
    <Icon name={trailingIcon} size={iconSize - 2} class="opacity-70" />
  {/if}
{/snippet}

{#if href && !disabled}
  <a
    bind:this={el}
    {href}
    {title}
    class={classes}
    target={external ? '_blank' : undefined}
    rel={external ? 'noopener noreferrer' : undefined}
    {onclick}
    {...rest as HTMLAnchorAttributes}
  >
    {@render content()}
  </a>
{:else}
  <button
    bind:this={el}
    {type}
    {title}
    disabled={disabled || loading}
    aria-busy={loading ? 'true' : undefined}
    class={classes}
    {onclick}
    {...rest as HTMLButtonAttributes}
  >
    {@render content()}
  </button>
{/if}

<style>
  .hp-btn {
    border: 1px solid transparent;
    cursor: pointer;
    transition:
      transform var(--hp-dur-press) var(--hp-ease-out),
      background-color var(--hp-dur-hover) ease,
      color var(--hp-dur-hover) ease,
      border-color var(--hp-dur-hover) ease;
  }

  .hp-btn:active:not(:disabled) {
    transform: scale(0.97);
  }

  .hp-btn:disabled {
    cursor: not-allowed;
  }

  /* 44px hit area on touch for small buttons */
  @media (pointer: coarse) {
    .hp-btn-sm::before {
      content: "";
      position: absolute;
      inset: -8px 0;
    }
  }

  .hp-btn-primary {
    background: var(--hp-accent);
    color: var(--hp-accent-ink);
  }
  .hp-btn-primary:hover:not(:disabled) {
    background: var(--hp-accent-hover);
  }
  .hp-btn-primary:active:not(:disabled) {
    background: var(--hp-accent-press);
  }
  .hp-btn-primary:disabled {
    background: var(--hp-bg-2);
    color: var(--hp-fg-3);
  }

  .hp-btn-secondary {
    background: var(--hp-bg-2);
    border-color: var(--hp-line-2);
    color: var(--hp-fg-1);
  }
  .hp-btn-secondary:hover:not(:disabled) {
    background: var(--hp-bg-3);
    border-color: var(--hp-line-control);
  }
  .hp-btn-secondary:disabled {
    color: var(--hp-fg-3);
    border-color: var(--hp-line-1);
  }

  .hp-btn-ghost {
    background: transparent;
    color: var(--hp-fg-2);
  }
  .hp-btn-ghost:hover:not(:disabled) {
    background: var(--hp-bg-2);
    color: var(--hp-fg-1);
  }
  .hp-btn-ghost:disabled {
    color: var(--hp-fg-3);
  }

  .hp-btn-danger {
    background: var(--hp-bg-2);
    border-color: var(--hp-line-2);
    color: var(--hp-negative);
  }
  .hp-btn-danger:hover:not(:disabled) {
    background: var(--hp-negative-bg);
    border-color: var(--hp-negative);
  }
  .hp-btn-danger:disabled {
    color: var(--hp-fg-3);
    border-color: var(--hp-line-1);
  }

  /* Only as the confirm button of a destructive ConfirmDialog */
  .hp-btn-danger-fill {
    background: var(--hp-negative-fill);
    color: var(--hp-fg-on-fill);
  }
  .hp-btn-danger-fill:hover:not(:disabled) {
    background: color-mix(in srgb, var(--hp-negative-fill) 88%, var(--hp-fg-on-fill));
  }
</style>
