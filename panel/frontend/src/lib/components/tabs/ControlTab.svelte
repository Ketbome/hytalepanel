<script lang="ts">
import { _ } from 'svelte-i18n';
import { emit } from '$lib/services/socketClient';
import { addLog } from '$lib/stores/console';
import { serverStatus } from '$lib/stores/server';
import { activeServer } from '$lib/stores/servers';
import Button from '../ui/Button.svelte';

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

<div class="control-grid">
  <Button variant="primary" size="small" onclick={handleStart} disabled={$serverStatus.running}>{$_('start')}</Button>
  <Button size="small" onclick={handleRestart} disabled={!$serverStatus.running}>{$_('restart')}</Button>
</div>
<Button variant="danger" size="small" onclick={handleStop} disabled={!$serverStatus.running}>{$_('stopServer')}</Button>
<Button variant="danger" size="small" onclick={handleForceStop} disabled={!$serverStatus.running} title={$_('forceStopTooltip')}>{$_('forceStop')}</Button>
<Button variant="warning" size="small" onclick={handleWipe} disabled={$serverStatus.running}>{$_('wipeData')}</Button>

<div class="info-compact">
  <div class="info-row">
    <span class="info-label">{$_('status')}</span>
    <span class="info-value">{$serverStatus.status}</span>
  </div>
  <div class="info-row">
    <span class="info-label">{$_('game')}</span>
    <span class="info-value">{$activeServer?.port || 5520}/UDP</span>
  </div>
  <div class="info-row">
    <span class="info-label">{$_('panel')}</span>
    <span class="info-value">3000/TCP</span>
  </div>
</div>
