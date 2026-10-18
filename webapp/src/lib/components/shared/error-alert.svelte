<script lang="ts">
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import * as Alert from '$lib/components/ui/alert/index.js';

  interface Props {
    message: string | null;
    title?: string;
    testid?: string;
  }

  let { message, title, testid = 'error-alert' }: Props = $props();
</script>

{#if message}
  <Alert.Root variant="destructive" class="mb-4" data-testid={testid}>
    <CircleAlertIcon />
    {#if title}<Alert.Title>{title}</Alert.Title>{/if}
    <Alert.Description>{message}</Alert.Description>
  </Alert.Root>
{/if}
