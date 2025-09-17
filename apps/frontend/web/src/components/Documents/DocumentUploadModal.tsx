import { useState, useCallback, useRef } from 'react';
import { X, Upload, File, FileImage, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useDocumentUpload } from '../../hooks/useDocumentDrive';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg,.jpeg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function DocumentUploadModal({
  isOpen,
  onClose,
  onUploadComplete
}: DocumentUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [metadata, setMetadata] = useState({
    documentType: 'other' as any,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    isConfidential: false,
    description: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadDocument, isUploading } = useDocumentUpload();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        setUploadErrors(prev => ({
          ...prev,
          [file.name]: 'File troppo grande (max 10MB)'
        }));
        return false;
      }
      return true;
    });

    // Auto-detect document type from filename
    validFiles.forEach(file => {
      const fileName = file.name.toLowerCase();
      if (fileName.includes('busta') || fileName.includes('payslip') || fileName.includes('cedolino')) {
        setMetadata(prev => ({ ...prev, documentType: 'payslip' }));
      } else if (fileName.includes('contratto') || fileName.includes('contract')) {
        setMetadata(prev => ({ ...prev, documentType: 'contract' }));
      } else if (fileName.includes('certificat')) {
        setMetadata(prev => ({ ...prev, documentType: 'certificate' }));
      } else if (fileName.includes('cv') || fileName.includes('resume')) {
        setMetadata(prev => ({ ...prev, documentType: 'cv' }));
      }
    });

    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    const fileName = files[index].name;
    setUploadErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fileName];
      return newErrors;
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    for (const file of files) {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        await uploadDocument(file, metadata, (progress) => {
          setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
        });
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      } catch (error) {
        setUploadErrors(prev => ({
          ...prev,
          [file.name]: error instanceof Error ? error.message : 'Errore upload'
        }));
      }
    }

    // Wait a moment to show completion
    setTimeout(() => {
      onUploadComplete();
      setFiles([]);
      setUploadProgress({});
      setUploadErrors({});
    }, 1000);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <FileImage className="h-5 w-5" />;
    if (file.type === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / 1048576) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">Carica Documenti</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="button-close-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              dragActive
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={Object.keys(ACCEPTED_FILE_TYPES).join(',')}
              onChange={(e) => handleFiles(Array.from(e.target.files || []))}
              className="hidden"
              data-testid="input-file-upload"
            />
            
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Trascina i file qui o clicca per selezionare
            </p>
            <p className="text-sm text-gray-500">
              PDF, Immagini, Word (max 10MB per file)
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-gray-700">File selezionati:</h3>
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  
                  {uploadProgress[file.name] !== undefined ? (
                    <div className="w-24">
                      <div className="flex items-center gap-2">
                        {uploadProgress[file.name] === 100 ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <div className="flex-1">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 transition-all"
                                style={{ width: `${uploadProgress[file.name]}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <span className="text-xs text-gray-500">
                          {uploadProgress[file.name]}%
                        </span>
                      </div>
                    </div>
                  ) : uploadErrors[file.name] ? (
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-xs">{uploadErrors[file.name]}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-red-500"
                      data-testid={`button-remove-file-${index}`}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Metadata Form */}
          {files.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">Informazioni Documento</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo Documento
                  </label>
                  <select
                    value={metadata.documentType}
                    onChange={(e) => setMetadata(prev => ({ ...prev, documentType: e.target.value as any }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    data-testid="select-document-type"
                  >
                    <option value="payslip">Busta Paga</option>
                    <option value="contract">Contratto</option>
                    <option value="certificate">Certificato</option>
                    <option value="id_document">Documento ID</option>
                    <option value="cv">CV/Resume</option>
                    <option value="evaluation">Valutazione</option>
                    <option value="warning">Richiamo</option>
                    <option value="other">Altro</option>
                  </select>
                </div>

                {metadata.documentType === 'payslip' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Anno
                      </label>
                      <input
                        type="number"
                        value={metadata.year}
                        onChange={(e) => setMetadata(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        min="2020"
                        max="2030"
                        data-testid="input-year"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mese
                      </label>
                      <select
                        value={metadata.month}
                        onChange={(e) => setMetadata(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        data-testid="select-month"
                      >
                        <option value="1">Gennaio</option>
                        <option value="2">Febbraio</option>
                        <option value="3">Marzo</option>
                        <option value="4">Aprile</option>
                        <option value="5">Maggio</option>
                        <option value="6">Giugno</option>
                        <option value="7">Luglio</option>
                        <option value="8">Agosto</option>
                        <option value="9">Settembre</option>
                        <option value="10">Ottobre</option>
                        <option value="11">Novembre</option>
                        <option value="12">Dicembre</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrizione (opzionale)
                </label>
                <textarea
                  value={metadata.description}
                  onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder="Aggiungi una descrizione..."
                  data-testid="textarea-description"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="confidential"
                  checked={metadata.isConfidential}
                  onChange={(e) => setMetadata(prev => ({ ...prev, isConfidential: e.target.checked }))}
                  className="rounded text-indigo-600"
                  data-testid="checkbox-confidential"
                />
                <label htmlFor="confidential" className="text-sm text-gray-700">
                  Documento confidenziale (accesso limitato)
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            data-testid="button-cancel"
          >
            Annulla
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-upload"
          >
            {isUploading ? 'Caricamento...' : `Carica ${files.length} file`}
          </button>
        </div>
      </div>
    </div>
  );
}