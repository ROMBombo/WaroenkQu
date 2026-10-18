<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import XIcon from '@lucide/svelte/icons/x';
  import { onMount } from 'svelte';
  import { ApiError } from '$lib/api/client';
  import { catalogApi, transactionsApi } from '$lib/api/endpoints';
  import type { CatalogItem, CurrentCatalog, TransactionDetail } from '$lib/api/types';
  import { errorMessage } from '$lib/helpers/errors';
  import { formatDateTime, rupiah } from '$lib/helpers/format';
  import { numberOrNull } from '$lib/helpers/input';
  import ProductCombobox from '$lib/components/pos/product-combobox.svelte';
  import ErrorAlert from '$lib/components/shared/error-alert.svelte';
  import PageHeader from '$lib/components/shared/page-header.svelte';
  import * as Alert from '$lib/components/ui/alert/index.js';
  import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import * as Table from '$lib/components/ui/table/index.js';

  interface Line {
    key: number;
    productId: string | null;
    quantity: number | null;
  }

  // Katalog diambil SEKALI saat halaman dibuka lalu disimpan di state (lihat readme bagian Webapp)
  let catalog = $state<CurrentCatalog | null>(null);
  let catalogError = $state<string | null>(null);

  let nextKey = 1;
  let lines = $state<Line[]>([{ key: 0, productId: null, quantity: 1 }]);
  let paid = $state<number | null>(null);
  let submitting = $state(false);
  let error = $state<string | null>(null);
  let warning = $state<string | null>(null);
  let receipt = $state<TransactionDetail | null>(null);

  const productsById = $derived(new Map((catalog?.products ?? []).map((p) => [p.id, p])));
  const pricedLines = $derived(
    lines.map((line) => {
      const product = line.productId ? productsById.get(line.productId) : undefined;
      const quantity = numberOrNull(line.quantity) ?? 0;
      return { ...line, product, subtotal: product ? product.price * quantity : 0 };
    }),
  );
  const selectedIds = $derived(lines.map((l) => l.productId).filter((id): id is string => id !== null));
  const total = $derived(pricedLines.reduce((sum, line) => sum + line.subtotal, 0));
  const paidAmount = $derived(numberOrNull(paid) ?? 0);
  const change = $derived(paidAmount - total);
  const linesValid = $derived(
    pricedLines.every((l) => l.product && Number.isInteger(Number(l.quantity)) && Number(l.quantity) >= 1),
  );
  // Tombol bayar tidak aktif kalau uang dibayar kurang dari total
  const canPay = $derived(catalog !== null && linesValid && total > 0 && paidAmount >= total && !submitting);

  async function loadCatalog() {
    catalogError = null;
    try {
      catalog = (await catalogApi.current()).data;
    } catch (err) {
      catalog = null;
      catalogError = errorMessage(err);
    }
  }

  function addLine() {
    lines.push({ key: nextKey++, productId: null, quantity: 1 });
  }

  function removeLine(key: number) {
    lines = lines.filter((line) => line.key !== key);
    if (lines.length === 0) addLine();
  }

  function selectProduct(key: number, product: CatalogItem) {
    const line = lines.find((l) => l.key === key);
    if (line) line.productId = product.id;
  }

  function resetForm() {
    lines = [{ key: nextKey++, productId: null, quantity: 1 }];
    paid = null;
  }

  /** Setelah katalog dimuat ulang, buang baris yang produknya sudah tidak ada di katalog baru. */
  function dropUnavailableLines(): number {
    const before = lines.length;
    lines = lines.filter((l) => !l.productId || productsById.has(l.productId));
    const removed = before - lines.length;
    if (lines.length === 0) addLine();
    return removed;
  }

  async function pay(event: SubmitEvent) {
    event.preventDefault();
    if (!catalog || !canPay) return;
    submitting = true;
    error = null;
    warning = null;
    receipt = null;
    try {
      const { data } = await transactionsApi.create({
        catalog_publish_id: catalog.catalog_publish_id,
        items: pricedLines.map((l) => ({ product_id: l.productId as string, quantity: Number(l.quantity) })),
        paid_amount: paidAmount,
      });
      receipt = data;
      resetForm();
    } catch (err) {
      await handlePayError(err);
    } finally {
      submitting = false;
    }
  }

  async function handlePayError(err: unknown) {
    if (err instanceof ApiError && (err.code === 'CATALOG_OUTDATED' || err.code === 'PRODUCT_NOT_IN_CATALOG')) {
      // Sudah ada publish baru: muat ulang katalog, hitung ulang total, kasir mengecek ulang sebelum bayar lagi
      await loadCatalog();
      const removed = dropUnavailableLines();
      warning =
        'Katalog sudah diperbarui. Harga dan total sudah dihitung ulang, periksa kembali sebelum bayar.' +
        (removed ? ` ${removed} produk sudah tidak dijual dan dihapus dari daftar.` : '');
      return;
    }
    if (err instanceof ApiError && err.code === 'INSUFFICIENT_STOCK') {
      const details = err.details as { product_name?: string; available?: number } | undefined;
      error = `Stok ${details?.product_name ?? 'produk'} tidak cukup (tersisa ${details?.available ?? 0}). Transaksi dibatalkan.`;
      return;
    }
    error = errorMessage(err);
  }

  onMount(loadCatalog);
</script>

<svelte:head>
  <title>Kasir · WaroenkQu</title>
</svelte:head>

<PageHeader
  title="Transaksi baru"
  description={catalog ? `Katalog ${formatDateTime(catalog.published_at)} · ${catalog.products.length} produk` : undefined}
  testid="pos-title"
/>

