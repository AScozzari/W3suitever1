import { useState } from 'react';
import Layout from '@/components/Layout';
import { FileText } from 'lucide-react';

export default function PriceListsPage() {
  const [currentModule, setCurrentModule] = useState('prodotti-listini');

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <FileText size={32} style={{ color: 'hsl(var(--brand-orange))' }} />
            <h1 
              style={{ fontSize: '28px', fontWeight: '700', color: 'hsl(var(--foreground))' }}
              data-testid="heading-price-lists"
            >
              Listini Prezzi
            </h1>
          </div>
          <p 
            style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}
            data-testid="text-price-lists-subtitle"
          >
            Gestisci i listini prezzi per i tuoi prodotti
          </p>
        </div>

        {/* Placeholder Content */}
        <div 
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '16px',
            padding: '64px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
          }}
        >
          <FileText size={64} style={{ margin: '0 auto 24px', color: 'var(--text-tertiary)' }} />
          <h2 
            style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px', color: 'hsl(var(--foreground))' }}
            data-testid="heading-placeholder-title"
          >
            Gestione Listini in Arrivo
          </h2>
          <p 
            style={{ color: 'var(--text-tertiary)', maxWidth: '500px', margin: '0 auto' }}
            data-testid="text-placeholder-message"
          >
            La funzionalità di gestione listini prezzi sarà disponibile a breve. 
            Potrai creare e gestire listini multipli per clienti, canali di vendita e periodi promozionali.
          </p>
        </div>
      </div>
    </Layout>
  );
}
