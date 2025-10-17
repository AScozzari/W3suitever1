/**
 * Enhanced Conversions Service
 * 
 * Handles SHA-256 hashing of user data (email, phone) for Google Ads Enhanced Conversions
 * and Google Analytics 4 User ID tracking.
 * 
 * @see https://developers.google.com/google-ads/api/docs/conversions/enhanced-conversions
 * @see https://support.google.com/google-ads/answer/9888656
 */

import crypto from 'crypto';
import { logger } from '../core/logger';

export interface EnhancedConversionData {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  street?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface HashedConversionData {
  sha256_email_address?: string[];
  sha256_phone_number?: string[];
  address?: {
    sha256_first_name?: string;
    sha256_last_name?: string;
    street?: string;
    city?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
}

class EnhancedConversionsService {
  /**
   * Normalize and hash a string using SHA-256
   */
  private hashValue(value: string | null | undefined): string | null {
    if (!value || typeof value !== 'string') {
      return null;
    }

    // Normalize: trim, lowercase, remove whitespace
    const normalized = value.trim().toLowerCase().replace(/\s+/g, '');
    
    if (!normalized) {
      return null;
    }

    // SHA-256 hash
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Normalize email address for hashing
   * - Remove leading/trailing whitespace
   * - Convert to lowercase
   * - Remove dots in Gmail addresses before @ (gmail-specific)
   */
  private normalizeEmail(email: string | null | undefined): string | null {
    if (!email || typeof email !== 'string') {
      return null;
    }

    let normalized = email.trim().toLowerCase();

    // Gmail-specific normalization: remove dots before @
    if (normalized.includes('@gmail.com') || normalized.includes('@googlemail.com')) {
      const [localPart, domain] = normalized.split('@');
      normalized = `${localPart.replace(/\./g, '')}@${domain}`;
    }

    // Validate basic email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      logger.warn('Invalid email format for Enhanced Conversions', { email: normalized });
      return null;
    }

    return normalized;
  }

  /**
   * Normalize phone number for hashing
   * - Remove all non-numeric characters
   * - Remove leading zeros
   * - Add country code if missing (Italy +39 by default)
   */
  private normalizePhone(phone: string | null | undefined, defaultCountryCode: string = '39'): string | null {
    if (!phone || typeof phone !== 'string') {
      return null;
    }

    // Remove all non-numeric characters
    let normalized = phone.replace(/\D/g, '');

    if (!normalized) {
      return null;
    }

    // Remove leading zeros
    normalized = normalized.replace(/^0+/, '');

    // Add country code if not present (assume Italy +39)
    if (!normalized.startsWith(defaultCountryCode)) {
      normalized = defaultCountryCode + normalized;
    }

    // Validate minimum length (should be at least 10 digits for Italian numbers)
    if (normalized.length < 10) {
      logger.warn('Invalid phone number format for Enhanced Conversions', { phone: normalized });
      return null;
    }

    return normalized;
  }

  /**
   * Hash user data for Enhanced Conversions
   * Returns data in format expected by Google Ads Measurement Protocol
   * 
   * @param data - User data to hash
   * @returns Hashed data ready for Google Ads/GA4
   */
  hashUserData(data: EnhancedConversionData): HashedConversionData {
    const result: HashedConversionData = {};

    // Hash email
    if (data.email) {
      const normalizedEmail = this.normalizeEmail(data.email);
      if (normalizedEmail) {
        const hashedEmail = this.hashValue(normalizedEmail);
        if (hashedEmail) {
          result.sha256_email_address = [hashedEmail];
        }
      }
    }

    // Hash phone
    if (data.phone) {
      const normalizedPhone = this.normalizePhone(data.phone);
      if (normalizedPhone) {
        const hashedPhone = this.hashValue(normalizedPhone);
        if (hashedPhone) {
          result.sha256_phone_number = [hashedPhone];
        }
      }
    }

    // Hash address data (optional, but improves match rate)
    const addressData: any = {};
    let hasAddressData = false;

    if (data.firstName) {
      const hashed = this.hashValue(data.firstName);
      if (hashed) {
        addressData.sha256_first_name = hashed;
        hasAddressData = true;
      }
    }

    if (data.lastName) {
      const hashed = this.hashValue(data.lastName);
      if (hashed) {
        addressData.sha256_last_name = hashed;
        hasAddressData = true;
      }
    }

    // Non-hashed address fields (normalized but not hashed per Google spec)
    if (data.city) {
      addressData.city = data.city.trim().toLowerCase();
      hasAddressData = true;
    }

    if (data.region) {
      addressData.region = data.region.trim().toLowerCase();
      hasAddressData = true;
    }

    if (data.postalCode) {
      addressData.postal_code = data.postalCode.trim().replace(/\s+/g, '');
      hasAddressData = true;
    }

    if (data.country) {
      addressData.country = data.country.trim().toLowerCase();
      hasAddressData = true;
    }

    if (hasAddressData) {
      result.address = addressData;
    }

    logger.debug('Enhanced Conversions data hashed', {
      hasEmail: !!result.sha256_email_address,
      hasPhone: !!result.sha256_phone_number,
      hasAddress: !!result.address
    });

    return result;
  }

  /**
   * Hash user data for Google Analytics 4 User ID
   * GA4 accepts hashed email as user_id for cross-device tracking
   * 
   * @param email - User email address
   * @returns SHA-256 hashed email or null
   */
  hashEmailForGA4(email: string | null | undefined): string | null {
    const normalized = this.normalizeEmail(email);
    if (!normalized) {
      return null;
    }
    return this.hashValue(normalized);
  }

  /**
   * Validate that Enhanced Conversions data meets minimum requirements
   * At least email OR phone is required for Google Ads
   * 
   * @param data - Hashed conversion data
   * @returns true if data meets minimum requirements
   */
  validateEnhancedConversionData(data: HashedConversionData): boolean {
    const hasEmail = data.sha256_email_address && data.sha256_email_address.length > 0;
    const hasPhone = data.sha256_phone_number && data.sha256_phone_number.length > 0;

    if (!hasEmail && !hasPhone) {
      logger.warn('Enhanced Conversions data missing required fields (email or phone)');
      return false;
    }

    return true;
  }

  /**
   * Create Enhanced Conversions payload for Google Ads Measurement Protocol
   * 
   * @param userData - User data to hash
   * @param conversionData - Conversion event data
   * @returns Complete payload ready for Google Ads API
   */
  createEnhancedConversionPayload(
    userData: EnhancedConversionData,
    conversionData: {
      conversionAction: string; // Google Ads conversion action ID
      conversionLabel?: string; // Conversion label
      conversionValue?: number; // Conversion value
      currency?: string; // Currency code (ISO 4217)
      orderId?: string; // Transaction ID
    }
  ) {
    const hashedData = this.hashUserData(userData);

    if (!this.validateEnhancedConversionData(hashedData)) {
      throw new Error('Enhanced Conversions data does not meet minimum requirements (email or phone required)');
    }

    return {
      ...hashedData,
      conversion_action: conversionData.conversionAction,
      conversion_label: conversionData.conversionLabel,
      value: conversionData.conversionValue,
      currency: conversionData.currency || 'EUR',
      order_id: conversionData.orderId,
    };
  }
}

export const enhancedConversionsService = new EnhancedConversionsService();
