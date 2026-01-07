/**
 * 🖼️ USE AVATAR UPLOAD HOOK
 * 
 * Hook per gestire upload avatar su S3 con presigned URL.
 * Flusso:
 * 1. Richiede presigned URL dal backend
 * 2. Carica file direttamente su S3
 * 3. Conferma upload al backend
 * 4. Restituisce URL permanente S3
 */

import { useState, useCallback } from 'react';

interface PresignedUrlResponse {
  success: boolean;
  data: {
    uploadUrl: string;
    objectKey: string;
    expiresAt: string;
    method: string;
  };
  message?: string;
}

interface ConfirmResponse {
  success: boolean;
  data: {
    userId: string;
    avatarUrl: string;
    objectKey: string;
  };
  message?: string;
}

interface AvatarUploadResult {
  success: boolean;
  url?: string;
  objectKey?: string;
  error?: string;
}

interface UseAvatarUploadReturn {
  uploadAvatar: (file: Blob, userId: string, fileName?: string) => Promise<AvatarUploadResult>;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook per upload avatar su S3
 */
export function useAvatarUpload(): UseAvatarUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Carica avatar su S3
   * @param file - Blob del file avatar
   * @param userId - ID dell'utente
   * @param fileName - Nome file opzionale (per determinare content type)
   */
  const uploadAvatar = useCallback(async (
    file: Blob,
    userId: string,
    fileName: string = 'avatar.png'
  ): Promise<AvatarUploadResult> => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Determina content type
      let contentType = 'image/png';
      if (file.type && file.type.startsWith('image/')) {
        contentType = file.type;
      } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (fileName.endsWith('.webp')) {
        contentType = 'image/webp';
      } else if (fileName.endsWith('.gif')) {
        contentType = 'image/gif';
      }

      setUploadProgress(10);

      // Step 1: Ottieni presigned URL dal backend
      const presignedResponse = await fetch(`/api/users/${userId}/avatar/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ contentType })
      });

      if (!presignedResponse.ok) {
        const errData = await presignedResponse.json().catch(() => ({}));
        throw new Error(errData.message || 'Errore generazione URL upload');
      }

      const presignedData: PresignedUrlResponse = await presignedResponse.json();
      
      if (!presignedData.success || !presignedData.data?.uploadUrl) {
        throw new Error(presignedData.message || 'URL upload non valido');
      }

      setUploadProgress(30);
      console.log('[AvatarUpload] Got presigned URL:', presignedData.data.objectKey);

      // Step 2: Carica file direttamente su S3
      const uploadResponse = await fetch(presignedData.data.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error('Errore caricamento file su S3');
      }

      setUploadProgress(70);
      console.log('[AvatarUpload] File uploaded to S3');

      // Step 3: Conferma upload al backend
      const confirmResponse = await fetch(`/api/users/${userId}/avatar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          objectKey: presignedData.data.objectKey
        })
      });

      if (!confirmResponse.ok) {
        const errData = await confirmResponse.json().catch(() => ({}));
        throw new Error(errData.message || 'Errore conferma upload avatar');
      }

      const confirmData: ConfirmResponse = await confirmResponse.json();
      
      setUploadProgress(100);
      console.log('[AvatarUpload] Upload confirmed, URL:', confirmData.data?.avatarUrl);

      return {
        success: true,
        url: confirmData.data?.avatarUrl,
        objectKey: presignedData.data.objectKey
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto durante upload';
      console.error('[AvatarUpload] Error:', errorMessage);
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsUploading(false);
      // Reset progress after short delay
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, []);

  return {
    uploadAvatar,
    isUploading,
    uploadProgress,
    error,
    clearError
  };
}

export default useAvatarUpload;
