<script lang="ts">
  import BellIcon from '@lucide/svelte/icons/bell';
  import CheckIcon from '@lucide/svelte/icons/check';
  import { onMount } from 'svelte';
  import { notificationsApi } from '$lib/api/endpoints';
  import type { Notification, NotificationListMeta } from '$lib/api/types';
  import { errorMessage } from '$lib/helpers/errors';
  import { formatDateTime } from '$lib/helpers/format';
  import { notificationCenter } from '$lib/state/notification-center.svelte';
  import ErrorAlert from '$lib/components/shared/error-alert.svelte';
  import PageHeader from '$lib/components/shared/page-header.svelte';
  import Pagination from '$lib/components/shared/pagination.svelte';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';

  let notifications = $state<Notification[]>([]);
  let meta = $state<NotificationListMeta | null>(null);
  let currentPage = $state(1);
  let error = $state<string | null>(null);

  async function load() {
    error = null;
    try {
      const response = await notificationsApi.list({ page: currentPage, limit: 10 });
      notifications = response.data;
      meta = response.meta;
    } catch (err) {
      error = errorMessage(err);
    }
  }

  async function markAsRead(id: string) {
    try {
      await notificationCenter.markAsRead(id);
      await load();
    } catch (err) {
      error = errorMessage(err);
    }
  }

  // Notifikasi baru dari WebSocket langsung ikut muncul di halaman pertama
  let lastSeenId = notificationCenter.latest[0]?.id;
  $effect(() => {
    const newestId = notificationCenter.latest[0]?.id;
    if (newestId && newestId !== lastSeenId) {
      lastSeenId = newestId;
      if (currentPage === 1) void load();
    }
  });

  onMount(load);
</script>

<svelte:head>
  <title>Notifikasi · WaroenkQu</title>
</svelte:head>

<PageHeader title="Notifikasi" description="Notifikasi stok menipis, maksimal satu per produk per hari.">
  {#snippet actions()}
    <Badge variant="secondary" data-testid="notification-page-unread">{meta?.unread_count ?? 0} belum dibaca</Badge>
  {/snippet}
</PageHeader>

<ErrorAlert message={error} testid="notification-error" />

<Card.Root>
  <Card.Content>
    <ul class="divide-y" data-testid="notification-list">
      {#each notifications as notification (notification.id)}
        <li
          class="flex items-center justify-between gap-4 px-2 py-3 {notification.is_read ? '' : 'rounded-md bg-accent/50'}"
          data-testid="notification-item"
        >
          <div class="flex items-start gap-3">
            <BellIcon class="mt-0.5 size-4 shrink-0 {notification.is_read ? 'text-muted-foreground' : 'text-primary'}" />
            <div>
              <p class="text-sm font-medium" data-testid="notification-message">{notification.message}</p>
              <p class="text-xs text-muted-foreground">{formatDateTime(notification.created_at)}</p>
            </div>
          </div>
          {#if notification.is_read}
            <Badge variant="outline" class="text-muted-foreground" data-testid="notification-read-badge">
              Dibaca {formatDateTime(notification.read_at)}
            </Badge>
          {:else}
            <Button
              variant="outline"
              size="sm"
              onclick={() => markAsRead(notification.id)}
              data-testid="notification-mark-read"
            >
              <CheckIcon /> Tandai dibaca
            </Button>
          {/if}
        </li>
      {:else}
        <li class="py-10 text-center text-sm text-muted-foreground">Belum ada notifikasi.</li>
      {/each}
    </ul>
    <Pagination
      {meta}
      onchange={(next) => {
        currentPage = next;
        void load();
      }}
    />
  </Card.Content>
</Card.Root>
