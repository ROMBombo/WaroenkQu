<script lang="ts">
  import * as Table from '$lib/components/ui/table/index.js';

  interface Props {
    colspan: number;
    message: string;
    testid?: string;
  }

  let { colspan, message, testid = 'table-empty' }: Props = $props();
</script>

<Table.Row>
  <Table.Cell {colspan} class="h-24 text-center text-muted-foreground" data-testid={testid}>{message}</Table.Cell>
</Table.Row>
