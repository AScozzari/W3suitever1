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
- **Universal Workflow System**: Approval hierarchies, RBAC, event-driven state machines, audit trails.
- **Unified Notification System**: Real-time notifications.
- **Centralized Webhook System**: Enterprise-grade with multi-provider support, queueing, and deduplication.
- **Task Management System**: Flexible task creation with workflow integration and RBAC-enabled API.
- **MCP Multi-Provider OAuth System**: Manages unified credentials for third-party services with per-user OAuth isolation.
- **AI Enforcement Middleware**: Hierarchical API-level blocking for AI functionalities.
- **AI Workflow Builder**: Generates natural language workflows using OpenAI `gpt-4o` in strict JSON mode, outputting ReactFlow DSL.
- **Intelligent Workflow Routing**: Supports automatic and manual task assignment.
- **AI Tools Ecosystem with PDC Analyzer**: Dashboard for AI tools, including automated PDF contract analysis using GPT-4.
- **CRM Module Backend**: Person-centric identity graph, omnichannel engagement, pipeline management, GDPR compliance, and lead-to-deal workflows, with RESTful endpoints, Zod validation, RLS, and structured logging.
- **CRM Manual Lead/Deal Creation System**: Context-aware manual creation with intelligent inheritance. Features: (1) CreateLeadDialog with `preselectedCampaignId` and `inheritedStoreId` props for auto-population, (2) CreateDealDialog with `preselectedPipelineId`, `inheritedStoreId`, and `defaultOwnerId` props for context inheritance, (3) `dealCreationSource` enum tracking (`manual`, `converted_from_lead`, `imported`, `workflow_automation`), (4) Backend support for manual deal creation without originating lead via direct `personId` parameter, (5) Required fields enforcement (storeId, ownerUserId) with manual selection fallback, (6) UI integration via "Nuovo Lead" button in CampaignDetailPage and "Nuovo Deal" button in PipelineDetailPage with pre-filled context. Database schema: `dealCreationSource` enum in `crm_deals` table. RESTful API: `POST /api/crm/leads` with `leadSource='manual'`, `POST /api/crm/deals` with optional `leadId` and `personId` for manual creation.
- **CRM Omnichannel Interaction Tracking**: Unified person-centric timeline across 15+ channels (email, SMS, WhatsApp, Telegram, Instagram DM/Comments, Facebook Messenger/Comments, TikTok, LinkedIn, voice/video calls, web chat, in-person, workflow automation). Features: interaction status tracking (pending/sent/delivered/read/replied/failed/bounced), AI sentiment scoring, engagement metrics, attachment management, multi-participant conversations, workflow integration, and full audit trail. Database schema: `crm_omnichannel_interactions`, `crm_interaction_attachments`, `crm_interaction_participants`.
- **CRM Identity Resolution System**: Advanced identity graph with ML-powered duplicate detection and conflict resolution. Features: (1) Candidate match detection with 8 match types (email/phone/social exact/fuzzy, name similarity, IP, device fingerprint) and confidence scoring (0-100%), (2) Manual review workflow with accept/reject actions, (3) Automated merge/split operations with rollback support, (4) Conflict detection for consent mismatches and data inconsistencies, (5) Complete audit trail for GDPR compliance. Database schema: `crm_identity_matches`, `crm_identity_events`, `crm_identity_conflicts`. RESTful API: `GET /api/crm/person/:personId/omnichannel-timeline`, `POST /api/crm/omnichannel-interactions`, `GET /api/crm/identity-matches`, `POST /api/crm/identity-matches/:id/accept|reject`, `GET /api/crm/identity-conflicts`.
- **CRM Pipeline Visualization**: Table, Kanban, and Gantt views with workflow validation, sorting, filters, localStorage persistence, analytics, and WindTre glassmorphism design.
- **CRM Workflow Auto-Trigger**: Dual-mode (automatic/manual) execution of pipeline workflows.
- **Integrated Marketing Attribution**: UTM tracking, GTM integration, social media webhooks, AI lead scoring, Enhanced Conversions for Google Ads/GA4.
- **GTM Auto-Configuration System (MCP)**: Utilizes `google-tag-manager-mcp` server for automated store tracking setup.
- **VoIP Telephony System (Enterprise WebRTC)**: Multi-store trunks, tenant-scoped SIP, user-specific WebRTC extensions, floating softphone, call actions integrated with CRM entities, CDR analytics, and policy-based routing.
- **AI Voice Agent System**: Production-ready intelligent voice assistant powered by OpenAI Realtime API (`gpt-4o-realtime`) via W3 Voice Gateway Microservice for bridging FreeSWITCH audio, function calling, time-based routing, graceful degradation, security, and session tracking.
- **edgvoip PBX Integration (Hub-and-Spoke)**: Bidirectional sync between W3 Suite and edgvoip PBX. Features HMAC-SHA256 webhook security, auto-sync on AI config changes, UI with BusinessHoursEditor, AI agent selection, failover configuration, and real-time sync status.
- **Dual-Mode Campaign Creation**: Beginner-friendly wizard and advanced interface with user preference persistence.
- **GDPR Consent Enforcement System**: Backend service validating campaign consents against lead status, blocking non-compliant conversions.
- **Enhanced Error Handling UI**: Toast notifications for mutation failures and structured error responses.
- **Customer 360° Dashboard**: Comprehensive customer view with 8 tabs, full B2B/B2C support, real-time documents management with Object Storage integration, and notes system with React Query, tenant isolation, and Zod validation.
- **Campaign Workflow Automation System**: Dual-mode intelligent lead routing with granular AI controls (Manual/Automatic modes), including AI Lead Scoring and AI Lead Routing toggles.
- **AI Funnel Orchestration System**: Production-ready intelligent deal routing across multiple pipelines within customer journey funnels, using the `funnel-orchestrator-assistant` AI agent (gpt-4o). Implements specialized workflow executors, AI-powered routing, funnel exit handling, and webhook triggers. Integrated with 5 dedicated workflow nodes in ReactFlow builder and configurable via FunnelSettingsDialog. Full CRUD API endpoints: `/api/crm/funnels/:funnelId/workflows` with RLS, RBAC, and automatic/manual execution modes. Analytics dashboard with TanStack Query for real-time funnel performance tracking.
- **Deploy Center Auto-Commit System**: Git-like deployment versioning for WMS/CRM governance, including database tables, CRUD API endpoints with RBAC, and auto-commit functionality for WMS supplier creation.
- **Deploy Center Bidirectional Branch Linking**: Fully integrated branch system linking W3 Suite tenants/stores to Deploy Center branches. Features: (1) Auto-branch creation on tenant/store creation with hierarchical naming (`tenant-slug`, `tenant-slug/store-code`), (2) Bidirectional sync endpoint (`POST /brand-api/deploy/branches/sync`) to backfill existing entities, (3) FK constraints to `deploy_center_branches` for referential integrity, (4) 50MB payload support for large deployments (price lists with ~25,000 products). Branch metadata tracks tenant/store context and auto-generation flags for governance.
- **Brand Interface Workflow Builder**: Enterprise workflow builder with Zustand store (undo/redo), 5 specialized node components, NodeConfigPanel, and 106 MCP nodes (Google Workspace, AWS, Meta/Instagram, Microsoft 365, Stripe, GTM/Analytics, PostgreSQL, Telegram, WhatsApp, Twilio ecosystems).
- **Brand Interface Master Catalog System**: Hybrid Minimal architecture for template governance using JSON file storage with Git versioning, database replication for workflows and tasks, complete REST API, and TanStack Query integration. Includes a tasks system with full CRUD, priority levels, status tracking, and import templates feature.

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