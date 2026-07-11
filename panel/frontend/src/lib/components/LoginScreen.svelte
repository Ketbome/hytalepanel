<script lang="ts">
import { _ } from 'svelte-i18n';
import { authError, checkDefaults, isUsingDefaults, login } from '$lib/stores/auth';
import Brand from './Brand.svelte';
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
  <div class="relative w-full max-w-md animate-bounce-in">
    <!-- Main login panel -->
    <div class="mc-panel">
      <!-- Header with logo -->
      <div class="mc-panel-header flex-col !items-center !gap-3 !py-8">
        <Brand size="lg" />
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
            <label class="text-sm text-text-muted uppercase tracking-wide" for="username">
              {$_('username')}
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
            <label class="text-sm text-text-muted uppercase tracking-wide" for="password">
              {$_('password')}
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
                <span>{$_('loginConnecting')}</span>
              {:else}
                <span>⏵</span>
                <span>{$_('loginSubmit')}</span>
              {/if}
            </Button>
          </div>
        </form>
      </div>
    </div>

    <!-- Footer decoration -->
    <div class="mt-6 text-center">
      <p class="text-sm text-text-dim">
        {$_('poweredBy')} <span class="text-hytale-gold">HytalePanel</span>
      </p>
    </div>
  </div>
</div>
