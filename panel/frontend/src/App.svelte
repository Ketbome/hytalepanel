<script lang="ts">
import Console from '$lib/components/Console.svelte';
import Dashboard from '$lib/components/Dashboard.svelte';
import Header from '$lib/components/Header.svelte';
import LoginScreen from '$lib/components/LoginScreen.svelte';
import Sidebar from '$lib/components/Sidebar.svelte';
import Toast from '$lib/components/ui/Toast.svelte';
import { connectSocket, disconnectSocket } from '$lib/services/socketClient';
import { checkStatus, isAuthenticated, isLoading } from '$lib/stores/auth';
import { loadPanelConfig, panelConfig } from '$lib/stores/config';
import { initRouter, isOnDashboard, currentRoute } from '$lib/stores/router';
import { panelExpanded, sidebarHidden } from '$lib/stores/ui';

// Initialize on mount
$effect(() => {
  (async () => {
    // Load panel config first (for BASE_PATH)
    await loadPanelConfig();
    // Initialize router after config is loaded
    initRouter();
    const authenticated = await checkStatus();
    isLoading.set(false);
    if (authenticated) {
      connectSocket();
    }
  })();

  return () => {
    disconnectSocket();
  };
});

// Connect after login (when user logs in after page load)
let prevAuth = false;
$effect(() => {
  const authenticated = $isAuthenticated;
  if (authenticated && !prevAuth) {
    connectSocket();
  }
  prevAuth = authenticated;
});

function showSidebar(): void {
  sidebarHidden.set(false);
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    if ($panelExpanded) {
      panelExpanded.set(false);
    }
    if ($sidebarHidden) {
      sidebarHidden.set(false);
    }
  }
}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if !$panelConfig.loaded}
  <div class="fixed inset-0 flex items-center justify-center bg-panel-bg">
    <div class="flex flex-col items-center gap-4 animate-fade-in">
      <div class="mc-spinner"></div>
      <span class="font-mono text-text-muted">Loading config...</span>
    </div>
  </div>
{:else if $isLoading}
  <div class="fixed inset-0 flex items-center justify-center bg-panel-bg">
    <div class="flex flex-col items-center gap-4 animate-fade-in">
      <div class="mc-spinner"></div>
      <span class="font-mono text-text-muted">Loading...</span>
    </div>
  </div>
{:else if !$isAuthenticated}
  <LoginScreen />
{:else if $isOnDashboard}
  <Dashboard />
{:else if $currentRoute.serverId}
  <div 
    class="max-w-[1600px] mx-auto p-5 h-screen flex flex-col animate-fade-in"
    class:sidebar-collapsed={$sidebarHidden}
  >
    <Header />
    <div 
      class="flex-1 grid gap-5 min-h-0"
      class:grid-cols-1={$panelExpanded}
      class:lg:grid-cols-[1fr_550px]={!$panelExpanded && !$sidebarHidden}
    >
      <main class="min-h-0 flex flex-col relative" class:hidden={$panelExpanded}>
        <Console />
        {#if $sidebarHidden}
          <button 
            class="absolute top-4 right-4 mc-btn mc-btn-sm mc-btn-wood"
            title="Show Panel" 
            onclick={showSidebar}
          >
            ☰
          </button>
        {/if}
      </main>
      {#if !$sidebarHidden || $panelExpanded}
        <div 
          class="min-h-0"
          class:fixed={$sidebarHidden && !$panelExpanded}
          class:inset-y-0={$sidebarHidden && !$panelExpanded}
          class:right-0={$sidebarHidden && !$panelExpanded}
          class:w-full={$sidebarHidden && !$panelExpanded}
          class:max-w-md={$sidebarHidden && !$panelExpanded}
          class:z-40={$sidebarHidden && !$panelExpanded}
          class:p-5={$sidebarHidden && !$panelExpanded}
          class:bg-opacity-95={$sidebarHidden && !$panelExpanded}
          class:bg-panel-bg={$sidebarHidden && !$panelExpanded}
        >
          <Sidebar />
        </div>
      {/if}
    </div>
  </div>
{:else}
  <div class="fixed inset-0 flex items-center justify-center bg-panel-bg">
    <div class="flex flex-col items-center gap-4 animate-fade-in">
      <div class="mc-spinner"></div>
      <span class="font-mono text-text-muted">Loading route...</span>
    </div>
  </div>
{/if}

<Toast />
