<script lang="ts" module>
  export interface ProductFormValue {
    name: string;
    price: number | null;
    min_stock: number | null;
    stock: number | null;
  }
</script>

<script lang="ts">
  import FieldError from '$lib/components/shared/field-error.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';

  interface Props {
    value: ProductFormValue;
    /** Stok hanya diisi saat membuat produk. Setelah itu lewat tambah/kurang stok. */
    showStock: boolean;
    fieldErrors: Record<string, string>;
    submitting: boolean;
    submitLabel: string;
    onsubmit: () => void;
  }

  let { value = $bindable(), showStock, fieldErrors, submitting, submitLabel, onsubmit }: Props = $props();

  function submit(event: SubmitEvent) {
    event.preventDefault();
    onsubmit();
  }
</script>

<form class="grid gap-5" onsubmit={submit} novalidate data-testid="product-form">
  <div class="grid gap-2">
    <Label for="product-name">Nama produk</Label>
    <Input
      id="product-name"
      bind:value={value.name}
      maxlength={50}
      aria-invalid={!!fieldErrors.name}
      data-testid="product-name-input"
    />
    <p class="text-xs text-muted-foreground">Maksimal 50 karakter, tidak boleh sama dengan produk lain.</p>
    <FieldError message={fieldErrors.name} testid="product-name-error" />
  </div>

  <div class="grid gap-2">
    <Label for="product-price">Harga (Rp)</Label>
    <Input
      id="product-price"
      type="number"
      bind:value={value.price}
      min={100}
      max={1000000}
      step={1}
      aria-invalid={!!fieldErrors.price}
      data-testid="product-price-input"
    />
    <p class="text-xs text-muted-foreground">Rp100 sampai Rp1.000.000.</p>
    <FieldError message={fieldErrors.price} testid="product-price-error" />
  </div>

  <div class="grid gap-4 sm:grid-cols-2">
    {#if showStock}
      <div class="grid gap-2">
        <Label for="product-stock">Stok awal</Label>
        <Input
          id="product-stock"
          type="number"
          bind:value={value.stock}
          min={0}
          step={1}
          aria-invalid={!!fieldErrors.stock}
          data-testid="product-stock-input"
        />
        <FieldError message={fieldErrors.stock} testid="product-stock-error" />
      </div>
    {/if}
    <div class="grid gap-2">
      <Label for="product-min-stock">Stok minimum</Label>
      <Input
        id="product-min-stock"
        type="number"
        bind:value={value.min_stock}
        min={0}
        step={1}
        aria-invalid={!!fieldErrors.min_stock}
        data-testid="product-min-stock-input"
      />
      <FieldError message={fieldErrors.min_stock} testid="product-min-stock-error" />
    </div>
  </div>
  <p class="-mt-3 text-xs text-muted-foreground">
    Owner mendapat notifikasi saat stok sama dengan atau di bawah stok minimum.
  </p>

  <div>
    <Button type="submit" disabled={submitting} data-testid="product-submit">
      {submitting ? 'Menyimpan...' : submitLabel}
    </Button>
  </div>
</form>
