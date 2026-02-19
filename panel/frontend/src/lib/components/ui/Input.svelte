<script lang="ts">
interface InputProps {
  type?: 'text' | 'password' | 'email' | 'number';
  placeholder?: string;
  value?: string;
  disabled?: boolean;
  autocomplete?: string;
  id?: string;
  required?: boolean;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  oninput?: (e: Event) => void;
  onkeydown?: (e: KeyboardEvent) => void;
  onblur?: (e: FocusEvent) => void;
  onfocus?: (e: FocusEvent) => void;
}

let {
  type = 'text',
  placeholder,
  value = $bindable(''),
  disabled = false,
  autocomplete,
  id,
  required = false,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid = false,
  oninput,
  onkeydown,
  onblur,
  onfocus
}: InputProps = $props();
</script>

<input
  {type}
  {placeholder}
  {disabled}
  {required}
  autocomplete={autocomplete as any}
  {id}
  aria-label={ariaLabel}
  aria-invalid={ariaInvalid}
  bind:value
  oninput={oninput}
  onkeydown={onkeydown}
  onblur={onblur}
  onfocus={onfocus}
  class="w-full px-4 py-2.5 bg-mc-darker font-[var(--font-mono)] text-base text-white border-[3px] border-t-mc-dark border-l-mc-dark border-r-mc-panel-light border-b-mc-panel-light rounded-none focus:outline-none focus:ring-2 focus:ring-hytale-orange focus:border-hytale-orange placeholder:text-text-dim disabled:opacity-50 aria-[invalid=true]:border-error aria-[invalid=true]:focus:ring-error"
/>
