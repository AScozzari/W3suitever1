# Overview
W3 Suite is a multi-tenant enterprise platform centralizing business operations across CRM, POS, WMS, Analytics, HR, CMS, and Bidding modules. It features a distinct WindTre glassmorphism design, robust security, and uses PostgreSQL with Row Level Security (RLS) for tenant isolation. The platform aims to enhance operational efficiency and capitalize on market opportunities by providing a scalable, secure, and comprehensive business solution.

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
- **CROSS-STORE ARCHITECTURE (PATTERN FONDAMENTALE)**:
  - **🌐 Default View**: SEMPRE cross-store (tenant-wide) - tutti i negozi visibili
  - **🔐 Access Control**: Permessi basati su RUOLO, non su selezione negozio
  - **📊 Data Queries**: Omettere storeId per vista cross-store, passare solo per filtri specifici
  - **👤 Admin Role**: Vede tutto, tutti gli utenti, tutti i negozi, senza filtri obbligatori
  - **Moduli Cross-Store**: HR, CRM, Tasks, Workflows, Teams, WMS, Analytics, Campaigns
  - **Pattern Query**: `useQuery({ queryKey: ['/api/endpoint'] })` senza storeId = cross-store
  - **Filtro Opzionale**: `storeId?: string` o `storeIds: []` = tutti i negozi di default
  - **❌ MAI**: Auto-selezionare il primo negozio come default
  - **❌ MAI**: Richiedere selezione negozio per visualizzare dati
  - **✅ SEMPRE**: Mostrare aggregato cross-store, con filtri opzionali per drill-down

# System Architecture
- **UI/UX Decisions**: WindTre Glassmorphism Design System using `shadcn/ui`, `@w3suite/frontend-kit`, CSS variables, and Tailwind CSS. Consistent app structure with header, sidebar, and white background.
- **Monorepo Structure**: Centralized code organization.
- **Database Architecture**: 3-schema approach (`w3suite`, `public`, `brand_interface`) with PostgreSQL RLS for multitenancy and tenant isolation.
- **Security**: OAuth2/OIDC, MFA, JWTs, and a 3-level RBAC system with Italian role templates and granular permissions.
- **Core Systems**: Universal Workflow System, Unified Notification System, Centralized Webhook System, Task Management System, and Multi-Provider OAuth System (MCP).
- **AI Integration**: AI Enforcement Middleware, AI Workflow Builder (OpenAI `gpt-4o` for ReactFlow DSL), Intelligent Workflow Routing, AI Tools Ecosystem with PDC Analyzer (GPT-4 for PDF contract analysis), AI Voice Agent System (OpenAI Realtime API `gpt-4o-realtime`), AI Funnel Orchestration System (`funnel-orchestrator-assistant`). Includes an AI Voice Agent RAG System for WindTre offers using `pgvector`.
- **CRM Module**: Person-centric identity graph, omnichannel engagement, pipeline management, GDPR compliance, lead-to-deal workflows, and a Customer 360° Dashboard.
- **Campaign Management**: Dual-mode campaign creation (wizard/advanced), GDPR Consent Enforcement.
- **Deployment & Governance**: Deploy Center Auto-Commit System (Git-like versioning) and Bidirectional Branch Linking.
- **Brand Interface**: Workflow Builder (n8n-style with Zustand, 5 specialized node components, 106 MCP nodes), Master Catalog System (hybrid architecture for template governance using JSON files with Git versioning).
- **VoIP Telephony**: Enterprise WebRTC, multi-store trunks, SIP, WebRTC extensions, CRM integration for call actions, CDR analytics, policy-based routing, and edgvoip PBX Integration. Supports bidirectional sync for trunks and extensions with dual authentication.
- **RBAC System**: 10 Italian role templates with a granular permission system (215 total permissions), providing default assignments for various roles (e.g., Amministratore, Store Manager, Sales Agent).
- **Workflow Database Operations**: Provides 4 secure database operations (SELECT, INSERT, UPDATE, DELETE) on the `w3suite` schema with a visual query builder, RLS enforcement, prepared statements, and table/column validation. EXECUTE_QUERY is disabled for security reasons in the MVP.
- **Store Working Stats API**: Calculates aggregated working days and hours for stores based on `store_opening_rules`, `store_calendar_settings`, `store_calendar_overrides`, and `public.italian_holidays` tables, with double-layer tenant isolation.
- **Shift Template Versioning System**: Immutable version tracking for shift templates. When templates are updated, a new version is created with snapshot of template data and time slots. Past shifts (completed/cancelled) retain original version reference. Future shifts (draft/scheduled/in_progress with date >= today) are updated to new version. API endpoints: `PUT /api/hr/shift-templates/:id` (creates new version), `GET /api/hr/shift-templates/:id/versions` (version history). Database tables: `shift_template_versions` (version snapshots), `shifts.template_version_id` (version reference).

# External Dependencies
- **PostgreSQL**: Replit Native PostgreSQL 16 (via Neon).
- **Redis**: For BullMQ and Unified Notification System.
- **OAuth2/OIDC Enterprise**: For user authentication.
- **SHADCN/UI**: For UI components.
- **Radix UI**: For headless component primitives.
- **Lucide React**: For icons.
- **TanStack React Query**: For server state management.
- **React Hook Form**: For form handling and validation.
- **Vite**: Frontend build tool.
- **Drizzle Kit**: For database schema management.
- **PostCSS**: For CSS pre-processing.
- **ESBuild**: For server-side code bundling.
- **Nginx**: As a reverse proxy.
- **OpenAI**: Used for AI Workflow Builder, PDC Analyzer, and AI Voice Agent System (`gpt-4o`, `gpt-4o-realtime`).
- **Google Workspace**: For integration.
- **AWS**: For cloud services.
- **Meta/Instagram**: For social media integrations.
- **Microsoft 365**: For Office suite integration.
- **Stripe**: For payment processing.
- **GTM/Analytics**: For Google Tag Manager and analytics services.