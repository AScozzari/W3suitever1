import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';

export default function BrandPriceListsTab() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
            Listini Prezzi Master
          </h2>
          <p style={{ color: '#6b7280', marginTop: '4px', margin: 0 }}>
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
        backdropFilter: 'blur(24px)',
        border: '1px solid hsla(255, 255, 255, 0.12)',
        borderRadius: '12px',
        padding: '48px',
        textAlign: 'center'
      }}>
        <FileText size={48} style={{ color: '#9ca3af', margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
          Listini Prezzi
        </h3>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          Funzionalità in arrivo: gestione listini prezzi master
        </p>
        <div style={{
          padding: '16px',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#1f2937'
        }}>
          💡 I listini prezzi permetteranno di definire prezzi differenziati per canali, aree geografiche e tipologie di cliente.
        </div>
      </div>
    </div>
  );
}
