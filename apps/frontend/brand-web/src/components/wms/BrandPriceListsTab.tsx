import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';

export default function BrandPriceListsTab() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
            Listini Prezzi Master
          </h2>
          <p style={{ color: '#6b7280', marginTop: '0.25rem', margin: 0 }}>
            Gestisci i listini prezzi del catalogo master
          </p>
        </div>
        <Button
          style={{ background: 'linear-gradient(135deg, #FF6900, #ff8533)', color: 'white', border: 'none' }}
          data-testid="button-create-pricelist"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Listino
        </Button>
      </div>

      <div style={{
        background: 'hsla(255, 255, 255, 0.08)',
        backdropFilter: 'blur(1.5rem)',
        border: '1px solid hsla(255, 255, 255, 0.12)',
        borderRadius: '0.75rem',
        padding: '3rem',
        textAlign: 'center'
      }}>
        <FileText size={48} style={{ color: '#9ca3af', margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
          Listini Prezzi
        </h3>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Funzionalità in arrivo: gestione listini prezzi master
        </p>
        <div style={{
          padding: '1rem',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          color: '#1f2937'
        }}>
          💡 I listini prezzi permetteranno di definire prezzi differenziati per canali, aree geografiche e tipologie di cliente.
        </div>
      </div>
    </div>
  );
}
