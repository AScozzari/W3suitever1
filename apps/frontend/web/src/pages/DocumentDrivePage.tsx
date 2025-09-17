import { useState, useCallback, useEffect } from 'react';
import {
  FileText,
  Upload,
  Search,
  Filter,
  Grid3X3,
  List,
  Download,
  Share2,
  Trash2,
  FolderOpen,
  FileCheck,
  FileWarning,
  Clock,
  Shield,
  HardDrive
} from 'lucide-react';
import { useDocumentDrive } from '../hooks/useDocumentDrive';
import DocumentUploadModal from '../components/Documents/DocumentUploadModal';
import DocumentGrid from '../components/Documents/DocumentGrid';
import DocumentViewer from '../components/Documents/DocumentViewer';
import DocumentCategories from '../components/Documents/DocumentCategories';
import PayslipManager from '../components/Documents/PayslipManager';
import { formatBytes } from '../utils/formatters';

export default function DocumentDrivePage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<any | null>(null);
  const [showPayslipManager, setShowPayslipManager] = useState(false);
  const [filters, setFilters] = useState({
    documentType: null as string | null,
    year: null as number | null,
    month: null as number | null,
    isConfidential: false,
    onlyExpiring: false
  });

  const {
    documents,
    isLoading,
    categories,
    storageUsage,
    deleteDocument,
    bulkDownload,
    searchDocuments,
    refetch
  } = useDocumentDrive(searchQuery, filters);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setIsUploadModalOpen(true);
      // Files will be handled in upload modal
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleBulkAction = async (action: 'download' | 'delete') => {
    if (selectedDocuments.size === 0) return;

    if (action === 'download') {
      await bulkDownload(Array.from(selectedDocuments));
    } else if (action === 'delete') {
      if (confirm(`Sei sicuro di voler eliminare ${selectedDocuments.size} documenti?`)) {
        for (const docId of selectedDocuments) {
          await deleteDocument(docId);
        }
        setSelectedDocuments(new Set());
        refetch();
      }
    }
  };

  const handleSelectDocument = (docId: string, isSelected: boolean) => {
    const newSelection = new Set(selectedDocuments);
    if (isSelected) {
      newSelection.add(docId);
    } else {
      newSelection.delete(docId);
    }
    setSelectedDocuments(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedDocuments.size === documents.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(documents.map(doc => doc.id)));
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (selectedCategory && doc.documentType !== selectedCategory) return false;
    if (filters.isConfidential && !doc.isConfidential) return false;
    if (filters.onlyExpiring && !doc.expiryDate) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="backdrop-blur-lg bg-white/80 shadow-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileText className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-semibold text-gray-900">
                Document Drive HR
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Storage Usage */}
              <div className="flex items-center gap-2 px-4 py-2 bg-white/60 rounded-lg backdrop-blur">
                <HardDrive className="h-4 w-4 text-gray-500" />
                <div className="text-sm">
                  <span className="font-medium">{formatBytes(storageUsage.used)}</span>
                  <span className="text-gray-500"> / {formatBytes(storageUsage.total)}</span>
                </div>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    style={{ width: `${(storageUsage.used / storageUsage.total) * 100}%` }}
                  />
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca documenti..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 bg-white/80 backdrop-blur-md border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  data-testid="input-document-search"
                />
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-white/60 rounded-lg p-1 backdrop-blur">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white text-indigo-600' : 'text-gray-500'}`}
                  data-testid="button-view-grid"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-white text-indigo-600' : 'text-gray-500'}`}
                  data-testid="button-view-list"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Upload Button */}
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
                data-testid="button-upload-document"
              >
                <Upload className="h-4 w-4" />
                Carica Documento
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={() => setShowPayslipManager(!showPayslipManager)}
              className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
              data-testid="button-payslip-manager"
            >
              Buste Paga
            </button>

            <button
              onClick={() => setFilters(f => ({ ...f, isConfidential: !f.isConfidential }))}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${
                filters.isConfidential ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
              }`}
              data-testid="button-filter-confidential"
            >
              <Shield className="h-3 w-3" />
              Confidenziali
            </button>

            <button
              onClick={() => setFilters(f => ({ ...f, onlyExpiring: !f.onlyExpiring }))}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${
                filters.onlyExpiring ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
              }`}
              data-testid="button-filter-expiring"
            >
              <Clock className="h-3 w-3" />
              In Scadenza
            </button>

            {selectedDocuments.size > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedDocuments.size} selezionati
                </span>
                <button
                  onClick={() => handleBulkAction('download')}
                  className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
                  data-testid="button-bulk-download"
                >
                  <Download className="h-3 w-3 inline mr-1" />
                  Download
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                  data-testid="button-bulk-delete"
                >
                  <Trash2 className="h-3 w-3 inline mr-1" />
                  Elimina
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Categories */}
          <div className="w-64 flex-shrink-0">
            <DocumentCategories
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              documentCounts={documents.reduce((acc, doc) => {
                acc[doc.documentType] = (acc[doc.documentType] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)}
            />
          </div>

          {/* Main Content Area */}
          <div 
            className="flex-1"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {showPayslipManager ? (
              <PayslipManager 
                onClose={() => setShowPayslipManager(false)}
              />
            ) : (
              <DocumentGrid
                documents={filteredDocuments}
                viewMode={viewMode}
                selectedDocuments={selectedDocuments}
                onSelectDocument={handleSelectDocument}
                onViewDocument={setViewingDocument}
                onDeleteDocument={deleteDocument}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {isUploadModalOpen && (
        <DocumentUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadComplete={() => {
            setIsUploadModalOpen(false);
            refetch();
          }}
        />
      )}

      {viewingDocument && (
        <DocumentViewer
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
}