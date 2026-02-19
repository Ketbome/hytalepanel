<script lang="ts">
interface SkeletonProps {
  type?: 'text' | 'card' | 'button' | 'circle';
  height?: string;
  width?: string;
  className?: string;
}

let { type = 'text', height, width, className = '' }: SkeletonProps = $props();

const typeClasses = {
  text: 'h-4 rounded-sm',
  card: 'h-32 rounded-md',
  button: 'h-10 rounded-sm',
  circle: 'rounded-full aspect-square'
};

const baseClasses = 'bg-mc-panel animate-pulse';

const classes = $derived(() => {
  return `${baseClasses} ${typeClasses[type]} ${className}`.trim();
});

const style = $derived(() => {
  return [height && `height: ${height}`, width && `width: ${width}`].filter(Boolean).join('; ');
});
</script>

<div class={classes()} style={style()}></div>
