<script lang="ts" module>
  export type StockMode = 'in' | 'out';
</script>

<script lang="ts">
  import { ApiError } from '$lib/api/client';
  import { productsApi } from '$lib/api/endpoints';
  import type { Product } from '$lib/api/types';
  import { errorMessage } from '$lib/helpers/errors';
  import { numberOrNull } from '$lib/helpers/input';
  import ErrorAlert from '$lib/components/shared/error-alert.svelte';
  import FieldError from '$lib/components/shared/field-error.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';

  interface Props {
    open: boolean;
    mode: StockMode;
    product: Product;
    onsaved: (product: Product) => void;
  }

  let { open = $bindable(), mode, product, onsaved }: Props = $props();

  let quantity = $state<number | null>(null);
  let note = $state('');
  let submitting = $state(false);
  let error = $state<string | null>(null);
  let fieldErrors = $state<Record<string, string>>({});

  const isStockIn = $derived(mode === 'in');

  // Form dikosongkan setiap dialog dibuka
  $effect(() => {
    if (open) {
      quantity = null;
      note = '';
      error = null;
      fieldErrors = {};
    }
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    submitting = true;
    error = null;
    fieldErrors = {};
    try {
      const qty = numberOrNull(quantity);
      const { data } = isStockIn
        ? await productsApi.stockIn(product.id, qty, note.trim() || undefined)
        : await productsApi.stockOut(product.id, qty, note.trim());
      open = false;
      onsaved(data);
    } catch (err) {
      if (err instanceof ApiError) fieldErrors = err.fieldErrors;
      error =
        err instanceof ApiError && err.code === 'INSUFFICIENT_STOCK'
          ? `Stok tidak cukup. Stok saat ini ${product.stock}, tidak bisa dikurangi ${quantity}.`
          : errorMessage(err);
    } finally {
      submitting = false;
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md" data-testid="stock-dialog">
    <Dialog.Header>
      <Dialog.Title>{isStockIn ? 'Tambah stok' : 'Kurangi stok'}</Dialog.Title>
      <Dialog.Description>
        {product.name} · stok saat ini <strong data-testid="stock-dialog-current">{product.stock}</strong>. Perubahan stok
        langsung berlaku di kasir.
      </Dialog.Description>
    </Dialog.Header>

    <form class="grid gap-4" onsubmit={submit} novalidate>
      <ErrorAlert message={error} testid="stock-dialog-error" />
      <div class="grid gap-2">
        <Label for="stock-quantity">Jumlah</Label>
        <Input
          id="stock-quantity"
          type="number"
          min={1}
          step={1}
          bind:value={quantity}
          aria-invalid={!!fieldErrors.quantity}
          data-testid="stock-quantity-input"
        />
        <FieldError message={fieldErrors.quantity} />
      </div>
      <div class="grid gap-2">
        <Label for="stock-note">Catatan {isStockIn ? '(opsional)' : '(wajib)'}</Label>
        <Textarea
          id="stock-note"
          rows={2}
          bind:value={note}
          placeholder={isStockIn ? 'Contoh: restock dari supplier' : 'Contoh: barang rusak, kadaluarsa'}
          aria-invalid={!!fieldErrors.note}
          data-testid="stock-note-input"
        />
        <FieldError message={fieldErrors.note} />
      </div>
      <Dialog.Footer>
        <Button variant="outline" type="button" onclick={() => (open = false)}>Batal</Button>
        <Button type="submit" disabled={submitting} data-testid="stock-submit">
          {submitting ? 'Menyimpan...' : isStockIn ? 'Tambah stok' : 'Kurangi stok'}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
