<script lang="ts">
import { _ } from 'svelte-i18n';
import { locale } from '$lib/i18n';
import { disconnectSocket, leaveServer } from '$lib/services/socketClient';
import { logout } from '$lib/stores/auth';
import { serverStatus } from '$lib/stores/server';
import { activeServer, activeServerId } from '$lib/stores/servers';
import { showToast } from '$lib/stores/ui';
import { formatUptime } from '$lib/utils/formatters';
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
        <button 
          class="mc-btn mc-btn-sm mc-btn-wood !px-3"
          onclick={handleBackToPanel} 
          title={$_('backToPanel')}
        >
          ←
        </button>
      {/if}
      
      <div class="w-12 h-12 bg-gradient-to-br from-grass-light via-grass to-grass-dark border-3 border-grass-light border-r-grass-dark border-b-grass-dark flex items-center justify-center">
        <span class="font-display text-base text-white text-shadow-pixel">H</span>
      </div>
      
      <div>
        {#if $activeServer}
          <h1 class="font-display text-sm text-hytale-gold text-shadow-pixel tracking-wide">{$activeServer.name}</h1>
          <p class="font-mono text-sm text-text-dim">:{$activeServer.port}/UDP</p>
        {:else}
          <h1 class="font-display text-sm text-hytale-gold text-shadow-pixel tracking-wide">HYTALEPANEL</h1>
          <p class="font-mono text-sm text-text-dim">{$_('serverPanel')}</p>
        {/if}
      </div>
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
        <button 
          class="mc-btn mc-btn-sm !inline-flex" 
          title={$_('language')}
          onclick={() => showLangDropdown = !showLangDropdown}
        >
          🌐 {($locale || 'en').toUpperCase()}
        </button>
        {#if showLangDropdown}
          <div class="absolute right-0 mt-2 mc-panel min-w-[120px]">
            <div class="mc-panel-body flex flex-col gap-2 p-2">
              <button 
                onclick={() => changeLanguage('en')} 
                class="mc-btn mc-btn-sm w-full justify-start"
              >
                🇬🇧 EN
              </button>
              <button 
                onclick={() => changeLanguage('es')} 
                class="mc-btn mc-btn-sm w-full justify-start"
              >
                🇪🇸 ES
              </button>
              <button 
                onclick={() => changeLanguage('uk')} 
                class="mc-btn mc-btn-sm w-full justify-start"
              >
                🇺🇦 UK
              </button>
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
      <button 
        onclick={handleLogout}
        class="mc-btn mc-btn-sm mc-btn-danger !inline-flex"
        title={$_('logout')}
      >
        🚪 {$_('logout')}
      </button>
    </div>
  </div>
</header>
