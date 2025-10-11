import { useState } from 'react';
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
import { CRMFilterDock } from '@/components/crm/CRMFilterDock';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, Plus, Building, User, Euro, Calendar, Phone, Mail, Shield, MessageSquare, Eye } from 'lucide-react';
import { Link, useLocation } from 'wouter';

interface Account {
  id: string;
  companyName: string;
  vatNumber: string;
  contactPerson: string;
  email: string;
  phone: string;
  activeDeals: number;
  ltv: number;
  status: 'active' | 'inactive' | 'prospect';
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  consentMarketing: boolean;
  consentProfiling: boolean;
  preferredChannel: 'EMAIL' | 'PHONE' | 'WHATSAPP';
  quietHoursStart?: string;
  quietHoursEnd?: string;
  lastContact: string;
}

const AccountsTable = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: accountsResponse } = useQuery({
    queryKey: ['/api/crm/accounts', globalFilter],
  });

  const accounts = accountsResponse?.data || [];

  const columns: ColumnDef<Account>[] = [
    {
      accessorKey: 'companyName',
      header: 'Azienda',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ background: 'var(--brand-glass-orange)' }}
          >
            <Building className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
          </div>
          <div>
            <div className="font-medium">{row.original.companyName}</div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {row.original.vatNumber}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'contactPerson',
      header: 'Referente',
      cell: ({ row }) => (
        <div>
          <div>{row.original.contactPerson}</div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {row.original.email}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'activeDeals',
      header: 'Deal Attivi',
      cell: ({ row }) => (
        <Badge variant="outline" style={{ borderColor: 'hsl(var(--brand-purple))' }}>
          {row.original.activeDeals}
        </Badge>
      ),
    },
    {
      accessorKey: 'ltv',
      header: 'LTV',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Euro className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
          <span className="font-semibold">€{(row.original.ltv / 1000).toFixed(0)}k</span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Stato',
      cell: ({ row }) => {
        const statusConfig = {
          active: { label: 'Attivo', color: 'hsl(142, 76%, 36%)' },
          inactive: { label: 'Inattivo', color: 'hsl(0, 84%, 60%)' },
          prospect: { label: 'Prospect', color: 'hsl(220, 90%, 56%)' }
        };
        const config = statusConfig[row.original.status];
        return (
          <Badge variant="outline" style={{ borderColor: config.color, color: config.color }}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const tenantSlug = window.location.pathname.split('/')[1];
        return (
          <Link href={`/${tenantSlug}/crm/customers/${row.original.id}`}>
            <Button
              variant="outline"
              size="sm"
              data-testid={`view-account-${row.original.id}`}
            >
              <Eye className="h-4 w-4 mr-2" />
              Visualizza
            </Button>
          </Link>
        );
      },
    },
  ];

  const table = useReactTable({
    data: accounts,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, globalFilter },
  });

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
            <Input
              placeholder="Cerca account..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10"
              data-testid="search-accounts"
            />
          </div>
          <Button style={{ background: 'hsl(var(--brand-orange))' }} data-testid="create-account">
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Account
          </Button>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--glass-card-bg)', borderColor: 'var(--glass-card-border)' }}>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-testid={`row-account-${row.original.id}`}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-[600px]" style={{ background: 'var(--glass-card-bg)' }}>
          {selectedAccount && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedAccount.companyName}</SheetTitle>
                <SheetDescription>{selectedAccount.vatNumber}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div>
                  <Label>Referente</Label>
                  <p className="mt-2">{selectedAccount.contactPerson}</p>
                </div>
                <div>
                  <Label>Contatti</Label>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm">{selectedAccount.email}</p>
                    <p className="text-sm">{selectedAccount.phone}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label>LTV</Label>
                  <p className="mt-2 text-2xl font-bold" style={{ color: 'hsl(var(--brand-orange))' }}>
                    €{(selectedAccount.ltv / 1000).toFixed(0)}k
                  </p>
                </div>
                <div>
                  <Label>Deal Attivi</Label>
                  <p className="mt-2 text-xl font-semibold">{selectedAccount.activeDeals}</p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

const ContactsTable = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: contactsResponse } = useQuery({
    queryKey: ['/api/crm/contacts', globalFilter],
  });

  const contacts = contactsResponse?.data || [];

  const columns: ColumnDef<Contact>[] = [
    {
      accessorKey: 'firstName',
      header: 'Contatto',
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
              {row.original.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'company',
      header: 'Azienda',
      cell: ({ row }) => row.original.company || '-',
    },
    {
      accessorKey: 'preferredChannel',
      header: 'Canale',
      cell: ({ row }) => {
        const channelConfig = {
          EMAIL: { icon: Mail, label: 'Email' },
          PHONE: { icon: Phone, label: 'Telefono' },
          WHATSAPP: { icon: MessageSquare, label: 'WhatsApp' }
        };
        const config = channelConfig[row.original.preferredChannel] || channelConfig.EMAIL;
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span>{config.label}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'consentMarketing',
      header: 'GDPR',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" style={{ color: row.original.consentMarketing ? 'hsl(142, 76%, 36%)' : 'var(--text-tertiary)' }} />
          <span className="text-sm">{row.original.consentMarketing ? 'Consenso' : 'No consenso'}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const tenantSlug = window.location.pathname.split('/')[1];
        return (
          <Link href={`/${tenantSlug}/crm/customers/${row.original.id}`}>
            <Button
              variant="outline"
              size="sm"
              data-testid={`view-contact-${row.original.id}`}
            >
              <Eye className="h-4 w-4 mr-2" />
              Visualizza
            </Button>
          </Link>
        );
      },
    },
  ];

  const table = useReactTable({
    data: contacts,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, globalFilter },
  });

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
            <Input
              placeholder="Cerca contatti..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10"
              data-testid="search-contacts"
            />
          </div>
          <Button style={{ background: 'hsl(var(--brand-orange))' }} data-testid="create-contact">
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Contatto
          </Button>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--glass-card-bg)', borderColor: 'var(--glass-card-border)' }}>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-testid={`row-contact-${row.original.id}`}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-[600px]" style={{ background: 'var(--glass-card-bg)' }}>
          {selectedContact && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedContact.firstName} {selectedContact.lastName}</SheetTitle>
                <SheetDescription>{selectedContact.email}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <Label>Consensi GDPR</Label>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Marketing</span>
                      <Switch checked={selectedContact.consentMarketing} disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Profilazione</span>
                      <Switch checked={selectedContact.consentProfiling} disabled />
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label>Canale Preferito</Label>
                  <p className="mt-2">{selectedContact.preferredChannel}</p>
                </div>
                <div>
                  <Label>Quiet Hours</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{selectedContact.quietHoursStart} - {selectedContact.quietHoursEnd}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default function CustomersPage() {
  const [currentModule, setCurrentModule] = useState('crm');

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <CRMCommandPalette />
      <div className="flex flex-col h-full">
        <CRMNavigationBar />
        <CRMScopeBar />

        <div className="flex-1 p-6 overflow-auto">
          <Tabs defaultValue="accounts" className="h-full">
            <TabsList className="mb-6">
              <TabsTrigger value="accounts" data-testid="tab-accounts">
                <Building className="mr-2 h-4 w-4" />
                Accounts (B2B)
              </TabsTrigger>
              <TabsTrigger value="contacts" data-testid="tab-contacts">
                <User className="mr-2 h-4 w-4" />
                Contacts (B2C)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="accounts">
              <AccountsTable />
            </TabsContent>

            <TabsContent value="contacts">
              <ContactsTable />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
