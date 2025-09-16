// Italian Business Data Validation Schemas
// Comprehensive validation for Italian business entities

import { z } from "zod";

// ==================== ITALIAN VAT NUMBER (P.IVA) VALIDATION ====================
export const italianVatNumberSchema = z.string()
  .regex(/^[0-9]{11}$/, "P.IVA deve essere di 11 cifre numeriche")
  .refine((vat) => {
    // Italian VAT number checksum validation
    if (vat.length !== 11) return false;
    
    const digits = vat.split('').map(Number);
    let sum = 0;
    
    // Calculate checksum using Italian algorithm
    for (let i = 0; i < 10; i++) {
      let digit = digits[i];
      if (i % 2 === 1) { // odd positions (1, 3, 5, 7, 9)
        digit *= 2;
        if (digit > 9) {
          digit = Math.floor(digit / 10) + (digit % 10);
        }
      }
      sum += digit;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === digits[10];
  }, "P.IVA non valida (checksum non corretto)");

// ==================== ITALIAN TAX CODE (CODICE FISCALE) VALIDATION ====================
export const italianTaxCodeSchema = z.string()
  .length(16, "Codice Fiscale deve essere di 16 caratteri")
  .regex(/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/, "Formato Codice Fiscale non valido")
  .refine((cf) => {
    // Italian tax code checksum validation
    const checkChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const oddValues = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23];
    const evenValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      const char = cf[i];
      const charCode = char.charCodeAt(0);
      let value: number;
      
      if (charCode >= 48 && charCode <= 57) { // 0-9
        value = charCode - 48;
      } else { // A-Z
        value = charCode - 65;
      }
      
      if (i % 2 === 0) { // odd positions (1st, 3rd, 5th, ...)
        sum += oddValues[value];
      } else { // even positions
        sum += evenValues[value];
      }
    }
    
    const expectedCheckChar = checkChars[sum % 26];
    return cf[15] === expectedCheckChar;
  }, "Codice Fiscale non valido (checksum non corretto)");

// ==================== PEC EMAIL VALIDATION ====================
export const pecEmailSchema = z.string()
  .email("Formato email non valido")
  .refine((email) => {
    // PEC domains list (certified email providers in Italy)
    const pecDomains = [
      ".pec.it",
      ".legalmail.it",
      ".postacert.it",
      ".pec.tim.it", 
      ".pec.aruba.it",
      ".pec.register.it",
      ".cert.legalmail.it",
      ".legalmail.it"
    ];
    
    const emailLower = email.toLowerCase();
    return pecDomains.some(domain => emailLower.includes(domain));
  }, "Deve essere un indirizzo PEC valido (es. nome@dominio.pec.it)");

// ==================== ITALIAN PHONE NUMBER VALIDATION ====================
export const italianPhoneSchema = z.string()
  .regex(/^(\+39\s?)?([0-9\s\-]{8,15})$/, "Formato telefono non valido")
  .transform((phone) => {
    // Normalize phone number
    let normalized = phone.replace(/\s/g, '').replace(/-/g, '');
    if (normalized.startsWith('+39')) {
      normalized = normalized.substring(3);
    }
    return `+39${normalized}`;
  })
  .refine((phone) => {
    // Validate Italian phone number patterns
    const phoneDigits = phone.replace('+39', '');
    
    // Mobile: 3XX XXXXXXX (10 digits total)
    const mobilePattern = /^3[0-9]{9}$/;
    
    // Landline patterns:
    // Major cities: 0X XXXXXXX or 0XX XXXXXX
    const landlinePatterns = [
      /^0[1-9][0-9]{7,8}$/, // 0X XXXXXXX or 0X XXXXXXXX
      /^0[1-9][0-9]{2}[0-9]{6}$/ // 0XXX XXXXXX
    ];
    
    // Toll-free and special numbers
    const specialPatterns = [
      /^800[0-9]{6}$/, // Toll-free 800
      /^199[0-9]{6}$/, // Special 199
      /^848[0-9]{6}$/, // Shared cost 848
    ];
    
    return mobilePattern.test(phoneDigits) || 
           landlinePatterns.some(pattern => pattern.test(phoneDigits)) ||
           specialPatterns.some(pattern => pattern.test(phoneDigits));
  }, "Numero di telefono italiano non valido");

