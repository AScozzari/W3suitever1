/**
 * WMS Document Movement Generation Rules
 * 
 * Logica per determinare se un documento genera un movimento di magazzino.
 * 
 * Regole Base:
 * - DDT: SEMPRE genera movimento (movimentazione fisica)
 * - Ricevuta: SEMPRE genera movimento (conferma ricezione)
 * - Scontrino Fiscale: SEMPRE genera movimento (vendita diretta → OUTBOUND)
 * - Fattura Attiva: SEMPRE genera movimento (vendita → stato "venduto")
 * - Fattura Passiva: SOLO SE non esiste DDT collegato (carico diretto)
 * - Ordine: MAI genera movimento (solo impegno/prenotazione)
 * - Nota di Credito: SOLO SE implica reso fisico (hasPhysicalReturn = true)
 * - Nota di Debito: MAI genera movimento (solo contabile)
 */

export type DocumentType = 
  | 'order' 
  | 'ddt' 
  | 'receipt' 
  | 'invoice' 
  | 'fiscal_receipt' 
  | 'credit_note' 
  | 'debit_note'
  | 'photo'
  | 'loan_contract'
  | 'tradein_form'
  | 'warranty_certificate'
  | 'doa_report'
  | 'return_form'
  | 'transfer_note'
  | 'adjustment_report'
  | 'other';

export type DocumentDirection = 'active' | 'passive';
export type DocumentNature = 'operational' | 'fiscal';

export interface DocumentMovementContext {
  documentType: DocumentType;
  documentDirection: DocumentDirection;
  linkedDdtId?: string | null;
  hasPhysicalReturn?: boolean;
}

export interface MovementGenerationResult {
  generatesMovement: boolean;
  movementDirection?: 'inbound' | 'outbound' | 'internal';
  reason: string;
}

/**
 * Mappa tipo documento → natura (operational/fiscal)
 */
export const DOCUMENT_NATURE_MAP: Record<DocumentType, DocumentNature | null> = {
  order: 'operational',
  ddt: 'operational',
  receipt: 'operational',
  invoice: 'fiscal',
  fiscal_receipt: 'fiscal',
  credit_note: 'fiscal',
  debit_note: 'fiscal',
  photo: null,
  loan_contract: null,
  tradein_form: null,
  warranty_certificate: null,
  doa_report: null,
  return_form: null,
  transfer_note: null,
  adjustment_report: null,
  other: null,
};

/**
 * Documenti core che possono generare movimenti
 */
export const CORE_DOCUMENT_TYPES: DocumentType[] = [
  'order',
  'ddt',
  'receipt',
  'invoice',
  'fiscal_receipt',
  'credit_note',
  'debit_note',
];

/**
 * Determina se un documento genera un movimento di magazzino
 * e quale direzione di movimento
 */
