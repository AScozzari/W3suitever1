import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploadFieldProps {
  label: string;
  value: string[];
  onChange: (files: string[]) => void;
  accept?: string;
  maxFiles?: number;
  required?: boolean;
  disabled?: boolean;
}

export default function FileUploadField({
  label,
  value = [],
  onChange,
  accept = 'image/*,.pdf',
  maxFiles = 5,
  required = false,
  disabled = false
}: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Check max files
    if (value.length + files.length > maxFiles) {
      toast({
        title: 'Limite file superato',
        description: `Puoi caricare massimo ${maxFiles} file`,
        variant: 'destructive'
      });
      return;
    }

    // Validate file types
    const validTypes = accept.split(',').map(t => t.trim());
    const invalidFiles = files.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      const mimeType = file.type;
      return !validTypes.some(type => 
        type === mimeType || 
        type === extension ||
        (type.includes('*') && mimeType.startsWith(type.split('/')[0]))
      );
    });

    if (invalidFiles.length > 0) {
      toast({
        title: 'Tipo file non valido',
        description: `Formati accettati: ${accept}`,
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      // Convert files to base64 for storage
      const base64Files = await Promise.all(
        files.map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = reader.result as string;
              resolve(JSON.stringify({
                name: file.name,
                type: file.type,
                size: file.size,
                data: base64
              }));
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );

      onChange([...value, ...base64Files]);

      toast({
        title: 'File caricati',
        description: `${files.length} file caricati con successo`
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Errore upload',
        description: 'Impossibile caricare i file',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const getFileInfo = (fileString: string) => {
    try {
      return JSON.parse(fileString);
    } catch {
      return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading || value.length >= maxFiles}
          className="w-full sm:w-auto"
          data-testid="button-upload-file"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Caricamento...' : 'Carica File'}
        </Button>
        <span className="text-xs text-gray-500">
          {value.length}/{maxFiles} file
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File List */}
      {value.length > 0 && (
        <div className="space-y-2 mt-3">
          {value.map((fileString, index) => {
            const fileInfo = getFileInfo(fileString);
            if (!fileInfo) return null;

            const isImage = fileInfo.type.startsWith('image/');
            const isPdf = fileInfo.type === 'application/pdf';

            return (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                data-testid={`file-item-${index}`}
              >
                {/* Icon/Preview */}
                <div className="flex-shrink-0">
                  {isImage ? (
                    <div className="h-10 w-10 rounded overflow-hidden bg-gray-200">
                      <img 
                        src={fileInfo.data} 
                        alt={fileInfo.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : isPdf ? (
                    <div className="h-10 w-10 rounded bg-red-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-red-600" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileInfo.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(fileInfo.size)}
                  </p>
                </div>

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                  className="flex-shrink-0"
                  data-testid={`button-remove-file-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Formati accettati: {accept === 'image/*,.pdf' ? 'Immagini (JPG, PNG) e PDF' : accept}
      </p>
    </div>
  );
}
