<script lang="ts">
import { _ } from 'svelte-i18n';
import AppBar from '$lib/components/AppBar.svelte';
import Dashboard from '$lib/components/Dashboard.svelte';
import LoginScreen from '$lib/components/LoginScreen.svelte';
import BlockLoader from '$lib/components/ui/BlockLoader.svelte';
import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
import Toast from '$lib/components/ui/Toast.svelte';
import Workspace from '$lib/components/Workspace.svelte';
import { connectSocket, disconnectSocket } from '$lib/services/socketClient';
import { checkStatus, isAuthenticated, isLoading } from '$lib/stores/auth';
import { loadPanelConfig, panelConfig } from '$lib/stores/config';
import { currentRoute, initRouter, isOnDashboard } from '$lib/stores/router';

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
</script>

{#snippet loadingScreen()}
  <div class="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-ground">
    <BlockLoader size="md" />
    <span class="hp-appear-late text-sm text-fg-3">{$_('loading')}</span>
  </div>
{/snippet}

{#if !$panelConfig.loaded || $isLoading}
  {@render loadingScreen()}
{:else if !$isAuthenticated}
  <LoginScreen />
{:else if $isOnDashboard}
  <Dashboard />
{:else if $currentRoute.serverId}
  <div class="flex min-h-dvh flex-col max-sm:h-dvh ws:h-dvh">
    <AppBar />
    <Workspace />
  </div>
{:else}
  {@render loadingScreen()}
{/if}

<Toast />
<ConfirmDialog />
