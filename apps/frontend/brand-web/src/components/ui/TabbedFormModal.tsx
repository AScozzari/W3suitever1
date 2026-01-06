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
        backdropFilter: 'blur(0.25rem)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.25rem'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid="tabbed-modal-overlay"
    >
      <div style={{
        background: 'white',
        borderRadius: '1rem',
        width: '100%',
        maxWidth: '56.25rem',
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1.5625rem 3.125rem -0.75rem rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '0.0625rem solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: `linear-gradient(135deg, ${iconGradient.split(',')[0]?.replace('linear-gradient(135deg,', '').trim() || 'rgba(99, 102, 241, 0.05)'}, rgba(255,255,255,0.95))`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '2.75rem',
              height: '2.75rem',
              borderRadius: '0.75rem',
              background: iconGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0.25rem 0.75rem rgba(0,0,0,0.15)'
            }}>
              <Icon size={22} style={{ color: 'white' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                {title}
              </h2>
              {subtitle && (
                <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0.125rem 0 0 0' }}>
                  {subtitle}
                </p>
              )}
              {headerBadge}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '2.25rem',
              height: '2.25rem',
              borderRadius: '0.5rem',
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
          gap: '0.5rem',
          padding: '0.75rem 1.5rem',
          background: '#fafafa',
          borderBottom: '0.0625rem solid #e5e7eb',
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
                  gap: '0.375rem',
                  padding: '0.5rem 0.875rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: isActive ? iconGradient : 'white',
                  color: isActive ? 'white' : '#6b7280',
                  fontSize: '0.8125rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive 
                    ? '0 0.125rem 0.5rem rgba(0,0,0,0.2)'
                    : '0 0.0625rem 0.125rem rgba(0,0,0,0.05)',
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
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '0.5rem',
              marginBottom: '1.25rem',
              color: '#ef4444',
              fontSize: '0.875rem'
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          {activeTabContent}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '0.0625rem solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          background: '#fafafa'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.625rem 1.25rem',
              background: 'white',
              color: '#374151',
              border: '0.0625rem solid #e5e7eb',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
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
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                background: saving ? '#9ca3af' : iconGradient,
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 0.125rem 0.5rem rgba(0,0,0,0.15)'
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

export const formStyles = {
  label: {
    display: 'block',
    marginBottom: '0.375rem',
    fontSize: '0.8125rem',
    fontWeight: '500' as const,
    color: '#374151'
  },
  input: (hasError = false, isValid = false, isReadOnly = false) => ({
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: `0.0625rem solid ${hasError ? '#ef4444' : isValid ? '#10b981' : '#e5e7eb'}`,
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    outline: 'none',
    background: isReadOnly ? '#f9fafb' : 'white',
    transition: 'border-color 0.2s'
  }),
  select: (isReadOnly = false) => ({
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '0.0625rem solid #e5e7eb',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    outline: 'none',
    background: isReadOnly ? '#f9fafb' : 'white',
    cursor: isReadOnly ? 'not-allowed' : 'pointer'
  }),
  textarea: (isReadOnly = false) => ({
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '0.0625rem solid #e5e7eb',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    outline: 'none',
    background: isReadOnly ? '#f9fafb' : 'white',
    resize: 'vertical' as const,
    fontFamily: 'inherit'
  }),
  grid: (columns = 2) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: '1rem'
  }),
  fieldError: {
    color: '#ef4444',
    fontSize: '0.75rem',
    marginTop: '0.25rem'
  },
  sectionTitle: {
    fontSize: '0.9375rem',
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    cursor: 'pointer'
  }
};
