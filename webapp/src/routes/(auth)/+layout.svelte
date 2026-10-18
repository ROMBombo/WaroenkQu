<script lang="ts">
  import { goto } from '$app/navigation';
  import { homePath } from '$lib/navigation';
  import { auth } from '$lib/state/auth.svelte';

  let { children } = $props();

  // Sudah login: langsung ke halaman awal sesuai role
  $effect(() => {
    if (auth.user) void goto(homePath(auth.user), { replaceState: true });
  });
</script>

{#if !auth.isLoggedIn}
  {@render children()}
{/if}
