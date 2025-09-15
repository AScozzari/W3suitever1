import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Palette, Upload, X, Check, AlertCircle, RefreshCw } from 'lucide-react';

// WindTre colors for avatar generation
const WINDTRE_COLORS = [
  ['#FF6900', '#ff8533'], // Primary orange gradient
  ['#7B2CBF', '#9747ff'], // Primary purple gradient
  ['#FF6900', '#7B2CBF'], // Orange to purple
  ['#ff8533', '#9747ff'], // Light orange to light purple
  ['#e55a00', '#6B21A8'], // Dark orange to dark purple
  ['#FF8500', '#8B5CF6'], // Bright orange to violet
];

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
  firstName = '',
  lastName = '',
  username = '',
  onAvatarChange,
  loading = false,
  error,
  size = 120
}: AvatarSelectorProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [avatarType, setAvatarType] = useState<'upload' | 'generated' | null>(
    currentAvatarUrl ? 'upload' : null
  );
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate initials from name or username
  const generateInitials = useCallback(() => {
    if (firstName && lastName) {
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }
    if (username) {
      const parts = username.split(/[._-]/);
      if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
      }
      return username.charAt(0).toUpperCase();
    }
    return 'U';
  }, [firstName, lastName, username]);

  // Generate random gradient from WindTre colors
  const getRandomGradient = useCallback(() => {
    const colorSet = WINDTRE_COLORS[Math.floor(Math.random() * WINDTRE_COLORS.length)];
    return `linear-gradient(135deg, ${colorSet[0]}, ${colorSet[1]})`;
  }, []);

  // Create avatar canvas and convert to blob
  const generateAvatarBlob = useCallback(async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas size
    canvas.width = size * 2; // High DPI
    canvas.height = size * 2;
    ctx.scale(2, 2);

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    const colorSet = WINDTRE_COLORS[Math.floor(Math.random() * WINDTRE_COLORS.length)];
    gradient.addColorStop(0, colorSet[0]);
    gradient.addColorStop(1, colorSet[1]);

    // Draw circle background
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
    ctx.fill();

    // Draw initials
    const initials = generateInitials();
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.4}px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, size / 2, size / 2);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png', 0.9);
    });
  }, [size, generateInitials]);

  // Validate uploaded file
  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!allowedTypes.includes(file.type)) {
      return 'Formato file non supportato. Usa JPEG, PNG, GIF o WEBP.';
    }

    if (file.size > maxSize) {
      return 'File troppo grande. Dimensione massima: 2MB.';
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
      setAvatarType('upload');

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

  // Handle avatar generation
  const handleGenerateAvatar = useCallback(async () => {
    setIsUploading(true);
    setValidationError(null);

    try {
      const blob = await generateAvatarBlob();
      if (!blob) {
        throw new Error('Errore nella generazione dell\'avatar');
      }

      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
      setAvatarType('generated');

      // Notify parent
      onAvatarChange?.({
        url: objectUrl,
        blob,
        type: 'generated'
      });

    } catch (err) {
      console.error('Avatar generation error:', err);
      setValidationError('Errore nella generazione dell\'avatar.');
    } finally {
      setIsUploading(false);
    }
  }, [generateAvatarBlob, onAvatarChange]);

  // Reset avatar
  const handleReset = useCallback(() => {
    setPreviewUrl(null);
    setAvatarType(null);
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
      padding: '24px',
      background: 'hsla(255, 255, 255, 0.08)',
      backdropFilter: 'blur(24px) saturate(140%)',
      WebkitBackdropFilter: 'blur(24px) saturate(140%)',
      border: '1px solid hsla(255, 255, 255, 0.12)',
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
              : getRandomGradient(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            border: '4px solid hsla(255, 255, 255, 0.2)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}
          data-testid="avatar-preview"
        >
          {!previewUrl && (
            <span style={{
              color: 'white',
              fontSize: `${size * 0.4}px`,
              fontWeight: 'bold',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
            }}>
              {generateInitials()}
            </span>
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

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        width: '100%',
        maxWidth: '280px'
      }}>
        {/* Upload Photo Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading || isUploading}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: loading || isUploading 
              ? '#e5e7eb' 
              : 'linear-gradient(135deg, #FF6900, #ff8533)',
            color: loading || isUploading ? '#6b7280' : 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading || isUploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
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
          <Camera size={16} />
          Carica Foto
        </button>

        {/* Generate Avatar Button */}
        <button
          onClick={handleGenerateAvatar}
          disabled={loading || isUploading}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: loading || isUploading 
              ? '#e5e7eb' 
              : 'hsla(255, 255, 255, 0.1)',
            color: loading || isUploading ? '#6b7280' : '#374151',
            border: '1px solid hsla(255, 255, 255, 0.2)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading || isUploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(10px)',
            opacity: loading || isUploading ? 0.6 : 1
          }}
          onMouseOver={(e) => {
            if (!loading && !isUploading) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.background = 'hsla(255, 255, 255, 0.15)';
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.background = loading || isUploading 
              ? '#e5e7eb' 
              : 'hsla(255, 255, 255, 0.1)';
          }}
          data-testid="button-create-avatar"
        >
          <Palette size={16} />
          Crea Avatar
        </button>
      </div>

      {/* Error Display */}
      {(validationError || error) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          background: 'hsla(239, 68, 68, 0.1)',
          border: '1px solid hsla(239, 68, 68, 0.2)',
          borderRadius: '8px',
          color: '#dc2626',
          fontSize: '14px',
          width: '100%',
          maxWidth: '280px'
        }}>
          <AlertCircle size={16} />
          {validationError || error}
        </div>
      )}

      {/* Success Indicator */}
      {avatarType && !isUploading && !validationError && !error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          background: 'hsla(34, 197, 94, 0.1)',
          border: '1px solid hsla(34, 197, 94, 0.2)',
          borderRadius: '8px',
          color: '#059669',
          fontSize: '14px',
          width: '100%',
          maxWidth: '280px'
        }}>
          <Check size={16} />
          Avatar {avatarType === 'upload' ? 'caricato' : 'generato'} con successo
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

      {/* Hidden Canvas for Avatar Generation */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
        data-testid="canvas-avatar-generator"
      />

    </div>
  );
}