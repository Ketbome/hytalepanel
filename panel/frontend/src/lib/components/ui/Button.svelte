<script lang="ts">
interface ButtonProps {
  variant?: 'default' | 'primary' | 'danger' | 'warning' | 'tab';
  size?: 'default' | 'small';
  disabled?: boolean;
  active?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  onclick?: (e: MouseEvent) => void;
  children?: import('svelte').Snippet;
}

let {
  variant = 'default',
  size = 'default',
  disabled = false,
  active = false,
  type = 'button',
  title,
  onclick,
  children
}: ButtonProps = $props();

const baseClasses =
  'font-[var(--font-mono)] cursor-pointer border-[3px] shadow-[2px_2px_0_theme(colors.mc-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-hytale-orange focus:ring-offset-2 focus:ring-offset-mc-dark';

const sizeClasses = {
  default: 'text-base px-4 py-2.5',
  small: 'text-sm px-3 py-2'
};

const variantClasses = {
  default:
    'bg-gradient-to-b from-[#7a7a7a] via-[#5a5a5a] via-50% to-[#3a3a3a] border-t-[#555] border-l-[#555] border-r-[#2a2a2a] border-b-[#2a2a2a] text-white hover:from-[#8a8a8a] hover:via-[#6a6a6a] hover:to-[#4a4a4a] hover:text-hytale-yellow',
  primary:
    'bg-gradient-to-b from-mc-green-light via-mc-green via-50% to-[oklch(46%_0.095_130)] border-t-[#6a9a3a] border-l-[#6a9a3a] border-r-[#2a4a1a] border-b-[#2a4a1a] text-white hover:text-hytale-yellow',
  danger:
    'bg-gradient-to-b from-[#c54a4a] via-[#a53a3a] via-50% to-[#6a1a1a] border-t-[#d55] border-l-[#d55] border-r-[#4a1a1a] border-b-[#4a1a1a] text-white hover:text-hytale-yellow',
  warning:
    'bg-gradient-to-b from-[#c5844a] via-[#a5643a] via-50% to-[#6a3a1a] border-t-[#d94] border-l-[#d94] border-r-[#4a2a1a] border-b-[#4a2a1a] text-white hover:text-hytale-yellow',
  tab: 'bg-gradient-to-b from-mc-panel-light to-mc-panel border-mc-border-light text-text-dim hover:text-hytale-yellow'
};

const classes = $derived(() => {
  const activeClasses = active ? 'from-mc-panel-light to-mc-panel text-hytale-yellow' : '';
  return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${activeClasses}`.trim();
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
