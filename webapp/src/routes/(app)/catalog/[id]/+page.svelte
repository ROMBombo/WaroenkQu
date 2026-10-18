<script lang="ts">
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { catalogApi } from '$lib/api/endpoints';
  import type { CatalogHistoryDetail } from '$lib/api/types';
  import { errorMessage } from '$lib/helpers/errors';
  import { formatDateTime, rupiah } from '$lib/helpers/format';
  import EmptyRow from '$lib/components/shared/empty-row.svelte';
  import ErrorAlert from '$lib/components/shared/error-alert.svelte';
  import PageHeader from '$lib/components/shared/page-header.svelte';
  import { buttonVariants } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Table from '$lib/components/ui/table/index.js';

  let catalog = $state<CatalogHistoryDetail | null>(null);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      catalog = (await catalogApi.historyDetail(page.params.id as string)).data;
    } catch (err) {
      error = errorMessage(err);
    }
  });
</script>

<svelte:head>
  <title>Isi katalog · WaroenkQu</title>
</svelte:head>

<PageHeader
  title="Isi katalog"
  description={catalog ? `Dipublish ${formatDateTime(catalog.published_at)} · ${catalog.products.length} produk` : undefined}
>
  {#snippet actions()}
    <a href="/catalog" class={buttonVariants({ variant: 'outline' })}><ArrowLeftIcon /> Kembali</a>
  {/snippet}
</PageHeader>

<ErrorAlert message={error} testid="catalog-detail-error" />

{#if catalog}
  <Card.Root>
    <Card.Content>
      <Table.Root data-testid="catalog-detail-table">
        <Table.Header>
          <Table.Row>
            <Table.Head>Nama</Table.Head>
            <Table.Head class="text-right">Harga</Table.Head>
            <Table.Head class="text-right">Stok minimum</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each catalog.products as product (product.id)}
            <Table.Row data-testid="catalog-detail-row">
              <Table.Cell class="font-medium">{product.name}</Table.Cell>
              <Table.Cell class="text-right tabular-nums">{rupiah(product.price)}</Table.Cell>
              <Table.Cell class="text-right tabular-nums">{product.min_stock}</Table.Cell>
            </Table.Row>
          {:else}
            <EmptyRow colspan={3} message="Katalog ini kosong." />
          {/each}
        </Table.Body>
      </Table.Root>
    </Card.Content>
  </Card.Root>
{/if}
