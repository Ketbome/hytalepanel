<script lang="ts">
import { _ } from 'svelte-i18n';
import { emit } from '$lib/services/socketClient';
import { addLog } from '$lib/stores/console';
import { serverStatus } from '$lib/stores/server';
import { activeServer } from '$lib/stores/servers';

function handleStart(): void {
  emit('start');
}

function handleRestart(): void {
  if (!$serverStatus.running) return;
  if (confirm($_('confirmRestart'))) {
    emit('restart');
  }
}

function handleStop(): void {
  if (!$serverStatus.running) return;
  if (confirm($_('confirmStop'))) {
    addLog('> /stop', 'cmd');
    emit('command', '/stop');
  }
}

function handleForceStop(): void {
  if (!$serverStatus.running) return;
  if (confirm($_('confirmForceStop'))) {
    emit('kill');
  }
}

function handleWipe(): void {
  if ($serverStatus.running) return;
  if (confirm($_('confirmWipe'))) {
    if (confirm($_('confirmWipeSure'))) {
      emit('wipe');
    }
  }
}
</script>

<div class="space-y-4">
  <!-- Server Actions -->
  <div class="bg-panel-light border-4 border-panel-border p-4">
    <h3 class="font-mono text-grass-light text-lg mb-4 pb-2 border-b-2 border-panel-border">{$_('serverControl')}</h3>
    
    <div class="grid grid-cols-2 gap-3">
      <button 
        class="px-4 py-3 font-mono text-base border-4 transition-all
               bg-grass border-grass-dark text-panel-bg
               hover:bg-grass-light hover:border-grass
               disabled:opacity-50 disabled:cursor-not-allowed
               shadow-mc-btn active:shadow-mc-btn-pressed active:translate-y-0.5"
        onclick={handleStart} 
        disabled={$serverStatus.running}
      >
        ▶ {$_('start')}
      </button>
      
      <button 
        class="px-4 py-3 font-mono text-base border-4 transition-all
               bg-wood border-wood-dark text-text
               hover:bg-wood-light hover:border-wood
               disabled:opacity-50 disabled:cursor-not-allowed
               shadow-mc-btn active:shadow-mc-btn-pressed active:translate-y-0.5"
        onclick={handleRestart} 
        disabled={!$serverStatus.running}
      >
        ↻ {$_('restart')}
      </button>
    </div>
  </div>
  
  <!-- Danger Zone -->
  <div class="bg-panel-light border-4 border-error/50 p-4">
    <h3 class="font-mono text-error text-lg mb-4 pb-2 border-b-2 border-error/30">⚠ {$_('dangerZone')}</h3>
    
    <div class="grid grid-cols-1 gap-3">
      <button 
        class="px-4 py-3 font-mono text-base border-4 transition-all w-full
               bg-stone-dark border-stone text-text
               hover:bg-error hover:border-error-dark hover:text-white
               disabled:opacity-50 disabled:cursor-not-allowed
               shadow-mc-btn active:shadow-mc-btn-pressed active:translate-y-0.5"
        onclick={handleStop} 
        disabled={!$serverStatus.running}
      >
        ⏹ {$_('stopServer')}
      </button>
      
      <button 
        class="px-4 py-3 font-mono text-base border-4 transition-all w-full
               bg-error/80 border-error text-white
               hover:bg-error hover:border-error
               disabled:opacity-50 disabled:cursor-not-allowed
               shadow-mc-btn active:shadow-mc-btn-pressed active:translate-y-0.5"
        onclick={handleForceStop} 
        disabled={!$serverStatus.running}
        title={$_('forceStopTooltip')}
      >
        ⚡ {$_('forceStop')}
      </button>
      
      <button 
        class="px-4 py-3 font-mono text-base border-4 transition-all w-full
               bg-warning/20 border-warning/50 text-warning
               hover:bg-warning hover:border-warning hover:text-panel-bg
               disabled:opacity-50 disabled:cursor-not-allowed
               shadow-mc-btn active:shadow-mc-btn-pressed active:translate-y-0.5"
        onclick={handleWipe} 
        disabled={$serverStatus.running}
      >
        🗑 {$_('wipeData')}
      </button>
    </div>
  </div>
  
  <!-- Server Info -->
  <div class="bg-panel-light border-4 border-panel-border p-4">
    <h3 class="font-mono text-hytale-gold text-lg mb-4 pb-2 border-b-2 border-panel-border">{$_('serverInfo')}</h3>
    
    <div class="space-y-2">
      <div class="flex justify-between items-center py-2 px-3 bg-panel-bg/50 border-2 border-panel-border">
        <span class="font-mono text-text-dim">{$_('status')}</span>
        <span class="font-mono" class:text-grass-light={$serverStatus.running} class:text-error={!$serverStatus.running}>
          {$serverStatus.running ? '● Online' : '○ Offline'}
        </span>
      </div>
      
      <div class="flex justify-between items-center py-2 px-3 bg-panel-bg/50 border-2 border-panel-border">
        <span class="font-mono text-text-dim">{$_('game')}</span>
        <span class="font-mono text-text">{$activeServer?.port || 5520}/UDP</span>
      </div>
      
      <div class="flex justify-between items-center py-2 px-3 bg-panel-bg/50 border-2 border-panel-border">
        <span class="font-mono text-text-dim">{$_('panel')}</span>
        <span class="font-mono text-text">3000/TCP</span>
      </div>
    </div>
  </div>
</div>
