import React, { useState, useEffect } from 'react';
import { useItalianCities, type ItalianCity } from '../../hooks/useItalianCities';

// ==================== VALIDATION UTILITIES ====================

// Validazione Email RFC Compliant
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
};

// Validazione Codice Fiscale Italiano
export const validateCodiceFiscale = (cf: string): boolean => {
  if (cf.length !== 16) return false;
  
  const cfRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  if (!cfRegex.test(cf.toUpperCase())) return false;

  // Controllo carattere di controllo
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const evenValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
  const oddValues = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23];
  
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const char = cf.charAt(i).toUpperCase();
    const value = chars.indexOf(char) >= 0 ? chars.indexOf(char) : parseInt(char);
    sum += i % 2 === 0 ? oddValues[value] : evenValues[value];
  }
  
  const controlChar = chars.charAt(sum % 26);
  return controlChar === cf.charAt(15).toUpperCase();
};

// Validazione Partita IVA Italiana
export const validatePartitaIVA = (piva: string): boolean => {
  // Rimuovi IT se presente
  const cleanPiva = piva.replace(/^IT/, '');
  
  if (cleanPiva.length !== 11 || !/^\d{11}$/.test(cleanPiva)) return false;
  
  // Algoritmo di controllo P.IVA
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let digit = parseInt(cleanPiva.charAt(i));
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit = digit - 9;
    }
    sum += digit;
  }
  
  const controlDigit = (10 - (sum % 10)) % 10;
  return controlDigit === parseInt(cleanPiva.charAt(10));
};

// ==================== ITALIAN CITIES DATA ====================
// Dati vengono recuperati dinamicamente dal database tramite useItalianCities hook

// ==================== STANDARD FIELD COMPONENTS ====================

interface StandardFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

// Campo Email con validazione
export const StandardEmailField: React.FC<StandardFieldProps> = ({
  value,
  onChange,
  error,
  placeholder = "example@company.it",
  required = false,
  disabled = false
}) => {
  const [touched, setTouched] = useState(false);
  const isValid = value ? validateEmail(value) : true;
  const showError = touched && !isValid && value;

  return (
    <div style={{ marginBottom: '16px' }}>
      <input
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: `2px solid ${showError ? '#ef4444' : error ? '#ef4444' : '#e5e7eb'}`,
          borderRadius: '8px',
          fontSize: '14px',
          background: disabled ? '#f9fafb' : 'white',
          outline: 'none',
          transition: 'all 0.2s ease'
        }}
      />
      {(showError || error) && (
        <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
          {error || 'Formato email non valido'}
        </div>
      )}
    </div>
  );
};

// Campo Città con select dropdown
export const StandardCityField: React.FC<StandardFieldProps & { 
  onCapChange?: (cap: string) => void;
  onProvinciaChange?: (provincia: string) => void;
}> = ({
  value,
  onChange,
  onCapChange,
  onProvinciaChange,
  error,
  required = false,
  disabled = false
}) => {
  const { data: cities = [], isLoading, error: citiesError } = useItalianCities();

  const handleCitySelect = (cityName: string) => {
    const selectedCity = cities.find(city => city.name === cityName);
    if (selectedCity) {
      onChange(selectedCity.name);
      onCapChange?.(selectedCity.postalCode);
      onProvinciaChange?.(selectedCity.province);
    }
  };

  if (isLoading) {
    return (
      <select 
        disabled
        style={{
          width: '100%',
          padding: '6px 10px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          fontSize: '14px',
          background: '#fafbfc',
          transition: 'all 0.2s ease',
          outline: 'none',
          color: '#374151',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontWeight: '400',
          lineHeight: '1.5'
        }}
      >
        <option>Caricamento città...</option>
      </select>
    );
  }

  if (citiesError) {
    return (
      <select 
        disabled
        style={{
          width: '100%',
          padding: '6px 10px',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          fontSize: '14px',
          background: '#fef2f2',
          transition: 'all 0.2s ease',
          outline: 'none',
          color: '#374151',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontWeight: '400',
          lineHeight: '1.5'
        }}
      >
        <option>Errore nel caricamento città</option>
      </select>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => handleCitySelect(e.target.value)}
      required={required}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '6px 10px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '14px',
        background: '#fafbfc',
        transition: 'all 0.2s ease',
        outline: 'none',
        color: '#374151',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontWeight: '400',
        lineHeight: '1.5'
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#3b82f6';
        e.target.style.background = '#ffffff';
        e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = '#e5e7eb';
        e.target.style.background = '#fafbfc';
        e.target.style.boxShadow = 'none';
      }}
    >
      <option value="">Seleziona una città...</option>
      {cities.map((city) => (
        <option key={city.id} value={city.name}>
          {city.name} ({city.province}) - {city.postalCode}
        </option>
      ))}
    </select>
  );
};

