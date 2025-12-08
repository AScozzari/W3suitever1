// Formatting utilities for the Document Drive system

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

export function formatDate(date: string | Date, format: 'short' | 'long' | 'relative' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'relative') {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Oggi';
    if (days === 1) return 'Ieri';
    if (days < 7) return `${days} giorni fa`;
    if (days < 30) return `${Math.floor(days / 7)} settimane fa`;
    if (days < 365) return `${Math.floor(days / 30)} mesi fa`;
    return `${Math.floor(days / 365)} anni fa`;
  }
  
  if (format === 'long') {
    return d.toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  return d.toLocaleDateString('it-IT');
}

export function formatMonthYear(month: number, year: number): string {
  const months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  return `${months[month - 1]} ${year}`;
}

export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
}

export function getMimeTypeIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.startsWith('application/msword') || mimeType.includes('wordprocessingml')) return '📝';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
  if (mimeType.startsWith('text/')) return '📋';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  return '📁';
}

export function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    payslip: 'Busta Paga',
    contract: 'Contratto',
    certificate: 'Certificato',
    id_document: 'Documento ID',
    cv: 'CV/Resume',
    evaluation: 'Valutazione',
    warning: 'Richiamo',
    other: 'Altro'
  };
  return labels[type] || 'Documento';
}

export function getDocumentTypeColor(type: string): string {
  const colors: Record<string, string> = {
    payslip: 'green',
    contract: 'blue',
    certificate: 'purple',
    id_document: 'gray',
    cv: 'teal',
    evaluation: 'yellow',
    warning: 'orange',
    other: 'gray'
  };
  return colors[type] || 'gray';
}

export function isDocumentExpiring(expiryDate: string | null | undefined, daysThreshold = 30): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntilExpiry <= daysThreshold && daysUntilExpiry > 0;
}

export function isDocumentExpired(expiryDate: string | null | undefined): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

export function sanitizeFileName(fileName: string): string {
  // Remove special characters and spaces
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
}

export function generateDocumentTitle(fileName: string, type: string): string {
  // Remove extension
  const name = fileName.replace(/\.[^/.]+$/, '');
  
  // Clean up common patterns
  const cleaned = name
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\d{4}\d{2}\b/g, '') // Remove dates like 202401
    .trim();
  
  // Capitalize first letter of each word
  const title = cleaned
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return title || getDocumentTypeLabel(type);
}

export function parsePayslipFileName(fileName: string): { year?: number; month?: number } {
  // Try to extract year and month from common patterns
  // Examples: busta_paga_2024_01.pdf, payslip-jan-2024.pdf, cedolino_012024.pdf
  
  const patterns = [
    /(\d{4})[-_](\d{1,2})/,  // 2024-01 or 2024_01
    /(\d{1,2})[-_](\d{4})/,  // 01-2024 or 01_2024
    /(\d{4})(\d{2})/,        // 202401
    /(\w{3})[-_](\d{4})/     // jan-2024 or jan_2024
  ];
  
  for (const pattern of patterns) {
    const match = fileName.match(pattern);
    if (match) {
      let year: number | undefined;
      let month: number | undefined;
      
      if (match[1].length === 4) {
        year = parseInt(match[1]);
        month = parseInt(match[2]);
      } else if (match[2].length === 4) {
        year = parseInt(match[2]);
        month = parseInt(match[1]);
      }
      
      // Validate ranges
      if (year && year >= 2020 && year <= 2030 && month && month >= 1 && month <= 12) {
        return { year, month };
      }
    }
  }
  
  return {};
}

export function getStorageQuotaStatus(used: number, total: number): {
  percentage: number;
  status: 'normal' | 'warning' | 'critical';
  color: string;
} {
  const percentage = (used / total) * 100;
  
  if (percentage >= 90) {
    return { percentage, status: 'critical', color: 'red' };
  } else if (percentage >= 75) {
    return { percentage, status: 'warning', color: 'orange' };
  } else {
    return { percentage, status: 'normal', color: 'green' };
  }
}

/**
 * Formatta un timestamp ISO o stringa orario in formato HH:mm
 * Gestisce sia "2025-11-24T09:00:00.000Z" che "09:00:00"
 */
export function formatShiftTime(time: string | null | undefined): string {
  if (!time) return '--:--';
  
  // Se è un timestamp ISO completo (contiene "T")
  if (time.includes('T')) {
    try {
      const date = new Date(time);
      return date.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch {
      return time.substring(0, 5);
    }
  }
  
  // Se è già in formato "HH:mm:ss" o "HH:mm"
  return time.substring(0, 5);
}

/**
 * Formatta una data per mostrare giorno della settimana e data in italiano
 * Es: "martedì 25 novembre"
 */
export function formatShiftDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  } catch {
    return String(date);
  }
}

/**
 * Formatta una fascia oraria come "09:00 - 14:00"
 */
export function formatTimeRange(startTime: string | null | undefined, endTime: string | null | undefined): string {
  return `${formatShiftTime(startTime)} - ${formatShiftTime(endTime)}`;
}

/**
 * Determina lo stato di un turno (passato, presente, futuro) basandosi su data e orari
 */
export function getShiftStatus(date: string, startTime: string, endTime: string): 'past' | 'present' | 'future' {
  const now = new Date();
  const shiftDate = new Date(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const shiftDay = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate());
  
  if (shiftDay < today) return 'past';
  if (shiftDay > today) return 'future';
  
  // Stesso giorno - controlla orari
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseInt(startTime.substring(0, 2)) * 60 + parseInt(startTime.substring(3, 5));
  const endMinutes = parseInt(endTime.substring(0, 2)) * 60 + parseInt(endTime.substring(3, 5));
  
  if (nowMinutes < startMinutes) return 'future';
  if (nowMinutes > endMinutes) return 'past';
  return 'present';
}

/**
 * Colori per badge stato turno
 */
export function getShiftStatusColor(status: 'past' | 'present' | 'future'): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'past':
      return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' };
    case 'present':
      return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-400' };
    case 'future':
      return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-400' };
  }
}

/**
 * Etichette in italiano per stato turno
 */
export function getShiftStatusLabel(status: 'past' | 'present' | 'future'): string {
  switch (status) {
    case 'past': return 'Passato';
    case 'present': return 'In Corso';
    case 'future': return 'Futuro';
  }
}