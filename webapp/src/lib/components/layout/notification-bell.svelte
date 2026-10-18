<script lang="ts">
  import BellIcon from '@lucide/svelte/icons/bell';
  import { formatDateTime } from '$lib/helpers/format';
  import { notificationCenter } from '$lib/state/notification-center.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="icon"
        class="relative"
        aria-label="Notifikasi ({notificationCenter.unreadCount} belum dibaca)"
        data-testid="notification-bell"
      >
        <BellIcon class="size-5" />
        {#if notificationCenter.unreadCount > 0}
          <span
            class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white"
            data-testid="notification-unread-count"
          >
            {notificationCenter.unreadCount}
          </span>
        {/if}
        <span
          class="absolute right-1 bottom-1 size-1.5 rounded-full {notificationCenter.connected ? 'bg-success' : 'bg-muted-foreground/50'}"
          title={notificationCenter.connected ? 'Realtime aktif' : 'Menyambungkan...'}
        ></span>
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" class="w-80" data-testid="notification-dropdown">
    <DropdownMenu.Label>Notifikasi</DropdownMenu.Label>
    <DropdownMenu.Separator />
    {#each notificationCenter.latest as notification (notification.id)}
      <DropdownMenu.Item
        class="flex flex-col items-start gap-0.5 {notification.is_read ? '' : 'bg-accent/60'}"
        onSelect={() => void notificationCenter.markAsRead(notification.id).catch(() => undefined)}
        data-testid="notification-dropdown-item"
      >
        <span class="text-sm">{notification.message}</span>
        <span class="text-xs text-muted-foreground">{formatDateTime(notification.created_at)}</span>
      </DropdownMenu.Item>
    {:else}
      <p class="px-2 py-4 text-center text-sm text-muted-foreground">Belum ada notifikasi.</p>
    {/each}
    <DropdownMenu.Separator />
    <DropdownMenu.Item>
      {#snippet child({ props })}
        <a href="/notifications" {...props} data-testid="notification-see-all">Lihat semua notifikasi</a>
      {/snippet}
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