// ==================== IBAN VALIDATION ====================
export const ibanSchema = z.string()
  .min(15, "IBAN troppo corto")
  .max(34, "IBAN troppo lungo")
  .regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/, "Formato IBAN non valido")
  .refine((iban) => {
    // IBAN checksum validation using mod-97 algorithm
    // Move first 4 characters to end
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    
    // Convert letters to numbers (A=10, B=11, ..., Z=35)
    let numericString = '';
    for (const char of rearranged) {
      if (char >= 'A' && char <= 'Z') {
        numericString += (char.charCodeAt(0) - 55).toString();
      } else {
        numericString += char;
      }
    }
    
    // Calculate mod 97
    let remainder = 0;
    for (const digit of numericString) {
      remainder = (remainder * 10 + parseInt(digit)) % 97;
    }
    
    return remainder === 1;
  }, "IBAN non valido (checksum non corretto)")
  .transform((iban) => iban.toUpperCase().replace(/\s/g, '')); // Normalize to uppercase, no spaces

// ==================== WEBSITE URL VALIDATION ====================
export const websiteUrlSchema = z.string()
  .refine((url) => {
    if (!url || url.trim() === '') return true; // Optional field
    
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }, "URL non valido. Deve iniziare con http:// o https://")
  .transform((url) => {
    if (!url || url.trim() === '') return '';
    return url.startsWith('http') ? url : `https://${url}`;
  });

// ==================== COMPREHENSIVE BUSINESS ENTITY SCHEMAS ====================

// Base validation for supplier entities
export const supplierValidationSchema = z.object({
  // Business Identity
  name: z.string().min(2, "Nome/Ragione Sociale richiesta").max(255, "Nome troppo lungo"),
  legalName: z.string().optional(),
  code: z.string().min(3, "Codice fornitore richiesto").max(50, "Codice troppo lungo"),
  
  // Fiscal Data  
  vatNumber: italianVatNumberSchema.optional().or(z.literal('')),
  taxCode: italianTaxCodeSchema.optional().or(z.literal('')),
  
  // Contact Information
  email: z.string().email("Email non valida").optional().or(z.literal('')),
  pecEmail: pecEmailSchema.optional().or(z.literal('')),
  phone: italianPhoneSchema.optional().or(z.literal('')),
  website: websiteUrlSchema.optional().or(z.literal('')),
  
  // Financial Information
  iban: ibanSchema.optional().or(z.literal('')),
  bic: z.string().regex(/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/, "Codice BIC non valido").optional().or(z.literal('')),
  
  // Payment Information
  preferredPaymentMethodId: z.string().uuid().optional().or(z.literal('')),
  paymentConditionId: z.string().uuid().optional().or(z.literal('')),
  
  // Address
  address: z.string().min(5, "Indirizzo richiesto").optional(),
  city: z.string().min(2, "Città richiesta").optional(),
  province: z.string().length(2, "Provincia deve essere di 2 caratteri").optional(),
  postalCode: z.string().regex(/^\d{5}$/, "CAP deve essere di 5 cifre").optional(),
  
  // Administrative
  sdiCode: z.string().regex(/^[A-Z0-9]{7}$/, "Codice SDI deve essere di 7 caratteri alfanumerici").optional().or(z.literal('')),
  splitPayment: z.boolean().optional(),
  withholdingTax: z.boolean().optional(),
  
  // Additional
  legalForm: z.string().optional(),
  status: z.enum(['active', 'suspended', 'blocked']).default('active'),
  notes: z.string().optional(),
});

