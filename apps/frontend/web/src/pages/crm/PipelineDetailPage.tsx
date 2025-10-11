import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import Layout from '@/components/Layout';
import { CRMNavigationBar } from '@/components/crm/CRMNavigationBar';
import { CRMScopeBar } from '@/components/crm/CRMScopeBar';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { 
  LayoutGrid, 
  Table as TableIcon, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Plus, 
  Euro, 
  Target,
  Settings,
  ChevronLeft
} from 'lucide-react';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';
import { Link } from 'wouter';
import { motion } from 'framer-motion';

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

export default function PipelineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [currentModule, setCurrentModule] = useState('crm');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Fetch pipeline details
  const { data: pipelineResponse } = useQuery({
    queryKey: ['/api/crm/pipelines', id],
  });

  const pipeline = pipelineResponse?.data;

  // Fetch deals for this pipeline
  const { data: dealsResponse, isLoading, error } = useQuery({
    queryKey: ['/api/crm/deals', { pipelineId: id }],
  });

  const deals: Deal[] = dealsResponse?.data || [];

  const columns: ColumnDef<Deal>[] = [
    {
      accessorKey: 'title',
      header: 'Deal',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback style={{ background: 'var(--glass-bg-heavy)' }}>
              {row.original.ownerInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {row.original.title}
            </div>
            {row.original.company && (
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {row.original.company}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'value',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1 p-0 hover:bg-transparent"
            data-testid="sort-value"
          >
            Valore
            {isSorted === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : isSorted === 'desc' ? (
              <ArrowDown className="h-3 w-3" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-1 font-semibold" style={{ color: 'hsl(var(--brand-orange))' }}>
          <Euro className="h-3 w-3" />
          {(row.original.value / 1000).toFixed(1)}k
        </div>
      ),
    },
    {
      accessorKey: 'stageName',
      header: 'Stato',
      cell: ({ row }) => (
        <Badge 
          variant="outline"
          style={{ 
            borderColor: row.original.stageColor,
            color: row.original.stageColor,
            background: 'var(--glass-bg-light)'
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
          <Badge 
            variant="outline"
            style={{ 
              borderColor: config.color,
              color: config.color,
              background: 'var(--glass-bg-light)'
            }}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'probability',
      header: 'Probabilità',
      cell: ({ row }) => (
        <div style={{ color: 'var(--text-secondary)' }}>
          {row.original.probability}%
        </div>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1 p-0 hover:bg-transparent"
            data-testid="sort-updated"
          >
            Ultimo Aggiornamento
            {isSorted === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : isSorted === 'desc' ? (
              <ArrowDown className="h-3 w-3" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => (
        <div style={{ color: 'var(--text-tertiary)' }}>
          {new Date(row.original.updatedAt).toLocaleDateString('it-IT')}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: deals,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });

  if (isLoading) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <CRMCommandPalette />
        <div className="flex flex-col h-full">
          <CRMNavigationBar />
          <CRMScopeBar />
          <div className="flex-1 p-6">
            <LoadingState />
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <CRMCommandPalette />
        <div className="flex flex-col h-full">
          <CRMNavigationBar />
          <CRMScopeBar />
          <div className="flex-1 p-6">
            <ErrorState message="Errore nel caricamento della pipeline" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <CRMCommandPalette />
      <div className="flex flex-col h-full">
        <CRMNavigationBar />
        <CRMScopeBar />
        
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/staging/crm/pipelines">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div 
                  className="p-3 rounded-xl"
                  style={{ 
                    background: 'var(--brand-glass-gradient)',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  <Target className="h-6 w-6" style={{ color: 'hsl(var(--brand-orange))' }} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--brand-orange))' }}>
                    {pipeline?.name || 'Pipeline'}
                  </h1>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {deals.length} deal attivi • Driver: {pipeline?.driver || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--glass-bg-heavy)' }}>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  data-testid="toggle-table-view"
                  style={viewMode === 'table' ? {
                    background: 'hsl(var(--brand-orange))',
                    color: 'white'
                  } : {}}
                >
                  <TableIcon className="h-4 w-4 mr-2" />
                  Tabella
                </Button>
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                  data-testid="toggle-kanban-view"
                  style={viewMode === 'kanban' ? {
                    background: 'hsl(var(--brand-orange))',
                    color: 'white'
                  } : {}}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Kanban
                </Button>
              </div>

              <Button
                variant="outline"
                data-testid="button-pipeline-settings"
              >
                <Settings className="h-4 w-4 mr-2" />
                Impostazioni
              </Button>
              <Button
                style={{ 
                  background: 'hsl(var(--brand-orange))',
                  color: 'white'
                }}
                data-testid="button-add-deal"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Deal
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          {viewMode === 'table' && (
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
                <Input
                  placeholder="Cerca deal per nome, azienda..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-10"
                  style={{
                    background: 'var(--glass-bg-light)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid var(--glass-border)'
                  }}
                  data-testid="input-search-deals"
                />
              </div>
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <Card 
              className="overflow-hidden"
              style={{
                background: 'var(--glass-bg-light)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--glass-border)'
              }}
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} style={{ borderColor: 'var(--glass-border)' }}>
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
                          style={{ borderColor: 'var(--glass-border)' }}
                          className="hover:bg-[var(--glass-bg-heavy)] cursor-pointer"
                          data-testid={`row-deal-${row.original.id}`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          <div style={{ color: 'var(--text-secondary)' }}>
                            Nessun deal trovato in questa pipeline
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div 
                className="flex items-center justify-between px-6 py-4"
                style={{ borderTop: '1px solid var(--glass-border)' }}
              >
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
                  {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} of{' '}
                  {table.getFilteredRowModel().rows.length} deals
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    data-testid="button-previous-page"
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
            </Card>
          )}

          {/* Kanban View */}
          {viewMode === 'kanban' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
              style={{
                background: 'var(--glass-bg-light)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px'
              }}
            >
              <LayoutGrid className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Vista Kanban
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Kanban board con drag & drop in arrivo
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
}
