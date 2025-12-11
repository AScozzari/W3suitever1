import { useState, useEffect, ReactNode } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface TabSection {
  id: string;
  label: string;
  icon: LucideIcon;
  content: ReactNode;
}

export interface TabbedFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconGradient: string;
  tabs: TabSection[];
  onSave?: () => void;
  saveLabel?: string;
  saving?: boolean;
  isReadOnly?: boolean;
  error?: string | null;
  headerBadge?: ReactNode;
  initialTab?: string;
}

export default function TabbedFormModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconGradient,
  tabs,
  onSave,
  saveLabel = 'Salva',
  saving = false,
  isReadOnly = false,
  error,
  headerBadge,
  initialTab
}: TabbedFormModalProps) {
  const [activeTab, setActiveTab] = useState(initialTab || tabs[0]?.id || '');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || tabs[0]?.id || '');
    }
  }, [isOpen, initialTab, tabs]);

  if (!isOpen) return null;

  const activeTabContent = tabs.find(t => t.id === activeTab)?.content;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid="tabbed-modal-overlay"
    >
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: `linear-gradient(135deg, ${iconGradient.split(',')[0]?.replace('linear-gradient(135deg,', '').trim() || 'rgba(99, 102, 241, 0.05)'}, rgba(255,255,255,0.95))`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: iconGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              <Icon size={22} style={{ color: 'white' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                {title}
              </h2>
              {subtitle && (
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                  {subtitle}
                </p>
              )}
              {headerBadge}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              background: '#f3f4f6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            data-testid="button-close-modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 24px',
          background: '#fafafa',
          borderBottom: '1px solid #e5e7eb',
          overflowX: 'auto'
        }}>
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? iconGradient : 'white',
                  color: isActive ? 'white' : '#6b7280',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive 
                    ? '0 2px 8px rgba(0,0,0,0.2)'
                    : '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s ease'
                }}
                data-testid={`tab-${tab.id}`}
              >
                <TabIcon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              marginBottom: '20px',
              color: '#ef4444',
              fontSize: '14px'
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          {activeTabContent}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          background: '#fafafa'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'white',
              color: '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
            data-testid="button-cancel-modal"
          >
            {isReadOnly ? 'Chiudi' : 'Annulla'}
          </button>
          {!isReadOnly && onSave && (
            <button
              onClick={onSave}
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: saving ? '#9ca3af' : iconGradient,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
              data-testid="button-save-modal"
            >
              {saving ? 'Salvataggio...' : saveLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Reusable form field styles
export const formStyles = {
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: '500' as const,
    color: '#374151'
  },
  input: (hasError = false, isValid = false, isReadOnly = false) => ({
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${hasError ? '#ef4444' : isValid ? '#10b981' : '#e5e7eb'}`,
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    background: isReadOnly ? '#f9fafb' : 'white',
    transition: 'border-color 0.2s'
  }),
  select: (isReadOnly = false) => ({
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    background: isReadOnly ? '#f9fafb' : 'white',
    cursor: isReadOnly ? 'not-allowed' : 'pointer'
  }),
  textarea: (isReadOnly = false) => ({
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    background: isReadOnly ? '#f9fafb' : 'white',
    resize: 'vertical' as const,
    fontFamily: 'inherit'
  }),
  grid: (columns = 2) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: '16px'
  }),
  fieldError: {
    color: '#ef4444',
    fontSize: '12px',
    marginTop: '4px'
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    cursor: 'pointer'
  }
};