// Campo CAP auto-popolato (read-only)
export const StandardCapField: React.FC<StandardFieldProps> = ({
  value,
  onChange,
  error
}) => {
  return (
    <div style={{ marginBottom: '16px' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Auto-popolato dalla città"
        disabled={true}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: `2px solid ${error ? '#ef4444' : '#e5e7eb'}`,
          borderRadius: '8px',
          fontSize: '14px',
          background: '#f9fafb',
          color: '#6b7280',
          outline: 'none'
        }}
      />
      {error && (
        <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
          {error}
        </div>
      )}
    </div>
  );
};

// Campo Codice Fiscale con validazione
export const StandardCodiceFiscaleField: React.FC<StandardFieldProps> = ({
  value,
  onChange,
  error,
  placeholder = "RSSMRA80A01H501U",
  required = false,
  disabled = false
}) => {
  const [touched, setTouched] = useState(false);
  const isValid = value ? validateCodiceFiscale(value) : true;
  const showError = touched && !isValid && value;

  return (
    <div style={{ marginBottom: '16px' }}>
      <input
        type="text"
        value={value.toUpperCase()}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={16}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: `2px solid ${showError ? '#ef4444' : error ? '#ef4444' : '#e5e7eb'}`,
          borderRadius: '8px',
          fontSize: '14px',
          background: disabled ? '#f9fafb' : 'white',
          outline: 'none',
          transition: 'all 0.2s ease',
          fontFamily: 'monospace'
        }}
      />
      {(showError || error) && (
        <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
          {error || 'Codice fiscale non valido'}
        </div>
      )}
    </div>
  );
};

// Campo Partita IVA con validazione
export const StandardPartitaIVAField: React.FC<StandardFieldProps> = ({
  value,
  onChange,
  error,
  placeholder = "IT12345678901",
  required = false,
  disabled = false
}) => {
  const [touched, setTouched] = useState(false);
  const isValid = value ? validatePartitaIVA(value) : true;
  const showError = touched && !isValid && value;

  const handleChange = (inputValue: string) => {
    let cleanValue = inputValue.replace(/\D/g, '');
    if (cleanValue.length <= 11) {
      onChange(cleanValue.length > 0 ? `IT${cleanValue}` : '');
    }
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={13}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: `2px solid ${showError ? '#ef4444' : error ? '#ef4444' : '#e5e7eb'}`,
          borderRadius: '8px',
          fontSize: '14px',
          background: disabled ? '#f9fafb' : 'white',
          outline: 'none',
          transition: 'all 0.2s ease',
          fontFamily: 'monospace'
        }}
      />
      {(showError || error) && (
        <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
          {error || 'Partita IVA non valida'}
        </div>
      )}
    </div>
  );
};

// Campo Paese fisso Italia
export const StandardPaeseField: React.FC<{ value?: string }> = ({ value = "Italia" }) => {
  return (
    <div style={{ marginBottom: '16px' }}>
      <input
        type="text"
        value={value}
        disabled={true}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          fontSize: '14px',
          background: '#f9fafb',
          color: '#6b7280',
          outline: 'none'
        }}
      />
    </div>
  );
};