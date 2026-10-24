<script lang="ts">
import { _ } from 'svelte-i18n';
import { activeTab, panelExpanded, sidebarHidden, toolsDrawerOpen } from '$lib/stores/ui';
import type { TabId } from '$lib/types';
import BackupsTab from './tabs/BackupsTab.svelte';
import ConfigTab from './tabs/ConfigTab.svelte';
import ControlTab from './tabs/ControlTab.svelte';
import FilesTab from './tabs/FilesTab.svelte';
import ModsTab from './tabs/ModsTab.svelte';
import SetupTab from './tabs/SetupTab.svelte';
import Button from './ui/Button.svelte';
import Segmented from './ui/Segmented.svelte';
import Tabs from './ui/Tabs.svelte';

type Layout = 'split' | 'console' | 'tools';

const { showLayout = false, drawer = false }: { showLayout?: boolean; drawer?: boolean } = $props();

const tabIds: TabId[] = ['control', 'setup', 'files', 'mods', 'backups', 'config'];
const tabs = $derived(tabIds.map((id) => ({ id, label: $_(id) })));
const layout = $derived<Layout>($panelExpanded ? 'tools' : $sidebarHidden ? 'console' : 'split');

function setLayout(next: Layout): void {
  sidebarHidden.set(next === 'console');
  panelExpanded.set(next === 'tools');
  toolsDrawerOpen.set(false);
}
</script>

<div class="flex h-full min-h-0 flex-col">
  <div class="flex h-11 shrink-0 items-center gap-2 border-b border-line pr-2">
    <Tabs
      {tabs}
      selected={$activeTab}
      idPrefix="tool"
      label={$_('serverTools')}
      class="min-w-0 flex-1 self-end px-1"
      onselect={(id) => activeTab.set(id)}
    />
    {#if showLayout}
      <Segmented
        size="sm"
        label={$_('layout')}
        value={layout}
        onchange={setLayout}
        options={[
          { value: 'split', label: $_('layoutSplit'), icon: 'panel-left', iconOnly: true },
          { value: 'console', label: $_('layoutConsole'), icon: 'terminal', iconOnly: true },
          { value: 'tools', label: $_('layoutTools'), icon: 'wrench', iconOnly: true }
        ]}
      />
    {/if}
    {#if drawer}
      <Button variant="ghost" size="sm" iconOnly icon="x" aria-label={$_('close')} onclick={() => toolsDrawerOpen.set(false)} />
    {/if}
  </div>

  {#each tabIds as id (id)}
    <div
      id="tool-panel-{id}"
      role="tabpanel"
      aria-labelledby="tool-tab-{id}"
      class="min-h-0 flex-1 max-sm:overflow-y-auto ws:overflow-y-auto"
      hidden={$activeTab !== id}
      tabindex="-1"
    >
      {#if id === 'config'}
        <ConfigTab />
      {:else}
        <div class="p-4">
          {#if id === 'control'}<ControlTab />
          {:else if id === 'setup'}<SetupTab />
          {:else if id === 'files'}<FilesTab />
          {:else if id === 'mods'}<ModsTab />
          {:else if id === 'backups'}<BackupsTab />{/if}
        </div>
      {/if}
    </div>
  {/each}
</div>
