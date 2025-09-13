import React, { useState } from 'react';
import Layout from '../components/Layout';
import {
  StandardEmailField,
  StandardCityField,
  StandardCapField,
  StandardCodiceFiscaleField,
  StandardPartitaIVAField,
  StandardPaeseField
} from '../components/forms/StandardFields';

const StandardFieldsDemo = () => {
  // Stati per i vari campi
  const [formData, setFormData] = useState({
    email: '',
    citta: '',
    cap: '',
    provincia: '',
    codiceFiscale: '',
    partitaIva: '',
    paese: 'Italia'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form Data:', formData);
    alert('Controlla la console per vedere i dati validati!');
  };

  return (
    <Layout>
      <div style={{
        background: '#ffffff',
        minHeight: '100vh',
        padding: '32px',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#111827',
              margin: '0 0 8px 0'
            }}>
              🧪 Demo Campi Standardizzati
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              margin: 0
            }}>
              Prova i nuovi campi con validazione automatica e funzionalità avanzate
            </p>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e5e7eb'
          }}>
            <form onSubmit={handleSubmit}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                marginBottom: '24px'
              }}>
                {/* Colonna Sinistra */}
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '16px'
                  }}>
                    📧 Contatti e Localizzazione
                  </h3>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Email *
                    </label>
                    <StandardEmailField
                      value={formData.email}
                      onChange={(value) => setFormData({...formData, email: value})}
                      placeholder="example@company.it"
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Città *
                    </label>
                    <StandardCityField
                      value={formData.citta}
                      onChange={(value) => setFormData({...formData, citta: value})}
                      onCapChange={(cap) => setFormData({...formData, cap})}
                      onProvinciaChange={(provincia) => setFormData({...formData, provincia})}
                      required
                    />
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '16px',
                    marginBottom: '20px' 
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        CAP
                      </label>
                      <StandardCapField
                        value={formData.cap}
                        onChange={(value) => setFormData({...formData, cap: value})}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Paese
                      </label>
                      <StandardPaeseField value={formData.paese} />
                    </div>
                  </div>
                </div>

                {/* Colonna Destra */}
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '16px'
                  }}>
                    🆔 Dati Fiscali
                  </h3>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Codice Fiscale
                    </label>
                    <StandardCodiceFiscaleField
                      value={formData.codiceFiscale}
                      onChange={(value) => setFormData({...formData, codiceFiscale: value})}
                      placeholder="RSSMRA80A01H501U"
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Partita IVA
                    </label>
                    <StandardPartitaIVAField
                      value={formData.partitaIva}
                      onChange={(value) => setFormData({...formData, partitaIva: value})}
                      placeholder="IT12345678901"
                    />
                  </div>
                </div>
              </div>

              {/* Info Display */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px'
              }}>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  📋 Dati Inseriti (Real-time)
                </h4>
                <pre style={{
                  background: '#1f2937',
                  color: '#f9fafb',
                  padding: '16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(formData, null, 2)}
                </pre>
              </div>

              {/* Features List */}
              <div style={{
                background: 'linear-gradient(135deg, #dbeafe, #eff6ff)',
                border: '1px solid #3b82f6',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px'
              }}>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1d4ed8',
                  marginBottom: '12px'
                }}>
                  ✨ Funzionalità Implementate
                </h4>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  color: '#374151'
                }}>
                  <li>✅ <strong>Email:</strong> Validazione RFC compliant in tempo reale</li>
                  <li>✅ <strong>Città:</strong> Select con autocomplete da database italiano</li>
                  <li>✅ <strong>CAP:</strong> Auto-popolato dalla città selezionata</li>
                  <li>✅ <strong>Codice Fiscale:</strong> Validazione algoritmo italiano + carattere controllo</li>
                  <li>✅ <strong>Partita IVA:</strong> Validazione algoritmo Luhn + formato IT</li>
                  <li>✅ <strong>Paese:</strong> Sempre "Italia" per entità italiane</li>
                </ul>
              </div>

              <div style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => setFormData({
                    email: '',
                    citta: '',
                    cap: '',
                    provincia: '',
                    codiceFiscale: '',
                    partitaIva: '',
                    paese: 'Italia'
                  })}
                  style={{
                    padding: '12px 24px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #FF6900, #e55a00)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(255, 105, 0, 0.3)'
                  }}
                >
                  Testa Validazione
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StandardFieldsDemo;