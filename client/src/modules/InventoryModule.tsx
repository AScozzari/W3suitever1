import { useTheme } from '../contexts/ThemeContext';
import { Package } from 'lucide-react';

export default function InventoryModule() {
  const { currentTheme } = useTheme();

  const colors = {
    text: currentTheme === 'dark' ? 'white' : '#1f2937',
    textSecondary: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(31, 41, 55, 0.7)',
    cardBg: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
    border: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  };

  return (
    <div>
      <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: '600', marginBottom: '24px' }}>
        Gestione Magazzino
      </h1>
      
      <div style={{
        background: colors.cardBg,
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '32px',
        border: `1px solid ${colors.border}`,
        textAlign: 'center',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>
          <Package size={64} style={{ marginBottom: '16px', color: '#FF6900' }} />
          <h2 style={{ color: colors.text, fontSize: '24px', marginBottom: '8px' }}>
            Inventario e Magazzino
          </h2>
          <p style={{ color: colors.textSecondary }}>
            Modulo inventario in sviluppo
          </p>
        </div>
      </div>
    </div>
  );
}