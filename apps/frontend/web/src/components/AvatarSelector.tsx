import React, { useState, useRef, useCallback } from 'react';
import { Camera, X, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface AvatarSelectorProps {
  /** Current avatar URL if any */
  currentAvatarUrl?: string;
  /** First name for initials generation */
  firstName?: string;
  /** Last name for initials generation */
  lastName?: string;
  /** Username as fallback for initials */
  username?: string;
  /** Callback when avatar changes */
  onAvatarChange?: (avatarData: { url?: string; blob?: Blob; type: 'upload' | 'generated' }) => void;
  /** Loading state */
  loading?: boolean;
  /** Error message to display */
  error?: string;
  /** Size of avatar preview in pixels */
  size?: number;
}

export default function AvatarSelector({
  currentAvatarUrl,
  onAvatarChange,
  loading = false,
  error,
  size = 120
}: AvatarSelectorProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate uploaded file
  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return 'Formato file non supportato. Usa JPEG, PNG, GIF o WEBP.';
    }

    if (file.size > maxSize) {
      return 'File troppo grande. Dimensione massima: 5MB.';
    }

    return null;
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validationErr = validateFile(file);
    if (validationErr) {
      setValidationError(validationErr);
      return;
    }

    setValidationError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Notify parent
      onAvatarChange?.({
        url: objectUrl,
        blob: file,
        type: 'upload'
      });

      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);

    } catch (err) {
      console.error('Upload error:', err);
      setValidationError('Errore durante il caricamento del file.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onAvatarChange]);

  // Reset avatar
  const handleReset = useCallback(() => {
    setPreviewUrl(null);
    setValidationError(null);
    onAvatarChange?.({
      url: undefined,
      blob: undefined,
      type: 'upload'
    });
  }, [onAvatarChange]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
      width: '100%',
      padding: '24px',
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(24px) saturate(140%)',
      WebkitBackdropFilter: 'blur(24px) saturate(140%)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
    }}>
      {/* Avatar Preview */}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            background: previewUrl 
              ? `url(${previewUrl}) center/cover`
              : 'linear-gradient(135deg, #e5e7eb, #f3f4f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            border: '4px solid rgba(255, 255, 255, 0.2)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}
          data-testid="avatar-preview"
        >
          {!previewUrl && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              color: '#6b7280'
            }}>
              <Camera size={32} />
              <span style={{
                fontSize: '12px',
                fontWeight: '500',
                textAlign: 'center'
              }}>
                Anteprima
              </span>
            </div>
          )}
          
          {/* Upload Progress Overlay */}
          {isUploading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <RefreshCw 
                  size={24} 
                  style={{ 
                    color: 'white',
                    animation: 'rotate 1s linear infinite',
                    transformOrigin: 'center'
                  }} 
                />
                {uploadProgress > 0 && (
                  <span style={{
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {uploadProgress}%
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reset Button */}
        {previewUrl && !loading && (
          <button
            onClick={handleReset}
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#ef4444',
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Rimuovi avatar"
            data-testid="button-reset-avatar"
          >
            <X size={12} style={{ color: 'white' }} />
          </button>
        )}
      </div>

      {/* Upload Button - Full Width */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={loading || isUploading}
        style={{
          width: '100%',
          padding: '14px 20px',
          background: loading || isUploading 
            ? '#e5e7eb' 
            : 'linear-gradient(135deg, #FF6900, #ff8533)',
          color: loading || isUploading ? '#6b7280' : 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '15px',
          fontWeight: '600',
          cursor: loading || isUploading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'all 0.2s ease',
          boxShadow: loading || isUploading 
            ? 'none' 
            : '0 4px 12px rgba(255, 105, 0, 0.3)',
          opacity: loading || isUploading ? 0.6 : 1
        }}
        onMouseOver={(e) => {
          if (!loading && !isUploading) {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 105, 0, 0.4)';
          }
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = loading || isUploading 
            ? 'none' 
            : '0 4px 12px rgba(255, 105, 0, 0.3)';
        }}
        data-testid="button-upload-photo"
      >
        <Camera size={18} />
        {previewUrl ? 'Cambia Foto' : 'Carica Foto'}
      </button>

      {/* Error Display */}
      {(validationError || error) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          color: '#dc2626',
          fontSize: '14px',
          width: '100%'
        }}>
          <AlertCircle size={16} />
          {validationError || error}
        </div>
      )}

      {/* Success Indicator */}
      {previewUrl && !isUploading && !validationError && !error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          borderRadius: '8px',
          color: '#059669',
          fontSize: '14px',
          width: '100%'
        }}>
          <Check size={16} />
          Avatar caricato con successo
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        data-testid="input-file-upload"
      />
    </div>
  );
}