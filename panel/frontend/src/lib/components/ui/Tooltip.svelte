<script lang="ts">
interface TooltipProps {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children?: import('svelte').Snippet;
}

let { text, position = 'top', children }: TooltipProps = $props();

let showTooltip = $state(false);

const positionClasses = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2'
};
</script>

<div
  class="relative inline-block"
  onmouseenter={() => showTooltip = true}
  onmouseleave={() => showTooltip = false}
  onfocus={() => showTooltip = true}
  onblur={() => showTooltip = false}
  role="tooltip"
  aria-label={text}
>
  {@render children?.()}
  
  {#if showTooltip && text}
    <div class="absolute {positionClasses[position]} z-50 px-3 py-1.5 bg-mc-darker border-2 border-mc-border-light text-xs text-white whitespace-nowrap pointer-events-none animate-[fade-in_0.1s_ease-out] font-[var(--font-mono)]">
      {text}
    </div>
  {/if}
</div>
