/**
 * WMS Document Movement Generation Rules
 * 
 * Logica per determinare se un documento genera un movimento di magazzino
 * E quale stato logistico applica ai prodotti.
 * 
 * Regole Generazione Movimento:
 * - DDT: SEMPRE genera movimento (movimentazione fisica) - STATO DIPENDE DA CAUSALE
 * - Ricevuta Attiva: SEMPRE genera movimento → sold (se senza scontrino/fattura)
 * - Ricevuta Passiva: SEMPRE genera movimento → NESSUN CAMBIO STATO (solo conferma)
 * - Scontrino Fiscale: SEMPRE genera movimento (vendita diretta → OUTBOUND → sold)
 * - Fattura (Attiva/Passiva): SOLO SE non esiste DDT/Ricevuta collegata
 * - Ordine: MAI genera movimento (solo impegno/prenotazione)
 * - Nota di Credito: SOLO SE implica reso fisico (hasPhysicalReturn = true)
 * - Nota di Debito: MAI genera movimento (solo contabile)
 * 
 * Regole Cambio Stato Logistico DDT per CAUSALE:
 * - DDT Vendita (sale) → shipping
 * - DDT Acquisto (purchase) → in_stock
 * - DDT Invio Assistenza (service_send) → in_service
 * - DDT Ritorno Assistenza (service_return) → in_stock
 * - DDT Reso DOA (doa_return) → doa_return
 * - DDT Trasferimento Interno (internal_transfer) → in_transfer
 * - DDT Reso Fornitore (supplier_return) → supplier_return
 * - DDT Reso Cliente (customer_return) → customer_return
 * - DDT Comodato (loan) → shipping (attivo) / in_stock (passivo)
 * - DDT Altro (other) → shipping (attivo) / in_stock (passivo)
 * 
 * Regole Cambio Stato Logistico Altri Documenti:
 * - Ricevuta Attiva → sold (se senza scontrino/fattura collegata)
 * - Ricevuta Passiva → NESSUN CAMBIO (solo conferma ricezione)
 * - Scontrino/Fattura (vendita completata) → sold
 * - NDC Attiva con reso → customer_return
 * - NDC Passiva con reso → supplier_return
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

/**
 * Causali DDT - Determinano lo stato logistico target
 */
export type DdtReason = 
  | 'sale'              // Vendita → shipping
  | 'purchase'          // Acquisto → in_stock
  | 'service_send'      // Invio in assistenza → in_service
  | 'service_return'    // Ritorno da assistenza → in_stock
  | 'doa_return'        // Reso DOA → doa_return
  | 'internal_transfer' // Trasferimento interno → in_transfer
  | 'supplier_return'   // Reso fornitore → supplier_return
  | 'customer_return'   // Reso cliente → customer_return
  | 'loan'              // Comodato d'uso
  | 'other';            // Altro

export interface DocumentMovementContext {
  documentType: DocumentType;
  documentDirection: DocumentDirection;
  linkedDdtId?: string | null;
  linkedReceiptId?: string | null;
  linkedInvoiceId?: string | null;  // Per ricevuta: se ha fattura/scontrino collegato
  hasPhysicalReturn?: boolean;
  ddtReason?: DdtReason;  // Causale DDT che determina lo stato target
}

/**
 * Stati logistici prodotto (da wms_product_logistic_status_enum)
 */
export type ProductLogisticStatus = 
  | 'in_stock'
  | 'reserved'
  | 'preparing'
  | 'shipping'
  | 'delivered'
  | 'sold'
  | 'customer_return'
  | 'doa_return'
  | 'in_service'
  | 'supplier_return'
  | 'in_transfer'
  | 'lost'
  | 'damaged'
  | 'internal_use';

export interface MovementGenerationResult {
  generatesMovement: boolean;
  movementDirection?: 'inbound' | 'outbound' | 'internal';
  targetLogisticStatus?: ProductLogisticStatus;
  reason: string;
}

/**
 * Mappa documento → stato logistico target (FALLBACK - usata se non c'è causale specifica)
 * Chiave: `${documentType}_${direction}`
 */
