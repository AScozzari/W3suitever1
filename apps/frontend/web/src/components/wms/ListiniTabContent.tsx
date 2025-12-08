import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ListiniTabContent() {
  return (
    <div className="space-y-6" data-testid="listini-content">
      {/* Header */}
      <div className="flex justify-between items-center" data-testid="listini-header">
        <div>
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: 'hsl(var(--foreground))' }}
            data-testid="listini-title"
          >
            Listini Prezzi
          </h2>
          <p className="text-gray-600" data-testid="listini-subtitle">
            Gestione listini prezzi e politiche commerciali
          </p>
        </div>
        <Button
          style={{
            background: 'hsl(var(--brand-orange))',
            color: 'white',
          }}
          disabled
          data-testid="button-new-pricelist"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Listino
        </Button>
      </div>

      {/* Implementation Notice */}
      <Card
        className="p-6"
        style={{
          background: 'rgba(255, 237, 213, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 105, 0, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(255, 105, 0, 0.1)'
        }}
        data-testid="implementation-notice"
      >
        <div className="flex items-start gap-4">
          <AlertCircle
            className="h-6 w-6 flex-shrink-0 mt-1"
            style={{ color: 'hsl(var(--brand-orange))' }}
            data-testid="icon-notice"
          />
          <div>
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: 'hsl(var(--foreground))' }}
              data-testid="notice-title"
            >
              Funzionalità in Implementazione
            </h3>
            <p className="text-gray-700 mb-3" data-testid="notice-description">
              Il modulo Listini Prezzi è attualmente in fase di sviluppo. La struttura DataTable sottostante 
              è pronta per l'integrazione con il backend.
            </p>
            <p className="text-sm text-gray-600" data-testid="notice-features">
              <strong>Funzionalità previste:</strong> Creazione listini multipli, validità temporale, 
              associazione prodotti, prezzi varianti, sconti e maggiorazioni.
            </p>
          </div>
        </div>
      </Card>

      {/* DataTable Structure (Placeholder) */}
      <Card
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
        }}
        data-testid="datatable-container"
      >
        <Table data-testid="pricelist-table">
          <TableHeader>
            <TableRow data-testid="table-header-row">
              <TableHead data-testid="header-name">Nome Listino</TableHead>
              <TableHead data-testid="header-description">Descrizione</TableHead>
              <TableHead data-testid="header-validity">Validità</TableHead>
              <TableHead data-testid="header-products">Prodotti</TableHead>
              <TableHead data-testid="header-status">Stato</TableHead>
              <TableHead data-testid="header-actions" className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow data-testid="empty-state-row">
              <TableCell
                colSpan={6}
                className="h-40 text-center"
                data-testid="empty-state-cell"
              >
                <div className="flex flex-col items-center justify-center gap-3">
                  <FileText
                    className="h-12 w-12 text-gray-300"
                    data-testid="icon-empty"
                  />
                  <p
                    className="text-gray-500 font-medium"
                    data-testid="text-empty-title"
                  >
                    Nessun listino disponibile
                  </p>
                  <p
                    className="text-sm text-gray-400"
                    data-testid="text-empty-subtitle"
                  >
                    La gestione listini sarà disponibile nelle prossime versioni
                  </p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
