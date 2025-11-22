# Overview
W3 Suite is a multi-tenant enterprise platform designed to centralize business operations across various modules, including CRM, POS, WMS, Analytics, HR, CMS, and Bidding. It features a distinct WindTre glassmorphism design, robust security measures, and utilizes PostgreSQL with Row Level Security (RLS) for stringent tenant isolation. The platform's primary goal is to provide a scalable, secure, and comprehensive business solution, aiming to significantly enhance operational efficiency and capitalize on market opportunities.

# User Preferences
- Preferred communication style: Simple, everyday language
- **❌ NEVER create shared/ folder - IT DOES NOT EXIST**
- **❌ NEVER reference shared/schema.ts - IT DOES NOT EXIST**
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
- **DEVELOPMENT RULES**:
  1. **NO custom components** when frontend-kit has one
  2. **NO inline styles** - use design tokens
  3. **NO custom layouts** - use templates
  4. **ALWAYS data-testid** on interactive elements
  5. **ALWAYS use TypeScript** interfaces
- **Error Prevention**:
  - ✅ Check frontend-kit first before creating anything
  - ✅ Use templates to avoid structural issues
  - ✅ Import from @w3suite/frontend-kit, not create new
  - ❌ Never duplicate existing components
  - ❌ Never use hex colors directly - use CSS variables
- **CRITICAL BUG PREVENTION: Double Tenant Slug in URLs**
  - **✅ ALWAYS use `useTenantNavigation` hook**
  - **❌ FORBIDDEN - Template Literals with tenantSlug**

# System Architecture
- **UI/UX Decisions**: WindTre Glassmorphism Design System, utilizing `shadcn/ui` and `@w3suite/frontend-kit` with CSS variables and Tailwind CSS. All pages maintain a consistent app structure with header, sidebar, and a white background.
- **Monorepo Structure**: Centralized code organization.
- **Database Architecture**: 3-schema approach (`w3suite`, `public`, `brand_interface`) with PostgreSQL RLS for multitenancy.
- **Security**: OAuth2/OIDC, MFA, JWTs, and a 3-level RBAC system.
- **Multitenancy**: PostgreSQL RLS, `TenantProvider`, and global unique constraints.
- **Core Systems**: Universal Workflow System, Unified Notification System, Centralized Webhook System, Task Management System, and Multi-Provider OAuth System (MCP).
- **AI Integration**: AI Enforcement Middleware, AI Workflow Builder (using OpenAI `gpt-4o` for ReactFlow DSL), Intelligent Workflow Routing, AI Tools Ecosystem with PDC Analyzer (GPT-4 for PDF contract analysis), AI Voice Agent System (OpenAI Realtime API `gpt-4o-realtime`), AI Funnel Orchestration System (`funnel-orchestrator-assistant` AI agent).
- **CRM Module**: Person-centric identity graph, omnichannel engagement, pipeline management, GDPR compliance, lead-to-deal workflows. Features include: manual lead/deal creation, omnichannel interaction tracking across 15+ channels, advanced identity resolution with ML-powered duplicate detection, pipeline visualization (Table, Kanban, Gantt), workflow auto-trigger, integrated marketing attribution, and a Customer 360° Dashboard.
- **Campaign Management**: Dual-mode campaign creation (wizard/advanced), GDPR Consent Enforcement.
- **Deployment & Governance**: Deploy Center Auto-Commit System (Git-like versioning), Deploy Center Bidirectional Branch Linking (linking tenants/stores to branches).
- **Brand Interface**: Workflow Builder (n8n-style with Zustand, 5 specialized node components, 106 MCP nodes), Master Catalog System (hybrid architecture for template governance, JSON files with Git versioning, tasks system).
- **VoIP Telephony**: Enterprise WebRTC, multi-store trunks, SIP, WebRTC extensions, call actions integrated with CRM, CDR analytics, policy-based routing, edgvoip PBX Integration.
- **Workflow Database Operations (PRODUCTION-READY MVP)**: [W3] Database Operation node with 4 secure operations (SELECT, INSERT, UPDATE, DELETE) on w3suite schema only. Visual query builder for non-technical users, RLS enforcement via `setTenantContext()`, prepared statements with proper parameter binding, table/column validation via `validateTableName/validateColumns/sanitizeIdentifier`. Preview functionality shows RLS-filtered sample data with tenant_id transparency. EXECUTE_QUERY permanently disabled for MVP (requires pg-query-parser for AST-based validation - see Known Issues section).

# Known Issues & Future Work

## Workflow Database Operations - Phase 1 MVP Complete ✅
**Status**: Production-ready MVP shipped (2025-11-22)
**What's included**:
- ✅ 4 secure database operations: SELECT, INSERT, UPDATE, DELETE
- ✅ Visual query builder with table/column dropdowns (w3suite schema only)
- ✅ RLS enforcement via `setTenantContext()` before all queries
- ✅ Security hardening: `validateTableName()`, `validateColumns()`, `sanitizeIdentifier()`
- ✅ Prepared statements with proper parameter binding (SQL injection proof)
- ✅ Preview functionality with RLS-filtered sample data
- ✅ Workflow executor plugin registered in ActionExecutorsRegistry
- ✅ ReactFlow integration with node mapping

**EXECUTE_QUERY - Disabled for MVP**:
**Reason**: Custom SQL queries vulnerable to:
- search_path manipulation via `set_config()` in CTEs
- Schema escaping through quoted identifiers bypass
- False positives on column aliases blocking legitimate JOINs
**Solution Required**: Implement pg-query-parser for AST-based SQL validation before re-enabling
**Impact**: Users can use 4 structured operations only - covers 95% of enterprise use cases
**Decision**: Architect-approved security posture prioritizes safety over flexibility for MVP

# External Dependencies
- **Replit Native PostgreSQL**: Managed PostgreSQL 16 (via Neon).
- **Redis**: BullMQ and Unified Notification System.
- **OAuth2/OIDC Enterprise**: User authentication.
- **SHADCN/UI**: UI components.
- **Radix UI**: Headless component primitives.
- **Lucide React**: Icon library.
- **TanStack React Query**: Server state management.
- **React Hook Form**: Form handling and validation.
- **Vite**: Frontend build tool.
- **Drizzle Kit**: Database schema management.
- **PostCSS**: CSS pre-processing.
- **ESBuild**: Server-side code bundling.
- **Nginx**: Reverse proxy.
- **OpenAI**: AI Workflow Builder, PDC Analyzer, AI Voice Agent System (`gpt-4o`, `gpt-4o-realtime`).
- **Google Workspace**: Integration.
- **AWS**: Cloud services.
- **Meta/Instagram**: Social media integrations.
- **Microsoft 365**: Office suite integration.
- **Stripe**: Payment processing.
- **GTM/Analytics**: Google Tag Manager and analytics services.