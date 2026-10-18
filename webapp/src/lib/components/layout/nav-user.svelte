<script lang="ts">
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
  import LogOutIcon from '@lucide/svelte/icons/log-out';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/state/auth.svelte';
  import { notificationCenter } from '$lib/state/notification-center.svelte';
  import * as Avatar from '$lib/components/ui/avatar/index.js';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';

  const sidebar = Sidebar.useSidebar();
  const roleLabel = $derived(auth.user?.role === 'OWNER' ? 'Owner' : 'Kasir');
  const initials = $derived(
    (auth.user?.name ?? '?')
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
  );

  async function logout() {
    notificationCenter.stop();
    auth.logout();
    await goto('/login');
  }
</script>

{#snippet identity()}
  <Avatar.Root class="size-8 rounded-lg">
    <Avatar.Fallback class="rounded-lg bg-primary text-xs text-primary-foreground">{initials}</Avatar.Fallback>
  </Avatar.Root>
  <div class="grid flex-1 text-left text-sm leading-tight">
    <span class="truncate font-medium">{auth.user?.name}</span>
    <span class="truncate text-xs text-muted-foreground">{auth.user?.username} · {roleLabel}</span>
  </div>
{/snippet}

<Sidebar.Menu>
  <Sidebar.MenuItem>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Sidebar.MenuButton
            {...props}
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            data-testid="user-menu"
          >
            {@render identity()}
            <ChevronsUpDownIcon class="ml-auto size-4" />
          </Sidebar.MenuButton>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
        side={sidebar.isMobile ? 'bottom' : 'right'}
        align="end"
        sideOffset={4}
      >
        <DropdownMenu.Label class="p-0 font-normal">
          <div class="flex items-center gap-2 px-1 py-1.5" data-testid="current-user">{@render identity()}</div>
        </DropdownMenu.Label>
        <DropdownMenu.Separator />
        <DropdownMenu.Item onSelect={logout} data-testid="logout-button">
          <LogOutIcon /> Keluar
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Sidebar.MenuItem>
</Sidebar.Menu>
