<script lang="ts">
interface ButtonProps {
  variant?: 'default' | 'primary' | 'danger' | 'warning' | 'wood' | 'tab';
  size?: 'default' | 'small';
  disabled?: boolean;
  active?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  'aria-label'?: string;
  class?: string;
  onclick?: (e: MouseEvent) => void;
  children?: import('svelte').Snippet;
}

const {
  variant = 'default',
  size = 'default',
  disabled = false,
  active = false,
  type = 'button',
  title,
  'aria-label': ariaLabel,
  class: className = '',
  onclick,
  children
}: ButtonProps = $props();

const variantMap: Record<string, string> = {
  default: '',
  primary: 'mc-btn-primary',
  danger: 'mc-btn-danger',
  warning: 'mc-btn-warning',
  wood: 'mc-btn-wood',
  tab: ''
};

const classes = $derived(
  variant === 'tab'
    ? `mc-tab ${active ? 'active' : ''} ${className}`.trim()
    : `mc-btn ${variantMap[variant]} ${size === 'small' ? 'mc-btn-sm' : ''} ${className}`.trim()
);
</script>

<button
  {type}
  {title}
  {disabled}
  aria-label={ariaLabel}
  class={classes}
  onclick={onclick}
>
  {@render children?.()}
</button>
