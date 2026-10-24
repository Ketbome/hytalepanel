<script lang="ts">
import { _ } from 'svelte-i18n';
import { emit } from '$lib/services/socketClient';
import { currentPath, isFilesLoading } from '$lib/stores/files';

interface BreadcrumbPart {
  path: string;
  label: string;
}

function getBreadcrumbParts(path: string): BreadcrumbPart[] {
  const parts = path.split('/').filter((p) => p);
  let accumulated = '';
  const result: BreadcrumbPart[] = [{ path: '/', label: 'server' }];
  for (const part of parts) {
    accumulated += `/${part}`;
    result.push({ path: accumulated, label: part });
  }
  return result;
}

const breadcrumbParts = $derived(getBreadcrumbParts($currentPath));

function navigateTo(path: string): void {
  isFilesLoading.set(true);
  emit('files:list', path);
}
</script>

<nav class="flex min-w-0 items-center overflow-x-auto font-mono text-[13px] whitespace-nowrap" aria-label={$_('path')}>
  {#each breadcrumbParts as part, i}
    {#if i > 0}
      <span class="px-0.5 text-fg-3" aria-hidden="true">/</span>
    {/if}
    {#if i === breadcrumbParts.length - 1}
      <span class="px-1 text-fg-1" aria-current="location">{part.label}</span>
    {:else}
      <button
        type="button"
        class="h-7 rounded-xs px-1 text-fg-2 transition-colors hover:bg-raised hover:text-fg-1"
        onclick={() => navigateTo(part.path)}
      >
        {part.label}
      </button>
    {/if}
  {/each}
</nav>
