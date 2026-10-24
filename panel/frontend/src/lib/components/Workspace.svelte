<script lang="ts">
import { tick } from 'svelte';
import { _ } from 'svelte-i18n';
import { activeTab, panelExpanded, sidebarHidden, toolsDrawerOpen } from '$lib/stores/ui';
import Console from './Console.svelte';
import ServerHeader from './ServerHeader.svelte';
import Sidebar from './Sidebar.svelte';
import Segmented from './ui/Segmented.svelte';

const wideQuery = matchMedia('(min-width: 1100px)');
const phoneQuery = matchMedia('(max-width: 639px)');
let wide = $state(wideQuery.matches);
let phone = $state(phoneQuery.matches);
let phoneView = $state<'console' | 'tools'>('console');

$effect(() => {
  const onWide = () => (wide = wideQuery.matches);
  const onPhone = () => (phone = phoneQuery.matches);
  wideQuery.addEventListener('change', onWide);
  phoneQuery.addEventListener('change', onPhone);
  return () => {
    wideQuery.removeEventListener('change', onWide);
    phoneQuery.removeEventListener('change', onPhone);
  };
});

// Layout modes only exist where there is room for two columns
const consoleOnly = $derived(wide && $sidebarHidden && !$panelExpanded);
const toolsOnly = $derived(wide && $panelExpanded);
const drawerOpen = $derived(consoleOnly && $toolsDrawerOpen);

let wasOpen = false;
$effect(() => {
  const open = drawerOpen;
  if (open === wasOpen) return;
  wasOpen = open;
  tick().then(() => {
    const target = open
      ? document.getElementById(`tool-tab-${$activeTab}`)
      : document.getElementById('tools-drawer-trigger');
    target?.focus();
  });
});

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && drawerOpen) toolsDrawerOpen.set(false);
}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex min-h-0 flex-1 flex-col" style={phone ? '--hp-bottom-bar: 44px' : undefined}>
  <ServerHeader />

  <div
    class="grid min-h-0 flex-1 gap-3 px-3 pb-3 sm:max-ws:flex-none sm:max-ws:auto-rows-auto"
    style:grid-template-columns={wide && !consoleOnly && !toolsOnly ? 'minmax(480px, 1fr) clamp(420px, 36vw, 560px)' : 'minmax(0, 1fr)'}
    style:grid-template-rows={wide || phone ? 'minmax(0, 1fr)' : undefined}
  >
    <section
      class="flex min-h-0 flex-col overflow-hidden rounded-md border border-line bg-surface sm:max-ws:h-[45vh] sm:max-ws:min-h-[280px]"
      aria-label={$_('console')}
      hidden={toolsOnly || (phone && phoneView !== 'console')}
    >
      <Console toolsButton={consoleOnly} />
    </section>

    <aside
      class="hp-pane flex min-h-0 flex-col border border-line bg-surface"
      class:hp-drawer={consoleOnly}
      class:open={drawerOpen}
      class:rounded-md={!consoleOnly}
      aria-label={$_('serverTools')}
      hidden={phone && phoneView !== 'tools'}
      inert={consoleOnly && !drawerOpen}
    >
      <Sidebar showLayout={wide} drawer={consoleOnly} />
    </aside>
  </div>

  {#if phone}
    <div class="sticky bottom-0 z-10 flex h-11 shrink-0 items-center border-t border-line bg-ground px-3">
      <Segmented
        class="w-full [&>button]:flex-1"
        label={$_('workspaceView')}
        value={phoneView}
        onchange={(v) => (phoneView = v)}
        options={[
          { value: 'console', label: $_('console') },
          { value: 'tools', label: $_('tools') }
        ]}
      />
    </div>
  {/if}
</div>

<style>
  /* Console-only mode: the same pane (still mounted, so tab state and listeners persist) becomes a right drawer */
  .hp-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 40;
    width: min(480px, 100vw);
    border-width: 0 0 0 1px;
    box-shadow: var(--hp-shadow-overlay);
    visibility: hidden;
    opacity: 0;
    transform: translateX(100%);
    transition:
      transform 180ms var(--hp-ease-out),
      opacity 180ms ease,
      visibility 0s linear 180ms;
  }

  .hp-drawer.open {
    visibility: visible;
    opacity: 1;
    transform: none;
    transition:
      transform 260ms cubic-bezier(0.32, 0.72, 0, 1),
      opacity 120ms ease,
      visibility 0s;
  }

  @media (prefers-reduced-motion: reduce) {
    .hp-drawer,
    .hp-drawer.open {
      transform: none;
    }
  }
</style>
