// ✅ Sistema Centralizzato degli Stati delle Richieste HR 
// Allineato al database schema: hrRequestStatusEnum & leaveRequestStatusEnum

export const REQUEST_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending', 
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled'
} as const;

export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS];

// ==================== TRADUZIONI ITALIANE ====================
export const STATUS_LABELS: Record<RequestStatus, string> = {
  [REQUEST_STATUS.DRAFT]: 'Bozza',
  [REQUEST_STATUS.PENDING]: 'Pending', 
  [REQUEST_STATUS.APPROVED]: 'Approvata',
  [REQUEST_STATUS.REJECTED]: 'Rifiutata',
  [REQUEST_STATUS.CANCELLED]: 'Annullata'
};

// ==================== COLORI UNIFORMI ====================
export const STATUS_COLORS: Record<RequestStatus, string> = {
  [REQUEST_STATUS.DRAFT]: 'bg-blue-500',
  [REQUEST_STATUS.PENDING]: 'bg-yellow-500',
  [REQUEST_STATUS.APPROVED]: 'bg-green-500', 
  [REQUEST_STATUS.REJECTED]: 'bg-red-500',
  [REQUEST_STATUS.CANCELLED]: 'bg-gray-500'
};

// ==================== FUNZIONI CENTRALIZZATE ====================

/**
 * Ottieni la traduzione italiana dello stato
 */
export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status as RequestStatus] || status;
}

/**
 * Ottieni il colore Tailwind per il badge dello stato
 */
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status as RequestStatus] || 'bg-gray-500';
}

/**
 * Ottieni la classe completa per il badge
 */
export function getStatusBadgeClass(status: string): string {
  return `${getStatusColor(status)} text-white`;
}

/**
 * Verifica se uno stato è valido
 */
export function isValidStatus(status: string): boolean {
  return Object.values(REQUEST_STATUS).includes(status as RequestStatus);
}

/**
 * Ottieni tutti gli stati disponibili per dropdown/select
 */
export function getAllStatuses(): Array<{ value: RequestStatus; label: string }> {
  return Object.values(REQUEST_STATUS).map(status => ({
    value: status,
    label: getStatusLabel(status)
  }));
}

/**
 * Ottieni gli stati per filtri (include "Tutte")
 */
export function getStatusFilters(): Array<{ value: string; label: string }> {
  return [
    { value: 'all', label: 'Tutte le richieste' },
    ...getAllStatuses()
  ];
}