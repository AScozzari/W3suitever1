# Overview

W3 Suite is a multi-tenant enterprise platform for comprehensive business management, integrating CRM, POS, Warehouse, Analytics, HR, CMS, and Bidding modules within a monorepo. It features a WindTre glassmorphism design, robust security via OAuth2/OIDC with MFA, and PostgreSQL with Row Level Security (RLS) for tenant isolation. The platform includes the Brand Interface HQ system for centralized control and cross-tenant management, aiming to provide a scalable, secure, and robust solution for diverse business needs.

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

The project employs an enterprise monorepo structure, separating tenant-facing applications (`W3 Suite`) from a centralized `Brand Interface HQ system`, with traffic routed via an Nginx reverse proxy.

## Monorepo Structure:
- **`apps/`**: For frontend/backend services, workers, and edge renderers.
- **`packages/`**: For shared libraries (UI, design tokens, SDK, DWH, CMS).
- **`db/`**: For database migration scripts.

## UI/UX Design:
- **Glassmorphism WindTre Design System**: Incorporates WindTre branding, colors, and glassmorphism effects.
- **Component-First Approach**: Leverages `shadcn/ui` for consistency and accessibility, extended with CSS variables and Tailwind CSS.
- **Typography**: Uses Inter (primary) and JetBrains Mono (monospaced).
- **Branding**: Supports tenant-customizable logos and color schemes.

## Technical Implementations:
- **Database Architecture**: 3-schema structure (`w3suite`, `public`, `brand_interface`) with PostgreSQL Row Level Security (RLS) for multitenancy.
- **Security**: OAuth2/OIDC with MFA, JWTs, and Role-Based Access Control (RBAC).
- **Multitenancy**: Achieved through RLS, a `TenantProvider`, and global unique constraints.
- **Universal Workflow System**: Features approval hierarchy, workflow-team separation, RBAC-integrated supervision, event-driven state machines, a visual workflow builder, and audit trails. Supports synchronous and asynchronous execution (BullMQ with Redis).
- **Frontend Package (`@w3suite/frontend-kit`)**: Centralizes the design system, page templates, reusable components, UI patterns, custom React hooks, and the `shadcn/ui` library.
- **Unified Notification System**: Real-time notifications using Redis + WebSocket with PostgreSQL fallback.
- **Centralized Webhook System**: Enterprise webhook receiver with multi-provider support, Redis queue, priority worker, deduplication, workflow engine integration, and audit trail.
- **Task Management System**: Flexible task system with optional workflow integration, RBAC-protected API, and feature-rich frontend.
- **MCP Multi-Provider OAuth System**: Unified credential management supporting Google Workspace, AWS, Meta/Instagram, Microsoft 365, Stripe, and GTM/Analytics with per-user OAuth isolation.
- **AI Enforcement Middleware System**: Hierarchical API-level blocking when AI features are disabled, intercepting requests and checking tenant-level `isActive` and agent-specific `isEnabled` flags using raw SQL queries to bypass RLS for settings access.
- **AI Workflow Builder with JSON Mode**: Natural language workflow generation using OpenAI `gpt-4o` with strict JSON mode, system prompt override, disabled tools, and ReactFlow DSL generation with Zod validation, supporting Italian prompts.
- **Intelligent Workflow Routing System**: Dual-mode routing (auto/manual) for team and user assignments.
- **AI Tools Ecosystem with PDC Analyzer**: Centralized AI tools dashboard with modular tool architecture. PDC (Proposta di Contratto) Analyzer provides automated PDF contract analysis using GPT-4, extracting customer data and service mapping with WindTre product hierarchy integration. Features multi-tenant training dataset, session management, human review workflow, and JSON export for cashier API integration.

# External Dependencies

## Database Services
- **Replit Native PostgreSQL**: Managed PostgreSQL 16 by Replit (via Neon).
- **Redis**: Used for BullMQ (workflow engine) and Unified Notification System.

## Authentication Services
- **OAuth2/OIDC Enterprise**: For secure user authentication.

## UI Component Ecosystem
- **SHADCN/UI**: Primary UI component library.
- **Radix UI**: Provides headless component primitives for building accessible UI.

## Icon & Utility Libraries
- **Lucide React**: Icon library.
- **TanStack React Query**: For server state management.
- **React Hook Form**: Facilitates form handling.

## Development Tools
- **Vite**: Frontend build tool.
- **Drizzle Kit**: For database schema management.
- **PostCSS**: CSS pre-processing.
- **ESBuild**: Server code bundling.
- **Nginx**: Reverse proxy.

## AI Services
- **OpenAI**: Used for AI Workflow Builder and PDC Analyzer (`gpt-4o`).

## Third-Party Integrations (OAuth Providers)
- **Google Workspace**
- **AWS**
- **Meta/Instagram**
- **Microsoft 365**
- **Stripe**
- **GTM/Analytics**

## Replit Platform Integration
- **Vite Plugin**: For runtime error modal and Cartographer integration.
- **Environment Detection**: Conditional plugin loading based on `REPL_ID`.
- **Development Banner**: Replit branding script.