<script lang="ts">
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

<nav class="flex items-center gap-1 px-3 py-2 rounded-lg bg-panel-light border border-panel-border overflow-x-auto" aria-label="Path">
  {#each breadcrumbParts as part, i}
    {#if i > 0}
      <span class="text-text-dim">/</span>
    {/if}
    <button
      type="button"
      class="px-2 py-1 text-sm rounded-md transition-colors
             {i === breadcrumbParts.length - 1
        ? 'text-hytale-gold bg-panel-lighter'
        : 'text-text-muted hover:text-text hover:bg-panel-lighter'}"
      aria-current={i === breadcrumbParts.length - 1 ? 'location' : undefined}
      onclick={() => navigateTo(part.path)}
    >
      {part.label}
    </button>
  {/each}
</nav>
