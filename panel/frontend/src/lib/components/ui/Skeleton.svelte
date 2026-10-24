<script lang="ts">
interface SkeletonProps {
  width?: string;
  height?: string;
  class?: string;
}

const { width = '100%', height = '10px', class: className = '' }: SkeletonProps = $props();
</script>

<span class="block bg-raised rounded-xs {className}" style="width: {width}; height: {height}" aria-hidden="true"></span>
