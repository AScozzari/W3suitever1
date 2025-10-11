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
} from '@tanstack/react-table';
import Layout from '@/components/Layout';
import { CRMNavigationBar } from '@/components/crm/CRMNavigationBar';
import { CRMSearchBar } from '@/components/crm/CRMSearchBar';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { CRMFilterDock } from '@/components/crm/CRMFilterDock';
import { CreateLeadDialog } from '@/components/crm/CreateLeadDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, ArrowUpDown, MoreHorizontal, Phone, Mail, MessageSquare, TrendingUp, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { queryClient } from '@/lib/queryClient';
import { Link } from 'wouter';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  status: 'new' | 'qualified' | 'contacted' | 'converted' | 'lost';
  source: string;
  driver: 'FISSO' | 'MOBILE' | 'DEVICE' | 'ACCESSORI';
  campaignName?: string;
  score: number;
  ownerId: string;
  ownerName: string;
  createdAt: string;
}

const statusConfig = {
  new: { label: 'Nuovo', color: 'hsl(var(--brand-purple))' },
  qualified: { label: 'Qualificato', color: 'hsl(220, 90%, 56%)' },
  contacted: { label: 'Contattato', color: 'hsl(280, 65%, 60%)' },
  converted: { label: 'Convertito', color: 'hsl(142, 76%, 36%)' },
  lost: { label: 'Perso', color: 'hsl(0, 84%, 60%)' }
};

const driverConfig = {
  FISSO: { label: 'Fibra', icon: '🌐', color: 'hsl(220, 90%, 56%)' },
  MOBILE: { label: '5G', icon: '📱', color: 'hsl(280, 65%, 60%)' },
  DEVICE: { label: 'Device', icon: '📲', color: 'hsl(var(--brand-orange))' },
  ACCESSORI: { label: 'Accessori', icon: '🎧', color: 'hsl(var(--brand-purple))' }
};

export default function LeadsPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: leadsResponse, isLoading } = useQuery<Lead[]>({
    queryKey: ['/api/crm/leads', globalFilter],
  });

  const leads = leadsResponse || [];

  const convertMutation = useMutation({
    mutationFn: async ({ leadId, pipelineId }: { leadId: string; pipelineId: string }) => {
      const response = await fetch(`/api/crm/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineId })
      });
      if (!response.ok) throw new Error('Conversione fallita');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Lead convertito in Deal!', description: 'Il deal è stato creato con successo' });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/leads'] });
      setIsConvertDialogOpen(false);
    }
  });

  const columns: ColumnDef<Lead>[] = [
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
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'firstName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          data-testid="sort-name"
        >
          Nome
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback style={{ background: 'hsl(var(--brand-purple))', color: 'white' }}>
              {row.original.firstName[0]}{row.original.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{row.original.firstName} {row.original.lastName}</div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {row.original.company || row.original.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Stato',
      cell: ({ row }) => {
        const status = row.original.status;
        const config = statusConfig[status];
        return (
          <Badge variant="outline" style={{ borderColor: config.color, color: config.color }}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'driver',
      header: 'Driver',
      cell: ({ row }) => {
        const driver = row.original.driver;
        const config = driverConfig[driver];
        return (
          <div className="flex items-center gap-2">
            <span>{config.icon}</span>
            <span style={{ color: config.color }}>{config.label}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'campaignName',
      header: 'Campagna',
      cell: ({ row }) => row.original.campaignName || '-',
    },
    {
      accessorKey: 'score',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          data-testid="sort-score"
        >
          Score
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
          <span className="font-semibold">{row.original.score}</span>
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Data',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('it-IT'),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const tenantSlug = window.location.pathname.split('/')[1];
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`actions-${row.original.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setSelectedLead(row.original);
                setIsDetailOpen(true);
              }}>
                Visualizza dettagli
              </DropdownMenuItem>
              <Link href={`/${tenantSlug}/crm/customers/${row.original.id}`}>
                <DropdownMenuItem>
                  <Eye className="h-4 w-4 mr-2" />
                  Profilo Cliente
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem onClick={() => {
                setSelectedLead(row.original);
                setIsConvertDialogOpen(true);
              }}>
                Converti in Deal
              </DropdownMenuItem>
              <DropdownMenuItem>Assegna a...</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: leads,
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

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <CRMCommandPalette />
      <div className="flex flex-col h-full">
        <CRMNavigationBar />
        <CRMSearchBar 
          onSearch={setGlobalFilter}
          placeholder="Cerca lead..."
        />

        <div className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
              <Input
                placeholder="Cerca lead..."
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
              <CRMFilterDock />
              <CreateLeadDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
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
                      data-testid={`row-lead-${row.original.id}`}
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
                      Nessun lead trovato
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
                data-testid="button-prev-page"
              >
                Precedente
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                data-testid="button-next-page"
              >
                Successiva
              </Button>
            </div>
          </div>
        </div>

        {/* Lead Detail Sheet */}
        <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <SheetContent className="w-[600px] sm:max-w-[600px]" style={{ background: 'var(--glass-card-bg)' }}>
            {selectedLead && (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedLead.firstName} {selectedLead.lastName}</SheetTitle>
                  <SheetDescription>{selectedLead.email}</SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" data-testid="button-call">
                      <Phone className="mr-2 h-4 w-4" />
                      Chiama
                    </Button>
                    <Button variant="outline" size="sm" data-testid="button-email">
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </Button>
                    <Button variant="outline" size="sm" data-testid="button-whatsapp">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      WhatsApp
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <Label>Stato</Label>
                      <Badge className="mt-2" style={{ borderColor: statusConfig[selectedLead.status].color }}>
                        {statusConfig[selectedLead.status].label}
                      </Badge>
                    </div>
                    <div>
                      <Label>Driver Prodotto</Label>
                      <p className="mt-2">{driverConfig[selectedLead.driver].icon} {driverConfig[selectedLead.driver].label}</p>
                    </div>
                    <div>
                      <Label>Score</Label>
                      <p className="mt-2 font-semibold">{selectedLead.score}/100</p>
                    </div>
                    <div>
                      <Label>Campagna</Label>
                      <p className="mt-2">{selectedLead.campaignName || 'N/D'}</p>
                    </div>
                  </div>

                  <Separator />

                  <Button 
                    className="w-full" 
                    style={{ background: 'hsl(var(--brand-orange))' }}
                    onClick={() => {
                      setIsDetailOpen(false);
                      setIsConvertDialogOpen(true);
                    }}
                    data-testid="button-convert-to-deal"
                  >
                    Converti in Deal
                  </Button>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Convert to Deal Dialog */}
        <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Converti Lead in Deal</DialogTitle>
              <DialogDescription>
                Seleziona la pipeline per creare il deal
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Pipeline</Label>
                <Select>
                  <SelectTrigger data-testid="select-pipeline">
                    <SelectValue placeholder="Seleziona pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Pipeline Fisso</SelectItem>
                    <SelectItem value="2">Pipeline Mobile</SelectItem>
                    <SelectItem value="3">Pipeline Device</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Note iniziali</Label>
                <Textarea placeholder="Aggiungi note..." data-testid="textarea-notes" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsConvertDialogOpen(false)}>
                Annulla
              </Button>
              <Button 
                style={{ background: 'hsl(var(--brand-orange))' }}
                onClick={() => selectedLead && convertMutation.mutate({ leadId: selectedLead.id, pipelineId: '1' })}
                data-testid="button-confirm-convert"
              >
                Converti
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
