// Modal Nuovo Utente Component
// Questo componente verrà inserito in SettingsPage.tsx

const UserModalComponent = () => (
  <>
    {/* Modal Nuovo Utente */}
    {userModal.open && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          width: '90%',
          maxWidth: '900px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
        }}>
          {/* Header Modal */}
          <div style={{
            padding: '32px 32px 24px 32px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Glassmorphism overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(10px) saturate(180%)',
              WebkitBackdropFilter: 'blur(10px) saturate(180%)'
            }} />
            
            {/* Effetto glow decorativo */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-20%',
              width: '300px',
              height: '300px',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(40px)',
              pointerEvents: 'none'
            }} />
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                  }}>
                    <User size={20} style={{ color: 'white' }} />
                  </div>
                  <h2 style={{
                    fontSize: '22px',
                    fontWeight: '700',
                    color: '#111827',
                    margin: 0,
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                    position: 'relative',
                    zIndex: 1,
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}>
                    {userModal.data ? 'Modifica Utente' : 'Nuovo Utente'}
                  </h2>
                </div>
                <p style={{
                  fontSize: '14px',
                  color: '#374151',
                  margin: 0,
                  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                  position: 'relative',
                  zIndex: 1,
                  fontWeight: 500
                }}>
                  {userModal.data ? 'Modifica i dati dell\'utente' : 'Completa tutte le informazioni per creare un nuovo utente'}
                </p>
              </div>
              <button
                onClick={() => setUserModal({ open: false, data: null })}
                style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  padding: '8px',
                  transition: 'all 0.15s ease',
                  color: '#64748b',
                  backdropFilter: 'blur(8px)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(248, 250, 252, 0.95)';
                  e.currentTarget.style.color = '#374151';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                  e.currentTarget.style.color = '#64748b';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body Modal con sezioni */}
          <div style={{ padding: '24px' }}>
            {/* SEZIONE 1: DATI DI ACCESSO */}
            <div style={{
              marginBottom: '32px',
              padding: '20px',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderRadius: '12px',
              border: '1px solid #bae6fd'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#0369a1',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Lock size={18} />
                Dati di Accesso
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                {/* Username */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Username <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="mario.rossi"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Password */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Minimo 8 caratteri"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Conferma Password */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Conferma Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Ripeti password"
                    value={newUser.confirmPassword}
                    onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Ruolo */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Ruolo <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newUser.ruolo}
                    onChange={(e) => setNewUser({ ...newUser, ruolo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Seleziona ruolo...</option>
                    {availableRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                {/* Cambio Password Obbligatorio */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="cambioPassword"
                    checked={newUser.cambioPasswordObbligatorio}
                    onChange={(e) => setNewUser({ ...newUser, cambioPasswordObbligatorio: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="cambioPassword" style={{
                    fontSize: '14px',
                    color: '#374151',
                    cursor: 'pointer'
                  }}>
                    Cambio password obbligatorio al primo accesso
                  </label>
                </div>
              </div>
            </div>

            {/* SEZIONE 2: INFORMAZIONI PERSONALI */}
            <div style={{
              marginBottom: '32px',
              padding: '20px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderRadius: '12px',
              border: '1px solid #fcd34d'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#92400e',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <User size={18} />
                Informazioni Personali
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                {/* Nome */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Nome <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Mario"
                    value={newUser.nome}
                    onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Cognome */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Cognome <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Rossi"
                    value={newUser.cognome}
                    onChange={(e) => setNewUser({ ...newUser, cognome: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Codice Fiscale */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Codice Fiscale
                  </label>
                  <input
                    type="text"
                    placeholder="RSSMRA85M01H501Z"
                    value={newUser.codiceFiscale}
                    onChange={(e) => setNewUser({ ...newUser, codiceFiscale: e.target.value.toUpperCase() })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      textTransform: 'uppercase'
                    }}
                  />
                </div>

                {/* Data di Nascita */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Data di Nascita
                  </label>
                  <input
                    type="date"
                    value={newUser.dataNascita}
                    onChange={(e) => setNewUser({ ...newUser, dataNascita: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Luogo di Nascita */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Luogo di Nascita
                  </label>
                  <input
                    type="text"
                    placeholder="Roma"
                    value={newUser.luogoNascita}
                    onChange={(e) => setNewUser({ ...newUser, luogoNascita: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Sesso */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Sesso
                  </label>
                  <select
                    value={newUser.sesso}
                    onChange={(e) => setNewUser({ ...newUser, sesso: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="M">Maschio</option>
                    <option value="F">Femmina</option>
                    <option value="X">Non specificato</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SEZIONE 3: CONTATTI */}
            <div style={{
              marginBottom: '32px',
              padding: '20px',
              background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
              borderRadius: '12px',
              border: '1px solid #a5b4fc'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#4338ca',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Phone size={18} />
                Contatti
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Email Aziendale */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Email Aziendale <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="mario.rossi@windtre.it"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Email Personale */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Email Personale
                  </label>
                  <input
                    type="email"
                    placeholder="mario.rossi@gmail.com"
                    value={newUser.emailPersonale}
                    onChange={(e) => setNewUser({ ...newUser, emailPersonale: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Telefono */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Telefono Personale <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+39 333 1234567"
                    value={newUser.telefono}
                    onChange={(e) => setNewUser({ ...newUser, telefono: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Telefono Aziendale */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Telefono Aziendale
                  </label>
                  <input
                    type="tel"
                    placeholder="+39 06 1234567"
                    value={newUser.telefonoAziendale}
                    onChange={(e) => setNewUser({ ...newUser, telefonoAziendale: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* SEZIONE 4: INDIRIZZO */}
            <div style={{
              marginBottom: '32px',
              padding: '20px',
              background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
              borderRadius: '12px',
              border: '1px solid #86efac'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#14532d',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <MapPin size={18} />
                Indirizzo di Residenza
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                {/* Via */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Via/Piazza
                  </label>
                  <input
                    type="text"
                    placeholder="Via Roma"
                    value={newUser.via}
                    onChange={(e) => setNewUser({ ...newUser, via: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Civico */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Civico
                  </label>
                  <input
                    type="text"
                    placeholder="1"
                    value={newUser.civico}
                    onChange={(e) => setNewUser({ ...newUser, civico: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Città */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Città
                  </label>
                  <input
                    type="text"
                    placeholder="Roma"
                    value={newUser.citta}
                    onChange={(e) => setNewUser({ ...newUser, citta: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* CAP */}
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
                  <input
                    type="text"
                    placeholder="00100"
                    value={newUser.cap}
                    onChange={(e) => setNewUser({ ...newUser, cap: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Provincia */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Provincia
                  </label>
                  <select
                    value={newUser.provincia}
                    onChange={(e) => setNewUser({ ...newUser, provincia: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Seleziona...</option>
                    {italianProvinces.map(prov => (
                      <option key={prov.code} value={prov.code}>{prov.name} ({prov.code})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SEZIONE 5: AMBITO OPERATIVO */}
            <div style={{
              marginBottom: '32px',
              padding: '20px',
              background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
              borderRadius: '12px',
              border: '1px solid #f9a8d4'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#831843',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Building2 size={18} />
                Ambito Operativo
              </h3>
              
              {/* Selezione tipo ambito */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Livello di Accesso <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[
                    { value: 'organizzazione', label: 'Intera Organizzazione', color: '#8b5cf6' },
                    { value: 'ragioni_sociali', label: 'Ragioni Sociali Specifiche', color: '#f59e0b' },
                    { value: 'punti_vendita', label: 'Punti Vendita Specifici', color: '#10b981' }
                  ].map(option => (
                    <label key={option.value} style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px',
                      background: newUser.ambito === option.value ? `${option.color}10` : '#ffffff',
                      border: `2px solid ${newUser.ambito === option.value ? option.color : '#e5e7eb'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="radio"
                        name="ambito"
                        value={option.value}
                        checked={newUser.ambito === option.value}
                        onChange={(e) => setNewUser({ ...newUser, ambito: e.target.value })}
                        style={{ display: 'none' }}
                      />
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: `2px solid ${newUser.ambito === option.value ? option.color : '#d1d5db'}`,
                        background: newUser.ambito === option.value ? option.color : 'transparent',
                        transition: 'all 0.2s ease'
                      }} />
                      <span style={{
                        fontSize: '14px',
                        fontWeight: newUser.ambito === option.value ? '600' : '500',
                        color: newUser.ambito === option.value ? option.color : '#6b7280'
                      }}>
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Selezione Ragioni Sociali (se applicabile) */}
              {(newUser.ambito === 'ragioni_sociali' || newUser.ambito === 'punti_vendita') && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Seleziona Ragioni Sociali
                  </label>
                  <div style={{
                    maxHeight: '150px',
                    overflowY: 'auto',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px'
                  }}>
                    {ragioneSocialiList.map(rs => (
                      <label key={rs.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                        <input
                          type="checkbox"
                          checked={newUser.selectedLegalEntities.includes(rs.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewUser({
                                ...newUser,
                                selectedLegalEntities: [...newUser.selectedLegalEntities, rs.id]
                              });
                            } else {
                              setNewUser({
                                ...newUser,
                                selectedLegalEntities: newUser.selectedLegalEntities.filter(id => id !== rs.id)
                              });
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '14px', color: '#374151' }}>
                          {rs.nome} ({rs.codice})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Selezione Punti Vendita (se applicabile) */}
              {newUser.ambito === 'punti_vendita' && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Seleziona Punti Vendita
                  </label>
                  <div style={{
                    maxHeight: '150px',
                    overflowY: 'auto',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px'
                  }}>
                    {puntiVenditaList
                      .filter(pv => newUser.selectedLegalEntities.length === 0 || newUser.selectedLegalEntities.includes(pv.ragioneSociale_id))
                      .map(pv => (
                        <label key={pv.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                          <input
                            type="checkbox"
                            checked={newUser.selectedStores.includes(pv.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewUser({
                                  ...newUser,
                                  selectedStores: [...newUser.selectedStores, pv.id]
                                });
                              } else {
                                setNewUser({
                                  ...newUser,
                                  selectedStores: newUser.selectedStores.filter(id => id !== pv.id)
                                });
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '14px', color: '#374151' }}>
                            {pv.nome} ({pv.codice})
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* SEZIONE 6: DOCUMENTI */}
            <div style={{
              marginBottom: '32px',
              padding: '20px',
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              borderRadius: '12px',
              border: '1px solid #fca5a5'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#7f1d1d',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FileText size={18} />
                Documenti
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                {/* Tipo Documento */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Tipo Documento
                  </label>
                  <select
                    value={newUser.tipoDocumento}
                    onChange={(e) => setNewUser({ ...newUser, tipoDocumento: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Carta Identità">Carta d'Identità</option>
                    <option value="Patente">Patente di Guida</option>
                    <option value="Passaporto">Passaporto</option>
                  </select>
                </div>

                {/* Numero Documento */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Numero Documento
                  </label>
                  <input
                    type="text"
                    placeholder="CA12345AB"
                    value={newUser.numeroDocumento}
                    onChange={(e) => setNewUser({ ...newUser, numeroDocumento: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      textTransform: 'uppercase'
                    }}
                  />
                </div>

                {/* Data Scadenza */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Data Scadenza
                  </label>
                  <input
                    type="date"
                    value={newUser.dataScadenzaDocumento}
                    onChange={(e) => setNewUser({ ...newUser, dataScadenzaDocumento: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* SEZIONE 7: IMPOSTAZIONI ACCOUNT */}
            <div style={{
              marginBottom: '32px',
              padding: '20px',
              background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
              borderRadius: '12px',
              border: '1px solid #d8b4fe'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#581c87',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Settings size={18} />
                Impostazioni Account
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                {/* Stato */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Stato Account
                  </label>
                  <select
                    value={newUser.stato}
                    onChange={(e) => setNewUser({ ...newUser, stato: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Attivo">Attivo</option>
                    <option value="Sospeso">Sospeso</option>
                    <option value="Disattivo">Disattivo</option>
                  </select>
                </div>

                {/* Data Inizio Validità */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Data Inizio Validità
                  </label>
                  <input
                    type="date"
                    value={newUser.dataInizioValidita}
                    onChange={(e) => setNewUser({ ...newUser, dataInizioValidita: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Data Fine Validità */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Data Fine Validità
                  </label>
                  <input
                    type="date"
                    value={newUser.dataFineValidita}
                    onChange={(e) => setNewUser({ ...newUser, dataFineValidita: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Notifiche */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '4px'
                  }}>
                    Notifiche
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={newUser.notificheEmail}
                      onChange={(e) => setNewUser({ ...newUser, notificheEmail: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Email</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={newUser.notificheSMS}
                      onChange={(e) => setNewUser({ ...newUser, notificheSMS: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>SMS</span>
                  </label>
                </div>

                {/* Lingua */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Lingua
                  </label>
                  <select
                    value={newUser.lingua}
                    onChange={(e) => setNewUser({ ...newUser, lingua: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="it">Italiano</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SEZIONE 8: INFORMAZIONI CONTRATTUALI */}
            <div style={{
              marginBottom: '32px',
              padding: '20px',
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
              borderRadius: '12px',
              border: '1px solid #93c5fd'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1e3a8a',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Briefcase size={18} />
                Informazioni Contrattuali
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                {/* Tipo Contratto */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Tipo Contratto
                  </label>
                  <select
                    value={newUser.tipoContratto}
                    onChange={(e) => setNewUser({ ...newUser, tipoContratto: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Indeterminato">Tempo Indeterminato</option>
                    <option value="Determinato">Tempo Determinato</option>
                    <option value="Apprendistato">Apprendistato</option>
                    <option value="Stage">Stage/Tirocinio</option>
                    <option value="Partita IVA">Partita IVA</option>
                  </select>
                </div>

                {/* Data Assunzione */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Data Assunzione
                  </label>
                  <input
                    type="date"
                    value={newUser.dataAssunzione}
                    onChange={(e) => setNewUser({ ...newUser, dataAssunzione: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Livello */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Livello
                  </label>
                  <input
                    type="text"
                    placeholder="3° Livello"
                    value={newUser.livello}
                    onChange={(e) => setNewUser({ ...newUser, livello: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* CCNL */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    CCNL
                  </label>
                  <select
                    value={newUser.ccnl}
                    onChange={(e) => setNewUser({ ...newUser, ccnl: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Commercio">Commercio</option>
                    <option value="Telecomunicazioni">Telecomunicazioni</option>
                    <option value="Metalmeccanico">Metalmeccanico</option>
                    <option value="Servizi">Servizi</option>
                  </select>
                </div>

                {/* Ore Lavoro Settimanali */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Ore Settimanali
                  </label>
                  <input
                    type="number"
                    placeholder="40"
                    value={newUser.oreLavoro}
                    onChange={(e) => setNewUser({ ...newUser, oreLavoro: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#ffffff',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* SEZIONE 9: NOTE */}
            <div style={{
              marginBottom: '24px',
              padding: '20px',
              background: 'linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%)',
              borderRadius: '12px',
              border: '1px solid #d4d4d4'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#525252',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FileText size={18} />
                Note Aggiuntive
              </h3>
              
              <textarea
                placeholder="Inserisci eventuali note o informazioni aggiuntive..."
                value={newUser.note}
                onChange={(e) => setNewUser({ ...newUser, note: e.target.value })}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: '#ffffff',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Footer con pulsanti */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => setUserModal({ open: false, data: null })}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: '#ffffff',
                  color: '#6b7280',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  // Validazione base
                  if (!newUser.username || !newUser.password || !newUser.nome || !newUser.cognome || !newUser.email || !newUser.ruolo) {
                    alert('Compila tutti i campi obbligatori');
                    return;
                  }
                  
                  if (newUser.password !== newUser.confirmPassword) {
                    alert('Le password non corrispondono');
                    return;
                  }
                  
                  // Aggiungi l'utente alla lista
                  const newUserEntry = {
                    id: utentiList.length + 1,
                    tenant_id: getCurrentTenantId(),
                    username: newUser.username,
                    nome: newUser.nome,
                    cognome: newUser.cognome,
                    email: newUser.email,
                    telefono: newUser.telefono,
                    ruolo: newUser.ruolo,
                    ambito: newUser.ambito === 'organizzazione' ? 'Organizzazione' : 
                            newUser.ambito === 'ragioni_sociali' ? `${newUser.selectedLegalEntities.length} Ragioni Sociali` :
                            `${newUser.selectedStores.length} Punti Vendita`,
                    stato: newUser.stato,
                    ultimoAccesso: 'Mai',
                    createdAt: new Date().toISOString().split('T')[0]
                  };
                  
                  setUtentiList([...utentiList, newUserEntry]);
                  setUserModal({ open: false, data: null });
                }}
                style={{
                  padding: '10px 24px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                  boxShadow: '0 1px 3px 0 rgba(59, 130, 246, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#2563eb';
                  e.currentTarget.style.boxShadow = '0 2px 6px 0 rgba(59, 130, 246, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(59, 130, 246, 0.3)';
                }}
              >
                Salva Utente
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);

export default UserModalComponent;