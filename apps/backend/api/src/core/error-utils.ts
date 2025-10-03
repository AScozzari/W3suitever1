import { Response } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger';

// PostgreSQL Error Codes
export const POSTGRES_ERRORS = {
  UNIQUE_VIOLATION: '23505',
  NOT_NULL_VIOLATION: '23502',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
  INVALID_TEXT_REPRESENTATION: '22P02',
  INVALID_UUID: '22P02',
} as const;

// Error response interface for consistency
interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  field?: string;
  code?: string;
}

// Mapping PostgreSQL error codes to user-friendly messages
const POSTGRES_ERROR_MESSAGES: Record<string, (error: any) => ErrorResponse> = {
  [POSTGRES_ERRORS.NOT_NULL_VIOLATION]: (error: any) => {
    const field = error.column || 'campo richiesto';
    const fieldMap: Record<string, string> = {
      'nome': 'Nome',
      'codice': 'Codice',
      'piva': 'Partita IVA',
      'email': 'Email',
      'phone': 'Telefono',
      'address': 'Indirizzo',
      'citta': 'Città',
      'tenant_id': 'Identificativo organizzazione',
      'legal_entity_id': 'Entità legale',
      'channel_id': 'Canale',
      'commercial_area_id': 'Area commerciale',
      'first_name': 'Nome',
      'last_name': 'Cognome',
    };
    
    const friendlyField = fieldMap[field] || field;
    return {
      error: 'validation_error',
      message: `Il campo "${friendlyField}" è obbligatorio`,
      field,
      code: error.code
    };
  },

  [POSTGRES_ERRORS.UNIQUE_VIOLATION]: (error: any) => {
    let message = 'Questo valore è già in uso';
    let field = 'unknown';
    
    if (error.constraint) {
      if (error.constraint.includes('codice')) {
        message = 'Questo codice è già in uso';
        field = 'codice';
      } else if (error.constraint.includes('email')) {
        message = 'Questa email è già registrata';
        field = 'email';
      } else if (error.constraint.includes('piva')) {
        message = 'Questa Partita IVA è già registrata';
        field = 'pIva';
      } else if (error.constraint.includes('nome')) {
        message = 'Questo nome è già in uso';
        field = 'nome';
      }
    }
    
    return {
      error: 'duplicate_entry',
      message,
      field,
      code: error.code
    };
  },

  [POSTGRES_ERRORS.FOREIGN_KEY_VIOLATION]: (error: any) => {
    const constraintMap: Record<string, string> = {
      'legal_entity_id': 'Entità legale selezionata non valida',
      'tenant_id': 'Organizzazione non valida',
      'channel_id': 'Canale selezionato non valido',
      'commercial_area_id': 'Area commerciale selezionata non valida',
      'store_id': 'Negozio selezionato non valido',
      'role_id': 'Ruolo selezionato non valido',
      'user_id': 'Utente selezionato non valido',
    };
    
    let message = 'Riferimento non valido';
    if (error.constraint) {
      for (const [key, value] of Object.entries(constraintMap)) {
        if (error.constraint.includes(key)) {
          message = value;
          break;
        }
      }
    }
    
    return {
      error: 'invalid_reference',
      message,
      code: error.code
    };
  },

  [POSTGRES_ERRORS.INVALID_TEXT_REPRESENTATION]: (error: any) => ({
    error: 'invalid_format',
    message: 'Formato dati non valido',
    details: 'Verificare che tutti i campi abbiano il formato corretto',
    code: error.code
  }),

  [POSTGRES_ERRORS.CHECK_VIOLATION]: (error: any) => ({
    error: 'validation_error', 
    message: 'I dati non rispettano i vincoli richiesti',
    details: 'Verificare che tutti i valori siano nel formato e range previsto',
    code: error.code
  }),
};

/**
 * Maps PostgreSQL database errors to user-friendly error responses
 */
