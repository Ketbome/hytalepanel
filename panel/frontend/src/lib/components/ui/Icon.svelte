<script lang="ts" module>
// The only place that knows the icon package. Swap it here and nowhere else.
import { type IconData, type MountedIcon, mountIcon, renderIcon } from '@animateicons/vanilla';
import { ArrowDownToLine } from '@animateicons/vanilla/lucide/arrow-down-to-line';
import { ArrowRight } from '@animateicons/vanilla/lucide/arrow-right';
import { BookOpen } from '@animateicons/vanilla/lucide/book-open';
import { Bug } from '@animateicons/vanilla/lucide/bug';
import { Check } from '@animateicons/vanilla/lucide/check';
import { ChevronDown } from '@animateicons/vanilla/lucide/chevron-down';
import { ChevronLeft } from '@animateicons/vanilla/lucide/chevron-left';
import { ChevronRight } from '@animateicons/vanilla/lucide/chevron-right';
import { CircleAlert } from '@animateicons/vanilla/lucide/circle-alert';
import { CircleCheck } from '@animateicons/vanilla/lucide/circle-check';
import { Copy } from '@animateicons/vanilla/lucide/copy';
import { Download } from '@animateicons/vanilla/lucide/download';
import { Ellipsis } from '@animateicons/vanilla/lucide/ellipsis';
import { Eraser } from '@animateicons/vanilla/lucide/eraser';
import { ExternalLink } from '@animateicons/vanilla/lucide/external-link';
import { File } from '@animateicons/vanilla/lucide/file';
import { FileArchive } from '@animateicons/vanilla/lucide/file-archive';
import { FileCode } from '@animateicons/vanilla/lucide/file-code';
import { FileImage } from '@animateicons/vanilla/lucide/file-image';
import { FileText } from '@animateicons/vanilla/lucide/file-text';
import { Folder } from '@animateicons/vanilla/lucide/folder';
import { FolderPlus } from '@animateicons/vanilla/lucide/folder-plus';
import { Info } from '@animateicons/vanilla/lucide/info';
import { KeyRound } from '@animateicons/vanilla/lucide/key-round';
import { Languages } from '@animateicons/vanilla/lucide/languages';
import { ListFilter } from '@animateicons/vanilla/lucide/list-filter';
import { Lock } from '@animateicons/vanilla/lucide/lock';
import { LogOut } from '@animateicons/vanilla/lucide/log-out';
import { PanelLeft } from '@animateicons/vanilla/lucide/panel-left';
import { Pencil } from '@animateicons/vanilla/lucide/pencil';
import { Play } from '@animateicons/vanilla/lucide/play';
import { Plus } from '@animateicons/vanilla/lucide/plus';
import { Power } from '@animateicons/vanilla/lucide/power';
import { RefreshCw } from '@animateicons/vanilla/lucide/refresh-cw';
import { RotateCw } from '@animateicons/vanilla/lucide/rotate-cw';
import { Search } from '@animateicons/vanilla/lucide/search';
import { SendHorizontal } from '@animateicons/vanilla/lucide/send-horizontal';
import { Terminal } from '@animateicons/vanilla/lucide/terminal';
import { Trash2 } from '@animateicons/vanilla/lucide/trash-2';
import { TriangleAlert } from '@animateicons/vanilla/lucide/triangle-alert';
import { Upload } from '@animateicons/vanilla/lucide/upload';
import { User } from '@animateicons/vanilla/lucide/user';
import { Wrench } from '@animateicons/vanilla/lucide/wrench';
import { X } from '@animateicons/vanilla/lucide/x';
import { Zap } from '@animateicons/vanilla/lucide/zap';

const icons = {
  'arrow-down-to-line': ArrowDownToLine,
  'arrow-right': ArrowRight,
  'book-open': BookOpen,
  bug: Bug,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'circle-alert': CircleAlert,
  'circle-check': CircleCheck,
  copy: Copy,
  download: Download,
  ellipsis: Ellipsis,
  eraser: Eraser,
  'external-link': ExternalLink,
  file: File,
  'file-archive': FileArchive,
  'file-code': FileCode,
  'file-image': FileImage,
  'file-text': FileText,
  folder: Folder,
  'folder-plus': FolderPlus,
  info: Info,
  'key-round': KeyRound,
  languages: Languages,
  'list-filter': ListFilter,
  lock: Lock,
  'log-out': LogOut,
  'panel-left': PanelLeft,
  pencil: Pencil,
  play: Play,
  plus: Plus,
  power: Power,
  'refresh-cw': RefreshCw,
  'rotate-cw': RotateCw,
  search: Search,
  'send-horizontal': SendHorizontal,
  terminal: Terminal,
  'trash-2': Trash2,
  'triangle-alert': TriangleAlert,
  upload: Upload,
  user: User,
  wrench: Wrench,
  x: X,
  zap: Zap
} satisfies Record<string, IconData>;

export type IconName = keyof typeof icons;

// Voxel rule: square caps, mitred joins, 1.75px stroke
function squareOff(svg: SVGSVGElement): void {
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'square');
  svg.setAttribute('stroke-linejoin', 'miter');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
}
</script>

<script lang="ts">
interface Props {
  name: IconName;
  size?: number;
  label?: string;
  /** Play the icon's motion when the closest button or link is hovered or pressed. */
  hover?: boolean;
  /** Play the icon's motion each time this turns true (e.g. refresh while loading, copy done). */
  play?: boolean;
  class?: string;
}

const { name, size = 16, label, hover = false, play, class: className = '' }: Props = $props();

let host = $state<HTMLSpanElement | null>(null);
let mounted: MountedIcon | null = null;
const animated = $derived(hover || play !== undefined);

$effect(() => {
  const el = host;
  if (!el) return;
  const data = icons[name];

  // Static icons skip the motion runtime entirely
  if (!animated) {
    const svg = renderIcon(data, size, el.ownerDocument);
    squareOff(svg);
    el.replaceChildren(svg);
    return () => svg.remove();
  }

  const icon = mountIcon(el, data, { size, isAnimated: false });
  const svg = el.querySelector('svg');
  if (svg) squareOff(svg);
  mounted = icon;

  const trigger = hover ? el.closest('button, a') : null;
  const start = () => icon.startAnimation();
  trigger?.addEventListener('pointerenter', start);
  trigger?.addEventListener('pointerdown', start);

  return () => {
    trigger?.removeEventListener('pointerenter', start);
    trigger?.removeEventListener('pointerdown', start);
    icon.destroy();
    mounted = null;
  };
});

$effect(() => {
  if (play) mounted?.startAnimation();
});
</script>

<span
  bind:this={host}
  class="inline-flex shrink-0 items-center justify-center {className}"
  style="width: {size}px; height: {size}px"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
></span>
