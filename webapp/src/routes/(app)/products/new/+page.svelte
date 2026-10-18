<script lang="ts">
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import InfoIcon from '@lucide/svelte/icons/info';
  import { toast } from 'svelte-sonner';
  import { goto } from '$app/navigation';
  import { ApiError } from '$lib/api/client';
  import { productsApi } from '$lib/api/endpoints';
  import { errorMessage } from '$lib/helpers/errors';
  import { effectiveMessage } from '$lib/helpers/format';
  import { numberOrNull } from '$lib/helpers/input';
  import ProductForm, { type ProductFormValue } from '$lib/components/products/product-form.svelte';
  import ErrorAlert from '$lib/components/shared/error-alert.svelte';
  import PageHeader from '$lib/components/shared/page-header.svelte';
  import * as Alert from '$lib/components/ui/alert/index.js';
  import { buttonVariants } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';

  let value = $state<ProductFormValue>({ name: '', price: null, min_stock: null, stock: null });
  let fieldErrors = $state<Record<string, string>>({});
  let error = $state<string | null>(null);
  let submitting = $state(false);

  async function submit() {
    submitting = true;
    error = null;
    fieldErrors = {};
    try {
      const { data, meta } = await productsApi.create({
        name: value.name,
        price: numberOrNull(value.price),
        stock: numberOrNull(value.stock),
        min_stock: numberOrNull(value.min_stock),
      });
      toast.success(effectiveMessage(meta.effective_at));
      await goto(`/products/${data.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        fieldErrors =
          err.code === 'DUPLICATE_PRODUCT_NAME' ? { name: 'Nama produk sudah dipakai produk lain.' } : err.fieldErrors;
      }
      error = errorMessage(err);
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Tambah produk · WaroenkQu</title>
</svelte:head>

<PageHeader title="Tambah produk">
  {#snippet actions()}
    <a href="/products" class={buttonVariants({ variant: 'outline' })}><ArrowLeftIcon /> Kembali</a>
  {/snippet}
</PageHeader>

<Card.Root class="max-w-xl">
  <Card.Content class="grid gap-4">
    <Alert.Root>
      <InfoIcon />
      <Alert.Description>Produk baru bisa dijual kasir setelah publish katalog berikutnya.</Alert.Description>
    </Alert.Root>
    <ErrorAlert message={error} testid="product-form-error" />
    <ProductForm bind:value showStock {fieldErrors} {submitting} submitLabel="Simpan produk" onsubmit={submit} />
  </Card.Content>
</Card.Root>
