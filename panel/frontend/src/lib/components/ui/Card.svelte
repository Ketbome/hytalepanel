<script lang="ts">
interface CardProps {
  children?: import('svelte').Snippet;
  header?: import('svelte').Snippet;
  headerText?: string;
  noPadding?: boolean;
}

let { children, header, headerText, noPadding = false }: CardProps = $props();
</script>

<div class="bg-gradient-to-b from-mc-panel-light to-mc-panel border-[4px] border-t-mc-border-light border-l-mc-border-light border-r-mc-dark border-b-mc-dark rounded-sm overflow-hidden">
  {#if header || headerText}
    <div class="bg-mc-panel border-b-2 border-mc-border-light px-5 py-3 font-[var(--font-mono)] text-lg text-hytale-yellow flex justify-between items-center">
      {#if header}
        {@render header()}
      {:else if headerText}
        <span>{headerText}</span>
      {/if}
    </div>
  {/if}
  <div class={noPadding ? '' : 'p-5'}>
    {@render children?.()}
  </div>
</div>
