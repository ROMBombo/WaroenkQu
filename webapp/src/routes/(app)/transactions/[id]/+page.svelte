<script lang="ts">
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { ApiError } from '$lib/api/client';
  import { transactionsApi } from '$lib/api/endpoints';
  import type { TransactionDetail } from '$lib/api/types';
  import { errorMessage } from '$lib/helpers/errors';
  import { formatDateTime, rupiah } from '$lib/helpers/format';
  import ErrorAlert from '$lib/components/shared/error-alert.svelte';
  import PageHeader from '$lib/components/shared/page-header.svelte';
  import { buttonVariants } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Table from '$lib/components/ui/table/index.js';

  let transaction = $state<TransactionDetail | null>(null);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      transaction = (await transactionsApi.get(page.params.id as string)).data;
    } catch (err) {
      error =
        err instanceof ApiError && err.code === 'TRANSACTION_NOT_FOUND' ? 'Transaksi tidak ditemukan.' : errorMessage(err);
    }
  });
</script>

<svelte:head>
  <title>Detail transaksi · WaroenkQu</title>
</svelte:head>

<PageHeader
  title="Detail transaksi"
  description={transaction ? `${formatDateTime(transaction.created_at)} · Kasir ${transaction.cashier.name}` : undefined}
>
  {#snippet actions()}
    <a href="/transactions" class={buttonVariants({ variant: 'outline' })}><ArrowLeftIcon /> Kembali</a>
  {/snippet}
</PageHeader>

<ErrorAlert message={error} testid="transaction-detail-error" />

{#if transaction}
  <Card.Root class="max-w-3xl" data-testid="transaction-detail">
    <Card.Header>
      <Card.Description>ID transaksi {transaction.id}</Card.Description>
    </Card.Header>
    <Card.Content>
      <Table.Root data-testid="transaction-items-table">
        <Table.Header>
          <Table.Row>
            <Table.Head>Produk</Table.Head>
            <Table.Head class="text-right">Jumlah</Table.Head>
            <Table.Head class="text-right">Harga</Table.Head>
            <Table.Head class="text-right">Subtotal</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each transaction.items as item (item.product_id)}
            <Table.Row data-testid="transaction-item-row">
              <Table.Cell class="font-medium">{item.product_name}</Table.Cell>
              <Table.Cell class="text-right tabular-nums">{item.quantity}</Table.Cell>
              <Table.Cell class="text-right tabular-nums">{rupiah(item.price)}</Table.Cell>
              <Table.Cell class="text-right tabular-nums">{rupiah(item.subtotal)}</Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
        <Table.Footer>
          <Table.Row>
            <Table.Cell colspan={3} class="text-right">Total</Table.Cell>
            <Table.Cell class="text-right tabular-nums" data-testid="transaction-detail-total">
              {rupiah(transaction.total)}
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell colspan={3} class="text-right font-normal text-muted-foreground">Uang dibayar</Table.Cell>
            <Table.Cell class="text-right font-normal tabular-nums" data-testid="transaction-detail-paid">
              {rupiah(transaction.paid_amount)}
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell colspan={3} class="text-right font-normal text-muted-foreground">Kembalian</Table.Cell>
            <Table.Cell class="text-right tabular-nums" data-testid="transaction-detail-change">
              {rupiah(transaction.change_amount)}
            </Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table.Root>
    </Card.Content>
  </Card.Root>
{/if}
