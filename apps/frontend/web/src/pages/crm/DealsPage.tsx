import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type Row,
} from '@tanstack/react-table';
import Layout from '@/components/Layout';
import { CRMNavigationBar } from '@/components/crm/CRMNavigationBar';
import { CRMScopeBar } from '@/components/crm/CRMScopeBar';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { CRMFilterDock } from '@/components/crm/CRMFilterDock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, ArrowUpDown, Download, Euro, Clock } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Deal {
  id: string;
  title: string;
  value: number;
  probability: number;
  pipelineName: string;
  stageName: string;
  stageColor: string;
  ownerName: string;
  ownerInitials: string;
  company?: string;
  campaignName?: string;
  driver: 'FISSO' | 'MOBILE' | 'DEVICE' | 'ACCESSORI';
  daysInStage: number;
  updatedAt: string;
}

const driverConfig = {
  FISSO: { label: 'Fibra', color: 'hsl(220, 90%, 56%)' },
  MOBILE: { label: '5G', color: 'hsl(280, 65%, 60%)' },
  DEVICE: { label: 'Device', color: 'hsl(var(--brand-orange))' },
  ACCESSORI: { label: 'Accessori', color: 'hsl(var(--brand-purple))' }
};

const EditableCell = ({ 
  value, 
  row, 
  column, 
  onUpdate 
}: { 
  value: any; 
  row: Row<Deal>; 
  column: string; 
  onUpdate: (dealId: string, field: string, value: any) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onUpdate(row.original.id, column, editValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') {
            setEditValue(value);
            setIsEditing(false);
          }
        }}
        className="h-8"
        autoFocus
        data-testid={`edit-${column}-${row.original.id}`}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)} 
      className="cursor-pointer hover:bg-accent px-2 py-1 rounded"
      data-testid={`cell-${column}-${row.original.id}`}
    >
      {value}
    </div>
  );
};

