import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  Calendar,
  User,
  FolderOpen
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type: string;
  category: string;
  uploadedBy: string;
  uploadedAt: Date;
  size: string;
  url?: string;
}

interface CustomerDocumentsTabProps {
  customerId: string;
}

export function CustomerDocumentsTab({ customerId }: CustomerDocumentsTabProps) {
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      name: 'Contratto_firmato_2024.pdf',
      type: 'pdf',
      category: 'Contratti',
      uploadedBy: 'Mario Rossi',
      uploadedAt: new Date('2024-10-15'),
      size: '2.4 MB'
    },
    {
      id: '2',
      name: 'Fattura_001_2024.pdf',
      type: 'pdf',
      category: 'Fatture',
      uploadedBy: 'Sistema',
      uploadedAt: new Date('2024-09-20'),
      size: '850 KB'
    },
    {
      id: '3',
      name: 'Documento_identita.jpg',
      type: 'jpg',
      category: 'Documenti',
      uploadedBy: 'Sara Bianchi',
      uploadedAt: new Date('2024-08-10'),
      size: '1.2 MB'
    }
  ]);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const categories = ['Contratti', 'Fatture', 'Documenti', 'Preventivi', 'Altro'];
  
  const filteredDocuments = selectedCategory === 'all' 
    ? documents 
    : documents.filter(doc => doc.category === selectedCategory);

  const getFileIcon = (type: string) => {
    const iconStyle = { color: 'hsl(var(--brand-orange))' };
    return <FileText className="h-8 w-8" style={iconStyle} />;
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FolderOpen className="h-5 w-5" style={{ color: 'hsl(var(--brand-orange))' }} />
              Documenti Cliente
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {filteredDocuments.length} documento{filteredDocuments.length !== 1 ? 'i' : ''} trovato{filteredDocuments.length !== 1 ? 'i' : ''}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]" data-testid="select-category">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button 
                  data-testid="button-upload"
                  className="gap-2"
                  style={{ backgroundColor: 'hsl(var(--brand-orange))' }}
                >
                  <Upload className="h-4 w-4" />
                  Carica Documento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Carica nuovo documento</DialogTitle>
                  <DialogDescription>
                    Seleziona un file da caricare e assegna una categoria
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">File</label>
                    <Input type="file" data-testid="input-file" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Categoria</label>
                    <Select>
                      <SelectTrigger data-testid="select-upload-category">
                        <SelectValue placeholder="Seleziona categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUploadOpen(false)} data-testid="button-cancel">
                    Annulla
                  </Button>
                  <Button 
                    data-testid="button-confirm-upload"
                    style={{ backgroundColor: 'hsl(var(--brand-orange))' }}
                    onClick={() => setIsUploadOpen(false)}
                  >
                    Carica
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-3">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nessun documento trovato</p>
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <Card 
                key={doc.id} 
                className="p-4 hover:shadow-md transition-shadow"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {getFileIcon(doc.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold truncate">{doc.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {doc.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {doc.uploadedBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {doc.uploadedAt.toLocaleDateString('it-IT')}
                      </span>
                      <span>{doc.size}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      data-testid={`button-preview-${doc.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      data-testid={`button-download-${doc.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      data-testid={`button-delete-${doc.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
