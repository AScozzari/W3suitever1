export default function App() {
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ 
        fontSize: '48px', 
        color: 'white', 
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        W3 Suite Enterprise
      </h1>
      
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h3 style={{ color: '#FF6900', fontSize: '18px', marginBottom: '8px' }}>Vendite</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>€2.4M</p>
        </div>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h3 style={{ color: '#7B2CBF', fontSize: '18px', marginBottom: '8px' }}>Ordini</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>8,327</p>
        </div>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h3 style={{ color: '#FF6900', fontSize: '18px', marginBottom: '8px' }}>Clienti</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>3,516</p>
        </div>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h3 style={{ color: '#7B2CBF', fontSize: '18px', marginBottom: '8px' }}>Conversione</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>24.8%</p>
        </div>
      </div>
    </div>
  );
}