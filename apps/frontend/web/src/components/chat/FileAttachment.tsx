import { useState } from 'react';
import { FileText, Image as ImageIcon, Film, Music, File, X, Upload } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface AttachmentProps {
  attachment: {
    id: string;
    fileName: string;
    contentType: string;
    fileSize: number;
    objectPath: string;
    publicUrl?: string;
  };
  onRemove?: () => void;
}

interface FileUploadProps {
  channelId: string;
  onFileUploaded: (attachment: any) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith('image/')) return <ImageIcon size={20} />;
  if (contentType.startsWith('video/')) return <Film size={20} />;
  if (contentType.startsWith('audio/')) return <Music size={20} />;
  if (contentType.includes('pdf')) return <FileText size={20} />;
  return <File size={20} />;
}

export function AttachmentPreview({ attachment, onRemove }: AttachmentProps) {
  const isImage = attachment.contentType.startsWith('image/');

  return (
    <div
      data-testid={`attachment-${attachment.id}`}
      style={{
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        background: 'white'
      }}
    >
      {onRemove && (
        <button
          onClick={onRemove}
          data-testid="button-remove-attachment"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1
          }}
        >
          <X size={14} />
        </button>
      )}

      {isImage && attachment.publicUrl ? (
        <img
          src={attachment.publicUrl}
          alt={attachment.fileName}
          style={{
            width: '100%',
            maxHeight: '200px',
            objectFit: 'cover'
          }}
        />
      ) : (
        <div style={{
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ color: '#6b7280' }}>
            {getFileIcon(attachment.contentType)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#1f2937',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {attachment.fileName}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#9ca3af',
              marginTop: '2px'
            }}>
              {formatFileSize(attachment.fileSize)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FileUpload({ channelId, onFileUploaded }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const prepareUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Prepare upload
      const uploadData = await apiRequest('/api/chat/attachments/prepare', {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          channelId
        })
      });

      // Upload file (simulato - in produzione usare Object Storage)
      // TODO: Implementare upload reale con Object Storage

      return uploadData.metadata;
    },
    onSuccess: (metadata) => {
      onFileUploaded(metadata);
      setSelectedFile(null);
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File troppo grande. Massimo 10MB');
      return;
    }

    setSelectedFile(file);
    prepareUploadMutation.mutate(file);
  };

  return (
    <div>
      <input
        type="file"
        id="file-upload"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        data-testid="input-file-upload"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv,video/*,audio/*"
      />
      <label
        htmlFor="file-upload"
        data-testid="button-attach-file"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          background: 'white',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#6b7280',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#FF6900';
          e.currentTarget.style.color = '#FF6900';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#e5e7eb';
          e.currentTarget.style.color = '#6b7280';
        }}
      >
        <Upload size={16} />
        Allega file
      </label>

      {selectedFile && prepareUploadMutation.isPending && (
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          Caricamento di {selectedFile.name}...
        </div>
      )}
    </div>
  );
}
