<script lang="ts">
import { _ } from 'svelte-i18n';
import { activeTab, panelExpanded, sidebarHidden } from '$lib/stores/ui';
import type { TabId } from '$lib/types';
import BackupsTab from './tabs/BackupsTab.svelte';
import ConfigTab from './tabs/ConfigTab.svelte';
import ControlTab from './tabs/ControlTab.svelte';
import FilesTab from './tabs/FilesTab.svelte';
import ModsTab from './tabs/ModsTab.svelte';
import SetupTab from './tabs/SetupTab.svelte';
import Button from './ui/Button.svelte';

const tabs: TabId[] = ['control', 'setup', 'files', 'mods', 'backups', 'config'];

function setTab(tab: TabId): void {
  activeTab.set(tab);
}

function toggleExpand(): void {
  panelExpanded.update((v) => !v);
}

function hideSidebar(): void {
  sidebarHidden.set(true);
}
</script>

<aside class="h-full flex flex-col">
  <div class="mc-panel h-full flex flex-col">
    <!-- Tabs navigation -->
    <div class="flex flex-wrap border-b-2 border-panel-bg">
      {#each tabs as tab}
        <Button
          variant="tab"
          active={$activeTab === tab}
          onclick={() => setTab(tab)}
        >
          {$_(tab)}
        </Button>
      {/each}
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-hidden">
      <div class="h-full overflow-auto" class:hidden={$activeTab !== 'setup'}>
        <div class="p-5 animate-fade-in">
          <SetupTab />
        </div>
      </div>

      <div class="h-full overflow-auto" class:hidden={$activeTab !== 'files'}>
        <div class="p-5 animate-fade-in">
          <FilesTab />
        </div>
      </div>

      <div class="h-full overflow-auto" class:hidden={$activeTab !== 'mods'}>
        <div class="p-5 animate-fade-in">
          <ModsTab />
        </div>
      </div>

      <div class="h-full overflow-auto" class:hidden={$activeTab !== 'control'}>
        <div class="p-5 animate-fade-in">
          <ControlTab />
        </div>
      </div>

      <div class="h-full overflow-auto" class:hidden={$activeTab !== 'config'}>
        <div class="p-5 animate-fade-in">
          <ConfigTab />
        </div>
      </div>

      <div class="h-full overflow-auto" class:hidden={$activeTab !== 'backups'}>
        <div class="p-5 animate-fade-in">
          <BackupsTab />
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex justify-end gap-2 p-3 border-t-2 border-panel-border bg-panel-light">
      <button 
        class="mc-btn mc-btn-sm !px-3"
        title="Expand" 
        onclick={toggleExpand}
      >
        {$panelExpanded ? '✕' : '⤢'}
      </button>
      <button 
        class="mc-btn mc-btn-sm mc-btn-danger !px-3"
        title="Hide" 
        onclick={hideSidebar}
      >
        ✕
      </button>
    </div>
  </div>
</aside>