export function shouldGenerateMovement(context: DocumentMovementContext): MovementGenerationResult {
  const { documentType, documentDirection, linkedDdtId, hasPhysicalReturn } = context;

  switch (documentType) {
    // =====================================================
    // DDT - SEMPRE genera movimento
    // =====================================================
    case 'ddt':
      return {
        generatesMovement: true,
        movementDirection: documentDirection === 'active' ? 'outbound' : 'inbound',
        reason: `DDT ${documentDirection === 'active' ? 'attivo (uscita)' : 'passivo (entrata)'} genera sempre movimento`,
      };

    // =====================================================
    // RICEVUTA - SEMPRE genera movimento
    // =====================================================
    case 'receipt':
      return {
        generatesMovement: true,
        movementDirection: documentDirection === 'active' ? 'outbound' : 'inbound',
        reason: `Ricevuta ${documentDirection === 'active' ? 'attiva' : 'passiva'} conferma movimentazione fisica`,
      };

    // =====================================================
    // SCONTRINO FISCALE - SEMPRE genera movimento (vendita diretta)
    // =====================================================
    case 'fiscal_receipt':
      return {
        generatesMovement: true,
        movementDirection: 'outbound',
        reason: 'Scontrino fiscale = vendita diretta POS, genera sempre uscita',
      };

    // =====================================================
    // FATTURA - Dipende da direzione e presenza DDT
    // =====================================================
    case 'invoice':
      if (documentDirection === 'active') {
        return {
          generatesMovement: true,
          movementDirection: 'outbound',
          reason: 'Fattura attiva genera movimento uscita (vendita)',
        };
      } else {
        // Fattura passiva: solo se NON esiste DDT collegato
        if (linkedDdtId) {
          return {
            generatesMovement: false,
            reason: 'Fattura passiva con DDT collegato: movimento già generato dal DDT',
          };
        }
        return {
          generatesMovement: true,
          movementDirection: 'inbound',
          reason: 'Fattura passiva SENZA DDT: genera movimento entrata (carico diretto)',
        };
      }

    // =====================================================
    // ORDINE - MAI genera movimento
    // =====================================================
    case 'order':
      return {
        generatesMovement: false,
        reason: 'Ordine è solo impegno/prenotazione, non movimenta fisicamente',
      };

    // =====================================================
    // NOTA DI CREDITO - Solo se reso fisico
    // =====================================================
    case 'credit_note':
      if (hasPhysicalReturn) {
        return {
          generatesMovement: true,
          movementDirection: documentDirection === 'active' ? 'inbound' : 'outbound',
          reason: `NDC con reso fisico: ${documentDirection === 'active' ? 'rientro merce da cliente' : 'reso a fornitore'}`,
        };
      }
      return {
        generatesMovement: false,
        reason: 'NDC senza reso fisico: solo correzione contabile',
      };

    // =====================================================
    // NOTA DI DEBITO - MAI genera movimento
    // =====================================================
    case 'debit_note':
      return {
        generatesMovement: false,
        reason: 'Nota di debito è solo documento contabile',
      };

    // =====================================================
    // ALLEGATI (foto, contratti, etc.) - MAI generano movimento
    // =====================================================
    default:
      return {
        generatesMovement: false,
        reason: `Tipo documento '${documentType}' è allegato, non genera movimento`,
      };
  }
}

/**
 * Determina la natura del documento (operational/fiscal)
 */
export function getDocumentNature(documentType: DocumentType): DocumentNature | null {
  return DOCUMENT_NATURE_MAP[documentType];
}

/**
 * Verifica se un tipo documento è un documento core (non allegato)
 */
export function isCoreDocumentType(documentType: DocumentType): boolean {
  return CORE_DOCUMENT_TYPES.includes(documentType);
}

/**
 * Genera il mapping direzione movimento basato su documento
 * 
 * DDT Attivo → Outbound (spedisco)
 * DDT Passivo → Inbound (ricevo)
 * Fattura Attiva → Outbound (vendo)
 * Fattura Passiva senza DDT → Inbound (carico diretto)
 * Scontrino → Outbound (vendita POS)
 * NDC Attiva con reso → Inbound (cliente restituisce)
 * NDC Passiva con reso → Outbound (restituisco a fornitore)
 */
export function getExpectedMovementDirection(
  documentType: DocumentType,
  documentDirection: DocumentDirection
): 'inbound' | 'outbound' | null {
  const directionMap: Record<string, 'inbound' | 'outbound'> = {
    'ddt_active': 'outbound',
    'ddt_passive': 'inbound',
    'receipt_active': 'outbound',
    'receipt_passive': 'inbound',
    'invoice_active': 'outbound',
    'invoice_passive': 'inbound',
    'fiscal_receipt_active': 'outbound',
    'credit_note_active': 'inbound',
    'credit_note_passive': 'outbound',
  };

  const key = `${documentType}_${documentDirection}`;
  return directionMap[key] || null;
}

/**
 * Valida coerenza documento-movimento
 * Ritorna errore se c'è incoerenza logica
 */
export function validateDocumentMovementConsistency(
  documentType: DocumentType,
  documentDirection: DocumentDirection,
  actualMovementDirection?: 'inbound' | 'outbound' | 'internal' | null
): { isValid: boolean; error?: string } {
  const expected = getExpectedMovementDirection(documentType, documentDirection);
  
  if (!expected) {
    return { isValid: true };
  }

  if (actualMovementDirection && actualMovementDirection !== expected && actualMovementDirection !== 'internal') {
    return {
      isValid: false,
      error: `Incoerenza: ${documentType} ${documentDirection} dovrebbe generare movimento ${expected}, trovato ${actualMovementDirection}`,
    };
  }

  return { isValid: true };
}
