<script lang="ts">
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import MinusIcon from '@lucide/svelte/icons/minus';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import PowerIcon from '@lucide/svelte/icons/power';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { ApiError } from '$lib/api/client';
  import { productsApi } from '$lib/api/endpoints';
  import type { PaginationMeta, Product, ProductHistory } from '$lib/api/types';
  import { errorMessage } from '$lib/helpers/errors';
  import { HISTORY_ACTION_LABELS, effectiveMessage, formatDateTime, rupiah } from '$lib/helpers/format';
  import { numberOrNull } from '$lib/helpers/input';
  import { auth } from '$lib/state/auth.svelte';
  import DeleteProductDialog from '$lib/components/products/delete-product-dialog.svelte';
  import ProductForm, { type ProductFormValue } from '$lib/components/products/product-form.svelte';
  import ProductStatusBadges from '$lib/components/products/product-status-badges.svelte';
  import StockDialog, { type StockMode } from '$lib/components/products/stock-dialog.svelte';
  import EmptyRow from '$lib/components/shared/empty-row.svelte';
  import ErrorAlert from '$lib/components/shared/error-alert.svelte';
  import PageHeader from '$lib/components/shared/page-header.svelte';
  import Pagination from '$lib/components/shared/pagination.svelte';
  import * as Alert from '$lib/components/ui/alert/index.js';
  import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Skeleton } from '$lib/components/ui/skeleton/index.js';
  import * as Table from '$lib/components/ui/table/index.js';

  const id = $derived(page.params.id as string);

  let product = $state<Product | null>(null);
  let loadError = $state<string | null>(null);
  let notice = $state<string | null>(null);
  let actionError = $state<string | null>(null);

  let form = $state<ProductFormValue>({ name: '', price: null, min_stock: null, stock: null });
  let fieldErrors = $state<Record<string, string>>({});
  let saving = $state(false);

  let histories = $state<ProductHistory[]>([]);
  let historyMeta = $state<PaginationMeta | null>(null);
  let historyPage = $state(1);

  let stockDialogOpen = $state(false);
  let stockMode = $state<StockMode>('in');
  let deleteDialogOpen = $state(false);
  let busy = $state(false);

  function fillForm(p: Product) {
    form = { name: p.name, price: p.price, min_stock: p.min_stock, stock: null };
  }

  async function loadProduct() {
    loadError = null;
    try {
      product = (await productsApi.get(id)).data;
      fillForm(product);
    } catch (err) {
      loadError =
        err instanceof ApiError && err.code === 'PRODUCT_NOT_FOUND'
          ? 'Produk tidak ditemukan atau sudah dihapus.'
          : errorMessage(err);
    }
  }

  async function loadHistory() {
    if (!auth.can('product-history:read')) return;
    try {
      const response = await productsApi.history(id, { page: historyPage, limit: 10 });
      histories = response.data;
      historyMeta = response.meta;
    } catch {
      histories = [];
    }
  }

  /** Setelah perubahan: perbarui data dan tampilkan pesan (termasuk kapan berlaku di kasir). */
  function applyChange(updated: Product, message: string) {
    product = updated;
    fillForm(updated);
    notice = message;
    toast.success(message);
    void loadHistory();
  }

  async function save() {
    saving = true;
    actionError = null;
    fieldErrors = {};
    try {
      const { data, meta } = await productsApi.update(id, {
        name: form.name,
        price: numberOrNull(form.price),
        min_stock: numberOrNull(form.min_stock),
      });
      applyChange(data, effectiveMessage(meta.effective_at));
    } catch (err) {
      if (err instanceof ApiError) {
        fieldErrors =
          err.code === 'DUPLICATE_PRODUCT_NAME' ? { name: 'Nama produk sudah dipakai produk lain.' } : err.fieldErrors;
      }
      actionError = errorMessage(err);
    } finally {
      saving = false;
    }
  }

  async function toggleStatus() {
    if (!product) return;
    busy = true;
    actionError = null;
    try {
      const { data, meta } = await productsApi.setStatus(id, !product.is_active);
      applyChange(data, effectiveMessage(meta.effective_at));
    } catch (err) {
      actionError = errorMessage(err);
    } finally {
      busy = false;
    }
  }

  async function remove() {
    busy = true;
    actionError = null;
    try {
      const { meta } = await productsApi.remove(id);
      toast.success(`Produk dihapus. ${effectiveMessage(meta.effective_at)}`);
      await goto('/products');
    } catch (err) {
      actionError = errorMessage(err);
      deleteDialogOpen = false;
    } finally {
      busy = false;
    }
  }

  function openStockDialog(mode: StockMode) {
    stockMode = mode;
    stockDialogOpen = true;
  }

  function onStockSaved(updated: Product) {
    const label = stockMode === 'in' ? 'ditambah' : 'dikurangi';
    applyChange(updated, `Stok berhasil ${label}. Stok sekarang ${updated.stock} dan langsung berlaku di kasir.`);
  }

  onMount(() => {
    void loadProduct();
    void loadHistory();
  });
</script>

<svelte:head>
  <title>{product?.name ?? 'Produk'} · WaroenkQu</title>
</svelte:head>

