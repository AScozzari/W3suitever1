// Settings Modal Components - Tabbed Form Design Pattern
// These modals provide a consistent UI/UX for entity creation and editing
// All use TabbedFormModal as the base component

export { default as UserFormModal } from './UserFormModal';
export { default as StoreFormModal } from './StoreFormModal';
export { default as LegalEntityFormModal } from './LegalEntityFormModal';
export { default as SupplierFormModal } from './SupplierFormModal';

// Re-export TabbedFormModal for custom implementations
export { default as TabbedFormModal, formStyles } from '../ui/TabbedFormModal';
export type { TabSection, TabbedFormModalProps } from '../ui/TabbedFormModal';
