# Overview

W3 Suite is a multi-tenant enterprise platform offering a comprehensive business management solution. It integrates CRM, POS, Warehouse, Analytics, HR, CMS, and Bidding modules within a structured monorepo. The platform features a WindTre glassmorphism design, OAuth2/OIDC with MFA, and PostgreSQL with Row Level Security for tenant isolation. A complementary Brand Interface HQ system provides centralized control and cross-tenant management. The project's ambition is to deliver a scalable, secure, and robust platform catering to diverse business needs.

# User Preferences

## CRITICAL RULES - VIOLAZIONE = ERRORE

### 1. DATABASE SCHEMA LOCATION (OBBLIGATORIO)
**❌ NEVER create shared/ folder - IT DOES NOT EXIST**
**❌ NEVER reference shared/schema.ts - IT DOES NOT EXIST**

#### Correct Schema Location:
- ✅ **ALWAYS** use: `apps/backend/api/src/db/schema/`
- ✅ **w3suite.ts** = Tenant-specific tables (users, stores, roles, HR tables with RLS)
- ✅ **public.ts** = Shared reference data (countries, cities, payment methods - no tenant)
- ✅ **brand-interface.ts** = Brand HQ system tables

#### Correct Import Pattern:
```typescript
// ✅ CORRECT
import { users, stores, leaveRequests } from '@/db/schema/w3suite';
import { countries, paymentMethods } from '@/db/schema/public';
import { brandTenants } from '@/db/schema/brand-interface';

// ❌ WRONG - WILL FAIL
import { users } from '@shared/schema'; // DOES NOT EXIST
import { users } from 'shared/schema.ts'; // DOES NOT EXIST
```

### 2. FRONTEND CONSISTENCY (OBBLIGATORIO)
- ✅ **ALL pages MUST use Layout** with header and sidebar
- ✅ **ALWAYS use @w3suite/frontend-kit** templates FIRST
- ✅ **ALWAYS use shadcn/ui** components before creating custom
- ❌ **NO custom components** if already exists in frontend-kit
- ❌ **NO inline styles** - use CSS variables from design-system
- ❌ **NO standalone pages** without Layout (except Login)