export const DOCUMENT_STATUS_MAP: Record<string, ProductLogisticStatus | null> = {
  // DDT - fallback (la causale ha priorità)
  'ddt_active': 'shipping',
  'ddt_passive': 'in_stock',
  
  // Ricevuta - NUOVA LOGICA
  'receipt_active': 'sold',      // Venduto (se senza scontrino/fattura collegata)
  'receipt_passive': null,       // NESSUN CAMBIO STATO (solo conferma ricezione)
  
  // Scontrino fiscale (vendita POS)
  'fiscal_receipt_active': 'sold',
  
  // Fattura
  'invoice_active': 'sold',
  'invoice_passive': 'in_stock',
  
  // Nota di Credito con reso fisico
  'credit_note_active': 'customer_return',
  'credit_note_passive': 'supplier_return',
};

/**
 * Mappa causale DDT → stato logistico target
 * La causale ha PRIORITÀ sul fallback document_direction
 */
export const DDT_REASON_STATUS_MAP: Record<DdtReason, { active: ProductLogisticStatus; passive: ProductLogisticStatus }> = {
  'sale': { 
    active: 'shipping',           // Vendita attiva → spedisco
    passive: 'in_stock'           // Non comune, fallback
  },
  'purchase': { 
    active: 'in_stock',           // Non comune, fallback
    passive: 'in_stock'           // Acquisto passivo → ricevo merce
  },
  'service_send': { 
    active: 'in_service',         // Invio in assistenza → in_service
    passive: 'in_stock'           // Ritorno da assistenza esterna
  },
  'service_return': { 
    active: 'in_stock',           // Non comune
    passive: 'in_stock'           // Prodotto torna da assistenza → disponibile
  },
  'doa_return': { 
    active: 'doa_return',         // Mando indietro DOA → stato doa_return
    passive: 'doa_return'         // Ricevo un DOA
  },
  'internal_transfer': { 
    active: 'in_transfer',        // Trasferisco → in_transfer
    passive: 'in_stock'           // Ricevo trasferimento → disponibile
  },
  'supplier_return': { 
    active: 'supplier_return',    // Reso a fornitore → supplier_return
    passive: 'supplier_return'    // Ricevo reso da fornitore (es. rifiutato) → supplier_return
  },
  'customer_return': { 
    active: 'shipping',           // Restituisco al cliente (es. riparato) → shipping
    passive: 'customer_return'    // Cliente restituisce → customer_return
  },
  'loan': { 
    active: 'shipping',           // Invio in comodato → shipping
    passive: 'in_stock'           // Ricevo da comodato → in_stock
  },
  'other': { 
    active: 'shipping',           // Fallback
    passive: 'in_stock'           // Fallback
  },
};

/**
 * Ottiene lo stato logistico target per DDT basandosi su causale e direzione
 */
export function getDdtTargetStatus(
  ddtReason: DdtReason | undefined,
  direction: DocumentDirection
): ProductLogisticStatus {
  if (!ddtReason) {
    // Fallback se nessuna causale
    return direction === 'active' ? 'shipping' : 'in_stock';
  }
  
  const reasonConfig = DDT_REASON_STATUS_MAP[ddtReason];
  return reasonConfig[direction];
}

/**
 * Labels italiani per le causali DDT
 */
export const DDT_REASON_LABELS: Record<DdtReason, string> = {
  'sale': 'Vendita',
  'purchase': 'Acquisto',
  'service_send': 'Invio in Assistenza',
  'service_return': 'Ritorno da Assistenza',
  'doa_return': 'Reso DOA',
  'internal_transfer': 'Trasferimento Interno',
  'supplier_return': 'Reso a Fornitore',
  'customer_return': 'Reso da Cliente',
  'loan': 'Comodato d\'Uso',
  'other': 'Altro',
};

/**
 * Ottiene il label italiano per una causale DDT
 */
