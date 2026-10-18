<script lang="ts">
  import { page } from '$app/state';
  import { breadcrumbs } from '$lib/navigation';
  import { auth } from '$lib/state/auth.svelte';
  import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import NotificationBell from './notification-bell.svelte';

  const crumbs = $derived(breadcrumbs(page.url.pathname));
</script>

<header class="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
  <Sidebar.Trigger class="-ml-1" data-testid="sidebar-toggle" />
  <Separator orientation="vertical" class="mr-2 data-vertical:h-4 data-vertical:self-center" />
  <Breadcrumb.Root>
    <Breadcrumb.List>
      {#each crumbs as crumb, index (crumb.label)}
        {#if index > 0}<Breadcrumb.Separator />{/if}
        <Breadcrumb.Item>
          {#if crumb.href}
            <Breadcrumb.Link href={crumb.href}>{crumb.label}</Breadcrumb.Link>
          {:else}
            <Breadcrumb.Page>{crumb.label}</Breadcrumb.Page>
          {/if}
        </Breadcrumb.Item>
      {/each}
    </Breadcrumb.List>
  </Breadcrumb.Root>
  <div class="ml-auto flex items-center gap-2">
    {#if auth.can('notification:read')}
      <NotificationBell />
    {/if}
  </div>
</header>
