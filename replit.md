# Overview
W3 Suite is a multi-tenant enterprise platform centralizing business operations across CRM, POS, WMS, Analytics, HR, CMS, and Bidding modules. It features a WindTre glassmorphism design, robust security, and PostgreSQL with Row Level Security (RLS) for tenant isolation. The platform aims to be a scalable, secure, and comprehensive business solution, enhancing operational efficiency and capitalizing on market opportunities.

# Recent Changes
- **2025-11-13: WMS Suppliers Refactoring Complete** - Successfully migrated complete Fornitori (Suppliers) management from Settings → Entità to dedicated WMS "Prodotti e Listini" → Tab Fornitori. Created FornitoriTabContent.tsx (1,189 lines) with full CRUD, DataTable, 5-section modal, Italian business validation, and TanStack Query integration. Removed ~1,581 lines from SettingsPage.tsx. All reference data endpoints migrated to `/api/reference/*` convention (payment-methods, payment-conditions, legal-forms, countries, italian-cities). Architect-approved with smoke tests passed.

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
- **UI/UX Decisions**: WindTre Glassmorphism Design System, utilizing `shadcn/ui` and `@w3suite/frontend-kit` for design tokens, templates, and components, styled with CSS variables and Tailwind CSS. All pages maintain a consistent app structure with header, sidebar, and a white background.
- **Monorepo Structure**: Centralized code organization.
- **Database Architecture**: Employs a 3-schema approach (`w3suite`, `public`, `brand_interface`) with PostgreSQL RLS for robust multitenancy.
- **Security**: Implements OAuth2/OIDC, MFA, JWTs, and a 3-level RBAC system.
- **Multitenancy**: Achieved through PostgreSQL RLS, a `TenantProvider`, and global unique constraints.
- **Universal Workflow System**: Features approval hierarchies, RBAC, event-driven state machines, and audit trails.
- **Unified Notification System**: Provides real-time notifications.
- **Centralized Webhook System**: Enterprise-grade with multi-provider support, queueing, and deduplication.
- **Task Management System**: Flexible task creation with workflow integration and RBAC-enabled API.
- **MCP Multi-Provider OAuth System**: Manages unified credentials for third-party services with per-user OAuth isolation.
- **AI Enforcement Middleware**: Hierarchical API-level blocking for AI functionalities.
- **AI Workflow Builder**: Generates natural language workflows using OpenAI `gpt-4o` in strict JSON mode, outputting ReactFlow DSL.
- **Intelligent Workflow Routing**: Supports automatic and manual task assignment.
- **AI Tools Ecosystem with PDC Analyzer**: Dashboard for AI tools, including automated PDF contract analysis using GPT-4.
- **CRM Module Backend**: Person-centric identity graph, omnichannel engagement, pipeline management, GDPR compliance, and lead-to-deal workflows, with RESTful endpoints, Zod validation, RLS, and structured logging.
- **CRM Pipeline Visualization**: Offers Table, Kanban, and Gantt views including workflow validation, sorting, filters, localStorage persistence, analytics, and WindTre glassmorphism design.
- **CRM Workflow Auto-Trigger**: Dual-mode (automatic/manual) execution of pipeline workflows.
- **Integrated Marketing Attribution**: Features UTM tracking, GTM integration, social media webhooks, AI lead scoring, and Enhanced Conversions for Google Ads/GA4.
- **GTM Auto-Configuration System (MCP)**: Utilizes `google-tag-manager-mcp` server for automated store tracking setup.
- **VoIP Telephony System (Enterprise WebRTC)**: Supports multi-store trunks, tenant-scoped SIP, user-specific WebRTC extensions, floating softphone, call actions integrated with CRM entities, CDR analytics, and policy-based routing.
- **AI Voice Agent System**: Production-ready intelligent voice assistant powered by OpenAI Realtime API (`gpt-4o-realtime`) via W3 Voice Gateway Microservice for bridging FreeSWITCH audio, function calling, time-based routing, graceful degradation, security, and session tracking.
- **edgvoip PBX Integration (Hub-and-Spoke)**: Production-ready bidirectional sync between W3 Suite (single source of truth for AI config) and edgvoip PBX (SIP trunks + intelligent routing). Features HMAC-SHA256 webhook security, auto-sync on AI config changes, comprehensive UI with BusinessHoursEditor, AI agent selection, failover configuration, and real-time sync status tracking.
- **Dual-Mode Campaign Creation**: Provides a beginner-friendly wizard and an advanced interface, with user preference persistence.
- **GDPR Consent Enforcement System**: Backend service validating campaign consents against lead status, blocking non-compliant conversions.
- **Enhanced Error Handling UI**: Provides toast notifications for mutation failures and structured error responses.
- **Customer 360° Dashboard**: Comprehensive customer view with 8 tabs, full B2B/B2C support with differentiated fields, real-time documents management with Object Storage integration, and notes system with React Query, tenant isolation, and Zod validation.
- **Campaign Workflow Automation System**: Dual-mode intelligent lead routing with granular AI controls (Manual/Automatic modes), including AI Lead Scoring and AI Lead Routing toggles.
- **AI Funnel Orchestration System**: Production-ready intelligent deal routing across multiple pipelines within customer journey funnels, using the `funnel-orchestrator-assistant` AI agent (gpt-4o). Implements specialized workflow executors for stage and pipeline transitions, AI-powered routing, funnel exit handling, and webhook triggers. Complete UI integration with 5 dedicated workflow nodes in ReactFlow builder: `funnel-stage-transition`, `funnel-pipeline-transition`, `ai-funnel-orchestrator`, `funnel-exit`, `deal-stage-webhook-trigger`. **Funnel-level workflows** are configured via **FunnelSettingsDialog** (not PipelineSettingsDialog) accessible from Funnel Page Settings button. Workflows at funnel level manage transitions BETWEEN pipelines within the same funnel. Full CRUD API endpoints: GET/POST/PATCH/DELETE `/api/crm/funnels/:funnelId/workflows` with RLS, RBAC, and automatic/manual execution modes. Database table `crm_funnel_workflows` stores assignments. Analytics dashboard with TypeScript-typed TanStack Query integration for real-time funnel performance tracking.

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
- **Meta/Instagram**: Social media integrations (via GTM MCP Server).
- **Microsoft 365**: Office suite integration.
- **Stripe**: Payment processing.
- **GTM/Analytics**: Google Tag Manager and analytics services.