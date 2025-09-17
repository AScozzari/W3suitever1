import { useState, useEffect } from 'react';
import { X, Download, Share2, Printer, ZoomIn, ZoomOut, RotateCw, Info, History, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface DocumentViewerProps {
  document: any;
  onClose: () => void;
}

export default function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // Simulate loading document
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [document]);

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(50, Math.min(200, prev + delta)));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    // Generate shareable link
    const link = `${window.location.origin}/shared/documents/${document.id}`;
    setShareUrl(link);
    await navigator.clipboard.writeText(link);
  };

  const handleDownload = () => {
    // Trigger download
    const link = document.createElement('a');
    link.href = `/api/hr/documents/${document.id}/download`;
    link.download = document.fileName;
    link.click();
  };

  const getMonthName = (month: number) => {
    const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                   'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    return months[month - 1];
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-black/50 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                data-testid="button-close-viewer"
              >
                <X className="h-5 w-5 text-white" />
              </button>
              <div>
                <h2 className="text-white font-medium">{document.title}</h2>
                {document.year && document.month && (
                  <p className="text-white/60 text-sm">
                    {getMonthName(document.month)} {document.year}
                  </p>
                )}
              </div>
              {document.isConfidential && (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 rounded-lg">
                  <Lock className="h-3 w-3 text-red-400" />
                  <span className="text-xs text-red-400">Confidenziale</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
                <button
                  onClick={() => handleZoom(-10)}
                  className="p-1 hover:bg-white/10 rounded"
                  data-testid="button-zoom-out"
                >
                  <ZoomOut className="h-4 w-4 text-white" />
                </button>
                <span className="text-white text-sm px-2">{zoom}%</span>
                <button
                  onClick={() => handleZoom(10)}
                  className="p-1 hover:bg-white/10 rounded"
                  data-testid="button-zoom-in"
                >
                  <ZoomIn className="h-4 w-4 text-white" />
                </button>
              </div>

              {/* Rotation */}
              <button
                onClick={handleRotate}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                data-testid="button-rotate"
              >
                <RotateCw className="h-4 w-4 text-white" />
              </button>

              {/* Actions */}
              <div className="h-6 w-px bg-white/20" />
              
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                data-testid="button-info"
              >
                <Info className="h-4 w-4 text-white" />
              </button>

              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                data-testid="button-history"
              >
                <History className="h-4 w-4 text-white" />
              </button>

              <button
                onClick={handlePrint}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                data-testid="button-print"
              >
                <Printer className="h-4 w-4 text-white" />
              </button>

              <button
                onClick={handleShare}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                data-testid="button-share"
              >
                <Share2 className="h-4 w-4 text-white" />
              </button>

              <button
                onClick={handleDownload}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
                data-testid="button-download"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="absolute inset-0 top-16 flex">
        {/* Document Preview */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
          {loading ? (
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-4 border-white/20 border-t-white rounded-full mx-auto mb-4"></div>
              <p className="text-white/60">Caricamento documento...</p>
            </div>
          ) : document.mimeType === 'application/pdf' ? (
            <div 
              className="bg-white rounded-lg shadow-2xl transition-transform"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center'
              }}
            >
              <iframe
                src={`/api/hr/documents/${document.id}/preview`}
                className="w-[800px] h-[1000px]"
                title={document.title}
              />
            </div>
          ) : document.mimeType?.startsWith('image/') ? (
            <img
              src={`/api/hr/documents/${document.id}/preview`}
              alt={document.title}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center'
              }}
            />
          ) : (
            <div className="bg-white/10 backdrop-blur rounded-lg p-8 text-center">
              <p className="text-white mb-4">Anteprima non disponibile per questo tipo di file</p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
              >
                Download per visualizzare
              </button>
            </div>
          )}
        </div>

        {/* Info Sidebar */}
        {showInfo && (
          <div className="w-80 bg-black/50 backdrop-blur-lg border-l border-white/10 p-4 overflow-y-auto">
            <h3 className="text-white font-medium mb-4">Informazioni Documento</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-white/60">Nome File</p>
                <p className="text-white">{document.fileName}</p>
              </div>
              <div>
                <p className="text-white/60">Dimensione</p>
                <p className="text-white">{(document.fileSize / 1024).toFixed(1)} KB</p>
              </div>
              <div>
                <p className="text-white/60">Tipo</p>
                <p className="text-white">{document.documentType}</p>
              </div>
              <div>
                <p className="text-white/60">Caricato da</p>
                <p className="text-white">{document.uploadedBy}</p>
              </div>
              <div>
                <p className="text-white/60">Data Caricamento</p>
                <p className="text-white">
                  {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true, locale: it })}
                </p>
              </div>
              {document.expiryDate && (
                <div>
                  <p className="text-white/60">Scadenza</p>
                  <p className="text-white">
                    {new Date(document.expiryDate).toLocaleDateString('it-IT')}
                  </p>
                </div>
              )}
              {document.description && (
                <div>
                  <p className="text-white/60">Descrizione</p>
                  <p className="text-white">{document.description}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Sidebar */}
        {showHistory && (
          <div className="w-80 bg-black/50 backdrop-blur-lg border-l border-white/10 p-4 overflow-y-auto">
            <h3 className="text-white font-medium mb-4">Cronologia</h3>
            <div className="space-y-3">
              <div className="border-l-2 border-white/20 pl-4 ml-2">
                <div className="relative -ml-[25px]">
                  <div className="absolute w-3 h-3 bg-indigo-500 rounded-full"></div>
                </div>
                <p className="text-white text-sm">Documento caricato</p>
                <p className="text-white/60 text-xs">
                  {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true, locale: it })}
                </p>
              </div>
              {document.lastAccessedAt && (
                <div className="border-l-2 border-white/20 pl-4 ml-2">
                  <div className="relative -ml-[25px]">
                    <div className="absolute w-3 h-3 bg-blue-500 rounded-full"></div>
                  </div>
                  <p className="text-white text-sm">Ultimo accesso</p>
                  <p className="text-white/60 text-xs">
                    {formatDistanceToNow(new Date(document.lastAccessedAt), { addSuffix: true, locale: it })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {shareUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="font-medium mb-4">Link di Condivisione</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 border rounded-lg bg-gray-50"
                data-testid="input-share-url"
              />
              <button
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                data-testid="button-copy-url"
              >
                Copia
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Link valido per 7 giorni
            </p>
            <button
              onClick={() => setShareUrl('')}
              className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              data-testid="button-close-share"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}