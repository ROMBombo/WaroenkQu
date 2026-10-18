<script lang="ts">
  import '../app.css';
  import { Toaster } from '$lib/components/ui/sonner/index.js';

  let { children } = $props();
</script>

{@render children()}

<Toaster richColors closeButton position="bottom-right" duration={6000} />
