<script lang="ts">
  import LogOutIcon from '@lucide/svelte/icons/log-out';
  import StoreIcon from '@lucide/svelte/icons/store';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { NAV_ITEMS } from '$lib/navigation';
  import { auth } from '$lib/state/auth.svelte';
  import { notificationCenter } from '$lib/state/notification-center.svelte';
  import { cn } from '$lib/utils.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
  import NotificationBell from './notification-bell.svelte';

  const items = $derived(NAV_ITEMS.filter((item) => auth.can(item.permission)));

  function isActive(href: string): boolean {
    return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
  }

  async function logout() {
    notificationCenter.stop();
    auth.logout();
    await goto('/login');
  }
</script>

<header class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
  <div class="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
    <a href="/" class="flex items-center gap-2 font-semibold text-primary" data-testid="nav-brand">
      <StoreIcon class="size-5" />
      WaroenkQu
    </a>

    <nav class="flex flex-1 items-center gap-1 overflow-x-auto">
      {#each items as item (item.href)}
        <a
          href={item.href}
          class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), isActive(item.href) && 'bg-accent text-accent-foreground')}
          aria-current={isActive(item.href) ? 'page' : undefined}
          data-testid="nav-{item.href.slice(1)}"
        >
          {item.label}
        </a>
      {/each}
    </nav>

    <div class="flex items-center gap-2">
      {#if auth.can('notification:read')}
        <NotificationBell />
      {/if}
      <div class="hidden text-right text-sm leading-tight sm:block" data-testid="current-user">
        <div class="font-medium">{auth.user?.name}</div>
        <Badge variant="secondary" class="mt-0.5">{auth.user?.role === 'OWNER' ? 'Owner' : 'Kasir'}</Badge>
      </div>
      <Button variant="ghost" size="sm" onclick={logout} data-testid="logout-button">
        <LogOutIcon /> Keluar
      </Button>
    </div>
  </div>
</header>
