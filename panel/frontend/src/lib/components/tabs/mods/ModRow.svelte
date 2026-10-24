<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  title: string;
  iconUrl: string | null;
  url: string | null;
  description?: string;
  meta?: Snippet;
  tags?: Snippet;
  trailing?: Snippet;
}

const { title, iconUrl, url, description, meta, tags, trailing }: Props = $props();

let iconError = $state(false);
const initial = $derived(Array.from(title.trim())[0]?.toUpperCase() ?? '?');
</script>

<li class="hp-mod flex min-h-16 items-center gap-3 px-2 py-3">
  <span class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xs bg-raised">
    {#if iconUrl && !iconError}
      <img src={iconUrl} alt="" class="h-full w-full object-cover" loading="lazy" onerror={() => (iconError = true)} />
    {:else}
      <span class="font-display text-sm text-fg-2" aria-hidden="true">{initial}</span>
    {/if}
  </span>

  <div class="flex min-w-0 flex-1 flex-col gap-1">
    <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      {#if url}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          class="min-w-0 truncate text-sm font-semibold text-fg-1 hover:underline"
          title={title}
        >
          {title}
        </a>
      {:else}
        <span class="min-w-0 truncate text-sm font-semibold text-fg-1" {title}>{title}</span>
      {/if}
      {@render tags?.()}
    </div>
    {#if meta}
      <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-fg-3">{@render meta()}</div>
    {/if}
    {#if description}
      <p class="line-clamp-2 text-xs text-fg-2">{description}</p>
    {/if}
  </div>

  {#if trailing}
    <div class="flex shrink-0 items-center gap-2">{@render trailing()}</div>
  {/if}
</li>

<style>
  .hp-mod {
    transition: background-color var(--hp-dur-hover) ease;
  }

  .hp-mod:hover {
    background: var(--hp-bg-2);
  }
</style>
