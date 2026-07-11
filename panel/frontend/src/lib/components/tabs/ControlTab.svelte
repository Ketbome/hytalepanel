<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import { emit } from '$lib/services/socketClient';
import { confirmDialog } from '$lib/stores/confirm';
import { addLog } from '$lib/stores/console';
import { serverStatus } from '$lib/stores/server';
import { activeServer } from '$lib/stores/servers';

function handleStart(): void {
  emit('start');
}

async function handleRestart(): Promise<void> {
  if (!$serverStatus.running) return;
  if (await confirmDialog($_('confirmRestart'))) {
    emit('restart');
  }
}

async function handleStop(): Promise<void> {
  if (!$serverStatus.running) return;
  if (await confirmDialog($_('confirmStop'))) {
    addLog('> /stop', 'cmd');
    emit('command', '/stop');
  }
}

async function handleForceStop(): Promise<void> {
  if (!$serverStatus.running) return;
  if (await confirmDialog($_('confirmForceStop'), { danger: true })) {
    emit('kill');
  }
}

async function handleWipe(): Promise<void> {
  if ($serverStatus.running) return;
  if (await confirmDialog($_('confirmWipe'), { danger: true })) {
    if (await confirmDialog($_('confirmWipeSure'), { danger: true })) {
      emit('wipe');
    }
  }
}
</script>

<div class="space-y-4">
  <!-- Server Actions -->
  <div class="mc-panel">
    <div class="mc-panel-header">{$_('serverControl')}</div>
    <div class="mc-panel-body">
      <div class="grid grid-cols-2 gap-3">
        <Button variant="primary" onclick={handleStart} disabled={$serverStatus.running}>
          ▶ {$_('start')}
        </Button>
        <Button variant="wood" onclick={handleRestart} disabled={!$serverStatus.running}>
          ↻ {$_('restart')}
        </Button>
      </div>
    </div>
  </div>

  <!-- Danger Zone -->
  <div class="mc-panel border-error/40">
    <div class="mc-panel-header text-error">⚠ {$_('dangerZone')}</div>
    <div class="mc-panel-body">
      <div class="grid grid-cols-1 gap-3">
        <Button class="w-full" onclick={handleStop} disabled={!$serverStatus.running}>
          ⏹ {$_('stopServer')}
        </Button>
        <Button
          variant="danger"
          class="w-full"
          onclick={handleForceStop}
          disabled={!$serverStatus.running}
          title={$_('forceStopTooltip')}
        >
          ⚡ {$_('forceStop')}
        </Button>
        <Button variant="warning" class="w-full" onclick={handleWipe} disabled={$serverStatus.running}>
          🗑 {$_('wipeData')}
        </Button>
      </div>
    </div>
  </div>

  <!-- Server Info -->
  <div class="mc-panel">
    <div class="mc-panel-header">{$_('serverInfo')}</div>
    <div class="mc-panel-body space-y-2">
      <div class="flex justify-between items-center py-2 px-3 rounded-lg bg-panel-light border border-panel-border">
        <span class="text-text-dim">{$_('status')}</span>
        <span class:text-grass-light={$serverStatus.running} class:text-error={!$serverStatus.running}>
          {$serverStatus.running ? '● Online' : '○ Offline'}
        </span>
      </div>

      <div class="flex justify-between items-center py-2 px-3 rounded-lg bg-panel-light border border-panel-border">
        <span class="text-text-dim">{$_('game')}</span>
        <span class="text-text">{$activeServer?.port || 5520}/UDP</span>
      </div>

      <div class="flex justify-between items-center py-2 px-3 rounded-lg bg-panel-light border border-panel-border">
        <span class="text-text-dim">{$_('panel')}</span>
        <span class="text-text">3000/TCP</span>
      </div>
    </div>
  </div>
</div>
