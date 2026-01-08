# Overview
W3 Suite is an AI-powered, multi-tenant enterprise platform designed to centralize and optimize business operations across various modules including CRM, POS, WMS, Analytics, HR, and CMS. It leverages artificial intelligence to enhance efficiency, provide data-driven insights, and facilitate strategic decision-making, with the ambition of becoming the leading AI-native operating system for enterprises.

# User Preferences
- Preferred communication style: Simple, everyday language
- **🎯 DEFAULT TENANT: STAGING** (slug: `staging`, id: `00000000-0000-0000-0000-000000000001`)
  - **❌ NEVER use demo, w3-demo, or other tenant slugs** - ALWAYS use `staging`
  - **Route pattern**: `/staging/wms/inventory`, `/staging/crm/dashboard`, etc.
  - **Suppliers are brand-pushed** from tenant_id `00000000-0000-0000-0000-000000000000`
- **❌ NEVER create shared/ folder - IT DOES EXIST**
- **❌ NEVER reference shared/schema.ts - IT DOES EXIST**
- **UI/UX CONSISTENCY RULE**: Tutte le pagine devono mantenere la struttura dell'app con header e sidebar
- **PAGE STRUCTURE**: Non creare pagine indipendenti, integrare contenuto nella dashboard esistente
- **BACKGROUND RULE**: Tutte le pagine devono avere sfondo bianco (#ffffff) con header e sidebar
- **DATABASE ARCHITECTURE**: Always use 3-schema structure (w3suite, public, brand_interface)
- **USER SCOPE - SINGLE SOURCE OF TRUTH (OBBLIGATORIO)**:
  - **📋 ARCHITETTURA**: `user_stores` è la FONTE UNICA per lo scope utente
    - Le ragioni sociali (`user_organization_entities`) vengono DERIVATE automaticamente dalle sedi assegnate
    - Quando si salvano le sedi di un utente, le org entities vengono sincronizzate automaticamente
    - Mai assegnare org entities direttamente - sempre tramite sedi
  - **🔄 FLUSSO**:
    1. Utente seleziona sedi nel modal → salva in `user_stores`
    2. Backend deriva automaticamente org entities da `stores.organization_entity_id`
    3. Backend sincronizza `user_organization_entities` nella stessa transazione
    4. Lettura: GET /users deriva org entities da stores, non da tabella separata
  - **✅ BENEFICI**:
    - Zero inconsistenze tra sedi e ragioni sociali
    - Modal mostra solo ragioni sociali/sedi ATTIVE
    - Pulsante "Seleziona tutte sedi" per assegnazione rapida
  - **❌ VIETATO**:
    - Assegnare org entities senza sedi
    - Modificare `user_organization_entities` direttamente
    - Leggere org entities da `user_organization_entities` senza derivarle da stores
- **MCP/ACTION RLS ARCHITECTURE (OBBLIGATORIO)**:
  - **📋 CATALOGO UNIFICATO**: `action_definitions` è la FONTE UNICA per il MCP Gateway
    - Contiene sia **operative** (15 azioni WMS workflow) che **query** (17 tool MCP)
    - **Mixed RLS**: `tenant_id NULL` = globale (tutti i tenant), `tenant_id UUID` = tenant-specific
    - **exposed_via_mcp**: Flag booleano che controlla visibilità via MCP Gateway
    - **source_table + source_id**: Traccia origine (action_configurations o mcp_tool_settings)
    - Query pattern: `(tenant_id = ? OR tenant_id IS NULL) AND exposed_via_mcp = true`
  - **🌐 TABELLE GLOBALI (TEMPLATES)**:
    - `mcp_query_templates` - Template SQL parametrizzati per dipartimento (25 templates)
    - `mcp_query_template_variables` - Variabili con tipo, validazione, tooltip (45 variabili)
  - **🔒 TABELLE TENANT (RLS ABILITATO)** - Configurazioni specifiche per tenant:
    - `action_configurations` - Workflow, team assignments, SLA per azioni OPERATIVE
    - `mcp_tool_settings` - Configurazioni MCP (query_template_id + variable_config per query tool)
    - `mcp_tool_permissions` - Permessi MCP ora referenziano `action_definition_id` (non più action_config_id)
  - **⚠️ REGOLA CHIAVE**: MCP Gateway legge SOLO da `action_definitions`. Per operative, `sourceId` passa a `triggerAction` per backwards compatibility
  - **Policy RLS**: `USING (tenant_id = current_setting('app.tenant_id')::uuid)`
  - **Nuovo Tenant**: Eredita tool globali automaticamente (tenant_id IS NULL), può aggiungere tool tenant-specific
- **🔒 RLS TENANT CONTEXT (CRITICO)**:
  - **⚠️ VARIABILE CORRETTA**: Usare SEMPRE `app.tenant_id` per impostare il tenant context
  - **❌ SBAGLIATO**: `set_config('app.current_tenant_id', ...)` - NON allineato con le policy RLS sulla VPS!
  - **✅ CORRETTO**: `set_config('app.tenant_id', ...)` - Corrisponde alle policy RLS
  - **🔄 CONNECTION POOLING**: Usare SEMPRE `db.transaction()` o `withTenantTransaction()` per garantire che `set_config` e le query usino la stessa connessione dal pool
  - **⚠️ SET_CONFIG TERZO PARAMETRO**: Usare SEMPRE `false` (session-scoped), MAI `true` (transaction-local, non funziona con Drizzle savepoints!)
- **COMPONENT-FIRST APPROACH (OBBLIGATORIO)**:
  1. **SEMPRE shadcn/ui FIRST** - Check 48 componenti disponibili prima di creare custom
  2. **Copy & Paste workflow** - `npx shadcn@latest add [component-name]`
  3. **No component reinvention** - usa Button, Card, Dialog, Form, Table esistenti
  4. **Accessibility built-in** - Radix primitives garantiscono WCAG compliance
  5. **ITALIAN BUSINESS VALIDATION (OBBLIGATORIO PER TUTTI I MODAL)**:
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
  - **`[BRAND]` = Brand Interface (HQ system)**
  - **`[w3suite]` = Schema tenant-specific (users, tenants, stores, roles, etc.)**
  - **`[PUBLIC]` = Schema dati riferimento (commercial_areas, countries, channels, etc.)**
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
  - **❌ FORBIDDEN - Template Literals con tenantSlug**
- **VPS Deploy Rules (OBBLIGATORIO)**:
  - **🚀 DEPLOY COMMAND**: Quando l'utente scrive "deploia sulla VPS", usare SEMPRE lo script incrementale chiedendo quale tipo:
    - `./deploy/incremental-deploy.sh backend` - Solo backend (più comune)
    - `./deploy/incremental-deploy.sh frontend` - Solo frontend
    - `./deploy/incremental-deploy.sh full` - Entrambi
  - **✅ INCREMENTAL DEPLOY**: Lo script sincronizza solo file sorgenti modificati e builda sulla VPS
  - **📁 File protetti** (esclusi da rsync in `deploy/rsync-exclude.txt`):
    - `.env.production`, `.env`, `ecosystem.config.cjs`
  - **❌ NEVER use full bundle upload** (85MB) - usa sempre deploy incrementale
  - **📍 Bundle Path**: `/var/www/w3suite/apps/backend/api/dist/server.cjs`
  - **📜 Start Script**: `/var/www/w3suite/start-w3-api.sh` (sources `.env.production` then runs node)
  - **PM2 Process**: `w3-api` (porta 3004)
  - **❌ DEPRECATED**: Il vecchio symlink `/var/www/w3suite/current/` non è più usato
  - **FRONTEND DEPLOY (VARIABILI OBBLIGATORIE)**:
    - **🔐 VITE_AUTH_MODE=oauth2** - OBBLIGATORIO per produzione (default è 'development'!)
    - **📏 VITE_FONT_SCALE=80** - UI zoom al 80%
    - **Build Command**: `VITE_AUTH_MODE=oauth2 VITE_FONT_SCALE=80 npx vite build`
    - Output: `/var/www/w3suite/apps/frontend/web/dist/`
    - **❌ NEVER**: Buildare senza `VITE_AUTH_MODE=oauth2` (causa 404 su tutte le API!)
- **VPS DIRECTORY STRUCTURE (UGUALE A REPLIT)**:
  - **📁 Root**: `/var/www/w3suite/` (come root Replit)
  - **📁 Apps**: `/var/w3suite/apps/` (backend, frontend, voice-gateway)
  - **📁 Packages**: `/var/w3suite/packages/`
  - **📁 Configs**: `/var/w3suite/configs/`
  - **❌ MAI**: Non esiste più `/var/www/w3suite/app/` (struttura vecchia eliminata)
  - **✅ SEMPRE**: Usare path senza `/app/intermedio`
- **VPS SSH & DATABASE**:
  - **🔑 SSH Key**: `deploy/keys/vps_key` (file permanente, NON usare secrets)
  - **📡 SSH Command**: `ssh -i deploy/keys/vps_key root@82.165.16.223`
  - **🗃️ Database**: `w3suite_prod` (not `w3suite`)
  - **🔧 DB Access**: `sudo -u postgres psql -d w3suite_prod`
  - **❌ MAI**: Usare connessione TCP (porta 5432 non esposta)
  - **✅ SEMPRE**: Usare socket locale via SSH
- **VITE_FONT_SCALE (UI Zoom)**:
  - **Location**: Set at BUILD time, not runtime (Vite bakes env vars)
  - **Current Value**: `VITE_FONT_SCALE=80` (80% = 20% smaller like browser zoom)
  - **Hook**: `useProductionScale()` in `App.tsx` applies `html { font-size: X% }`
  - **Values**: 100=normal, 90=10% smaller, 80=20% smaller, 70=30% smaller
  - **Scales**: Everything using `rem`/`em` (Tailwind, shadcn) - NOT `px` values
  - **❌ NEVER**: Use custom CSS folder approach (gets overwritten on deploy)
  - **❌ NEVER**: Forget `VITE_FONT_MODE=oauth2` when building frontend for VPS
- **🚨 CSS UNITS RULE - OBBLIGATORIO PER TUTTI I NUOVI SVILUPPI (da Gen 2026)**:
  - **⚠️ REGOLA ASSOLUTA**: TUTTI i nuovi file e modifiche DEVONO usare `rem` per dimensioni
  - **✅ SEMPRE rem**: font-size, padding, margin, gap, width, height, border-radius, icon sizes
  - **✅ px OK SOLO**: border-width (1-2px), box-shadow offset/blur (piccoli valori fissi)
  - **❌ MAI px per**: font-size, padding, margin, gap, width, height - CAUSE BUG DI SCALING!
  - **Motivo**: VITE_FONT_SCALE=80 scala solo rem/em, px resta fisso e rompe il layout
  - **Formula**: `rem = px / 16` (es: 20px → 1.25rem, 16px → 1rem, 14px → 0.875rem, 12px → 0.75rem)
  - **Inline styles**: Usare rem anche in style={{}} (es: `padding: '1.25rem'` non `padding: '20px'`)
  - **Tailwind OK**: Le classi Tailwind (p-4, w-6, gap-2) usano già rem internamente
  - **W3 Suite convertite**: Login.tsx ✅, ForgotPassword.tsx ✅, ResetPassword.tsx ✅, SettingsPage.tsx ✅
  - **Brand Interface convertite**: Login.tsx ✅, Management.tsx ✅, CloudStoragePage.tsx ✅, Dashboard.tsx ✅, BrandLayout.tsx ✅, ErrorBoundary.tsx ✅, DeployCenterPage.tsx ✅, AIManagement.tsx ✅, OrganizationDetail.tsx ✅, Entities.tsx ✅, DashboardTab.tsx ✅, BrowseCommitsTab.tsx ✅, WMSCatalogPage.tsx ✅, BrandPriceListsTab.tsx ✅
  - **Refactor continuo**: Convertire pagine esistenti quando vengono toccate
  - **File rimanenti Brand Interface (px→rem)**: CRM.tsx, AgentDetailsModal.tsx, RagKnowledgeSection.tsx, DeploymentWizard.deploy/DeployModal.tsx

# System Architecture
- **UI/UX Decisions**:
    - Consistent Glassmorphism design with headers, sidebars, and white backgrounds across all pages.
    - Utilizes `shadcn/ui` components (built on Radix UI) for accessibility and adheres to a component-first approach.
    - Styling is based on Tailwind CSS, with a strict rule for using `rem` units for all new developments to ensure proper UI scaling via `VITE_FONT_SCALE`.
- **Technical Implementations**:
    - **Database**: PostgreSQL with a 3-schema architecture (`w3suite`, `public`, `brand_interface`) and robust Row Level Security (RLS) managed by `app.tenant_id`.
    - **Security**: OAuth2/OIDC, MFA, JWTs, and a 3-level Role-Based Access Control (RBAC) system.
    - **Core Systems**: Includes a Universal Workflow Engine, Unified Notification System, Centralized Webhook Management, Task Management, Multi-Provider OAuth (MCP) for external integrations, AI Voice Agent with RAG, and multi-tenant object storage.
    - **AI Integration**: Features AI Enforcement Middleware, an AI Workflow Builder, Intelligent Workflow Routing, and a comprehensive AI Tools Ecosystem.
    - **CRM Module**: Focuses on person-centric identity graphs, omnichannel engagement, pipeline management, GDPR compliance, and a Customer 300° Dashboard.
    - **HR Module**: Manages employee shift schedules, leave requests, and time tracking.
    - **WMS Module (CQRS)**: Designed to support diverse product types with dual-layer versioning, 13 distinct logistic states, serialized/non-serialized product handling, immutable event logs, read models, historical snapshots, and dedicated document tables.
    - **Brand Interface**: Provides a Workflow Builder and a Git-versioned JSON-based Master Catalog System for managing brand-specific data.
- **System Design Choices**:
    - **Organizational Hierarchy**: A clear structure from Tenant down to User (Tenant → Commercial Area → Organization Entity → Store → Department → Team → User).
    - **Cross-Store Architecture**: Enables tenant-wide data views with Role-Based Access (RBA) and advanced filtering capabilities.
    - **Request Routing**: Implements "Functional First → First Wins" for task assignment and "Shift-Based Routing" for efficient workload distribution.
    - **Action Management System**: Centralizes the configuration and management of all actions via `action_definitions`, which are routed through a `UnifiedTriggerService`.
    - **MCP Public Gateway**: A JSON-RPC 2.0 interface that uses `action_definitions` as the single source of truth for both operational workflows and query tools.
    - **User Scope Management**: `user_stores` serves as the single source of truth for defining user scope, with associated organization entities being automatically derived.
    - **Italian Business Validation**: Comprehensive validation for Italian-specific data types (email, PEC, VAT, fiscal code, phone, IBAN, website, BIC/SWIFT, addresses), featuring real-time feedback, Italian error messages, and Zod schemas.
    - **Deployment & Governance**: Features an incremental deployment process to the VPS (`/var/www/w3suite/`) using dedicated `deploy/incremental-deploy.sh` scripts. SSH access is secured via `deploy/keys/vps_key`. The production database `w3suite_prod` is accessed exclusively via a local socket. Frontend builds necessitate `VITE_AUTH_MODE=oauth2` and `VITE_FONT_SCALE=80` environment variables.

# External Dependencies
- PostgreSQL
- Redis
- OAuth2/OIDC Enterprise
- shadcn/ui
- Radix UI
- Lucide React
- TanStack React Query
- React Hook Form
- Vite
- Drizzle Kit
- PostCSS
- ESBuild
- Nginx
- OpenAI
- AWS S3