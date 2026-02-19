<script lang="ts">
import { authError, checkDefaults, isUsingDefaults, login } from '$lib/stores/auth';
import Button from './ui/Button.svelte';
import Input from './ui/Input.svelte';

let username = $state('');
let password = $state('');
let isLoggingIn = $state(false);

$effect(() => {
  checkDefaults();
});

async function handleSubmit(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  isLoggingIn = true;
  await login(username, password);
  isLoggingIn = false;
}
</script>

<div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
  <!-- Background decorative elements -->
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <!-- Grass top layer -->
    <div class="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-grass-dark via-grass to-transparent opacity-20"></div>
    <!-- Dirt ground layer -->
    <div class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-dirt-dark via-dirt to-transparent opacity-30"></div>
  </div>

  <div class="relative w-full max-w-md animate-bounce-in">
    <!-- Main login panel -->
    <div class="mc-panel">
      <!-- Header with logo -->
      <div class="mc-panel-header flex-col !items-center !gap-3 !py-8">
        <div class="flex items-center gap-4">
          <!-- Block logo -->
          <div class="w-16 h-16 relative">
            <div class="absolute inset-0 bg-gradient-to-br from-grass-light via-grass to-grass-dark border-4 border-grass-light border-r-grass-dark border-b-grass-dark flex items-center justify-center">
              <span class="font-display text-2xl text-white text-shadow-pixel">H</span>
            </div>
            <!-- Grass texture on top -->
            <div class="absolute -top-1 left-0 right-0 h-3 bg-gradient-to-b from-grass-light to-grass opacity-80"></div>
          </div>
          <div class="text-left">
            <h1 class="font-display text-xl text-hytale-gold text-shadow-pixel tracking-wider">HYTALE</h1>
            <p class="font-mono text-lg text-text-muted mt-1">Server Panel</p>
          </div>
        </div>
      </div>

      <!-- Form body -->
      <div class="mc-panel-body">
        <form class="flex flex-col gap-5" onsubmit={handleSubmit}>
          {#if $isUsingDefaults}
            <div class="mc-badge mc-badge-warning !flex gap-2 !px-4 !py-3 text-sm">
              <span>⚠️</span>
              <span>Using default credentials! Set PANEL_USER and PANEL_PASS.</span>
            </div>
          {/if}
          
          {#if $authError}
            <div class="mc-badge mc-badge-error !flex gap-2 !px-4 !py-3 text-sm animate-slide-down">
              <span>✕</span>
              <span>{$authError}</span>
            </div>
          {/if}

          <div class="flex flex-col gap-2">
            <label class="font-mono text-base text-text-muted uppercase tracking-wide" for="username">
              Username
            </label>
            <Input
              id="username"
              type="text"
              placeholder="admin"
              autocomplete="username"
              bind:value={username}
            />
          </div>

          <div class="flex flex-col gap-2">
            <label class="font-mono text-base text-text-muted uppercase tracking-wide" for="password">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
              bind:value={password}
            />
          </div>

          <div class="mt-2">
            <Button type="submit" variant="primary" disabled={isLoggingIn}>
              {#if isLoggingIn}
                <span class="mc-spinner !w-5 !h-5 !border-2"></span>
                <span>CONNECTING...</span>
              {:else}
                <span>⏵</span>
                <span>PLAY</span>
              {/if}
            </Button>
          </div>
        </form>
      </div>
    </div>

    <!-- Footer decoration -->
    <div class="mt-6 text-center">
      <p class="font-mono text-sm text-text-dim">
        Powered by <span class="text-hytale-gold">HytalePanel</span>
      </p>
    </div>
  </div>
</div>
