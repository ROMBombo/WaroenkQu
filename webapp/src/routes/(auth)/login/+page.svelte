<script lang="ts">
  import StoreIcon from '@lucide/svelte/icons/store';
  import { auth } from '$lib/state/auth.svelte';
  import ErrorAlert from '$lib/components/shared/error-alert.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';

  let username = $state('');
  let password = $state('');
  let submitting = $state(false);
  let error = $state<string | null>(null);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    submitting = true;
    const failure = await auth.login(username.trim(), password);
    submitting = false;
    if (!failure) return; // layout (auth) mengarahkan ke halaman awal sesuai role
    error =
      failure.status === 401
        ? 'Username atau password salah.'
        : failure.status === 0
          ? 'Tidak bisa terhubung ke server.'
          : 'Login gagal, coba lagi.';
  }
</script>

<svelte:head>
  <title>Login · WaroenkQu</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-accent to-background p-4">
  <Card.Root class="w-full max-w-sm">
    <Card.Header class="text-center">
      <div class="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <StoreIcon class="size-6" />
      </div>
      <Card.Title class="text-2xl">WaroenkQu</Card.Title>
      <Card.Description>Masuk sebagai owner atau kasir.</Card.Description>
    </Card.Header>
    <Card.Content>
      <form class="grid gap-4" onsubmit={submit} data-testid="login-form">
        <ErrorAlert message={error} testid="login-error" />
        <div class="grid gap-2">
          <Label for="username">Username</Label>
          <Input id="username" bind:value={username} autocomplete="username" required data-testid="login-username" />
        </div>
        <div class="grid gap-2">
          <Label for="password">Password</Label>
          <Input
            id="password"
            type="password"
            bind:value={password}
            autocomplete="current-password"
            required
            data-testid="login-password"
          />
        </div>
        <Button type="submit" class="w-full" disabled={submitting} data-testid="login-submit">
          {submitting ? 'Memproses...' : 'Masuk'}
        </Button>
      </form>
    </Card.Content>
  </Card.Root>
</div>
