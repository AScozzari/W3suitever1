# @w3suite/frontend-kit

Centralized frontend components, templates, and design system for W3 Suite applications.

## 🎨 Design System

The package includes a complete design system with:
- **CSS Tokens**: WindTre brand colors, spacing, shadows
- **Glassmorphism**: Modern glass effects for UI elements
- **Animations**: Standard animation classes

## 📦 Components

### Blocks
Ready-to-use component blocks:
- `DataTable` - Complete table with sorting, filtering, pagination
- `StatsCard` - Metrics display with trends
- `PageHeader` - Standard page header with breadcrumbs
- `EmptyState` - Empty state displays
- `ErrorState` - Error handling UI
- `LoadingState` - Loading skeletons and spinners

### Patterns
Common UI patterns:
- `FormSection` - Form wrapper with validation
- `SearchBar` - Search with filters and suggestions
- `ActionBar` - Actions toolbar with bulk operations

## 📄 Templates

Pre-built page templates for rapid development:
- `ListPageTemplate` - For list/table pages
- `SafePageShell` - Error boundary wrapper

## 🪝 Hooks

Reusable React hooks:
- `useDebounce` - Debounce values and callbacks
- `useLocalStorage` - Persist state to localStorage
- `usePagination` - Complete pagination logic

## 💅 Usage

### Import Components
```tsx
import { DataTable, StatsCard, PageHeader } from '@w3suite/frontend-kit';
```

### Import Design System
```css
@import '@w3suite/frontend-kit/design-system/index.css';
```

### Use Templates
```tsx
import { ListPageTemplate, SafePageShell } from '@w3suite/frontend-kit/templates';

function MyPage() {
  return (
    <SafePageShell>
      <ListPageTemplate
        title="My Items"
        columns={columns}
        data={data}
      />
    </SafePageShell>
  );
}
```

## 🎨 WindTre Brand Colors

- Primary (Orange): `#FF6900`
- Secondary (Purple): `#7B2CBF`
- White: `#FFFFFF`
- Black: `#1A1A1A`

## 📝 Notes

- All components are fully typed with TypeScript
- Components include proper `data-testid` attributes for testing
- Glassmorphism effects are optimized for performance
- Templates handle loading, error, and empty states automatically