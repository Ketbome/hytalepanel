<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import Switch from '$lib/components/ui/Switch.svelte';
import Tag from '$lib/components/ui/Tag.svelte';
import { emit } from '$lib/services/socketClient';
import { confirmDialog } from '$lib/stores/confirm';
import type { InstalledMod, ModUpdate } from '$lib/types';
import ModRow from './ModRow.svelte';
import { getModUrl, toggleMod, updateMod } from './modActions';

const { mod, updateInfo }: { mod: InstalledMod; updateInfo?: ModUpdate } = $props();

const modUrl = $derived(getModUrl(mod));

async function uninstall(): Promise<void> {
  if (
    await confirmDialog($_('confirmUninstallMsg'), {
      title: $_('confirmUninstall', { values: { name: mod.projectTitle } }),
      confirmLabel: $_('remove'),
      danger: true
    })
  ) {
    emit('mods:uninstall', mod.id);
  }
}
</script>

<ModRow title={mod.projectTitle} iconUrl={mod.projectIconUrl} url={modUrl}>
  {#snippet tags()}
    {#if mod.classification}<Tag>{mod.classification}</Tag>{/if}
    {#if mod.providerId === 'curseforge'}<Tag>CurseForge</Tag>{/if}
    {#if mod.isLocal}<Tag>{$_('modLocal')}</Tag>{/if}
  {/snippet}
  {#snippet meta()}
    <span class="font-mono">{mod.versionName ? `v${mod.versionName}` : '—'}</span>
    {#if updateInfo}
      <span class="font-mono text-accent">{updateInfo.currentVersion} → {updateInfo.latestVersion}</span>
    {/if}
    {#if !mod.enabled}<span>{$_('modDisabledLabel')}</span>{/if}
  {/snippet}
  {#snippet trailing()}
    {#if updateInfo}
      {#if updateInfo.manualOnly && modUrl}
        <Button variant="ghost" size="sm" href={modUrl} external trailingIcon="external-link" title={$_('modNoDistribution')}>
          {$_('manualDownload')}
        </Button>
      {:else}
        <Button variant="secondary" size="sm" onclick={() => updateMod(mod, updateInfo)}>{$_('update')}</Button>
      {/if}
    {/if}
    <Switch
      checked={mod.enabled}
      label={$_('modEnabledNamed', { values: { name: mod.projectTitle } })}
      title={mod.enabled ? $_('disable') : $_('enable')}
      onchange={() => toggleMod(mod)}
    />
    <Button
      variant="ghost"
      size="sm"
      iconOnly
      icon="trash-2"
      class="hover:!text-negative"
      aria-label={$_('removeNamed', { values: { name: mod.projectTitle } })}
      title={$_('remove')}
      onclick={uninstall}
    />
  {/snippet}
</ModRow>
