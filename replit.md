# Overview
W3 Suite is a multi-tenant enterprise platform centralizing core business operations like CRM, POS, WMS, Analytics, HR, CMS, and Bidding. It features a WindTre glassmorphism design, robust OAuth2/OIDC security with MFA, and employs PostgreSQL with Row Level Security (RLS) for strong tenant isolation. The platform includes a central Brand Interface HQ system for multi-brand management, aiming to be a scalable, secure, and comprehensive business solution that drives efficiency and market potential.

# User Preferences

### DATABASE SCHEMA LOCATION (OBBLIGATORIO)
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
```

#### 🚫 FORBIDDEN ACTIONS:
- **NEVER** create duplicate enum definitions across schema files
- **NEVER** create duplicate table definitions across schema files
- **NEVER** define new tables in `index.ts` (only re-exports allowed)
- **NEVER** import from removed files: `core.ts`, `rbac.ts`, `organization.ts`

### ROUTING & NAVIGATION (CRITICAL - OBBLIGATORIO)
**🚨 CRITICAL BUG PREVENTION: Double Tenant Slug in URLs**

#### ✅ ALWAYS use `useTenantNavigation` hook:
```typescript
import { useTenantNavigation } from '@/hooks/useTenantSafety';

const { buildUrl, navigate } = useTenantNavigation();

// ✅ CORRECT - Navigation tabs
const tabs = [
  { path: buildUrl('crm/leads') },      // → /staging/crm/leads
  { path: buildUrl('crm/pipeline') }    // → /staging/crm/pipeline
];

// ✅ CORRECT - Links with dynamic params
<Link href={buildUrl(`crm/customers/${id}`)}>View</Link>

// ✅ CORRECT - Programmatic navigation
navigate('crm/analytics');
setLocation(buildUrl('crm/dashboard'));
```

#### ❌ FORBIDDEN - Template Literals with tenantSlug:
```typescript
// ❌ WRONG - Causes double slug (/staging/staging/crm/leads)
const tenantSlug = window.location.pathname.split('/')[1];
const tabs = [
  { path: `/${tenantSlug}/crm/leads` }  // BUG!
];

// ❌ WRONG - Direct template literals
<Link href={`/${tenantSlug}/crm/customers/${id}`}>  // BUG!
setLocation(`/${tenantSlug}/crm/dashboard`);        // BUG!
```

#### 🔍 Why This Matters:
When you're already on `/staging/crm/leads` and click a tab with `path: /${tenantSlug}/crm/leads`:
1. `tenantSlug` extracts "staging" from current URL
2. Creates path `/staging/crm/leads`
3. Wouter navigation APPENDS to current path → `/staging/staging/crm/leads` ❌

**Solution**: `buildUrl()` intelligently handles tenant context, preventing double slugs.

### FRONTEND CONSISTENCY (OBBLIGATORIO)
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
  - **`[PUBLIC]` = Schema dati riferimento (commercial_areas, countries, channels, etc.)
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
import { DataTable } => '@w3suite/frontend-kit/components/blocks';
import { glassmorphism } from '@w3suite/frontend-kit/design-system';
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

## UI/UX Decisions
The UI/UX adheres to a Glassmorphism WindTre Design System, leveraging `shadcn/ui` for consistency and accessibility. The `@w3suite/frontend-kit` package centralizes design tokens, page templates, reusable components, UI patterns, and custom React hooks, all styled with CSS variables and Tailwind CSS.

## Technical Implementations
- **Monorepo Structure**: Centralized code organization.
- **Database Architecture**: 3-schema approach (`w3suite`, `public`, `brand_interface`) with PostgreSQL RLS for multitenancy.
- **Security**: OAuth2/OIDC, MFA, JWTs, and 3-level RBAC.
- **Multitenancy**: Achieved via RLS, `TenantProvider`, and global unique constraints.
- **Universal Workflow System**: Approval hierarchies, RBAC, event-driven state machines, audit trails.
- **Unified Notification System**: Real-time notifications.
- **Centralized Webhook System**: Enterprise-grade with multi-provider support, queueing, deduplication.
- **Task Management System**: Flexible task creation with workflow integration and RBAC API.
- **MCP Multi-Provider OAuth System**: Manages unified credentials for third-party services with per-user OAuth isolation.
- **AI Enforcement Middleware**: Hierarchical API-level blocking for AI features.
- **AI Workflow Builder**: Generates natural language workflows using OpenAI `gpt-4o` in strict JSON mode, outputting ReactFlow DSL.
- **Intelligent Workflow Routing**: Dual-mode (automatic/manual) task assignment.
- **AI Tools Ecosystem with PDC Analyzer**: Dashboard for AI tools, including automated PDF contract analysis (GPT-4).
- **CRM Module Backend**: Person-centric identity graph, omnichannel engagement, pipeline management, GDPR compliance, lead-to-deal workflows, RESTful endpoints with Zod validation, RLS, structured logging.
- **CRM Pipeline Visualization**: Table, Kanban, Gantt views using TanStack Table and `@dnd-kit`, with workflow validation, sorting, filters, localStorage persistence, analytics, and WindTre glassmorphism design.
- **CRM Workflow Auto-Trigger**: Dual-mode (automatic/manual) execution of pipeline workflows.
- **Integrated Marketing Attribution**: UTM tracking, GTM integration, social media webhooks, AI lead scoring, Enhanced Conversions for Google Ads/GA4.
- **VoIP Telephony System (Enterprise WebRTC)**: Multi-store trunks, tenant-scoped SIP, user-specific WebRTC extensions, floating softphone, call actions integrated with CRM entities, CDR analytics, policy-based routing.
- **Dual-Mode Campaign Creation**: Beginner-friendly wizard and advanced interface, with user preference persistence.
- **GDPR Consent Enforcement System**: Backend service validating campaign consents against lead status, blocking non-compliant conversions.
- **Enhanced Error Handling UI**: Toast notifications for mutation failures and structured error responses.

# External Dependencies

## Database Services
- **Replit Native PostgreSQL**: Managed PostgreSQL 16 (via Neon).
- **Redis**: For BullMQ and Unified Notification System.

## Authentication Services
- **OAuth2/OIDC Enterprise**: For secure user authentication.

## UI Component Ecosystem
- **SHADCN/UI**: Primary UI component library.
- **Radix UI**: Headless component primitives.

## Icon & Utility Libraries
- **Lucide React**: Icon library.
- **TanStack React Query**: For server state management.
- **React Hook Form**: For form handling and validation.

## Development Tools
- **Vite**: Frontend build tool.
- **Drizzle Kit**: For database schema management and migrations.
- **PostCSS**: CSS pre-processing.
- **ESBuild**: Server code bundling.
- **Nginx**: Reverse proxy.

## AI Services
- **OpenAI**: For AI Workflow Builder and PDC Analyzer (`gpt-4o`).

## Third-Party Integrations (OAuth Providers)
- **Google Workspace**
- **AWS**
- **Meta/Instagram**
- **Microsoft 365**
- **Stripe**
- **GTM/Analytics**