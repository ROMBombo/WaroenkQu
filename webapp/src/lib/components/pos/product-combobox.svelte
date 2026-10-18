<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
  import { tick } from 'svelte';
  import type { CatalogItem } from '$lib/api/types';
  import { rupiah } from '$lib/helpers/format';
  import { cn } from '$lib/utils.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Command from '$lib/components/ui/command/index.js';
  import * as Popover from '$lib/components/ui/popover/index.js';

  interface Props {
    products: CatalogItem[];
    /** Produk yang sudah dipilih di baris lain tidak ditampilkan (satu produk sekali per transaksi). */
    excludeIds: string[];
    selectedId: string | null;
    onselect: (product: CatalogItem) => void;
    testid: string;
  }

  let { products, excludeIds, selectedId, onselect, testid }: Props = $props();

  let open = $state(false);
  let triggerRef = $state<HTMLButtonElement | null>(null);

  const selected = $derived(products.find((p) => p.id === selectedId) ?? null);
  const options = $derived(products.filter((p) => !excludeIds.includes(p.id) || p.id === selectedId));

  // Pola combobox shadcn: setelah memilih, popover ditutup dan fokus kembali ke tombol
  function choose(product: CatalogItem) {
    onselect(product);
    open = false;
    void tick().then(() => triggerRef?.focus());
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger bind:ref={triggerRef}>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        class="w-full justify-between font-normal"
        data-testid={testid}
      >
        <span class={cn('truncate', !selected && 'text-muted-foreground')}>{selected?.name ?? 'Pilih produk...'}</span>
        <ChevronsUpDownIcon class="opacity-50" />
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-(--bits-popover-anchor-width) min-w-64 p-0" align="start">
    <Command.Root>
      <Command.Input placeholder="Cari produk..." data-testid="{testid}-search" />
      <Command.List data-testid="{testid}-options">
        <Command.Empty>Produk tidak ditemukan.</Command.Empty>
        <Command.Group>
          {#each options as product (product.id)}
            <Command.Item value="{product.name} {product.id}" onSelect={() => choose(product)} data-testid="{testid}-option">
              <CheckIcon class={cn(product.id !== selectedId && 'text-transparent')} />
              <span class="flex-1 truncate">{product.name}</span>
              <span class="text-xs text-muted-foreground tabular-nums">{rupiah(product.price)}</span>
            </Command.Item>
          {/each}
        </Command.Group>
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
