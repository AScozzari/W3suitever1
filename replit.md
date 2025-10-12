# Overview

W3 Suite is a multi-tenant enterprise platform designed for comprehensive business management, integrating modules like CRM, POS, Warehouse, Analytics, HR, CMS, and Bidding. Built as a monorepo, it features a unique WindTre glassmorphism design, robust OAuth2/OIDC security with MFA, and PostgreSQL with Row Level Security (RLS) for stringent tenant isolation. The platform includes a Brand Interface HQ system for centralized control and cross-tenant management, aiming to provide a scalable, secure, and complete solution for diverse business needs.

# User Preferences

### 1. DATABASE SCHEMA LOCATION (OBBLIGATORIO)
**❌ NEVER create shared/ folder - IT DOES NOT EXIST**
**❌ NEVER reference shared/schema.ts - IT DOES NOT EXIST**

#### ✅ CLEAN ARCHITECTURE:
- 🎯 **ALWAYS** use: `apps/backend/api/src/db/schema/`
- 🏢 **w3suite.ts** = Tenant-specific tables (users, stores, roles, HR tables with RLS)
- 🌐 **public.ts** = Shared reference data (countries, cities, payment methods - no tenant)
- 🎯 **brand-interface.ts** = Brand HQ system tables
- 📋 **index.ts** = ONLY backward compatibility re-exports (NO new definitions)

#### ✅ SCHEMA POSITIONING RULES:
```typescript
// 🏢 W3SUITE SCHEMA - Tenant Data (RLS Enabled)
- tenants, users, legalEntities, stores
- roles, rolePerms, userAssignments
- customers, leads, products, inventory (CRM/Warehouse)
- HR: calendarEvents, shifts, leaveRequests, timeTracking
- AI: aiSettings, aiConversations, aiUsageLogs
- notifications, structuredLogs, entityLogs
- webhookEvents, webhookSignatures (centralized webhook system)

// 🌐 PUBLIC SCHEMA - Reference Data (NO RLS)
- brands, channels, commercialAreas, drivers
- countries, italianCities, legalForms
- paymentMethods, paymentMethodsConditions

// 🎯 BRAND_INTERFACE SCHEMA - Brand HQ (Brand RLS)
- brandTenants, brandUsers, brandRoles
- brandCampaigns, brandPriceLists, brandTemplates
```

#### ✅ Correct Import Pattern:
```typescript
// ✅ CORRECT - Direct from canonical schema
import { users, stores, leaveRequests } from './db/schema/w3suite';
import { countries, paymentMethods } from './db/schema/public';
import { brandTenants } from './db/schema/brand-interface';

// ✅ ACCEPTABLE - Backward compatibility (index.ts re-exports)
import { users, stores } from './db/schema'; // Re-exported from w3suite
import { brands, channels } from './db/schema'; // Re-exported from public

// ❌ WRONG - OBSOLETE FILES REMOVED
import { users } from './db/schema/core'; // FILE REMOVED 2024/09/24
import { roles } from './db/schema/rbac'; // FILE REMOVED 2024/09/24
import { stores } from './db/schema/organization'; // NEVER EXISTED
```

#### 🚫 FORBIDDEN ACTIONS:
- **NEVER** create duplicate enum definitions across schema files
- **NEVER** create duplicate table definitions across schema files
- **NEVER** define new tables in `index.ts` (only re-exports allowed)
- **NEVER** import from removed files: `core.ts`, `rbac.ts`, `organization.ts`

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

## Monorepo Structure
The project is structured as a monorepo with:
- **`apps/`**: Contains frontend/backend services, workers, and edge renderers.
- **`packages/`**: Houses shared libraries, including UI components, design tokens, SDKs, and DWH/CMS components.
- **`db/`**: Dedicated to database migration scripts.

## UI/UX Design
The UI/UX adheres to a **Glassmorphism WindTre Design System**, integrating WindTre branding, colors, and glassmorphism effects. It follows a **Component-First Approach**, utilizing `shadcn/ui` for consistency and accessibility, enhanced with CSS variables and Tailwind CSS.

## Technical Implementations
- **Database Architecture**: Implements a 3-schema structure (`w3suite`, `public`, `brand_interface`) with PostgreSQL Row Level Security (RLS) for robust multitenancy.
- **Security**: Features OAuth2/OIDC with MFA, JWTs, and Role-Based Access Control (RBAC) with a 3-level security hierarchy (Scope Definition, RBAC Permissions, Workflow Hierarchy). Scope Validation Ibrida (Defense in Depth) uses RBAC Middleware and Executor Scope Validation.
- **Multitenancy**: Achieved via RLS, a `TenantProvider`, and global unique constraints.
- **Universal Workflow System**: Supports approval hierarchies, RBAC-integrated supervision, event-driven state machines, a visual workflow builder, and audit trails for both synchronous and asynchronous execution.
- **Frontend Package (`@w3suite/frontend-kit`)**: Centralizes the design system, page templates, reusable components, UI patterns, and custom React hooks, integrating `shadcn/ui`.
- **Unified Notification System**: Real-time notifications leveraging Redis + WebSockets with PostgreSQL fallback.
- **Centralized Webhook System**: An enterprise-grade system with multi-provider support, queueing, deduplication, and audit trail.
- **Task Management System**: A flexible task system with optional workflow integration and RBAC-protected API.
- **MCP Multi-Provider OAuth System**: Manages unified credentials across various third-party services with per-user OAuth isolation.
- **AI Enforcement Middleware System**: Provides hierarchical API-level blocking of AI features based on tenant and agent flags.
- **AI Workflow Builder with JSON Mode**: Generates natural language workflows using OpenAI `gpt-4o` with strict JSON mode and ReactFlow DSL output.
- **Intelligent Workflow Routing System**: Offers dual-mode routing (auto/manual) for team and user assignments.
- **AI Tools Ecosystem with PDC Analyzer**: A centralized dashboard for AI tools, including PDC Analyzer for automated PDF contract analysis using GPT-4, extracting data and mapping services to WindTre product hierarchy.
- **CRM Module Backend**: A comprehensive CRM backend with 20 tables in the `w3suite` schema, featuring a person-centric identity graph, omnichannel engagement tracking, pipeline management, GDPR-compliant consent, and lead-to-deal conversion workflows. It provides 25 RESTful endpoints with Zod validation, RLS, and structured logging.

# External Dependencies

## Database Services
-   **Replit Native PostgreSQL**: Managed PostgreSQL 16 (via Neon).
-   **Redis**: For BullMQ and the Unified Notification System.

## Authentication Services
-   **OAuth2/OIDC Enterprise**: For secure user authentication.

## UI Component Ecosystem
-   **SHADCN/UI**: Primary UI component library.
-   **Radix UI**: Provides headless component primitives for building accessible UI.

## Icon & Utility Libraries
-   **Lucide React**: Icon library.
-   **TanStack React Query**: For server state management.
-   **React Hook Form**: Facilitates form handling.

## Development Tools
-   **Vite**: Frontend build tool.
-   **Drizzle Kit**: For database schema management.
-   **PostCSS**: CSS pre-processing.
-   **ESBuild**: Server code bundling.
-   **Nginx**: Reverse proxy.

## AI Services
-   **OpenAI**: Used for AI Workflow Builder and PDC Analyzer (`gpt-4o`).

## Third-Party Integrations (OAuth Providers)
-   **Google Workspace**
-   **AWS**
-   **Meta/Instagram**
-   **Microsoft 365**
-   **Stripe**
-   **GTM/Analytics**