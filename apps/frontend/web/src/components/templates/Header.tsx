import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  User, Search, Bell, Settings, Menu, ChevronDown,
  Store, LogOut, UserCircle
} from 'lucide-react';
import { oauth2Client } from '../../services/OAuth2Client';
import { queryClient } from '../../lib/queryClient';

// Palette colori W3 Suite - Consistent con Layout
const COLORS = {
  primary: {
    orange: '#FF6900',
    orangeLight: '#ff8533',
    purple: '#7B2CBF',
    purpleLight: '#9747ff',
  }
};

interface HeaderProps {
  isMobile?: boolean;
  isTablet?: boolean;
  onMenuToggle?: () => void;
  selectedStore?: any;
  stores?: any[];
  onStoreSelect?: (store: any) => void;
  searchPlaceholder?: string;
}

export default function Header({ 
  isMobile = false, 
  isTablet = false,
  onMenuToggle,
  selectedStore,
  stores = [],
  onStoreSelect,
  searchPlaceholder = "Cerca clienti, contratti, fatture..."
}: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  
  const { data: user } = useQuery({ queryKey: ["/api/auth/session"] });

  // Chiudi menu quando clicchi fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-user-menu]')) {
        setUserMenuOpen(false);
      }
      if (!target.closest('[data-store-menu]')) {
        setStoreMenuOpen(false);
      }
      if (!target.closest('[data-notification-menu]')) {
        setNotificationMenuOpen(false);
      }
    };

    if (userMenuOpen || storeMenuOpen || notificationMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [userMenuOpen, storeMenuOpen, notificationMenuOpen]);

  const handleLogout = async () => {
    try {
      await oauth2Client.logout();
      queryClient.removeQueries({ queryKey: ['/api/auth/session'] });
      queryClient.clear();
      window.location.href = '/brandinterface/login';
    } catch (error) {
      await oauth2Client.logout();
      queryClient.clear();
      window.location.href = '/brandinterface/login';
    }
  };

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: isMobile ? '56px' : '64px',
      background: 'hsla(255, 255, 255, 0.15)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderBottom: '1px solid hsla(255, 255, 255, 0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '0 16px' : '0 24px',
      zIndex: 50,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
      borderRadius: '0 0 20px 20px'
    }}>
      {/* Logo e Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Mobile Menu Button */}
        {isMobile && onMenuToggle && (
          <button
            onClick={onMenuToggle}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              borderRadius: '8px',
              marginRight: '8px'
            }}
          >
            <Menu size={20} />
          </button>
        )}
        
        <div style={{
          width: '32px',
          height: '32px',
          background: `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px'
        }}>W</div>
        <div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', margin: 0, lineHeight: 1 }}>
            WindTre Suite
          </p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: 1 }}>
            Multitenant Dashboard
          </p>
        </div>
      </div>

      {/* Barra di ricerca centrale - Hidden on mobile */}
      {!isMobile && (
        <div style={{ flex: 1, maxWidth: '400px', margin: '0 32px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: '#6b7280' 
            }} />
            <input
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                padding: '8px 12px 8px 40px',
                background: 'hsla(0, 0%, 100%, 0.25)',
                backdropFilter: 'blur(16px)',
                border: '1px solid hsla(0, 0%, 100%, 0.18)',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
        </div>
      )}
      
      {/* Mobile search button */}
      {isMobile && (
        <button style={{
          background: 'transparent',
          border: 'none',
          padding: '8px',
          cursor: 'pointer',
          borderRadius: '8px'
        }}>
          <Search size={20} />
        </button>
      )}

      {/* Sezione destra - Responsive */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px' }}>
        {/* Selettore Punto Vendita - Hidden on mobile */}
        {!isMobile && stores.length > 0 && (
          <div style={{ position: 'relative' }} data-store-menu>
            <button
              onClick={() => setStoreMenuOpen(!storeMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'hsla(0, 0%, 100%, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid hsla(0, 0%, 100%, 0.15)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: 'inherit'
              }}
            >
              <Store size={16} style={{ color: '#6b7280' }} />
              <span style={{ fontWeight: 400 }}>
                {selectedStore?.nome || selectedStore?.name || 'Seleziona Punto Vendita'}
              </span>
              <ChevronDown size={14} style={{ 
                transform: storeMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }} />
            </button>

            {/* Dropdown Menu Punti Vendita */}
            {storeMenuOpen && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '8px',
                width: '280px',
                maxHeight: '300px',
                overflowY: 'auto',
                background: 'hsla(0, 0%, 100%, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid hsla(0, 0%, 100%, 0.2)',
                borderRadius: '12px',
                boxShadow: '0 16px 48px rgba(0, 0, 0, 0.1)',
                zIndex: 1000
              }}>
                {stores.map((store, index) => (
                  <button
                    key={store.id}
                    onClick={() => {
                      onStoreSelect?.(store);
                      setStoreMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: index < stores.length - 1 ? '1px solid hsla(0, 0%, 0%, 0.05)' : 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0, 0%, 0%, 0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937', marginBottom: '2px' }}>
                      {store.nome || store.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {store.codice || store.code} • {store.citta || store.city}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifiche */}
        <div style={{ position: 'relative' }} data-notification-menu>
          <button
            onClick={() => setNotificationMenuOpen(!notificationMenuOpen)}
            style={{
              position: 'relative',
              background: 'hsla(0, 0%, 100%, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid hsla(0, 0%, 100%, 0.15)',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Bell size={isMobile ? 18 : 20} />
            {/* Badge notifiche */}
            <div style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '8px',
              height: '8px',
              background: '#ef4444',
              borderRadius: '50%',
              border: '2px solid white'
            }} />
          </button>

          {/* Menu Notifiche */}
          {notificationMenuOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '8px',
              width: '320px',
              background: 'hsla(0, 0%, 100%, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid hsla(0, 0%, 100%, 0.2)',
              borderRadius: '12px',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              padding: '16px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', marginBottom: '12px' }}>
                Notifiche
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', padding: '20px' }}>
                Nessuna notifica al momento
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div style={{ position: 'relative' }} data-user-menu>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '0' : '8px',
              padding: '6px',
              background: 'hsla(0, 0%, 100%, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid hsla(0, 0%, 100%, 0.15)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              background: user?.profileImageUrl ? `url(${user.profileImageUrl})` : `linear-gradient(135deg, ${COLORS.primary.purple}, ${COLORS.primary.purpleLight})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600
            }}>
              {!user?.profileImageUrl && (user?.firstName?.[0] || user?.email?.[0] || 'U')}
            </div>
            {!isMobile && (
              <>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937' }}>
                  {user?.firstName || user?.email?.split('@')[0] || 'Utente'}
                </div>
                <ChevronDown size={14} style={{ 
                  transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }} />
              </>
            )}
          </button>

          {/* User Dropdown */}
          {userMenuOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '8px',
              width: '200px',
              background: 'hsla(0, 0%, 100%, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid hsla(0, 0%, 100%, 0.2)',
              borderRadius: '12px',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              overflow: 'hidden'
            }}>
              <button
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid hsla(0, 0%, 0%, 0.05)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0, 0%, 0%, 0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <UserCircle size={16} />
                <span style={{ fontSize: '14px', color: '#1f2937' }}>Profilo</span>
              </button>
              <button
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid hsla(0, 0%, 0%, 0.05)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0, 0%, 0%, 0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Settings size={16} />
                <span style={{ fontSize: '14px', color: '#1f2937' }}>Impostazioni</span>
              </button>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.2s ease',
                  color: '#ef4444'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(239, 68%, 68%, 0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={16} />
                <span style={{ fontSize: '14px' }}>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}