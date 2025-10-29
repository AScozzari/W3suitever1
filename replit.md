# Overview
W3 Suite is a multi-tenant enterprise platform designed to centralize business operations across various domains including CRM, POS, WMS, Analytics, HR, CMS, and Bidding. It features a unique WindTre glassmorphism design, robust security, and utilizes PostgreSQL with Row Level Security (RLS) for tenant isolation. The platform aims to provide a scalable, secure, and comprehensive business solution to improve operational efficiency and leverage market opportunities.

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
import { countries, payment methods } from './db/schema/public';
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
  - **`[PUBLIC]`** = Schema dati riferimento (commercial_areas, countries, channels, etc.)
  - **`[brand_interface]` = Schema Brand Interface (brand_users, brand_tenants, etc.)**

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
- **UI/UX Decisions**: WindTre Glassmorphism Design System using `shadcn/ui`, `frontend-kit` for design tokens, templates, and components, styled with CSS variables and Tailwind CSS. All pages maintain app structure with header, sidebar, and a white background.
- **Monorepo Structure**: Centralized code organization for efficient management.
- **Database Architecture**: 3-schema approach (`w3suite`, `public`, `brand_interface`) with PostgreSQL RLS for robust multitenancy.
- **Security**: Implements OAuth2/OIDC, MFA, JWTs, and a 3-level RBAC system for secure access control.
- **Multitenancy**: Achieved through PostgreSQL RLS, a `TenantProvider`, and global unique constraints.
- **Universal Workflow System**: Features approval hierarchies, RBAC, event-driven state machines, and audit trails.
- **Unified Notification System**: Provides real-time notifications across the platform.
- **Centralized Webhook System**: Enterprise-grade with multi-provider support, queueing, and deduplication.
- **Task Management System**: Offers flexible task creation with workflow integration and an RBAC-enabled API.
- **MCP Multi-Provider OAuth System**: Manages unified credentials for third-party services with per-user OAuth isolation.
- **AI Enforcement Middleware**: Hierarchical API-level blocking for AI functionalities.
- **AI Workflow Builder**: Generates natural language workflows using OpenAI `gpt-4o` in strict JSON mode, outputting ReactFlow DSL.
- **Intelligent Workflow Routing**: Supports automatic and manual task assignment.
- **AI Tools Ecosystem with PDC Analyzer**: Dashboard for AI tools, including automated PDF contract analysis using GPT-4.
- **CRM Module Backend**: Person-centric identity graph, omnichannel engagement, pipeline management, GDPR compliance, and lead-to-deal workflows, with RESTful endpoints, Zod validation, RLS, and structured logging.
- **CRM Pipeline Visualization**: Offers Table, Kanban, and Gantt views using TanStack Table and `@dnd-kit`, including workflow validation, sorting, filters, localStorage persistence, analytics, and WindTre glassmorphism design.
- **CRM Workflow Auto-Trigger**: Dual-mode (automatic/manual) execution of pipeline workflows.
- **Integrated Marketing Attribution**: Features UTM tracking, GTM integration, social media webhooks, AI lead scoring, and Enhanced Conversions for Google Ads/GA4.
- **GTM Auto-Configuration System (MCP)**: Utilizes `google-tag-manager-mcp` server for automated store tracking setup.
- **VoIP Telephony System (Enterprise WebRTC)**: Supports multi-store trunks, tenant-scoped SIP, user-specific WebRTC extensions, floating softphone, call actions integrated with CRM entities, CDR analytics, and policy-based routing.
- **AI Voice Agent System**: Production-ready intelligent voice assistant powered by OpenAI Realtime API (gpt-4o-realtime) via W3 Voice Gateway Microservice for bridging FreeSWITCH audio, function calling, time-based routing, graceful degradation, security, and session tracking.
- **Dual-Mode Campaign Creation**: Provides a beginner-friendly wizard and an advanced interface, with user preference persistence.
- **GDPR Consent Enforcement System**: Backend service validating campaign consents against lead status, blocking non-compliant conversions.
- **Enhanced Error Handling UI**: Provides toast notifications for mutation failures and structured error responses.

# External Dependencies
- **Replit Native PostgreSQL**: Managed PostgreSQL 16 (via Neon).
- **Redis**: Used for BullMQ and the Unified Notification System.
- **OAuth2/OIDC Enterprise**: For secure user authentication.
- **SHADCN/UI**: Primary library for UI components.
- **Radix UI**: Provides headless component primitives.
- **Lucide React**: Icon library.
- **TanStack React Query**: For efficient server state management.
- **React Hook Form**: Facilitates robust form handling and validation.
- **Vite**: Frontend build tool.
- **Drizzle Kit**: For database schema management and migrations.
- **PostCSS**: For CSS pre-processing.
- **ESBuild**: For bundling server-side code.
- **Nginx**: Serves as a reverse proxy.
- **OpenAI**: Utilized for AI Workflow Builder, PDC Analyzer, and AI Voice Agent System (`gpt-4o`, `gpt-4o-realtime`).
- **Google Workspace**: Integration for various services.
- **AWS**: Cloud services.
- **Meta/Instagram**: Social media integrations.
- **Microsoft 365**: Office suite integration.
- **Stripe**: Payment processing.
- **GTM/Analytics**: Google Tag Manager and analytics services.