/**
 * USE AVATAR UPLOAD HOOK
 * 
 * Hook per gestire upload avatar tramite storageService.
 * Flusso:
 * 1. Carica file direttamente al backend
 * 2. Backend salva in MyDrive Avatar folder
 * 3. Restituisce URL firmato per visualizzazione
 */

import { useState, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';

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
 * Hook per upload avatar tramite storageService
 */
export function useAvatarUpload(): UseAvatarUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Carica avatar al backend
   * @param file - Blob del file avatar
   * @param userId - ID dell'utente
   * @param fileName - Nome file opzionale
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
      setUploadProgress(20);

      const formData = new FormData();
      formData.append('avatar', file, fileName);

      setUploadProgress(40);

      const uploadResponse = await fetch(`/api/storage/avatars/${userId}`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!uploadResponse.ok) {
        const errData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Errore caricamento avatar');
      }

      const avatarObject = await uploadResponse.json();
      
      setUploadProgress(80);
      console.log('[AvatarUpload] Avatar uploaded:', avatarObject.id);

      const signedUrlResponse = await fetch(`/api/storage/avatars/${userId}/signed-url`, {
        credentials: 'include'
      });

      let avatarUrl = null;
      if (signedUrlResponse.ok) {
        const signedData = await signedUrlResponse.json();
        avatarUrl = signedData.url;
      }

      setUploadProgress(100);

      queryClient.invalidateQueries({ queryKey: [`/api/storage/avatars/${userId}/signed-url`] });

      return {
        success: true,
        url: avatarUrl,
        objectKey: avatarObject.objectKey
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