export function getDdtReasonLabel(ddtReason: DdtReason): string {
  return DDT_REASON_LABELS[ddtReason] || ddtReason;
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
  const { documentType, documentDirection, linkedDdtId, linkedReceiptId, linkedInvoiceId, hasPhysicalReturn, ddtReason } = context;

  switch (documentType) {
    // =====================================================
    // DDT - SEMPRE genera movimento, STATO DIPENDE DA CAUSALE
    // =====================================================
    case 'ddt': {
      const targetStatus = getDdtTargetStatus(ddtReason, documentDirection);
      const reasonLabel = ddtReason ? getDdtReasonLabel(ddtReason) : 'generico';
      return {
        generatesMovement: true,
        movementDirection: documentDirection === 'active' ? 'outbound' : 'inbound',
        targetLogisticStatus: targetStatus,
        reason: `DDT ${documentDirection === 'active' ? 'attivo' : 'passivo'} - Causale: ${reasonLabel} → stato '${targetStatus}'`,
      };
    }

    // =====================================================
    // RICEVUTA - SEMPRE genera movimento
    // Attiva: se senza scontrino/fattura → sold
    // Passiva: NESSUN cambio stato (solo conferma)
    // =====================================================
    case 'receipt': {
      if (documentDirection === 'active') {
        // Ricevuta attiva: verifica se ha già scontrino/fattura collegata
        const hasLinkedFiscalDoc = linkedInvoiceId;
        if (hasLinkedFiscalDoc) {
          return {
            generatesMovement: true,
            movementDirection: 'outbound',
            targetLogisticStatus: undefined, // Stato già gestito da fattura/scontrino
            reason: 'Ricevuta attiva con fattura/scontrino collegata: movimento generato, stato già gestito dal doc fiscale',
          };
        }
        return {
          generatesMovement: true,
          movementDirection: 'outbound',
          targetLogisticStatus: 'sold',
          reason: 'Ricevuta attiva SENZA fattura/scontrino → venduto direttamente',
        };
      }
      // Ricevuta passiva: solo conferma ricezione, NESSUN cambio stato
      return {
        generatesMovement: true,
        movementDirection: 'inbound',
        targetLogisticStatus: undefined, // NESSUN cambio stato
        reason: 'Ricevuta passiva: conferma ricezione fisica, stato logistico NON modificato',
      };
    }

    // =====================================================
    // SCONTRINO FISCALE - SEMPRE genera movimento (vendita diretta)
    // =====================================================
    case 'fiscal_receipt':
      return {
        generatesMovement: true,
        movementDirection: 'outbound',
        targetLogisticStatus: 'sold',
        reason: 'Scontrino fiscale = vendita diretta POS, genera sempre uscita',
      };

    // =====================================================
    // FATTURA - Dipende da direzione e presenza DDT/Ricevuta
    // Sia Attiva che Passiva: se esiste DDT/Ricevuta collegata, 
    // il movimento è già stato generato da quel documento
    // =====================================================
    case 'invoice': {
      const hasLinkedMovementDoc = linkedDdtId || linkedReceiptId;
      const statusKey = `invoice_${documentDirection}`;
      const targetStatus = DOCUMENT_STATUS_MAP[statusKey];
      
      if (hasLinkedMovementDoc) {
        return {
          generatesMovement: false,
          targetLogisticStatus: targetStatus,
          reason: `Fattura ${documentDirection === 'active' ? 'attiva' : 'passiva'} con DDT/Ricevuta collegata: movimento già generato, applica solo stato '${targetStatus}'`,
        };
      }
      
      return {
        generatesMovement: true,
        movementDirection: documentDirection === 'active' ? 'outbound' : 'inbound',
        targetLogisticStatus: targetStatus,
        reason: `Fattura ${documentDirection === 'active' ? 'attiva' : 'passiva'} SENZA DDT/Ricevuta: genera movimento ${documentDirection === 'active' ? 'uscita' : 'entrata'}`,
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
        const ndcStatus = DOCUMENT_STATUS_MAP[`credit_note_${documentDirection}`];
        return {
          generatesMovement: true,
          movementDirection: documentDirection === 'active' ? 'inbound' : 'outbound',
          targetLogisticStatus: ndcStatus,
          reason: `NDC con reso fisico: ${documentDirection === 'active' ? 'rientro merce da cliente' : 'reso a fornitore'} → stato '${ndcStatus}'`,
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
 * Ottiene lo stato logistico target per un documento
 */
export function getTargetLogisticStatus(
  documentType: DocumentType,
  documentDirection: DocumentDirection,
  ddtReason?: DdtReason
): ProductLogisticStatus | null {
  // Per DDT: usa la causale per determinare lo stato
  if (documentType === 'ddt') {
    return getDdtTargetStatus(ddtReason, documentDirection);
  }
  
  // Per ricevuta passiva: nessun cambio stato
  if (documentType === 'receipt' && documentDirection === 'passive') {
    return null;
  }
  
  // Per altri documenti: usa la mappa standard
  const key = `${documentType}_${documentDirection}`;
  return DOCUMENT_STATUS_MAP[key] || null;
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
