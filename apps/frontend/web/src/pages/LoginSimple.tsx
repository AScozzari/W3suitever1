import React from 'react';

interface LoginProps {
  tenantCode?: string;
}

/**
 * LOGIN SEMPLIFICATO PER DEBUG - NESSUN SIDE EFFECT
 */
export default function LoginSimple({ tenantCode }: LoginProps = {}) {
  console.log('LoginSimple rendered with tenant:', tenantCode);
  
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        textAlign: 'center'
      }}>
        <h1 style={{ color: 'white', fontSize: '24px', marginBottom: '16px' }}>
          W3 Suite Enterprise - DEBUG
        </h1>
        <p style={{ color: 'white/80', marginBottom: '24px' }}>
          Tenant: {tenantCode || 'staging'}
        </p>
        <p style={{ color: 'white/60', fontSize: '14px' }}>
          Login semplificato senza side effects
        </p>
      </div>
    </div>
  );
}