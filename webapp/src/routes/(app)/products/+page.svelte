<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import SearchIcon from '@lucide/svelte/icons/search';
  import { onMount } from 'svelte';
  import { productsApi } from '$lib/api/endpoints';
  import type { PaginationMeta, Product } from '$lib/api/types';
  import { errorMessage } from '$lib/helpers/errors';
  import { rupiah } from '$lib/helpers/format';
  import { auth } from '$lib/state/auth.svelte';
  import ProductStatusBadges from '$lib/components/products/product-status-badges.svelte';
  import EmptyRow from '$lib/components/shared/empty-row.svelte';
  import ErrorAlert from '$lib/components/shared/error-alert.svelte';
  import PageHeader from '$lib/components/shared/page-header.svelte';
  import Pagination from '$lib/components/shared/pagination.svelte';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { buttonVariants } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as InputGroup from '$lib/components/ui/input-group/index.js';
  import * as Table from '$lib/components/ui/table/index.js';

  let products = $state<Product[]>([]);
  let meta = $state<PaginationMeta | null>(null);
  let search = $state('');
  let currentPage = $state(1);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  async function load() {
    loading = true;
    error = null;
    try {
      const response = await productsApi.list({ page: currentPage, limit: 10, search: search.trim() });
      products = response.data;
      meta = response.meta;
    } catch (err) {
      error = errorMessage(err);
    } finally {
      loading = false;
    }
  }

  function onSearchInput() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentPage = 1;
      void load();
    }, 300);
  }

  function goToPage(next: number) {
    currentPage = next;
    void load();
  }

  onMount(load);
</script>

<svelte:head>
  <title>Produk · WaroenkQu</title>
</svelte:head>

<PageHeader title="Produk" description="Perubahan produk berlaku di kasir setelah publish katalog berikutnya.">
  {#snippet actions()}
    {#if auth.can('product:create')}
      <a href="/products/new" class={buttonVariants()} data-testid="product-create-link"><PlusIcon /> Tambah produk</a>
    {/if}
  {/snippet}
</PageHeader>

<Card.Root>
  <Card.Header>
    <InputGroup.Root class="max-w-sm">
      <InputGroup.Input
        type="search"
        placeholder="Cari nama produk..."
        aria-label="Cari produk"
        bind:value={search}
        oninput={onSearchInput}
        data-testid="product-search-input"
      />
      <InputGroup.Addon><SearchIcon /></InputGroup.Addon>
    </InputGroup.Root>
  </Card.Header>
  <Card.Content>
    <ErrorAlert message={error} testid="product-list-error" />
    <Table.Root data-testid="product-table">
      <Table.Header>
        <Table.Row>
          <Table.Head>Nama</Table.Head>
          <Table.Head class="text-right">Harga</Table.Head>
          <Table.Head class="text-right">Stok</Table.Head>
          <Table.Head class="text-right">Stok min.</Table.Head>
          <Table.Head>Status</Table.Head>
          <Table.Head></Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each products as product (product.id)}
          <Table.Row data-testid="product-row">
            <Table.Cell class="font-medium" data-testid="product-row-name">{product.name}</Table.Cell>
            <Table.Cell class="text-right tabular-nums" data-testid="product-row-price">{rupiah(product.price)}</Table.Cell>
            <Table.Cell class="text-right tabular-nums" data-testid="product-row-stock">
              {#if product.stock <= product.min_stock}
                <Badge class="mr-1.5 bg-warning-soft text-warning">Menipis</Badge>
              {/if}
              {product.stock}
            </Table.Cell>
            <Table.Cell class="text-right tabular-nums" data-testid="product-row-min-stock">{product.min_stock}</Table.Cell>
            <Table.Cell><ProductStatusBadges {product} /></Table.Cell>
            <Table.Cell class="text-right">
              <a
                href="/products/{product.id}"
                class={buttonVariants({ variant: 'outline', size: 'sm' })}
                data-testid="product-row-detail"
              >
                Detail
              </a>
            </Table.Cell>
          </Table.Row>
        {:else}
          <EmptyRow
            colspan={6}
            message={loading ? 'Memuat...' : search ? 'Produk tidak ditemukan.' : 'Belum ada produk.'}
            testid="product-table-empty"
          />
        {/each}
      </Table.Body>
    </Table.Root>
    <Pagination {meta} onchange={goToPage} />
  </Card.Content>
</Card.Root>
