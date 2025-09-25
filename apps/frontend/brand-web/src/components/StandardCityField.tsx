import React from 'react';
import { useItalianCities } from '../hooks/useItalianCities';

interface StandardCityFieldProps {
  value: string;
  onChange: (value: string) => void;
  onCapChange?: (cap: string) => void;
  onProvinciaChange?: (provincia: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export const StandardCityField: React.FC<StandardCityFieldProps> = ({
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
          padding: '8px 12px',
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
          padding: '8px 12px',
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
        padding: '8px 12px',
        border: error ? '1px solid #ef4444' : '1px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '14px',
        background: disabled ? '#f9fafb' : '#fafbfc',
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
        e.target.style.borderColor = error ? '#ef4444' : '#e5e7eb';
        e.target.style.background = disabled ? '#f9fafb' : '#fafbfc';
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