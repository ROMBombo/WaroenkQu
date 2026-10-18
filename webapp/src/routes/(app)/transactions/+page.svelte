<script lang="ts">
  import { onMount } from 'svelte';
  import { transactionsApi } from '$lib/api/endpoints';
  import type { PaginationMeta, TransactionSummary } from '$lib/api/types';
  import { errorMessage } from '$lib/helpers/errors';
  import { formatDateTime, rupiah } from '$lib/helpers/format';
  import { auth } from '$lib/state/auth.svelte';
  import EmptyRow from '$lib/components/shared/empty-row.svelte';
  import ErrorAlert from '$lib/components/shared/error-alert.svelte';
  import PageHeader from '$lib/components/shared/page-header.svelte';
  import Pagination from '$lib/components/shared/pagination.svelte';
  import { buttonVariants } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Table from '$lib/components/ui/table/index.js';

  let transactions = $state<TransactionSummary[]>([]);
  let meta = $state<PaginationMeta | null>(null);
  let currentPage = $state(1);
  let loading = $state(true);
  let error = $state<string | null>(null);

  async function load() {
    loading = true;
    error = null;
    try {
      const response = await transactionsApi.list({ page: currentPage, limit: 10 });
      transactions = response.data;
      meta = response.meta;
    } catch (err) {
      error = errorMessage(err);
    } finally {
      loading = false;
    }
  }

  onMount(load);
</script>

<svelte:head>
  <title>Transaksi · WaroenkQu</title>
</svelte:head>

<PageHeader
  title="Transaksi"
  description={auth.user?.role === 'OWNER' ? 'Transaksi dari semua kasir.' : 'Transaksi yang Anda buat.'}
/>

<ErrorAlert message={error} testid="transaction-list-error" />

<Card.Root>
  <Card.Content>
    <Table.Root data-testid="transaction-table">
      <Table.Header>
        <Table.Row>
          <Table.Head>Waktu</Table.Head>
          <Table.Head>Kasir</Table.Head>
          <Table.Head class="text-right">Total</Table.Head>
          <Table.Head class="text-right">Dibayar</Table.Head>
          <Table.Head class="text-right">Kembalian</Table.Head>
          <Table.Head></Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each transactions as trx (trx.id)}
          <Table.Row data-testid="transaction-row">
            <Table.Cell>{formatDateTime(trx.created_at)}</Table.Cell>
            <Table.Cell>{trx.cashier.name}</Table.Cell>
            <Table.Cell class="text-right font-medium tabular-nums" data-testid="transaction-row-total">
              {rupiah(trx.total)}
            </Table.Cell>
            <Table.Cell class="text-right tabular-nums">{rupiah(trx.paid_amount)}</Table.Cell>
            <Table.Cell class="text-right tabular-nums">{rupiah(trx.change_amount)}</Table.Cell>
            <Table.Cell class="text-right">
              <a
                href="/transactions/{trx.id}"
                class={buttonVariants({ variant: 'outline', size: 'sm' })}
                data-testid="transaction-row-detail"
              >
                Detail
              </a>
            </Table.Cell>
          </Table.Row>
        {:else}
          <EmptyRow colspan={6} message={loading ? 'Memuat...' : 'Belum ada transaksi.'} />
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
