import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ClipboardList,
  Play,
  Trash2,
  Clock,
  Package,
  Building2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productEan?: string;
  quantity: number;
  unitCost: number;
}

interface OrderDraft {
  id: string;
  legalEntityId?: string;
  legalEntityName?: string;
  supplierId?: string;
  supplierName?: string;
  documentNumber?: string;
  documentDate?: string;
  expectedDeliveryDate?: string;
  storeId?: string;
  storeName?: string;
  notes?: string;
  items: OrderItem[];
  lastModified: string;
}

interface SuspendedOrdersDraftsProps {
  onResume: (draft: OrderDraft) => void;
  refreshTrigger?: number;
}

export function SuspendedOrdersDrafts({ onResume, refreshTrigger }: SuspendedOrdersDraftsProps) {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<OrderDraft[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadDrafts = () => {
    try {
      const stored = localStorage.getItem('wms_order_drafts');
      if (stored) {
        const parsed = JSON.parse(stored);
        setDrafts(parsed.sort((a: OrderDraft, b: OrderDraft) => 
          new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        ));
      } else {
        setDrafts([]);
      }
    } catch (e) {
      console.error('Error loading drafts:', e);
      setDrafts([]);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, [refreshTrigger]);

  const handleDelete = (draftId: string) => {
    const updated = drafts.filter(d => d.id !== draftId);
    localStorage.setItem('wms_order_drafts', JSON.stringify(updated));
    setDrafts(updated);
    setDeleteConfirm(null);
    toast({ title: 'Bozza eliminata' });
  };

  const handleResume = (draft: OrderDraft) => {
    onResume(draft);
    const updated = drafts.filter(d => d.id !== draft.id);
    localStorage.setItem('wms_order_drafts', JSON.stringify(updated));
    setDrafts(updated);
  };

  if (drafts.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="mb-4 border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-blue-500" />
            Ordini Sospesi
            <Badge variant="secondary" className="ml-2">{drafts.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-blue-100/50">
                <TableHead>Fornitore</TableHead>
                <TableHead>Entità Legale</TableHead>
                <TableHead className="text-center">Prodotti</TableHead>
                <TableHead className="text-right">Valore</TableHead>
                <TableHead>Ultima Modifica</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drafts.map((draft) => {
                const totalItems = draft.items.reduce((sum, i) => sum + i.quantity, 0);
                const totalValue = draft.items.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);
                
                return (
                  <TableRow key={draft.id} className="hover:bg-blue-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{draft.supplierName || 'Non specificato'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span>{draft.legalEntityName || 'Non specificata'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{draft.items.length} ({totalItems} pz)</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      € {totalValue.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(draft.lastModified), { 
                          addSuffix: true, 
                          locale: it 
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleResume(draft)}
                          data-testid={`btn-resume-draft-${draft.id}`}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Riprendi
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteConfirm(draft.id)}
                          data-testid={`btn-delete-draft-${draft.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina bozza ordine</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa bozza? L'operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
