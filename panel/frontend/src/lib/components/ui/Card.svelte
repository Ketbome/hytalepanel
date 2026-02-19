<script lang="ts">
interface CardProps {
  children?: import('svelte').Snippet;
  header?: import('svelte').Snippet;
  headerText?: string;
  noPadding?: boolean;
}

const { children, header, headerText, noPadding = false }: CardProps = $props();
</script>

<div class="mc-panel">
  {#if header || headerText}
    <div class="mc-panel-header">
      {#if header}
        {@render header()}
      {:else if headerText}
        <span>{headerText}</span>
      {/if}
    </div>
  {/if}
  <div class={noPadding ? '' : 'mc-panel-body'}>
    {@render children?.()}
  </div>
</div>
