<script lang="ts">
  import type { Product } from '$lib/api/types';
  import { Badge } from '$lib/components/ui/badge/index.js';

  let { product }: { product: Pick<Product, 'is_active' | 'publish_status'> } = $props();
</script>

<span class="inline-flex flex-wrap gap-1.5">
  {#if product.is_active}
    <Badge class="bg-success-soft text-success" data-testid="badge-status">Aktif</Badge>
  {:else}
    <Badge variant="secondary" class="text-muted-foreground" data-testid="badge-status">Nonaktif</Badge>
  {/if}
  {#if product.publish_status === 'PENDING'}
    <Badge class="bg-warning-soft text-warning" data-testid="badge-publish">Menunggu publish</Badge>
  {:else}
    <Badge variant="outline" data-testid="badge-publish">Sudah publish</Badge>
  {/if}
</span>
