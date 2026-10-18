<script lang="ts">
  import StoreIcon from '@lucide/svelte/icons/store';
  import { page } from '$app/state';
  import { NAV_ITEMS, isNavItemActive } from '$lib/navigation';
  import { auth } from '$lib/state/auth.svelte';
  import { notificationCenter } from '$lib/state/notification-center.svelte';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import NavUser from './nav-user.svelte';

  const items = $derived(NAV_ITEMS.filter((item) => auth.can(item.permission)));
</script>

<Sidebar.Root collapsible="icon" data-testid="app-sidebar">
  <Sidebar.Header>
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton size="lg">
          {#snippet child({ props })}
            <a href="/" {...props} data-testid="nav-brand">
              <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <StoreIcon class="size-4" />
              </div>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">WaroenkQu</span>
                <span class="truncate text-xs text-muted-foreground">Sistem warung</span>
              </div>
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Header>

  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel>Menu</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each items as item (item.href)}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton isActive={isNavItemActive(item, page.url.pathname)} tooltipContent={item.label}>
                {#snippet child({ props })}
                  <a href={item.href} {...props} data-testid="nav-{item.href.slice(1)}">
                    <item.icon />
                    <span>{item.label}</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
              {#if item.href === '/notifications' && notificationCenter.unreadCount > 0}
                <Sidebar.MenuBadge class="bg-destructive text-white">{notificationCenter.unreadCount}</Sidebar.MenuBadge>
              {/if}
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>

  <Sidebar.Footer>
    <NavUser />
  </Sidebar.Footer>
  <Sidebar.Rail />
</Sidebar.Root>
