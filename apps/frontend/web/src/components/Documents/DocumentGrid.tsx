import { FileText, Download, Eye, Trash2, Share2, MoreVertical, Lock, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface Document {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  documentType: string;
  isConfidential: boolean;
  expiryDate?: string | null;
  createdAt: string;
  uploadedBy: string;
  year?: number;
  month?: number;
  metadata?: any;
}

interface DocumentGridProps {
  documents: Document[];
  viewMode: 'grid' | 'list';
  selectedDocuments: Set<string>;
  onSelectDocument: (docId: string, isSelected: boolean) => void;
  onViewDocument: (doc: Document) => void;
  onDeleteDocument: (docId: string) => Promise<void>;
  isLoading: boolean;
}

const documentTypeConfig = {
  payslip: {
    label: 'Busta Paga',
    icon: '💰',
    gradient: 'from-green-400 to-emerald-600',
    bgColor: 'bg-green-100'
  },
  contract: {
    label: 'Contratto',
    icon: '📄',
    gradient: 'from-blue-400 to-indigo-600',
    bgColor: 'bg-blue-100'
  },
  certificate: {
    label: 'Certificato',
    icon: '🏆',
    gradient: 'from-purple-400 to-violet-600',
    bgColor: 'bg-purple-100'
  },
  id_document: {
    label: 'Documento ID',
    icon: '🆔',
    gradient: 'from-gray-400 to-slate-600',
    bgColor: 'bg-gray-100'
  },
  cv: {
    label: 'CV/Resume',
    icon: '📋',
    gradient: 'from-teal-400 to-cyan-600',
    bgColor: 'bg-teal-100'
  },
  evaluation: {
    label: 'Valutazione',
    icon: '⭐',
    gradient: 'from-yellow-400 to-amber-600',
    bgColor: 'bg-yellow-100'
  },
  warning: {
    label: 'Richiamo',
    icon: '⚠️',
    gradient: 'from-orange-400 to-red-600',
    bgColor: 'bg-orange-100'
  },
  other: {
    label: 'Altro',
    icon: '📁',
    gradient: 'from-gray-400 to-gray-600',
    bgColor: 'bg-gray-100'
  }
};

export default function DocumentGrid({
  documents,
  viewMode,
  selectedDocuments,
  onSelectDocument,
  onViewDocument,
  onDeleteDocument,
  isLoading
}: DocumentGridProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / 1048576 * 10) / 10 + ' MB';
  };

  const getDocumentConfig = (type: string) => {
    return documentTypeConfig[type as keyof typeof documentTypeConfig] || documentTypeConfig.other;
  };

  const isExpiringSoon = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const getMonthName = (month: number) => {
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    return months[month - 1];
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded-xl"></div>
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FileText className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun documento trovato</h3>
        <p className="text-gray-500">Inizia caricando il tuo primo documento</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedDocuments.size === documents.length}
                  onChange={() => {
                    if (selectedDocuments.size === documents.length) {
                      documents.forEach(doc => onSelectDocument(doc.id, false));
                    } else {
                      documents.forEach(doc => onSelectDocument(doc.id, true));
                    }
                  }}
                  className="rounded"
                  data-testid="checkbox-select-all"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dimensione</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {documents.map((doc) => {
              const config = getDocumentConfig(doc.documentType);
              return (
                <tr key={doc.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.has(doc.id)}
                      onChange={(e) => onSelectDocument(doc.id, e.target.checked)}
                      className="rounded"
                      data-testid={`checkbox-document-${doc.id}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{config.icon}</span>
                      <div>
                        <p className="font-medium text-gray-900">{doc.title}</p>
                        {doc.year && doc.month && (
                          <p className="text-sm text-gray-500">{getMonthName(doc.month)} {doc.year}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${config.bgColor}`}>
                      {config.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatFileSize(doc.fileSize)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true, locale: it })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onViewDocument(doc)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg"
                        data-testid={`button-view-${doc.id}`}
                      >
                        <Eye className="h-4 w-4 text-gray-500" />
                      </button>
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg">
                        <Download className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => onDeleteDocument(doc.id)}
                        className="p-1.5 hover:bg-red-100 rounded-lg"
                        data-testid={`button-delete-${doc.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Grid View
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {documents.map((doc) => {
        const config = getDocumentConfig(doc.documentType);
        const isSelected = selectedDocuments.has(doc.id);
        
        return (
          <div
            key={doc.id}
            className={`group relative bg-white/80 backdrop-blur-lg rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border-2 ${
              isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-transparent'
            }`}
          >
            {/* Gradient Header */}
            <div className={`h-32 bg-gradient-to-br ${config.gradient} relative flex items-center justify-center`}>
              <span className="text-5xl">{config.icon}</span>
              
              {/* Badges */}
              <div className="absolute top-2 right-2 flex gap-1">
                {doc.isConfidential && (
                  <div className="bg-red-500 text-white p-1.5 rounded-lg">
                    <Lock className="h-3 w-3" />
                  </div>
                )}
                {isExpiringSoon(doc.expiryDate) && (
                  <div className="bg-orange-500 text-white p-1.5 rounded-lg">
                    <Clock className="h-3 w-3" />
                  </div>
                )}
                {isExpired(doc.expiryDate) && (
                  <div className="bg-red-500 text-white p-1.5 rounded-lg">
                    <AlertCircle className="h-3 w-3" />
                  </div>
                )}
              </div>

              {/* Checkbox */}
              <div className="absolute top-2 left-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onSelectDocument(doc.id, e.target.checked)}
                  className="rounded bg-white/80"
                  data-testid={`checkbox-grid-${doc.id}`}
                />
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-medium text-gray-900 truncate">
                  {doc.title}
                </h3>
                {doc.year && doc.month && (
                  <p className="text-sm text-gray-500">
                    {getMonthName(doc.month)} {doc.year}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{formatFileSize(doc.fileSize)}</span>
                <span>{formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true, locale: it })}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className={`px-2 py-1 rounded-full text-xs ${config.bgColor}`}>
                  {config.label}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onViewDocument(doc)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid={`button-grid-view-${doc.id}`}
                  >
                    <Eye className="h-4 w-4 text-gray-500" />
                  </button>
                  <button className="p-1.5 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download className="h-4 w-4 text-gray-500" />
                  </button>
                  <button className="p-1.5 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Share2 className="h-4 w-4 text-gray-500" />
                  </button>
                  <button className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}