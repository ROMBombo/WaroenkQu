<script lang="ts">
  import { goto } from '$app/navigation';
  import { homePath } from '$lib/navigation';
  import { auth } from '$lib/state/auth.svelte';

  // Beranda: langsung ke halaman awal sesuai role (kasir -> /pos, owner -> /products)
  $effect(() => {
    if (auth.user) void goto(homePath(auth.user), { replaceState: true });
  });
</script>
