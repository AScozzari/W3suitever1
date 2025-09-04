export default function App() {
  return (
    <div style={{ padding: '40px', backgroundColor: 'white', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '32px', color: '#FF6900', fontWeight: 'bold', marginBottom: '20px' }}>
        W3 Suite Enterprise - TEST FUNZIONANTE
      </h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        
        <div style={{ 
          backgroundColor: '#f9f9f9', 
          padding: '20px', 
          borderRadius: '12px',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>Vendite Dirette</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>12.483</p>
          <span style={{ 
            backgroundColor: '#FF6900', 
            color: 'white', 
            padding: '4px 8px', 
            borderRadius: '4px',
            fontSize: '12px'
          }}>+12%</span>
        </div>

        <div style={{ 
          backgroundColor: '#f9f9f9', 
          padding: '20px', 
          borderRadius: '12px',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>Ordini</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>8.327</p>
          <span style={{ 
            backgroundColor: '#7B2CBF', 
            color: 'white', 
            padding: '4px 8px', 
            borderRadius: '4px',
            fontSize: '12px'
          }}>+8%</span>
        </div>

        <div style={{ 
          backgroundColor: '#f9f9f9', 
          padding: '20px', 
          borderRadius: '12px',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>Clienti</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>3.516</p>
          <span style={{ 
            backgroundColor: '#2563eb', 
            color: 'white', 
            padding: '4px 8px', 
            borderRadius: '4px',
            fontSize: '12px'
          }}>+5%</span>
        </div>

        <div style={{ 
          backgroundColor: '#f9f9f9', 
          padding: '20px', 
          borderRadius: '12px',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>Visualizzazioni</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>1.284</p>
          <span style={{ 
            backgroundColor: '#10b981', 
            color: 'white', 
            padding: '4px 8px', 
            borderRadius: '4px',
            fontSize: '12px'
          }}>+15%</span>
        </div>
        
      </div>

      <p style={{ marginTop: '40px', color: '#666' }}>
        Se vedi questo testo e le card sopra, React funziona correttamente!
      </p>
    </div>
  )
}