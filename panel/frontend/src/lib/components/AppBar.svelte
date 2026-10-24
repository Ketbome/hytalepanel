<script lang="ts">
import { _ } from 'svelte-i18n';
import { locale } from '$lib/i18n';
import { disconnectSocket, joinServer, leaveServer } from '$lib/services/socketClient';
import { authDisabled, currentUser, logout } from '$lib/stores/auth';
import { navigateToDashboard } from '$lib/stores/router';
import { pendingAction, serverStatus } from '$lib/stores/server';
import { activeServer, activeServerId, servers } from '$lib/stores/servers';
import { listStatus, workspaceStatus } from '$lib/utils/status';
import Brand from './Brand.svelte';
import Button from './ui/Button.svelte';
import Icon from './ui/Icon.svelte';
import Menu, { type MenuEntry } from './ui/Menu.svelte';
import StatusSquare from './ui/StatusSquare.svelte';

const DOCS_URL = 'https://hytalepanel.ketbome.com/';
const ISSUES_URL = 'https://github.com/ketbome/hytalepanel/issues';
const LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'es', name: 'Español' },
  { id: 'uk', name: 'Українська' },
  { id: 'br', name: 'Português (BR)' }
];

const currentStatus = $derived(workspaceStatus($serverStatus, $pendingAction));

function goHome(e: MouseEvent): void {
  e.preventDefault();
  if ($activeServerId) leaveServer();
  else navigateToDashboard();
}

function handleLogout(): void {
  disconnectSocket();
  logout();
}

const languageItems = $derived<MenuEntry[]>(
  LANGUAGES.map((l) => ({ label: l.name, checked: ($locale || 'en') === l.id, onselect: () => locale.set(l.id) }))
);

const accountItems = $derived<MenuEntry[]>([
  { label: $_('reportIssue'), icon: 'bug', href: ISSUES_URL },
  { kind: 'separator' },
  { label: $_('logout'), icon: 'log-out', onselect: handleLogout }
]);

const phoneItems = $derived<MenuEntry[]>([
  { label: $_('docs'), icon: 'book-open', href: DOCS_URL },
  { label: $_('reportIssue'), icon: 'bug', href: ISSUES_URL },
  { kind: 'separator' },
  { kind: 'label', label: $_('language') },
  ...languageItems,
  ...($authDisabled
    ? []
    : ([{ kind: 'separator' }, { label: $_('logout'), icon: 'log-out', onselect: handleLogout }] as MenuEntry[]))
]);

const switcherItems = $derived<MenuEntry[]>([
  ...$servers.map(
    (s): MenuEntry => ({
      label: s.name,
      meta: `${s.port}/udp`,
      status: s.id === $activeServer?.id ? currentStatus : listStatus(s),
      onselect: () => {
        if (s.id !== $activeServer?.id) joinServer(s.id);
      }
    })
  ),
  { kind: 'separator' },
  { label: $_('allServers'), icon: 'arrow-right', onselect: () => leaveServer() }
]);
</script>

<header class="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-ground px-3 sm:px-4">
  <a href="./" class="flex shrink-0 items-center rounded-sm px-1 py-1" onclick={goHome} aria-label="HytalePanel">
    <span class="hidden sm:inline-flex"><Brand /></span>
    <span class="inline-flex sm:hidden"><Brand wordmark={false} /></span>
  </a>

  {#if $activeServer}
    <span class="shrink-0 text-fg-3" aria-hidden="true">/</span>
    <Menu items={switcherItems} label={$_('switchServer')} minWidth="240px" class="min-w-0">
      {#snippet trigger(props)}
        <button
          type="button"
          class="hp-switcher flex h-8 min-w-0 items-center gap-2 rounded-sm px-2 text-sm font-medium text-fg-1"
          {...props}
        >
          <StatusSquare status={currentStatus} />
          <span class="min-w-0 max-w-[40ch] truncate" title={$activeServer.name}>{$activeServer.name}</span>
          <span class="shrink-0 text-fg-3"><Icon name="chevron-down" size={14} /></span>
        </button>
      {/snippet}
    </Menu>
  {/if}

  <div class="ml-auto hidden items-center gap-1 sm:flex">
    <Button variant="ghost" size="sm" href={DOCS_URL} external trailingIcon="external-link">{$_('docs')}</Button>
    {#if $authDisabled}
      <Button variant="ghost" size="sm" iconOnly icon="bug" href={ISSUES_URL} external aria-label={$_('reportIssue')} title={$_('reportIssue')} />
    {/if}
    <Menu items={languageItems} label={$_('language')} align="end" minWidth="180px">
      {#snippet trigger(props)}
        <Button variant="ghost" size="sm" trailingIcon="chevron-down" aria-label={$_('language')} {...props}>
          <span class="font-mono text-xs">{($locale || 'en').toUpperCase()}</span>
        </Button>
      {/snippet}
    </Menu>
    {#if !$authDisabled}
      <Menu items={accountItems} label={$_('account')} align="end">
        {#snippet trigger(props)}
          <Button variant="ghost" size="sm" icon="user" trailingIcon="chevron-down" aria-label={$_('account')} {...props}>
            <span class="max-w-[16ch] truncate">{$currentUser ?? $_('account')}</span>
          </Button>
        {/snippet}
      </Menu>
    {/if}
  </div>

  <div class="ml-auto flex sm:hidden">
    <Menu items={phoneItems} label={$_('more')} align="end" minWidth="220px">
      {#snippet trigger(props)}
        <Button variant="ghost" iconOnly icon="ellipsis" aria-label={$_('more')} {...props} />
      {/snippet}
    </Menu>
  </div>
</header>

<style>
  .hp-switcher {
    transition: background-color var(--hp-dur-hover) ease;
  }

  .hp-switcher:hover,
  .hp-switcher[aria-expanded="true"] {
    background: var(--hp-bg-2);
  }
</style>
