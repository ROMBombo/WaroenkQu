<script lang="ts">
  let { message, testid }: { message?: string; testid?: string } = $props();
</script>

{#if message}
  <p class="text-sm text-destructive" data-testid={testid}>{message}</p>
{/if}
