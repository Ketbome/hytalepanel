<script lang="ts">
interface Props {
  checked: boolean;
  label: string;
  disabled?: boolean;
  title?: string;
  onchange: (checked: boolean) => void;
}

const { checked, label, disabled = false, title, onchange }: Props = $props();
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={label}
  {title}
  {disabled}
  class="hp-switch relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-xs"
  class:on={checked}
  onclick={() => onchange(!checked)}
>
  <span class="hp-thumb h-3.5 w-3.5"></span>
</button>

<style>
  .hp-switch {
    background: var(--hp-bg-sunken);
    border: 1px solid var(--hp-line-control);
    padding: 1px;
    cursor: pointer;
    transition:
      background-color var(--hp-dur-hover) ease,
      border-color var(--hp-dur-hover) ease;
  }

  .hp-thumb {
    background: var(--hp-fg-3);
    transition:
      transform var(--hp-dur-ui) var(--hp-ease-out),
      background-color var(--hp-dur-hover) ease;
  }

  .hp-switch.on {
    background: var(--hp-positive-bg);
    border-color: var(--hp-positive);
  }

  .hp-switch.on .hp-thumb {
    background: var(--hp-positive);
    transform: translateX(14px);
  }

  .hp-switch:disabled {
    cursor: not-allowed;
    border-color: var(--hp-line-1);
  }

  /* 44px touch target */
  @media (pointer: coarse) {
    .hp-switch::before {
      content: "";
      position: absolute;
      inset: -13px -6px;
    }
  }
</style>
