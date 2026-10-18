<script lang="ts">
  import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
  import HistoryIcon from '@lucide/svelte/icons/history';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { onMount } from 'svelte';
  import { catalogApi } from '$lib/api/endpoints';
  import type { CatalogHistoryItem, PaginationMeta, PublishInfo } from '$lib/api/types';
  import { errorMessage } from '$lib/helpers/errors';
  import { formatDateTime } from '$lib/helpers/format';
  import EmptyRow from '$lib/components/shared/empty-row.svelte';
  import ErrorAlert from '$lib/components/shared/error-alert.svelte';
  import PageHeader from '$lib/components/shared/page-header.svelte';
  import Pagination from '$lib/components/shared/pagination.svelte';
  import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Table from '$lib/components/ui/table/index.js';

  let info = $state<PublishInfo | null>(null);
  let history = $state<CatalogHistoryItem[]>([]);
  let meta = $state<PaginationMeta | null>(null);
  let currentPage = $state(1);
  let error = $state<string | null>(null);

  async function load() {
    error = null;
    try {
      const [infoResponse, historyResponse] = await Promise.all([
        catalogApi.publishInfo(),
        catalogApi.history({ page: currentPage, limit: 10 }),
      ]);
      info = infoResponse.data;
      history = historyResponse.data;
      meta = historyResponse.meta;
    } catch (err) {
      error = errorMessage(err);
    }
  }

  onMount(load);
</script>

<svelte:head>
  <title>Katalog · WaroenkQu</title>
</svelte:head>

<PageHeader title="Katalog" description="Perubahan produk berlaku di kasir setelah katalog dipublish. Stok selalu realtime.">
  {#snippet actions()}
    <Button variant="outline" onclick={load} data-testid="catalog-refresh"><RefreshCwIcon /> Muat ulang</Button>
  {/snippet}
</PageHeader>

<ErrorAlert message={error} testid="catalog-error" />

<div class="mb-6 grid gap-4 sm:grid-cols-2">
  <Card.Root>
    <Card.Header>
      <Card.Description class="flex items-center gap-2"><HistoryIcon class="size-4" /> Publish terakhir</Card.Description>
      <Card.Title class="text-xl tabular-nums" data-testid="catalog-last-published">{info?.last_published_at ?? '-'}</Card.Title>
    </Card.Header>
  </Card.Root>
  <Card.Root>
    <Card.Header>
      <Card.Description class="flex items-center gap-2">
        <CalendarClockIcon class="size-4" /> Publish berikutnya
      </Card.Description>
      <Card.Title class="text-xl tabular-nums" data-testid="catalog-next-published">{info?.next_published_at ?? '-'}</Card.Title>
    </Card.Header>
  </Card.Root>
</div>

<Card.Root>
  <Card.Header>
    <Card.Title>History katalog</Card.Title>
  </Card.Header>
  <Card.Content>
    <Table.Root data-testid="catalog-history-table">
      <Table.Header>
        <Table.Row>
          <Table.Head>Waktu publish</Table.Head>
          <Table.Head class="text-right">Jumlah produk</Table.Head>
          <Table.Head></Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each history as item (item.id)}
          <Table.Row data-testid="catalog-history-row">
            <Table.Cell>{formatDateTime(item.published_at)}</Table.Cell>
            <Table.Cell class="text-right tabular-nums" data-testid="catalog-history-count">{item.product_count}</Table.Cell>
            <Table.Cell class="text-right">
              <a
                href="/catalog/{item.id}"
                class={buttonVariants({ variant: 'outline', size: 'sm' })}
                data-testid="catalog-history-detail"
              >
                Lihat isi
              </a>
            </Table.Cell>
          </Table.Row>
        {:else}
          <EmptyRow colspan={3} message="Belum ada katalog yang dipublish." />
        {/each}
      </Table.Body>
    </Table.Root>
    <Pagination
      {meta}
      onchange={(next) => {
        currentPage = next;
        void load();
      }}
    />
  </Card.Content>
</Card.Root>
