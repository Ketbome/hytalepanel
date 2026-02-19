<script lang="ts">
interface ButtonProps {
  variant?: 'default' | 'primary' | 'danger' | 'warning' | 'wood' | 'tab';
  size?: 'default' | 'small';
  disabled?: boolean;
  active?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
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

const classes = $derived(() => {
  if (variant === 'tab') {
    return `mc-tab ${active ? 'active' : ''}`.trim();
  }
  const sizeClass = size === 'small' ? 'mc-btn-sm' : '';
  return `mc-btn ${variantMap[variant]} ${sizeClass}`.trim();
});
</script>

<button
  {type}
  {title}
  {disabled}
  class={classes()}
  onclick={onclick}
>
  {@render children?.()}
</button>