// Legal Entity validation schema  
export const legalEntityValidationSchema = z.object({
  nome: z.string().min(2, "Nome ragione sociale richiesto").max(255, "Nome troppo lungo"),
  codice: z.string().min(3, "Codice richiesto").max(20, "Codice troppo lungo"),
  
  // Fiscal data
  pIva: italianVatNumberSchema.optional().or(z.literal('')),
  codiceFiscale: italianTaxCodeSchema.optional().or(z.literal('')),
  
  // Contact info
  email: z.string().email("Email non valida").optional().or(z.literal('')),
  pec: pecEmailSchema.optional().or(z.literal('')),
  telefono: italianPhoneSchema.optional().or(z.literal('')),
  
  // Address
  indirizzo: z.string().min(5, "Indirizzo richiesto").optional(),
  citta: z.string().min(2, "Città richiesta").optional(),
  provincia: z.string().length(2, "Provincia deve essere di 2 caratteri").optional(),
  cap: z.string().regex(/^\d{5}$/, "CAP deve essere di 5 cifre").optional(),
  
  // Business info
  formaGiuridica: z.string().optional(),
  capitaleSociale: z.string().optional(),
  dataCostituzione: z.string().optional(), // Will be transformed to date
  
  // Additional fields for enterprise
  rea: z.string().optional(),
  codiceSDI: z.string().regex(/^[A-Z0-9]{7}$/, "Codice SDI deve essere di 7 caratteri alfanumerici").optional().or(z.literal('')),
  registroImprese: z.string().optional(),
  
  // Admin contact
  refAmminNome: z.string().optional(),
  refAmminCognome: z.string().optional(),
  refAmminEmail: z.string().email("Email amministratore non valida").optional().or(z.literal('')),
  refAmminCodiceFiscale: italianTaxCodeSchema.optional().or(z.literal('')),
  refAmminIndirizzo: z.string().optional(),
  refAmminCitta: z.string().optional(),
  refAmminCap: z.string().regex(/^\d{5}$/, "CAP deve essere di 5 cifre").optional().or(z.literal('')),
  refAmminPaese: z.string().optional(),
  
  // Other
  note: z.string().optional(),
});

// Store validation schema
export const storeValidationSchema = z.object({
  nome: z.string().min(2, "Nome punto vendita richiesto").max(255, "Nome troppo lungo"),
  code: z.string().min(3, "Codice richiesto").max(50, "Codice troppo lungo"),
  
  // Contact info
  email: z.string().email("Email non valida").optional().or(z.literal('')),
  phone: italianPhoneSchema.optional().or(z.literal('')),
  
  // WhatsApp numbers
  whatsapp1: italianPhoneSchema.optional().or(z.literal('')),
  whatsapp2: italianPhoneSchema.optional().or(z.literal('')),
  
  // Social media URLs  
  facebook: websiteUrlSchema.optional().or(z.literal('')),
  instagram: websiteUrlSchema.optional().or(z.literal('')),
  tiktok: websiteUrlSchema.optional().or(z.literal('')),
  telegram: z.string().optional(),
  googleMapsUrl: websiteUrlSchema.optional().or(z.literal('')),
  
  // Address
  address: z.string().min(5, "Indirizzo richiesto"),
  citta: z.string().min(2, "Città richiesta"),
  provincia: z.string().length(2, "Provincia deve essere di 2 caratteri"),
  cap: z.string().regex(/^\d{5}$/, "CAP deve essere di 5 cifre"),
  region: z.string().optional(),
  
  // Geographic coordinates
  geo: z.object({
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional()
  }).optional(),
  
  // Business associations
  legalEntityId: z.string().uuid("Seleziona ragione sociale"),
  channelId: z.string().uuid("Seleziona canale"),
  commercialAreaId: z.string().uuid("Seleziona area commerciale"),
  brands: z.array(z.string()).optional(),
  
  // Status and dates
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
  openedAt: z.string().optional(),
  closedAt: z.string().optional(),
});

// User validation schema
export const userValidationSchema = z.object({
  firstName: z.string().min(2, "Nome richiesto").max(100, "Nome troppo lungo"),
  lastName: z.string().min(2, "Cognome richiesto").max(100, "Cognome troppo lungo"),
  email: z.string().email("Email non valida"),
  phone: italianPhoneSchema.optional().or(z.literal('')),
  
  // Work-related fields
  position: z.string().optional(),
  department: z.string().optional(),
  role: z.string().optional(),
  contractType: z.string().optional(),
  hireDate: z.string().optional(), // Will be transformed to date
  
  // Store association
  storeId: z.string().uuid().optional(),
});

// ==================== EXPORT TYPES ====================
export type SupplierValidation = z.infer<typeof supplierValidationSchema>;
export type LegalEntityValidation = z.infer<typeof legalEntityValidationSchema>;
export type StoreValidation = z.infer<typeof storeValidationSchema>;
export type UserValidation = z.infer<typeof userValidationSchema>;