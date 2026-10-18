<script lang="ts">
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
  import { buttonVariants } from '$lib/components/ui/button/index.js';

  interface Props {
    open: boolean;
    productName: string;
    busy: boolean;
    onconfirm: () => void;
  }

  let { open = $bindable(), productName, busy, onconfirm }: Props = $props();
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content data-testid="delete-dialog">
    <AlertDialog.Header>
      <AlertDialog.Title>Hapus produk?</AlertDialog.Title>
      <AlertDialog.Description>
        <strong>{productName}</strong> akan dihapus dari daftar produk. Produk masih bisa dijual kasir sampai publish
        katalog berikutnya.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel data-testid="delete-cancel">Batal</AlertDialog.Cancel>
      <AlertDialog.Action
        class={buttonVariants({ variant: 'destructive' })}
        disabled={busy}
        onclick={onconfirm}
        data-testid="delete-confirm"
      >
        Ya, hapus
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
