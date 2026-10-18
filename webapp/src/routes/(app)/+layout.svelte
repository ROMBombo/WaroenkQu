<script lang="ts">
  import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { requiredPermission } from '$lib/navigation';
  import { auth } from '$lib/state/auth.svelte';
  import { notificationCenter } from '$lib/state/notification-center.svelte';
  import AppHeader from '$lib/components/layout/app-header.svelte';
  import { buttonVariants } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';

  let { children } = $props();

  const permission = $derived(requiredPermission(page.url.pathname));
  const allowed = $derived(permission === null || auth.can(permission));

  // Semua halaman di group (app) butuh login. Termasuk saat sesi berakhir (refresh token gagal).
  $effect(() => {
    if (!auth.isLoggedIn) {
      notificationCenter.stop();
      void goto('/login', { replaceState: true });
    }
  });

  // Notifikasi realtime hanya untuk role yang punya permission notification:read
  $effect(() => {
    if (auth.isLoggedIn) void notificationCenter.start();
  });
</script>

{#if auth.isLoggedIn}
  <div class="min-h-screen bg-muted/40">
    <AppHeader />
    <main class="mx-auto max-w-6xl px-4 py-8">
      {#if allowed}
        {@render children()}
      {:else}
        <Card.Root class="mx-auto max-w-md text-center" data-testid="forbidden-page">
          <Card.Header>
            <ShieldAlertIcon class="mx-auto size-10 text-muted-foreground" />
            <Card.Title>Tidak punya akses</Card.Title>
            <Card.Description>Halaman ini tidak tersedia untuk role Anda.</Card.Description>
          </Card.Header>
          <Card.Footer class="justify-center">
            <a href="/" class={buttonVariants({ variant: 'outline' })}>Kembali ke beranda</a>
          </Card.Footer>
        </Card.Root>
      {/if}
    </main>
  </div>
{/if}