{#if catalogError}
  <Card.Root class="mb-6">
    <Card.Content class="grid gap-4">
      <ErrorAlert message={catalogError} testid="pos-catalog-error" />
      <div>
        <Button variant="outline" onclick={loadCatalog} data-testid="pos-catalog-retry"><RefreshCwIcon /> Muat ulang katalog</Button>
      </div>
    </Card.Content>
  </Card.Root>
{/if}

{#if receipt}
  <Card.Root class="mb-6 border-success/30 bg-success-soft" data-testid="pos-receipt">
    <Card.Header>
      <Card.Title class="flex items-center gap-2 text-success"><CircleCheckIcon class="size-5" /> Transaksi berhasil</Card.Title>
    </Card.Header>
    <Card.Content>
      <dl class="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        <dt class="text-muted-foreground">Total</dt>
        <dd class="font-medium tabular-nums" data-testid="pos-receipt-total">{rupiah(receipt.total)}</dd>
        <dt class="text-muted-foreground">Uang dibayar</dt>
        <dd class="tabular-nums" data-testid="pos-receipt-paid">{rupiah(receipt.paid_amount)}</dd>
        <dt class="text-muted-foreground">Kembalian</dt>
        <dd class="text-lg font-semibold tabular-nums" data-testid="pos-receipt-change">{rupiah(receipt.change_amount)}</dd>
      </dl>
    </Card.Content>
    <Card.Footer class="gap-2">
      <a href="/transactions/{receipt.id}" class={buttonVariants({ variant: 'outline', size: 'sm' })} data-testid="pos-receipt-detail">
        Lihat detail
      </a>
      <Button variant="ghost" size="sm" onclick={() => (receipt = null)} data-testid="pos-receipt-close">Tutup</Button>
    </Card.Footer>
  </Card.Root>
{/if}

{#if catalog}
  <form onsubmit={pay} novalidate data-testid="pos-form">
    {#if warning}
      <Alert.Root class="mb-4 border-warning/30 bg-warning-soft text-warning" data-testid="pos-warning">
        <TriangleAlertIcon />
        <Alert.Description class="text-warning">{warning}</Alert.Description>
      </Alert.Root>
    {/if}
    <ErrorAlert message={error} testid="pos-error" />

    <div class="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
      <Card.Root>
        <Card.Header>
          <Card.Title>Daftar belanja</Card.Title>
          {#if catalog.products.length === 0}
            <Card.Description>Katalog belum berisi produk. Produk baru bisa dijual setelah publish berikutnya.</Card.Description>
          {/if}
        </Card.Header>
        <Card.Content>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head class="w-[45%]">Produk</Table.Head>
                <Table.Head class="text-right">Harga</Table.Head>
                <Table.Head class="w-28">Jumlah</Table.Head>
                <Table.Head class="text-right">Subtotal</Table.Head>
                <Table.Head class="w-10"></Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each pricedLines as line, index (line.key)}
                <Table.Row data-testid="pos-line">
                  <Table.Cell>
                    <ProductCombobox
                      products={catalog.products}
                      excludeIds={selectedIds}
                      selectedId={line.productId}
                      onselect={(product) => selectProduct(line.key, product)}
                      testid="pos-product-{index}"
                    />
                  </Table.Cell>
                  <Table.Cell class="text-right tabular-nums" data-testid="pos-line-price">
                    {line.product ? rupiah(line.product.price) : '-'}
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      bind:value={lines[index].quantity}
                      aria-label="Jumlah"
                      data-testid="pos-quantity-{index}"
                    />
                  </Table.Cell>
                  <Table.Cell class="text-right font-medium tabular-nums" data-testid="pos-line-subtotal">
                    {rupiah(line.subtotal)}
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Hapus baris"
                      onclick={() => removeLine(line.key)}
                      data-testid="pos-remove-line-{index}"
                    >
                      <XIcon />
                    </Button>
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </Card.Content>
        <Card.Footer>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onclick={addLine}
            disabled={selectedIds.length >= catalog.products.length}
            data-testid="pos-add-line"
          >
            <PlusIcon /> Tambah produk
          </Button>
        </Card.Footer>
      </Card.Root>

      <Card.Root class="h-fit lg:sticky lg:top-20">
        <Card.Header>
          <Card.Title>Pembayaran</Card.Title>
        </Card.Header>
        <Card.Content class="grid gap-4">
          <div class="flex items-baseline justify-between">
            <span class="text-sm text-muted-foreground">Total</span>
            <span class="text-3xl font-semibold text-primary tabular-nums" data-testid="pos-total">{rupiah(total)}</span>
          </div>
          <Separator />
          <div class="grid gap-2">
            <Label for="paid">Uang dibayar (Rp)</Label>
            <Input
              id="paid"
              type="number"
              min={0}
              step={1}
              bind:value={paid}
              aria-invalid={paid !== null && total > 0 && paidAmount < total}
              data-testid="pos-paid-input"
            />
            {#if paid !== null && total > 0 && paidAmount < total}
              <p class="text-sm text-destructive" data-testid="pos-paid-error">Uang dibayar kurang {rupiah(total - paidAmount)}.</p>
            {/if}
          </div>
          <div class="flex items-baseline justify-between">
            <span class="text-sm text-muted-foreground">Kembalian</span>
            <span class="text-lg font-semibold tabular-nums" data-testid="pos-change">
              {change >= 0 && total > 0 ? rupiah(change) : '-'}
            </span>
          </div>
        </Card.Content>
        <Card.Footer>
          <Button type="submit" size="lg" class="w-full" disabled={!canPay} data-testid="pos-pay-button">
            {submitting ? 'Memproses...' : 'Bayar'}
          </Button>
        </Card.Footer>
      </Card.Root>
    </div>
  </form>
{/if}
