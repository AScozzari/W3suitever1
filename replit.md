# Overview

W3 Suite is a multi-tenant enterprise platform within a structured monorepo, offering CRM, POS, Warehouse, Analytics, HR, CMS, and Bidding modules. It features a WindTre glassmorphism design, OAuth2/OIDC with MFA, PostgreSQL with Row Level Security, and a feature-first architecture. A separate Brand Interface HQ system provides centralized control and cross-tenant management. The project aims to deliver a scalable, secure, and comprehensive business management solution.

# User Preferences

# CRITICAL RULES - VIOLAZIONE = ERRORE

## 1. DATABASE SCHEMA LOCATION (OBBLIGATORIO)
**❌ NEVER create shared/ folder - IT DOES NOT EXIST**
**❌ NEVER reference shared/schema.ts - IT DOES NOT EXIST**

### Correct Schema Location:
- ✅ **ALWAYS** use: `apps/backend/api/src/db/schema/`
- ✅ **w3suite.ts** = Tenant-specific tables (users, stores, roles, HR tables with RLS)
- ✅ **public.ts** = Shared reference data (countries, cities, payment methods - no tenant)
- ✅ **brand-interface.ts** = Brand HQ system tables

### Correct Import Pattern:
```typescript
// ✅ CORRECT
import { users, stores, leaveRequests } from '@/db/schema/w3suite';
import { countries, paymentMethods } from '@/db/schema/public';
import { brandTenants } from '@/db/schema/brand-interface';

// ❌ WRONG - WILL FAIL
import { users } from '@shared/schema'; // DOES NOT EXIST
import { users } from 'shared/schema.ts'; // DOES NOT EXIST
```

## 2. FRONTEND CONSISTENCY (OBBLIGATORIO)
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
- **MODAL VALIDATION STATUS** (Updated: December 2024):
  ✅ **Modal Fornitori**: Tutte le validazioni implementate con feedback real-time
  ✅ **Modal Ragioni Sociali**: Campi business chiave validati (P.IVA, CF, PEC)
  ✅ **Modal Punti Vendita**: Validazioni complete implementate (email, telefono, social media)
  ✅ **Modal Utenti**: Validazioni email e telefono italiane implementate
  ✅ **Comprehensive Coverage**: Tutti i modal principali hanno validazioni complete
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

### Time Savings:
| Task | Old Way | With Frontend-kit |
|------|---------|------------------|
| List Page | 2-3 hours | 15 minutes |
| Dashboard | 3-4 hours | 20 minutes |
| Form Page | 2 hours | 10 minutes |
| Settings | 2 hours | 15 minutes |

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

The project employs an enterprise monorepo structure, separating tenant-facing applications (W3 Suite) from a centralized Brand Interface HQ system.

**Embedded Nginx Architecture:**
A Node.js master process orchestrates an embedded Nginx reverse proxy, routing traffic to internal services:
- W3 Suite Frontend (Port 3000)
- W3 Suite Backend (Port 3004)
- Brand Frontend (Port 3001)
- Brand Backend (Port 3002)

**Monorepo Structure:**
- **`apps/`**: Contains `frontend/web/` (W3 Suite SPA), `frontend/brand-web/` (Brand Interface SPA), `backend/api/` (W3 Suite API), `backend/brand-api/` (Brand Interface API), `backend/workers/brand-propagation/` (BullMQ consumer), and `backend/cms-render/` (Edge renderer).
- **`packages/`**: Shared libraries including `ui/` (Design system), `tokens/` (Tailwind preset), `sdk/` (TypeScript client SDKs), `dwh/`, `cms-core/`, `cms-render/`, and `agents/`.
- **`db/`**: Database migration scripts.

**UI/UX Design:**
- **Glassmorphism WindTre Design System**: Utilizes brand colors (#FF6900, #7B2CBF) and glassmorphism effects.
- **Component-First Approach**: Prioritizes `shadcn/ui` components for consistency and accessibility, complemented by CSS variables and Tailwind CSS.
- **Typography**: Inter (primary) and JetBrains Mono (monospaced).
- **Branding**: Supports tenant-customizable logos and colors.

**Technical Implementations:**
- **Database Architecture**: A 3-schema structure (`w3suite`, `public`, `brand_interface`) for data isolation and management.
- **Security**: OAuth2/OIDC with MFA, JWTs, PostgreSQL RLS for tenant isolation, and granular RBAC.
- **Multitenancy**: RLS at the database level, `TenantProvider` for context, and global unique constraints.
- **Organizational Hierarchy**: Defines relationships between TENANTs, RAGIONI SOCIALI (Legal Entities), PUNTI VENDITA (Sales Points), and RISORSE (Users).
- **Brand Interface Features**: Centralized Super Admin, cross-tenant campaign/pricing management, and event propagation via BullMQ.
- **Data Architecture Patterns**:
    - **Brand Base + Tenant Override**: For entities managed by both Brand and Tenants (e.g., Suppliers, Products), using a base table and an override table.
    - **Brand-Only**: For entities exclusively managed by Brand (e.g., Stores, Legal Entities), with tenant read-only access controlled by `assigned_tenants` array.

## HR System Tables (in w3suite schema)
The following HR tables are available in `apps/backend/api/src/db/schema/w3suite.ts`:
- **calendarEvents** - Employee calendar and events
- **timeTracking** - Clock in/out and time tracking  
- **leaveRequests** - Vacation and leave management
- **shifts** - Shift scheduling
- **shiftTemplates** - Recurring shift patterns
- **hrDocuments** - Employee documents  
- **expenseReports** - Expense management
- **expenseItems** - Individual expense items
- **employeeBalances** - Leave and time balances
- **hrAnnouncements** - Company announcements

**Frontend Package Structure:**
- **@w3suite/frontend-kit**: Centralized frontend package with:
  - Design system with WindTre tokens and glassmorphism
  - 7 page templates for rapid development
  - 9 reusable component blocks
  - 3 UI patterns (forms, search, actions)
  - 3 custom React hooks
  - Complete shadcn/ui component library (31 components)
  
## Database Schema Import Reference
**ALWAYS import from the correct schema location:**
- Schema files are located in `apps/backend/api/src/db/schema/`
- Use TypeScript path aliases like `@/db/schema/w3suite` or direct imports
- NEVER create or reference a shared/ folder - it does not exist in this project

# External Dependencies

## Database Services
- **Replit Native PostgreSQL**: Built-in PostgreSQL 16 managed by Replit (via Neon).

## Authentication Services
- **OAuth2/OIDC Enterprise**: For user authentication.

## UI Component Ecosystem
- **SHADCN/UI**: Primary UI component library.
- **Existing Project Components**: Custom components in `packages/ui/` and `packages/tokens/`.

## Icon & Utility Libraries
- **Lucide React**: Icon library.
- **TanStack React Query**: Server state management.
- **React Hook Form**: Form handling.
- **Radix UI**: Headless component primitives.

## Development Tools
- **Vite**: Frontend build tool.
- **Drizzle Kit**: Database schema management.
- **PostCSS**: CSS processing.
- **ESBuild**: Server code bundling.

## Replit Platform Integration
- **Vite Plugin**: For runtime error modal and cartographer integration.
- **Environment Detection**: Conditional plugin loading based on `REPL_ID`.
- **Development Banner**: Replit branding script.