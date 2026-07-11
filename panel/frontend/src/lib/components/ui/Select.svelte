<script lang="ts">
import type { Snippet } from 'svelte';

interface SelectProps {
  value?: string;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  onchange?: (e: Event) => void;
  children?: Snippet;
  class?: string;
}

let {
  value = $bindable(''),
  disabled = false,
  id,
  'aria-label': ariaLabel,
  onchange,
  children,
  class: className = ''
}: SelectProps = $props();
</script>

<select
  {id}
  {disabled}
  aria-label={ariaLabel}
  bind:value
  onchange={onchange}
  class="mc-select disabled:opacity-50 disabled:cursor-not-allowed {className}"
>
  {@render children?.()}
</select>
