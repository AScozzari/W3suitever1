import { useQuery } from '@tanstack/react-query';
import { Package, FolderTree, Building2, FileText } from 'lucide-react';

export default function BrandDashboardTab() {
  // Fetch counts from all endpoints
  const { data: products = [] } = useQuery({ queryKey: ['/brand-api/wms/products'] });
  const { data: categories = [] } = useQuery({ queryKey: ['/brand-api/wms/categories'] });
  const { data: suppliers = [] } = useQuery({ queryKey: ['/brand-api/wms/suppliers'] });
  const { data: productTypes = [] } = useQuery({ queryKey: ['/brand-api/wms/product-types'] });

  const stats = [
    {
      title: 'Prodotti',
      count: products.length,
      icon: Package,
      color: '#FF6900',
      bgColor: 'rgba(255, 105, 0, 0.1)'
    },
    {
      title: 'Categorie',
      count: categories.length,
      icon: FolderTree,
      color: '#7B2CBF',
      bgColor: 'rgba(123, 44, 191, 0.1)'
    },
    {
      title: 'Fornitori',
      count: suppliers.length,
      icon: Building2,
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)'
    },
    {
      title: 'Tipologie',
      count: productTypes.length,
      icon: FileText,
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.1)'
    }
  ];

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#1f2937' }}>
        Dashboard WMS - Catalogo Master
      </h2>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              style={{
                background: 'hsla(255, 255, 255, 0.08)',
                backdropFilter: 'blur(24px)',
                border: '1px solid hsla(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}
            >
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                background: stat.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon size={28} style={{ color: stat.color }} />
              </div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
                  {stat.count}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                  {stat.title}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div style={{
        background: 'hsla(255, 255, 255, 0.08)',
        backdropFilter: 'blur(24px)',
        border: '1px solid hsla(255, 255, 255, 0.12)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
          Catalogo Master WMS
        </h3>
        <p style={{ color: '#6b7280', lineHeight: '1.6', margin: 0 }}>
          Gestisci il catalogo master prodotti, categorie, tipologie e fornitori. 
          I dati vengono sincronizzati selettivamente ai tenant tramite il sistema di deployment.
          Utilizza i tab sopra per navigare tra le diverse sezioni.
        </p>
      </div>
    </div>
  );
}
