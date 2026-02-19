<script lang="ts">
interface SkeletonProps {
  type?: 'text' | 'card' | 'button' | 'circle';
  height?: string;
  width?: string;
  className?: string;
}

const { type = 'text', height, width, className = '' }: SkeletonProps = $props();

const typeClasses = {
  text: 'h-4',
  card: 'h-32',
  button: 'h-10',
  circle: 'aspect-square'
};

const baseClasses = 'bg-panel-light border-2 border-panel-border animate-pulse';

const classes = $derived(() => {
  return `${baseClasses} ${typeClasses[type]} ${className}`.trim();
});

const style = $derived(() => {
  return [height && `height: ${height}`, width && `width: ${width}`].filter(Boolean).join('; ');
});
</script>

<div class={classes()} style={style()}></div>
