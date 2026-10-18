<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    testid?: string;
  }

  let { title, description, actions, testid = 'page-title' }: Props = $props();
</script>

<div class="mb-6 flex flex-wrap items-end justify-between gap-4">
  <div class="space-y-1">
    <h1 class="text-2xl font-semibold tracking-tight" data-testid={testid}>{title}</h1>
    {#if description}
      <p class="text-sm text-muted-foreground">{description}</p>
    {/if}
  </div>
  {#if actions}
    <div class="flex flex-wrap items-center gap-2">{@render actions()}</div>
  {/if}
</div>
