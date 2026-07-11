<script lang="ts">
import { _ } from 'svelte-i18n';
import { locale } from '$lib/i18n';
import { disconnectSocket, leaveServer } from '$lib/services/socketClient';
import { logout } from '$lib/stores/auth';
import { assetUrl } from '$lib/stores/config';
import { serverStatus } from '$lib/stores/server';
import { activeServer, activeServerId } from '$lib/stores/servers';
import { showToast } from '$lib/stores/ui';
import { formatUptime } from '$lib/utils/formatters';
import Brand from './Brand.svelte';
import Button from './ui/Button.svelte';
import StatusBadge from './ui/StatusBadge.svelte';

let clockTime = $state('--:--:--');
let uptime = $state('00:00:00');
let showLangDropdown = $state(false);

function updateClock(): void {
  const now = new Date();
  clockTime = [now.getHours(), now.getMinutes(), now.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
}

function updateUptime(): void {
  uptime = formatUptime($serverStatus.startedAt);
}

// Clock and uptime timers with $effect
$effect(() => {
  updateClock();
  const clockTimer = setInterval(updateClock, 1000);
  const uptimeTimer = setInterval(updateUptime, 1000);

  return () => {
    clearInterval(clockTimer);
    clearInterval(uptimeTimer);
  };
});

$effect(() => {
  function handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (showLangDropdown && !target.closest('.lang-dropdown-container')) {
      showLangDropdown = false;
    }
  }

  if (showLangDropdown) {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }
});

function handleLogout(): void {
  disconnectSocket();
  logout();
}

function handleBackToPanel(): void {
  leaveServer();
}

function changeLanguage(lang: string): void {
  locale.set(lang);
  showToast(`${$_('language')}: ${lang.toUpperCase()}`);
  showLangDropdown = false;
}
</script>

<header class="mc-panel mb-5 !overflow-visible">
  <div class="flex items-center justify-between px-5 py-3 flex-wrap gap-4">
    <!-- Left section: Logo -->
    <div class="flex items-center gap-4">
      {#if $activeServerId}
        <Button size="small" variant="wood" class="!px-3" onclick={handleBackToPanel} title={$_('backToPanel')} aria-label={$_('backToPanel')}>
          ←
        </Button>
      {/if}
      
      {#if $activeServer}
        <img src={assetUrl('/images/hytale.png')} alt="HytalePanel" class="w-11 h-11 object-contain" />
        <div>
          <h1 class="font-display text-sm text-hytale-gold tracking-wide">{$activeServer.name}</h1>
          <p class="text-sm text-text-dim">:{$activeServer.port}/UDP</p>
        </div>
      {:else}
        <Brand />
      {/if}
    </div>

    <!-- Right section: Controls -->
    <div class="flex items-center gap-3 flex-wrap relative z-50">
      <!-- Links -->
      <a 
        href="https://hytalepanel.ketbome.com/" 
        target="_blank" 
        class="mc-btn mc-btn-sm mc-btn-wood !hidden sm:!inline-flex"
        title={$_('documentation')}
      >
        📚 {$_('docs')}
      </a>
      <a 
        href="https://github.com/ketbome/hytalepanel/issues" 
        target="_blank" 
        class="mc-btn mc-btn-sm !hidden sm:!inline-flex"
        title={$_('reportIssue')}
      >
        🐛 {$_('issues')}
      </a>

      <!-- Language selector -->
      <div class="relative lang-dropdown-container z-[9999]">
        <Button size="small" class="!inline-flex" title={$_('language')} onclick={() => (showLangDropdown = !showLangDropdown)}>
          🌐 {($locale || 'en').toUpperCase()}
        </Button>
        {#if showLangDropdown}
          <div class="absolute right-0 mt-2 mc-panel min-w-[120px]">
            <div class="mc-panel-body flex flex-col gap-2 p-2">
              {#each ['en', 'es', 'uk', 'br'] as lang}
                <Button size="small" class="w-full justify-start" onclick={() => changeLanguage(lang)}>
                  {lang === 'en' ? '🇬🇧' : lang === 'es' ? '🇪🇸' : lang === 'uk' ? '🇺🇦' : '🇧🇷'} {lang.toUpperCase()}
                </Button>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Time displays -->
      <div class="mc-badge !hidden md:!flex gap-2">
        <span class="text-text-dim">🕐</span>
        <span class="font-code text-sm text-hytale-gold">{clockTime}</span>
      </div>

      <div class="mc-badge !hidden md:!flex">
        <span class="font-code text-sm text-grass-light">{uptime}</span>
      </div>

      <!-- Status -->
      <StatusBadge running={$serverStatus.running} />

      <!-- Logout -->
      <Button size="small" variant="danger" class="!inline-flex" onclick={handleLogout} title={$_('logout')}>
        🚪 {$_('logout')}
      </Button>
    </div>
  </div>
</header>
