<script lang="ts">
interface InputProps {
  type?: 'text' | 'password' | 'email' | 'number';
  placeholder?: string;
  value?: string | number;
  disabled?: boolean;
  autocomplete?: string;
  id?: string;
  required?: boolean;
  min?: number;
  max?: number;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  class?: string;
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
  min,
  max,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid = false,
  class: className = '',
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
  {min}
  {max}
  autocomplete={autocomplete as any}
  {id}
  aria-label={ariaLabel}
  aria-invalid={ariaInvalid}
  bind:value
  oninput={oninput}
  onkeydown={onkeydown}
  onblur={onblur}
  onfocus={onfocus}
  class="mc-input disabled:opacity-50 disabled:cursor-not-allowed aria-[invalid=true]:border-error {className}"
/>