<PageHeader title={product?.name ?? 'Detail produk'} testid="product-detail-title">
  {#snippet actions()}
    <a href="/products" class={buttonVariants({ variant: 'outline' })}><ArrowLeftIcon /> Kembali</a>
  {/snippet}
</PageHeader>

<ErrorAlert message={loadError} testid="product-detail-error" />

{#if !product && !loadError}
  <div class="grid gap-6 lg:grid-cols-2 lg:items-start">
    <Skeleton class="h-72 w-full" />
    <Skeleton class="h-72 w-full" />
  </div>
{/if}

{#if product}
  {#if notice}
    <Alert.Root class="mb-4 border-success/30 bg-success-soft text-success" data-testid="product-notice">
      <CircleCheckIcon />
      <Alert.Description class="text-success">{notice}</Alert.Description>
    </Alert.Root>
  {/if}
  <ErrorAlert message={actionError} testid="product-action-error" />

  <div class="grid gap-6 lg:grid-cols-2 lg:items-start">
    <Card.Root data-testid="product-detail">
      <Card.Header>
        <Card.Title>Informasi</Card.Title>
        <Card.Action><ProductStatusBadges {product} /></Card.Action>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
          <dt class="text-muted-foreground">Harga</dt>
          <dd class="font-medium" data-testid="product-detail-price">{rupiah(product.price)}</dd>
          <dt class="text-muted-foreground">Stok</dt>
          <dd class="font-medium" data-testid="product-detail-stock">{product.stock}</dd>
          <dt class="text-muted-foreground">Stok minimum</dt>
          <dd class="font-medium" data-testid="product-detail-min-stock">{product.min_stock}</dd>
          <dt class="text-muted-foreground">Dibuat</dt>
          <dd>{formatDateTime(product.created_at)}</dd>
          <dt class="text-muted-foreground">Terakhir diubah</dt>
          <dd>{formatDateTime(product.updated_at)}</dd>
        </dl>
      </Card.Content>
      <Card.Footer class="flex flex-wrap gap-2">
        {#if auth.can('product-stock:update')}
          <Button variant="outline" onclick={() => openStockDialog('in')} data-testid="stock-in-button">
            <PlusIcon /> Tambah stok
          </Button>
          <Button variant="outline" onclick={() => openStockDialog('out')} data-testid="stock-out-button">
            <MinusIcon /> Kurangi stok
          </Button>
        {/if}
        {#if auth.can('product-status:update')}
          <Button variant="outline" onclick={toggleStatus} disabled={busy} data-testid="toggle-status-button">
            <PowerIcon />
            {product.is_active ? 'Nonaktifkan' : 'Aktifkan'}
          </Button>
        {/if}
        {#if auth.can('product:delete')}
          <Button variant="destructive" onclick={() => (deleteDialogOpen = true)} data-testid="delete-button">
            <Trash2Icon /> Hapus
          </Button>
        {/if}
      </Card.Footer>
    </Card.Root>

    {#if auth.can('product:update')}
      <Card.Root>
        <Card.Header>
          <Card.Title>Ubah produk</Card.Title>
          <Card.Description>
            Perubahan nama, harga, dan stok minimum berlaku di kasir setelah publish katalog berikutnya.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <ProductForm
            bind:value={form}
            showStock={false}
            {fieldErrors}
            submitting={saving}
            submitLabel="Simpan perubahan"
            onsubmit={save}
          />
        </Card.Content>
      </Card.Root>
    {/if}
  </div>

  {#if auth.can('product-history:read')}
    <Card.Root class="mt-6">
      <Card.Header>
        <Card.Title>History perubahan</Card.Title>
        <Card.Description>Pengurangan stok dari transaksi kasir tidak dicatat di sini.</Card.Description>
      </Card.Header>
      <Card.Content>
        <Table.Root data-testid="product-history-table">
          <Table.Header>
            <Table.Row>
              <Table.Head>Waktu</Table.Head>
              <Table.Head>Aksi</Table.Head>
              <Table.Head class="text-right">Jumlah</Table.Head>
              <Table.Head>Catatan</Table.Head>
              <Table.Head>Nama</Table.Head>
              <Table.Head class="text-right">Harga</Table.Head>
              <Table.Head class="text-right">Stok</Table.Head>
              <Table.Head class="text-right">Stok min.</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Oleh</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each histories as history (history.id)}
              <Table.Row data-testid="product-history-row">
                <Table.Cell class="whitespace-nowrap">{formatDateTime(history.created_at)}</Table.Cell>
                <Table.Cell data-testid="product-history-action">
                  {HISTORY_ACTION_LABELS[history.action] ?? history.action}
                </Table.Cell>
                <Table.Cell class="text-right tabular-nums">{history.quantity ?? '-'}</Table.Cell>
                <Table.Cell>{history.note ?? '-'}</Table.Cell>
                <Table.Cell>{history.name}</Table.Cell>
                <Table.Cell class="text-right tabular-nums">{rupiah(history.price)}</Table.Cell>
                <Table.Cell class="text-right tabular-nums">{history.stock}</Table.Cell>
                <Table.Cell class="text-right tabular-nums">{history.min_stock}</Table.Cell>
                <Table.Cell>{history.is_active ? 'Aktif' : 'Nonaktif'}</Table.Cell>
                <Table.Cell>{history.changed_by.name}</Table.Cell>
              </Table.Row>
            {:else}
              <EmptyRow colspan={10} message="Belum ada history." />
            {/each}
          </Table.Body>
        </Table.Root>
        <Pagination
          meta={historyMeta}
          onchange={(next) => {
            historyPage = next;
            void loadHistory();
          }}
        />
      </Card.Content>
    </Card.Root>
  {/if}

  <StockDialog bind:open={stockDialogOpen} mode={stockMode} {product} onsaved={onStockSaved} />
  <DeleteProductDialog bind:open={deleteDialogOpen} productName={product.name} {busy} onconfirm={remove} />
{/if}
