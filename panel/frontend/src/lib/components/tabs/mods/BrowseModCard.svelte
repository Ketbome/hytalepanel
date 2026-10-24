<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import Icon from '$lib/components/ui/Icon.svelte';
import Tag from '$lib/components/ui/Tag.svelte';
import { currentProvider, installedMods } from '$lib/stores/mods';
import type { ModProject } from '$lib/types';
import { formatNumber } from '$lib/utils/formatters';
import ModRow from './ModRow.svelte';
import { getModUrl, installMod } from './modActions';

const { mod }: { mod: ModProject } = $props();

const alreadyInstalled = $derived($installedMods.some((m) => m.projectId === mod.id));
const latestVersion = $derived(mod.latestVersion || mod.versions?.[0]);
const modUrl = $derived(getModUrl(mod));
const noDistribution = $derived('allowDistribution' in mod && mod.allowDistribution === false);
</script>

<ModRow title={mod.title} iconUrl={mod.iconUrl} url={modUrl} description={mod.shortDescription}>
  {#snippet tags()}
    {#if mod.classification}<Tag>{mod.classification}</Tag>{/if}
    {#if $currentProvider === 'curseforge'}<Tag>CurseForge</Tag>{/if}
    {#if noDistribution}<Tag kind="warning" title={$_('modNoDistribution')}>{$_('manualOnly')}</Tag>{/if}
  {/snippet}
  {#snippet meta()}
    {#if latestVersion?.version}<span class="font-mono">v{latestVersion.version}</span>{/if}
    {#if mod.author}<span class="min-w-0 truncate">{mod.author}</span>{/if}
    {#if mod.downloads}
      <span class="flex items-center gap-1 font-mono" title={String(mod.downloads)}>
        <Icon name="download" size={12} />{formatNumber(mod.downloads)}
      </span>
    {/if}
  {/snippet}
  {#snippet trailing()}
    {#if noDistribution && modUrl}
      <Button variant="ghost" size="sm" href={modUrl} external trailingIcon="external-link" title={$_('modNoDistribution')}>
        {$_('manualDownload')}
      </Button>
    {:else if alreadyInstalled}
      <Button variant="ghost" size="sm" icon="check" disabled>{$_('installed')}</Button>
    {:else}
      <Button variant="secondary" size="sm" icon="download" onclick={() => installMod(mod)} disabled={noDistribution}>
        {$_('install')}
      </Button>
    {/if}
  {/snippet}
</ModRow>
