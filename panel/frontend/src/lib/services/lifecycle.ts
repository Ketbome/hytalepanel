import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { confirmDialog } from '$lib/stores/confirm';
import { addLog } from '$lib/stores/console';
import { serverStatus, setPendingAction } from '$lib/stores/server';
import { activeServer } from '$lib/stores/servers';
import { emit } from './socketClient';

function serverName(): string {
  return get(activeServer)?.name ?? '';
}

export function startServer(): void {
  setPendingAction('starting');
  emit('start');
}

export async function restartServer(): Promise<void> {
  if (!get(serverStatus).running) return;
  const t = get(_);
  const name = serverName();
  if (
    await confirmDialog(t('confirmRestartMsg'), {
      title: t('confirmRestart', { values: { name } }),
      confirmLabel: t('restart')
    })
  ) {
    setPendingAction('starting');
    emit('restart');
  }
}

export async function stopServer(): Promise<void> {
  if (!get(serverStatus).running) return;
  const t = get(_);
  const name = serverName();
  if (
    await confirmDialog(t('confirmStopMsg'), {
      title: t('confirmStop', { values: { name } }),
      confirmLabel: t('stop')
    })
  ) {
    setPendingAction('stopping');
    addLog('> /stop', 'cmd');
    emit('command', '/stop');
  }
}

export async function forceStopServer(): Promise<void> {
  if (!get(serverStatus).running) return;
  const t = get(_);
  const name = serverName();
  if (
    await confirmDialog(t('confirmForceStopMsg'), {
      title: t('confirmForceStop', { values: { name } }),
      confirmLabel: t('forceStop'),
      danger: true
    })
  ) {
    setPendingAction('stopping');
    emit('kill');
  }
}

export async function wipeServer(): Promise<void> {
  if (get(serverStatus).running) return;
  const t = get(_);
  const name = serverName();
  if (
    !(await confirmDialog(t('confirmWipeMsg'), {
      title: t('confirmWipe', { values: { name } }),
      confirmLabel: t('wipeData'),
      danger: true
    }))
  )
    return;
  if (
    await confirmDialog(t('confirmWipeSureMsg', { values: { name } }), {
      title: t('confirmWipeSure'),
      confirmLabel: t('wipeNamed', { values: { name } }),
      danger: true
    })
  ) {
    emit('wipe');
  }
}