- Preferred communication style: Simple, everyday language
- **UI/UX CONSISTENCY RULE**: Tutte le pagine devono mantenere la struttura dell'app con header e sidebar
- **PAGE STRUCTURE**: Non creare pagine indipendenti, integrare contenuto nella dashboard esistente
- **BACKGROUND RULE**: Tutte le pagine devono avere sfondo bianco (#ffffff) con header e sidebar
- **DATABASE ARCHITECTURE**: Always use 3-schema structure (w3suite, public, brand_interface)
- **COMPONENT-FIRST APPROACH (OBBLIGATORIO)**:
  1. **SEMPRE shadcn/ui FIRST** - Check 48 componenti disponibili prima di creare custom
  2. **Copy & Paste workflow** - `npx shadcn@latest add [component-name]`
  3. **No component reinvention** - usa Button, Card, Dialog, Form, Table esistenti
  4. **Accessibility built-in** - Radix primitives garantiscono WCAG compliance
- **ITALIAN BUSINESS VALIDATION (OBBLIGATORIO PER TUTTI I MODAL)**:
  📧 **Email**: Validazione RFC standard con formatting automatico lowercase
  🏢 **PEC Email**: Domini certificati (.pec.it, .legalmail.it, .postacert.it, .ingpec.eu, etc.)
  🔢 **Partita IVA**: Formato IT + 11 cifre con algoritmo checksum italiano completo
  📋 **Codice Fiscale**: 16 caratteri con validazione formato e checksum italiano
  📱 **Telefono**: Formato italiano (+39) con auto-formatting e validazione lunghezza
  💳 **IBAN**: Validazione formato internazionale con algoritmo checksum MOD-97
  🌐 **Website**: Validazione URL HTTP/HTTPS con formato corretto
  🏛️ **BIC/SWIFT**: Codice bancario internazionale 8-11 caratteri
  📍 **Indirizzi**: Validazione CAP italiano (5 cifre) e province (2 caratteri)
- **VALIDATION IMPLEMENTATION RULES**:
  - **Real-time feedback**: Bordi verdi (successo) / rossi (errore) con messaggi
  - **Italian language**: Tutti i messaggi di errore in italiano
  - **Zod schemas**: Usare `apps/frontend/web/src/lib/validation/italian-business-validation.ts`
  - **Auto-formatting**: Maiuscolo per codici fiscali, formattazione telefoni
  - **Visual indicators**: Campi obbligatori con asterisco rosso (*)
- **ERROR PREVENTION**:
  ❌ **Non fare**: Inline hex colors (#ff6900)
  ❌ **Non fare**: Custom components quando shadcn esiste
  ❌ **Non fare**: White/solid backgrounds without glassmorphism
  ❌ **Non fare**: Text su background colorati senza contrast check
  ✅ **Fai sempre**: CSS variables, component reuse, accessibility, mobile-first
- **REGOLA**: Usare SEMPRE questi prefissi nei prompt per evitare ambiguità su quale scope lavorare:
  - **`[W3]`** = WindTre Suite (tenant-facing app)
  - **`[BRAND]`** = Brand Interface (HQ system)
  - **`[w3suite]`** = Schema tenant-specific (users, tenants, stores, roles, etc.)
  - **`[PUBLIC]`** = Schema dati riferimento (commercial_areas, countries, channels, etc.)
  - **`[brand_interface]`** = Schema Brand Interface (brand_users, brand_tenants, etc.)

## 🎯 FRONTEND-KIT USAGE (OBBLIGATORIO)
**Always use @w3suite/frontend-kit package for rapid development:**

### Available Templates (Copy & Customize):
- **ListPageTemplate**: For data tables and lists with sorting/filtering
- **FormPageTemplate**: For create/edit forms with validation
- **DashboardTemplate**: For metrics dashboards with charts
- **DetailPageTemplate**: For viewing entity details with tabs
- **SettingsPageTemplate**: For configuration pages with sections
- **EmptyPageTemplate**: For empty states with actions
- **SafePageShell**: Error boundary wrapper for all pages

### Development Workflow:
1. **ALWAYS START WITH A TEMPLATE** - Never create pages from scratch
2. **Copy the appropriate template** from packages/frontend-kit/templates/
3. **Customize with your data** - Change endpoints, columns, fields
4. **Use existing blocks** - DataTable, StatsCard, PageHeader, etc.
5. **Apply design tokens** - Use CSS variables from frontend-kit

### Import Pattern:
```typescript
// CORRECT - Import from frontend-kit
import { ListPageTemplate } from '@w3suite/frontend-kit/templates';
import { DataTable } from '@w3suite/frontend-kit/components/blocks';
import { glassmorphism } from '@w3suite/frontend-kit/design-system';

// WRONG - Don't recreate components
const MyTable = () => { /* custom implementation */ }
```

### CSS Variables Available:
- `--brand-orange`: WindTre orange (#FF6900 in HSL)
- `--brand-purple`: WindTre purple (#7B2CBF in HSL)
- `--glass-bg`: Glassmorphism background
- `--glass-border`: Glassmorphism border
- Spacing: `--space-xs`, `--space-sm`, `--space-md`, `--space-lg`
- Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-lg`

### Component Blocks Available:
- **DataTable**: Complete table with sort/filter/pagination
- **StatsCard**: Metric display with trend
- **PageHeader**: Standard page header
- **EmptyState**: Empty data display
- **ErrorState**: Error display
- **LoadingState**: Loading skeletons
- **FormSection**: Form with validation
- **SearchBar**: Search with filters
- **ActionBar**: Actions toolbar

### Shadcn/UI Components (31 total):
All components available in apps/frontend/web/src/components/ui/:
accordion, alert-dialog, alert, avatar, badge, button, calendar, card, checkbox, command, dialog, dropdown-menu, form, hover-card, input, label, navigation-menu, popover, progress, radio-group, scroll-area, select, separator, sheet, skeleton, switch, table, tabs, textarea, toast, tooltip

### DEVELOPMENT RULES:
1. **NO custom components** when frontend-kit has one
2. **NO inline styles** - use design tokens
3. **NO custom layouts** - use templates
4. **ALWAYS data-testid** on interactive elements
5. **ALWAYS use TypeScript** interfaces

### Error Prevention:
- ✅ Check frontend-kit first before creating anything
- ✅ Use templates to avoid structural issues
- ✅ Import from @w3suite/frontend-kit, not create new
- ❌ Never duplicate existing components
- ❌ Never use hex colors directly - use CSS variables

# System Architecture

The project employs an enterprise monorepo structure, separating `W3 Suite` (tenant-facing applications) from a centralized `Brand Interface HQ system`. An embedded Nginx reverse proxy, managed by a Node.js master process, directs traffic to internal services, including frontend and backend applications for both W3 Suite and Brand Interface.

## Monorepo Structure:
- **`apps/`**: Contains frontend/backend services, workers, and edge renderers.
- **`packages/`**: Hosts shared libraries (UI, tokens, SDK, DWH, CMS).
- **`db/`**: Dedicated to database migration scripts.

## UI/UX Design:
- **Glassmorphism WindTre Design System**: Utilizes WindTre branding, colors, and glassmorphism effects.
- **Component-First Approach**: Leverages `shadcn/ui` for consistency and accessibility, extended with CSS variables and Tailwind CSS.
- **Typography**: Uses Inter (primary) and JetBrains Mono (monospaced).
- **Branding**: Supports tenant-customizable logos and color schemes.

## Technical Implementations:
- **Database Architecture**: 3-schema structure (`w3suite`, `public`, `brand_interface`) for data isolation and management.
- **Security**: OAuth2/OIDC with MFA, JWTs, PostgreSQL Row Level Security (RLS) for multitenancy, and granular Role-Based Access Control (RBAC).
- **Multitenancy**: Achieved via RLS, a `TenantProvider`, and global unique constraints.
- **Organizational Hierarchy**: Manages relationships among TENANTs, Legal Entities, Sales Points, and Users.
- **Brand Interface Features**: Centralized Super Admin, cross-tenant campaign/pricing management, and event propagation via BullMQ.
- **Data Architecture Patterns**:
    - **Brand Base + Tenant Override**: For collaboratively managed entities (e.g., Suppliers, Products).
    - **Brand-Only**: For Brand-controlled entities (e.g., Stores, Legal Entities) with tenant read-only access.
- **Universal Workflow System**: A comprehensive approval hierarchy with 6 core database tables, supporting workflow-team separation, RBAC-integrated supervision, and event-driven state machines. Key features include a visual workflow builder, team-based supervision, progressive approval chains with escalation, dynamic runtime resolution, and audit trails.
- **Frontend Package Structure**: `@w3suite/frontend-kit` centralizes the design system, page templates, reusable component blocks, UI patterns, custom React hooks, and the `shadcn/ui` component library.
- **Unified Notification System**: Real-time notifications across 7 business categories (CRM, Finance, HR, Sales, Support, Operations, Marketing) with stable color-coded badges. It uses a hybrid Redis + WebSocket architecture with automatic PostgreSQL fallback for graceful degradation. `w3suite.notifications` table is extended for comprehensive management.

# External Dependencies

## Database Services
- **Replit Native PostgreSQL**: Managed PostgreSQL 16 by Replit (via Neon).

## Authentication Services
- **OAuth2/OIDC Enterprise**: For secure user authentication.

## UI Component Ecosystem
- **SHADCN/UI**: Primary UI component library.
- **Existing Project Components**: Custom components and design tokens within `packages/ui/` and `packages/tokens/`.

## Icon & Utility Libraries
- **Lucide React**: Icon library.
- **TanStack React Query**: For server state management.
- **React Hook Form**: Facilitates form handling.
- **Radix UI**: Provides headless component primitives for building accessible UI.

## Development Tools
- **Vite**: Frontend build tool.
- **Drizzle Kit**: For database schema management.
- **PostCSS**: CSS pre-processing.
- **ESBuild**: Server code bundling.

## Replit Platform Integration
- **Vite Plugin**: For runtime error modal and Cartographer integration.
- **Environment Detection**: Conditional plugin loading based on `REPL_ID`.
- **Development Banner**: Replit branding script.