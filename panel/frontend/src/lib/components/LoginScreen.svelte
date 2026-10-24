<script lang="ts">
import { _ } from 'svelte-i18n';
import { authError, checkDefaults, isUsingDefaults, login } from '$lib/stores/auth';
import { version } from '../../../package.json';
import Brand from './Brand.svelte';
import Button from './ui/Button.svelte';
import Icon from './ui/Icon.svelte';
import InlineNotice from './ui/InlineNotice.svelte';
import Input from './ui/Input.svelte';

const DOCS_URL = 'https://hytalepanel.ketbome.com/';
const shortVersion = version.split('.').slice(0, 2).join('.');

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

<main class="flex min-h-dvh flex-col items-center px-4 pt-[max(48px,calc(40dvh-220px))] pb-12">
  <div class="w-full max-w-[360px]">
    <Brand wordmark={false} size={40} />
    <h1 class="mt-5 font-display text-[28px] leading-9 font-medium tracking-[-0.02em] text-fg-1">{$_('signInTitle')}</h1>

    <form class="mt-8 flex flex-col gap-4" onsubmit={handleSubmit} novalidate>
      <div class="hp-field-group">
        <label for="username">{$_('username')}</label>
        <Input
          id="username"
          type="text"
          size="lg"
          autocomplete="username"
          invalid={!!$authError}
          aria-describedby={$authError ? 'login-error' : undefined}
          bind:value={username}
        />
      </div>

      <div class="hp-field-group">
        <label for="password">{$_('password')}</label>
        <Input
          id="password"
          type="password"
          size="lg"
          autocomplete="current-password"
          invalid={!!$authError}
          aria-describedby={$authError ? 'login-error' : undefined}
          bind:value={password}
        />
      </div>

      {#if $authError}
        <div id="login-error" class="flex items-start gap-2 rounded-md bg-negative-bg px-3 py-2.5 text-[13px] text-negative" role="alert">
          <span class="pt-0.5"><Icon name="circle-alert" size={14} /></span>
          <span class="min-w-0 [overflow-wrap:anywhere]">{$authError}</span>
        </div>
      {/if}

      <Button type="submit" variant="primary" size="lg" class="mt-2 w-full" loading={isLoggingIn}>
        {isLoggingIn ? $_('loginConnecting') : $_('loginSubmit')}
      </Button>
    </form>

    {#if $isUsingDefaults}
      <InlineNotice kind="warning" title={$_('defaultCredsTitle')} class="mt-6">
        {$_('defaultCredsBody')}
      </InlineNotice>
    {/if}
  </div>

  <p class="mt-10 text-xs text-fg-3">
    <span class="font-mono">v{shortVersion}</span>
    <span aria-hidden="true"> · </span>
    <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 hover:text-fg-1">
      {$_('documentation')}<Icon name="external-link" size={12} />
    </a>
  </p>
</main>
