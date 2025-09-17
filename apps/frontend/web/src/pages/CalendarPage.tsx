import React from 'react';
import Calendar from '@/components/Calendar/Calendar';
import { useQuery } from '@tanstack/react-query';

export default function CalendarPage() {
  const { data: user } = useQuery({ queryKey: ["/api/auth/session"] });
  const { data: stores } = useQuery({ queryKey: ["/api/stores"] });

  return (
    <div style={{
      width: '100%',
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '24px',
    }}>
      <div style={{
        marginBottom: '24px',
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '8px',
        }}>
          Calendario Aziendale
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
        }}>
          Gestisci eventi, turni, ferie e riunioni del team
        </p>
      </div>

      <Calendar 
        selectedStore={stores?.[0]}
        compactMode={false}
      />
    </div>
  );
}