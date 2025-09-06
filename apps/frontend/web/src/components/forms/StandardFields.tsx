import React, { useState, useEffect } from 'react';

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

export const ITALIAN_CITIES = [
  { name: 'Roma', provincia: 'RM', cap: '00100' },
  { name: 'Milano', provincia: 'MI', cap: '20100' },
  { name: 'Napoli', provincia: 'NA', cap: '80100' },
  { name: 'Torino', provincia: 'TO', cap: '10100' },
  { name: 'Palermo', provincia: 'PA', cap: '90100' },
  { name: 'Genova', provincia: 'GE', cap: '16100' },
  { name: 'Bologna', provincia: 'BO', cap: '40100' },
  { name: 'Firenze', provincia: 'FI', cap: '50100' },
  { name: 'Bari', provincia: 'BA', cap: '70100' },
  { name: 'Catania', provincia: 'CT', cap: '95100' },
  // Aggiungere tutti i comuni italiani dal database
];

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

// Campo Città con auto-completamento CAP
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
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCities, setFilteredCities] = useState(ITALIAN_CITIES);

  useEffect(() => {
    if (value) {
      const filtered = ITALIAN_CITIES.filter(city => 
        city.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCities(filtered);
    } else {
      setFilteredCities(ITALIAN_CITIES);
    }
  }, [value]);

  const handleCitySelect = (city: typeof ITALIAN_CITIES[0]) => {
    onChange(city.name);
    onCapChange?.(city.cap);
    onProvinciaChange?.(city.provincia);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', marginBottom: '16px' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        placeholder="Seleziona città..."
        required={required}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: `2px solid ${error ? '#ef4444' : '#e5e7eb'}`,
          borderRadius: '8px',
          fontSize: '14px',
          background: disabled ? '#f9fafb' : 'white',
          outline: 'none',
          transition: 'all 0.2s ease'
        }}
      />
      
      {isOpen && filteredCities.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}>
          {filteredCities.slice(0, 10).map((city, index) => (
            <div
              key={index}
              onClick={() => handleCitySelect(city)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: index < Math.min(filteredCities.length, 10) - 1 ? '1px solid #f3f4f6' : 'none',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              <div style={{ fontWeight: '500', color: '#111827' }}>{city.name}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {city.provincia} - CAP {city.cap}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {error && (
        <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
          {error}
        </div>
      )}
    </div>
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