<script lang="ts">
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { createServer } from '$lib/services/api';
import { servers } from '$lib/stores/servers';
import { showToast } from '$lib/stores/ui';
import Button from './ui/Button.svelte';
import Input from './ui/Input.svelte';
import Modal from './ui/Modal.svelte';
import Select from './ui/Select.svelte';

const { onClose, onCreated }: { onClose: () => void; onCreated: () => void } = $props();

let name = $state('');
let port = $state(5520);
let javaXms = $state('4G');
let javaXmx = $state('8G');
let autoDownload = $state(true);
let useG1gc = $state(true);
let useMachineId = $state(false); // For Linux native - disable for CasaOS/Windows
let isCreating = $state(false);
let showAdvanced = $state(false);

// Auto-increment port based on existing servers
$effect(() => {
  const existingServers = get(servers);
  if (existingServers.length > 0) {
    const maxPort = Math.max(...existingServers.map((s) => s.port));
    port = maxPort + 1;
  }
});

const machineIdVolumes = $derived(useMachineId ? `      - /etc/machine-id:/etc/machine-id:ro` : '');

// Use platform detection from backend (ARM64 gets x64 emulation for downloader)
const platformLine = '';
const dockerComposePreview = $derived(`services:
  hytale-server:
    image: ketbom/hytale-server:latest
${platformLine}    container_name: hytale-xxxxxxxx
    restart: on-failure
    ports:
      - "${port}:${port}/udp"
    environment:
      JAVA_XMS: ${javaXms}
      JAVA_XMX: ${javaXmx}
      BIND_PORT: ${port}
      AUTO_DOWNLOAD: ${autoDownload}
      USE_G1GC: ${useG1gc}
    volumes:
      - ./server:/opt/hytale${machineIdVolumes ? `\n${machineIdVolumes}` : ''}`);

async function handleSubmit(): Promise<void> {
  if (!name.trim()) {
    showToast($_('serverNameRequired'), 'error');
    return;
  }

  isCreating = true;

  const result = await createServer({
    name: name.trim(),
    port,
    config: {
      javaXms,
      javaXmx,
      bindAddr: '0.0.0.0',
      autoDownload,
      useG1gc,
      extraArgs: '',
      useMachineId
    }
  });

  isCreating = false;

  if (result.success) {
    showToast($_('serverCreated'));
    onCreated();
  } else {
    showToast(result.error || 'Failed to create server', 'error');
  }
}
</script>

<Modal open={true} title={$_('createServer')} maxWidth="42rem" onclose={onClose}>
  <form
    class="max-h-[70vh] overflow-y-auto space-y-4"
    onsubmit={(e) => {
      e.preventDefault();
      handleSubmit();
    }}
  >
    <div class="flex flex-col gap-1">
      <label for="server-name" class="text-xs text-text-dim uppercase">{$_('serverName')}</label>
      <Input type="text" id="server-name" bind:value={name} placeholder="My Hytale Server" required />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div class="flex flex-col gap-1">
        <label for="server-port" class="text-xs text-text-dim uppercase">{$_('serverPort')}</label>
        <Input type="number" id="server-port" bind:value={port} min={1024} max={65535} />
      </div>

      <div class="flex flex-col gap-1">
        <label for="java-xms" class="text-xs text-text-dim uppercase">{$_('minMemory')}</label>
        <Select id="java-xms" bind:value={javaXms}>
          <option value="1G">1 GB</option>
          <option value="2G">2 GB</option>
          <option value="4G">4 GB</option>
          <option value="6G">6 GB</option>
          <option value="8G">8 GB</option>
        </Select>
      </div>

      <div class="flex flex-col gap-1">
        <label for="java-xmx" class="text-xs text-text-dim uppercase">{$_('maxMemory')}</label>
        <Select id="java-xmx" bind:value={javaXmx}>
          <option value="2G">2 GB</option>
          <option value="4G">4 GB</option>
          <option value="6G">6 GB</option>
          <option value="8G">8 GB</option>
          <option value="12G">12 GB</option>
          <option value="16G">16 GB</option>
        </Select>
      </div>
    </div>

    <div class="flex flex-wrap gap-3 text-sm">
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" bind:checked={autoDownload} class="w-4 h-4 accent-hytale-orange" />
        <span>{$_('autoDownloadFiles')}</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" bind:checked={useG1gc} class="w-4 h-4 accent-hytale-orange" />
        <span>{$_('useG1GC')}</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer" title={$_('machineIdHint')}>
        <input type="checkbox" bind:checked={useMachineId} class="w-4 h-4 accent-hytale-orange" />
        <span>{$_('linuxNative')}</span>
      </label>
    </div>

    <Button class="w-full justify-start" size="small" onclick={() => (showAdvanced = !showAdvanced)}>
      {showAdvanced ? '▼' : '▶'} {$_('composePreview')}
    </Button>

    {#if showAdvanced}
      <pre
        class="p-3 rounded-lg bg-[#100e0b] border border-panel-border text-xs text-text font-code overflow-x-auto">{dockerComposePreview}</pre>
    {/if}

    <div class="flex justify-end gap-2 pt-3 border-t border-panel-border">
      <Button onclick={onClose} disabled={isCreating}>
        {$_('cancel')}
      </Button>
      <Button type="submit" variant="primary" disabled={isCreating}>
        {#if isCreating}
          <span class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
        {:else}
          {$_('create')}
        {/if}
      </Button>
    </div>
  </form>
</Modal>