export default function DealsPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const { toast } = useToast();

  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ['/api/crm/deals', globalFilter],
    initialData: [
      {
        id: '1',
        title: 'Fibra FTTH 2.5 Gbps - Rossi SRL',
        value: 45000,
        probability: 60,
        pipelineName: 'Pipeline Fisso',
        stageName: 'Proposta',
        stageColor: 'hsl(280, 65%, 60%)',
        ownerName: 'Tu',
        ownerInitials: 'TU',
        company: 'Rossi SRL',
        campaignName: 'Black Friday 2024',
        driver: 'FISSO',
        daysInStage: 7,
        updatedAt: '2024-10-10T15:30:00Z'
      },
      {
        id: '2',
        title: 'Unlimited 5G - Bianchi Auto',
        value: 12000,
        probability: 40,
        pipelineName: 'Pipeline Mobile',
        stageName: 'Qualificazione',
        stageColor: 'hsl(220, 90%, 56%)',
        ownerName: 'Tu',
        ownerInitials: 'TU',
        company: 'Bianchi Auto',
        campaignName: 'Mobile 5G Promo',
        driver: 'MOBILE',
        daysInStage: 5,
        updatedAt: '2024-10-11T10:00:00Z'
      }
    ]
  });

  const updateDealMutation = useMutation({
    mutationFn: async ({ dealId, field, value }: { dealId: string; field: string; value: any }) => {
      const response = await fetch(`/api/crm/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (!response.ok) throw new Error('Aggiornamento fallito');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Deal aggiornato!', description: 'Le modifiche sono state salvate' });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/deals'] });
    }
  });

  const bulkChangeStageMutation = useMutation({
    mutationFn: async ({ dealIds, stageId }: { dealIds: string[]; stageId: string }) => {
      const response = await fetch('/api/crm/deals/bulk/change-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealIds, stageId })
      });
      if (!response.ok) throw new Error('Aggiornamento bulk fallito');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Deals aggiornati!', description: 'Gli stage sono stati cambiati' });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/deals'] });
      setRowSelection({});
    }
  });

  const handleUpdateCell = (dealId: string, field: string, value: any) => {
    updateDealMutation.mutate({ dealId, field, value });
  };

  const handleBulkChangeStage = (stageId: string) => {
    const selectedIds = Object.keys(rowSelection);
    bulkChangeStageMutation.mutate({ dealIds: selectedIds, stageId });
  };

  const handleExportCSV = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const data = selectedRows.length > 0 
      ? selectedRows.map(r => r.original)
      : table.getFilteredRowModel().rows.map(r => r.original);
    
    const csv = [
      ['ID', 'Titolo', 'Valore', 'Pipeline', 'Stage', 'Owner', 'Aggiornato'],
      ...data.map(d => [
        d.id,
        d.title,
        d.value,
        d.pipelineName,
        d.stageName,
        d.ownerName,
        new Date(d.updatedAt).toLocaleDateString('it-IT')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deals_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast({ title: 'Export completato!', description: `${data.length} deals esportati` });
  };

  const columns: ColumnDef<Deal>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleziona tutto"
          data-testid="checkbox-select-all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleziona riga"
          data-testid={`checkbox-row-${row.original.id}`}
        />
      ),
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          data-testid="sort-title"
        >
          Deal
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.title}</div>
          {row.original.company && (
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {row.original.company}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'value',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          data-testid="sort-value"
        >
          Valore
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Euro className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
          <EditableCell
            value={`€${(row.original.value / 1000).toFixed(1)}k`}
            row={row}
            column="value"
            onUpdate={handleUpdateCell}
          />
        </div>
      ),
    },
    {
      accessorKey: 'probability',
      header: 'Probabilità',
      cell: ({ row }) => (
        <EditableCell
          value={`${row.original.probability}%`}
          row={row}
          column="probability"
          onUpdate={handleUpdateCell}
        />
      ),
    },
    {
      accessorKey: 'pipelineName',
      header: 'Pipeline',
      cell: ({ row }) => row.original.pipelineName,
    },
    {
      accessorKey: 'stageName',
      header: 'Stage',
      cell: ({ row }) => (
        <Badge 
          variant="outline" 
          style={{ 
            borderColor: row.original.stageColor, 
            color: row.original.stageColor 
          }}
        >
          {row.original.stageName}
        </Badge>
      ),
    },
    {
      accessorKey: 'driver',
      header: 'Driver',
      cell: ({ row }) => {
        const config = driverConfig[row.original.driver];
        return (
          <span style={{ color: config.color }}>{config.label}</span>
        );
      },
    },
    {
      accessorKey: 'ownerName',
      header: 'Owner',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback 
              className="text-xs" 
              style={{ background: 'hsl(var(--brand-purple))', color: 'white' }}
            >
              {row.original.ownerInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{row.original.ownerName}</span>
        </div>
      ),
    },
    {
      accessorKey: 'daysInStage',
      header: 'Giorni',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3" style={{ color: 'var(--text-tertiary)' }} />
          {row.original.daysInStage}g
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: deals,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <CRMCommandPalette />
      <div className="flex flex-col h-full">
        <CRMNavigationBar />
        <CRMScopeBar />

        <div className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
              <Input
                placeholder="Cerca deals..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10"
                style={{ 
                  background: 'var(--glass-bg-light)',
                  borderColor: 'var(--glass-card-border)'
                }}
                data-testid="input-search"
              />
            </div>
            <div className="flex items-center gap-2">
              {selectedCount > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" data-testid="bulk-actions">
                      Azioni ({selectedCount})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkChangeStage('qualification')}>
                      Sposta a Qualificazione
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkChangeStage('proposal')}>
                      Sposta a Proposta
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkChangeStage('closing')}>
                      Sposta a Chiusura
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Assegna a...</DropdownMenuItem>
                    <DropdownMenuItem>Aggiungi tag</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button variant="outline" onClick={handleExportCSV} data-testid="export-csv">
                <Download className="mr-2 h-4 w-4" />
                Esporta CSV
              </Button>
              <CRMFilterDock />
              <Button style={{ background: 'hsl(var(--brand-orange))' }} data-testid="create-deal">
                <Plus className="mr-2 h-4 w-4" />
                Nuovo Deal
              </Button>
            </div>
          </div>

          {/* DataTable */}
          <div 
            className="rounded-xl border overflow-hidden"
            style={{ 
              background: 'var(--glass-card-bg)',
              backdropFilter: 'blur(10px)',
              borderColor: 'var(--glass-card-border)'
            }}
          >
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      data-testid={`row-deal-${row.original.id}`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      Nessun deal trovato
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {table.getFilteredSelectedRowModel().rows.length} di{' '}
              {table.getFilteredRowModel().rows.length} righe selezionate
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                data-testid="prev-page"
              >
                Precedente
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                data-testid="next-page"
              >
                Successiva
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