export function mapDatabaseError(error: any): ErrorResponse | null {
  if (!error.code) return null;
  
  const errorMapper = POSTGRES_ERROR_MESSAGES[error.code];
  if (!errorMapper) return null;
  
  return errorMapper(error);
}

/**
 * Maps Zod validation errors to user-friendly error responses  
 */
export function mapValidationError(error: ZodError): ErrorResponse {
  const firstError = error.errors[0];
  const field = firstError.path.join('.');
  
  const messageMap: Record<string, string> = {
    'required': 'Campo obbligatorio',
    'invalid_type': 'Tipo di dato non valido',
    'too_small': 'Valore troppo piccolo',
    'too_big': 'Valore troppo grande',
    'invalid_string': 'Formato testo non valido',
    'invalid_email': 'Email non valida',
    'invalid_uuid': 'Identificativo non valido',
  };
  
  let message = firstError.message;
  if (messageMap[firstError.code]) {
    message = messageMap[firstError.code];
  }
  
  // Field-specific customizations
  const fieldMap: Record<string, string> = {
    'nome': 'Nome',
    'codice': 'Codice',
    'email': 'Email',
    'pIva': 'Partita IVA',
    'phone': 'Telefono',
    'firstName': 'Nome',
    'lastName': 'Cognome',
  };
  
  const friendlyField = fieldMap[field] || field;
  
  return {
    error: 'validation_error',
    message: `${friendlyField}: ${message}`,
    field,
    details: error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  };
}

/**
 * Standard error handler for API endpoints
 * Automatically maps database and validation errors to user-friendly responses
 */
export function handleApiError(error: any, res: Response, context: string = 'operazione') {
  // Log the original error for debugging
  logger.error('API Error', {
    context,
    error: error.message,
    stack: error.stack,
    code: error.code,
    constraint: error.constraint
  });

  // Check if it's a Zod validation error
  if (error instanceof ZodError) {
    const errorResponse = mapValidationError(error);
    return res.status(400).json(errorResponse);
  }

  // Check if it's a database error we can map
  const dbError = mapDatabaseError(error);
  if (dbError) {
    const statusCode = 
      dbError.error === 'validation_error' ? 400 :
      dbError.error === 'duplicate_entry' ? 409 :
      dbError.error === 'invalid_reference' ? 400 :
      400;
    
    return res.status(statusCode).json(dbError);
  }

  // Check for custom business logic errors
  if (error.name === 'NotFoundError' || error.message?.includes('not found')) {
    return res.status(404).json({
      error: 'not_found',
      message: `Elemento non trovato`,
    });
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(403).json({
      error: 'forbidden',
      message: 'Non hai i permessi necessari per questa operazione',
    });
  }

  // Default server error for unknown errors
  return res.status(500).json({
    error: 'internal_error',
    message: `Errore interno durante ${context}. Riprova più tardi.`,
  });
}

/**
 * Validate request body using Zod schema and handle errors automatically
 */
export function validateRequestBody<T>(schema: any, body: any, res: Response): T | null {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      const errorResponse = mapValidationError(error);
      res.status(400).json(errorResponse);
      return null;
    }
    throw error;
  }
}

/**
 * Validate UUID parameter
 */
export function validateUUID(uuid: string, paramName: string = 'ID'): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Handle UUID validation with error response
 */
export function validateUUIDParam(uuid: string, paramName: string, res: Response): boolean {
  if (!validateUUID(uuid)) {
    res.status(400).json({
      error: 'invalid_parameter',
      message: `${paramName} non valido`,
      field: paramName.toLowerCase()
    });
    return false;
  }
  return true;
}

/**
 * Parse and validate UUID parameter, throwing error if invalid
 */
export function parseUUIDParam(uuid: string, paramName: string): string {
  if (!validateUUID(uuid)) {
    throw new Error(`Invalid ${paramName}: must be a valid UUID`);
  }
  return uuid;
}