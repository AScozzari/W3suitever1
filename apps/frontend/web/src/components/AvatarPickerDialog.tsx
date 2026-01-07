/**
 * 🖼️ AVATAR PICKER DIALOG
 * 
 * Dialog modale per selezionare avatar da:
 * 1. Dispositivo locale - Upload classico dal PC
 * 2. MyDrive - Cartella avatars/ personale con anteprime
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Upload, 
  HardDrive, 
  CloudOff, 
  Image as ImageIcon,
  Loader2,
  Check,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface SavedAvatar {
  objectKey: string;
  url: string;
  fileName: string;
  uploadedAt: string;
  sizeBytes?: number;
}

interface AvatarPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentAvatarUrl?: string;
  onSelectLocalFile: (file: File) => void;
  onSelectFromMyDrive: (avatar: SavedAvatar) => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

export default function AvatarPickerDialog({
  open,
  onOpenChange,
  userId,
  currentAvatarUrl,
  onSelectLocalFile,
  onSelectFromMyDrive,
  isUploading = false,
  uploadProgress = 0
}: AvatarPickerDialogProps) {
  const [activeTab, setActiveTab] = useState<'device' | 'mydrive'>('device');
  const [savedAvatars, setSavedAvatars] = useState<SavedAvatar[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved avatars when MyDrive tab is active
  useEffect(() => {
    if (open && activeTab === 'mydrive' && userId) {
      loadSavedAvatars();
    }
  }, [open, activeTab, userId]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setValidationError(null);
    }
  }, [open]);

  const loadSavedAvatars = async () => {
    setLoadingAvatars(true);
    setLoadError(null);
    
    try {
      const response = await fetch(`/api/users/${userId}/avatars`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Errore caricamento avatar salvati');
      }
      
      const data = await response.json();
      setSavedAvatars(data.data?.avatars || []);
    } catch (err) {
      console.error('[AvatarPicker] Error loading avatars:', err);
      setLoadError(err instanceof Error ? err.message : 'Errore sconosciuto');
      setSavedAvatars([]);
    } finally {
      setLoadingAvatars(false);
    }
  };

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return 'Formato non supportato. Usa JPEG, PNG, GIF o WEBP.';
    }

    if (file.size > maxSize) {
      return 'File troppo grande. Max 5MB.';
    }

    return null;
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    setSelectedFile(file);
    
    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleConfirmUpload = useCallback(() => {
    if (selectedFile) {
      onSelectLocalFile(selectedFile);
    }
  }, [selectedFile, onSelectLocalFile]);

  const handleSelectSavedAvatar = useCallback((avatar: SavedAvatar) => {
    onSelectFromMyDrive(avatar);
  }, [onSelectFromMyDrive]);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        style={{ 
          maxWidth: '32rem',
          padding: '1.5rem',
          background: 'white',
          borderRadius: '1rem'
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Scegli Avatar
          </DialogTitle>
          <DialogDescription style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Carica una nuova foto o seleziona dalle immagini salvate
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'device' | 'mydrive')}>
          <TabsList style={{ 
            width: '100%', 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            marginBottom: '1rem',
            background: '#f3f4f6',
            borderRadius: '0.5rem',
            padding: '0.25rem'
          }}>
            <TabsTrigger 
              value="device"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1rem',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'all 0.2s',
                background: activeTab === 'device' ? 'white' : 'transparent',
                color: activeTab === 'device' ? '#FF6900' : '#6b7280',
                boxShadow: activeTab === 'device' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
              data-testid="tab-device"
            >
              <Upload size={16} />
              Dispositivo
            </TabsTrigger>
            <TabsTrigger 
              value="mydrive"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1rem',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'all 0.2s',
                background: activeTab === 'mydrive' ? 'white' : 'transparent',
                color: activeTab === 'mydrive' ? '#FF6900' : '#6b7280',
                boxShadow: activeTab === 'mydrive' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
              data-testid="tab-mydrive"
            >
              <HardDrive size={16} />
              MyDrive
            </TabsTrigger>
          </TabsList>

          {/* Tab: Device Upload */}
          <TabsContent value="device" style={{ marginTop: '1rem' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              {/* Preview Area */}
              <div style={{
                width: '8rem',
                height: '8rem',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px dashed #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f9fafb',
                position: 'relative'
              }}>
                {previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }} 
                  />
                ) : currentAvatarUrl ? (
                  <img 
                    src={currentAvatarUrl} 
                    alt="Current avatar" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      opacity: 0.5
                    }} 
                  />
                ) : (
                  <ImageIcon size={48} style={{ color: '#d1d5db' }} />
                )}
                
                {isUploading && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}>
                    <Loader2 size={24} style={{ color: 'white', animation: 'spin 1s linear infinite' }} />
                    <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: '600' }}>
                      {uploadProgress}%
                    </span>
                  </div>
                )}
              </div>

              {/* File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                data-testid="input-avatar-file"
              />

              {/* Select File Button */}
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                variant="outline"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
                data-testid="button-select-file"
              >
                <Upload size={18} />
                {selectedFile ? 'Cambia file' : 'Seleziona file'}
              </Button>

              {/* Selected File Info */}
              {selectedFile && (
                <div style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#059669',
                  fontSize: '0.875rem'
                }}>
                  <Check size={16} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedFile.name}
                  </span>
                  <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
              )}

              {/* Validation Error */}
              {validationError && (
                <div style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#dc2626',
                  fontSize: '0.875rem'
                }}>
                  <AlertCircle size={16} />
                  {validationError}
                </div>
              )}

              {/* Confirm Upload Button */}
              {selectedFile && !validationError && (
                <Button
                  onClick={handleConfirmUpload}
                  disabled={isUploading}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                  data-testid="button-confirm-upload"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      Caricamento...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Usa questa foto
                    </>
                  )}
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Tab: MyDrive */}
          <TabsContent value="mydrive" style={{ marginTop: '1rem' }}>
            <div style={{ minHeight: '12rem' }}>
              {loadingAvatars ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '12rem',
                  gap: '1rem',
                  color: '#6b7280'
                }}>
                  <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.875rem' }}>Caricamento avatar salvati...</span>
                </div>
              ) : loadError ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '12rem',
                  gap: '1rem',
                  color: '#dc2626',
                  textAlign: 'center',
                  padding: '1rem'
                }}>
                  <AlertCircle size={32} />
                  <span style={{ fontSize: '0.875rem' }}>{loadError}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadSavedAvatars}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <RefreshCw size={14} />
                    Riprova
                  </Button>
                </div>
              ) : savedAvatars.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '12rem',
                  gap: '1rem',
                  color: '#9ca3af',
                  textAlign: 'center'
                }}>
                  <CloudOff size={48} />
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>
                      Nessun avatar salvato
                    </p>
                    <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      Carica un'immagine dal dispositivo per iniziare
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.75rem',
                  maxHeight: '16rem',
                  overflowY: 'auto',
                  padding: '0.25rem'
                }}>
                  {savedAvatars.map((avatar, index) => (
                    <button
                      key={avatar.objectKey || index}
                      onClick={() => handleSelectSavedAvatar(avatar)}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '0.5rem',
                        overflow: 'hidden',
                        border: '2px solid transparent',
                        cursor: 'pointer',
                        background: '#f3f4f6',
                        transition: 'all 0.2s',
                        padding: 0
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = '#FF6900';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      data-testid={`button-avatar-${index}`}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.fileName || 'Avatar salvato'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23d1d5db"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Info */}
              {savedAvatars.length > 0 && (
                <p style={{
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  marginTop: '1rem'
                }}>
                  Clicca su un'immagine per selezionarla
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
