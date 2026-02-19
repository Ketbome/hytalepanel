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

<div class="login-screen">
  <div class="login-box">
    <div class="login-header">
      <div class="login-logo">
        <div class="login-logo-block">H</div>
        <div class="login-title">HYTALE</div>
      </div>
      <div class="login-subtitle">Server Panel</div>
    </div>
    <form class="login-form" onsubmit={handleSubmit}>
      {#if $isUsingDefaults}
        <div class="login-warning visible">
          ⚠️ Using default credentials! Set PANEL_USER and PANEL_PASS.
        </div>
      {/if}
      {#if $authError}
        <div class="login-error visible">{$authError}</div>
      {/if}
      <div class="login-field">
        <label class="login-label" for="username">Username</label>
        <Input
          id="username"
          type="text"
          placeholder="admin"
          autocomplete="username"
          bind:value={username}
        />
      </div>
      <div class="login-field">
        <label class="login-label" for="password">Password</label>
        <Input
          id="password"
          type="password"
          placeholder="********"
          autocomplete="current-password"
          bind:value={password}
        />
      </div>
      <Button type="submit" variant="primary" disabled={isLoggingIn}>
        {isLoggingIn ? '...' : 'LOGIN'}
      </Button>
    </form>
  </div>
</div>
