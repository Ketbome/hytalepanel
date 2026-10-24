<script lang="ts">
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { createServer } from '$lib/services/api';
import { servers } from '$lib/stores/servers';
import { showToast } from '$lib/stores/ui';
import Button from './ui/Button.svelte';
import Checkbox from './ui/Checkbox.svelte';
import Icon from './ui/Icon.svelte';
import Input from './ui/Input.svelte';
import Modal from './ui/Modal.svelte';
import Select from './ui/Select.svelte';

const { onClose, onCreated }: { onClose: () => void; onCreated: () => void } = $props();

let name = $state('');
let nameInvalid = $state(false);
let port = $state(5520);
let javaXms = $state('4G');
let javaXmx = $state('8G');
let autoDownload = $state(true);
let useG1gc = $state(true);
let useMachineId = $state(false); // For Linux native - disable for CasaOS/Windows
let isCreating = $state(false);
let showAdvanced = $state(false);
let copied = $state(false);

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

async function copyPreview(): Promise<void> {
  try {
    await navigator.clipboard.writeText(dockerComposePreview);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  } catch {
    // Clipboard blocked: the text stays selectable
  }
}

async function handleSubmit(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  if (!name.trim()) {
    nameInvalid = true;
    document.getElementById('server-name')?.focus();
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
    showToast(result.error || $_('failed'), 'error');
  }
}
</script>

<Modal open={true} title={$_('createServer')} size="md" onclose={onClose}>
  <form id="create-server-form" class="flex flex-col gap-4" onsubmit={handleSubmit} novalidate>
    <div class="hp-field-group">
      <label for="server-name">{$_('serverName')}</label>
      <Input
        type="text"
        id="server-name"
        bind:value={name}
        placeholder="Survival-01"
        maxlength={64}
        required
        invalid={nameInvalid}
        aria-describedby={nameInvalid ? 'server-name-error' : undefined}
        oninput={() => (nameInvalid = false)}
        data-autofocus
      />
      {#if nameInvalid}
        <p id="server-name-error" class="flex items-center gap-1.5 text-xs text-negative">
          <Icon name="circle-alert" size={12} />{$_('serverNameRequired')}
        </p>
      {/if}
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="hp-field-group">
        <label for="server-port">{$_('serverPort')}</label>
        <Input type="number" id="server-port" mono bind:value={port} min={1024} max={65535} />
      </div>
      <div class="hp-field-group">
        <label for="java-xms">{$_('minMemory')}</label>
        <Select id="java-xms" mono bind:value={javaXms}>
          <option value="1G">1 GB</option>
          <option value="2G">2 GB</option>
          <option value="4G">4 GB</option>
          <option value="6G">6 GB</option>
          <option value="8G">8 GB</option>
        </Select>
      </div>
      <div class="hp-field-group">
        <label for="java-xmx">{$_('maxMemory')}</label>
        <Select id="java-xmx" mono bind:value={javaXmx}>
          <option value="2G">2 GB</option>
          <option value="4G">4 GB</option>
          <option value="6G">6 GB</option>
          <option value="8G">8 GB</option>
          <option value="12G">12 GB</option>
          <option value="16G">16 GB</option>
        </Select>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <Checkbox bind:checked={autoDownload} hint={$_('autoDownloadHint')}>{$_('autoDownloadFiles')}</Checkbox>
      <Checkbox bind:checked={useG1gc} hint={$_('useG1gcHint')}>{$_('useG1GC')}</Checkbox>
      <Checkbox bind:checked={useMachineId} hint={$_('machineIdHint')}>{$_('linuxNative')}</Checkbox>
    </div>

    <div class="border-t border-line pt-2">
      <button
        type="button"
        class="flex h-8 w-full items-center gap-2 text-left text-sm font-medium text-fg-1"
        aria-expanded={showAdvanced}
        aria-controls="compose-preview"
        onclick={() => (showAdvanced = !showAdvanced)}
      >
        <span class="hp-chevron flex text-fg-3" class:open={showAdvanced}><Icon name="chevron-right" /></span>
        {$_('composePreview')}
      </button>
      <div id="compose-preview" class="hp-disclosure" class:open={showAdvanced} inert={!showAdvanced}>
        <div class="overflow-hidden">
          <div class="relative mt-2">
            <pre class="overflow-x-auto rounded-md border border-line bg-sunken p-3 pr-12 font-mono text-xs leading-4 text-fg-1">{dockerComposePreview}</pre>
            <span class="absolute top-2 right-2">
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={copied ? 'check' : 'copy'}
                playIcon={copied}
                aria-label={copied ? $_('copied') : $_('copy')}
                title={copied ? $_('copied') : $_('copy')}
                onclick={copyPreview}
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  </form>

  {#snippet footer()}
    <Button variant="secondary" onclick={onClose} disabled={isCreating}>{$_('cancel')}</Button>
    <Button type="submit" form="create-server-form" variant="primary" loading={isCreating}>{$_('createServer')}</Button>
  {/snippet}
</Modal>
