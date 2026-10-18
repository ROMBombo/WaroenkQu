<script lang="ts">
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import type { PaginationMeta } from '$lib/api/types';
  import { Button } from '$lib/components/ui/button/index.js';

  interface Props {
    meta: PaginationMeta | null;
    onchange: (page: number) => void;
  }

  let { meta, onchange }: Props = $props();
</script>

{#if meta && meta.total_pages > 1}
  <nav class="flex items-center justify-end gap-3 pt-4 text-sm" aria-label="Halaman" data-testid="pagination">
    <span class="text-muted-foreground" data-testid="pagination-info">
      Halaman {meta.page} dari {meta.total_pages} · {meta.total} data
    </span>
    <Button
      variant="outline"
      size="sm"
      disabled={meta.page <= 1}
      onclick={() => onchange(meta.page - 1)}
      data-testid="pagination-prev"
    >
      <ChevronLeftIcon /> Sebelumnya
    </Button>
    <Button
      variant="outline"
      size="sm"
      disabled={meta.page >= meta.total_pages}
      onclick={() => onchange(meta.page + 1)}
      data-testid="pagination-next"
    >
      Berikutnya <ChevronRightIcon />
    </Button>
  </nav>
{/if}
