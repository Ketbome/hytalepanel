<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { activeTab, sidebarHidden, panelExpanded } from '$lib/stores/ui';
  import type { TabId } from '$lib/types';
  import SetupTab from './tabs/SetupTab.svelte';
  import FilesTab from './tabs/FilesTab.svelte';
  import ModsTab from './tabs/ModsTab.svelte';
  import CommandsTab from './tabs/CommandsTab.svelte';
  import ControlTab from './tabs/ControlTab.svelte';
  import ConfigTab from './tabs/ConfigTab.svelte';
  import BackupsTab from './tabs/BackupsTab.svelte';

  const tabs: TabId[] = ['control', 'setup', 'files', 'mods', 'backups', 'commands', 'config'];

  function setTab(tab: TabId): void {
    activeTab.set(tab);
  }

  function toggleExpand(): void {
    panelExpanded.update(v => !v);
  }

  function hideSidebar(): void {
    sidebarHidden.set(true);
  }
</script>

<div class="sidebar">
  <div class="card">
    <div class="tabs-header">
      {#each tabs as tab}
        <button
          class="tab-btn"
          class:active={$activeTab === tab}
          onclick={() => setTab(tab)}
        >
          {$_(tab)}
        </button>
      {/each}
    </div>

    <div id="tab-setup" class="tab-content" class:active={$activeTab === 'setup'}>
      <SetupTab />
    </div>

    <div id="tab-files" class="tab-content" class:active={$activeTab === 'files'}>
      <FilesTab />
    </div>

    <div id="tab-mods" class="tab-content" class:active={$activeTab === 'mods'}>
      <ModsTab />
    </div>

    <div id="tab-commands" class="tab-content" class:active={$activeTab === 'commands'}>
      <CommandsTab />
    </div>

    <div id="tab-control" class="tab-content" class:active={$activeTab === 'control'}>
      <ControlTab />
    </div>

    <div id="tab-config" class="tab-content" class:active={$activeTab === 'config'}>
      <ConfigTab />
    </div>

    <div id="tab-backups" class="tab-content" class:active={$activeTab === 'backups'}>
      <BackupsTab />
    </div>

    <div class="sidebar-toolbar">
      <button id="btn-expand-panel" class="sidebar-btn" title="Expand" onclick={toggleExpand}>
        {$panelExpanded ? '✕' : '⤢'}
      </button>
      <button id="btn-hide-sidebar" class="sidebar-btn" title="Hide" onclick={hideSidebar}>✕</button>
    </div>
  </div>
</div>
