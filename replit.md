# Overview
W3 Suite is an AI-powered, multi-tenant enterprise platform designed to centralize business operations across various modules like CRM, POS, WMS, Analytics, HR, and CMS. Its core purpose is to boost efficiency, deliver data-driven insights, and enable strategic decision-making through advanced AI. The long-term vision is to establish W3 Suite as a leading AI-native operating system in the market.

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
- **💰 COMMISSIONING MODULE**:
  - **📋 ARCHITETTURA 3 LIVELLI**:
    - **Livello 0 - TIPO** (Backend): Configuratori tipo costruiti da sviluppatori (`soglie`, `gettone`, `bonus_malus`)
    - **Livello 1 - TEMPLATE** (Frontend): Template riutilizzabili creati da admin
    - **Livello 2 - ISTANZA** (Gara): Importazione template con cluster e valori specifici
  - **🎯 4 VALORI CHIAVE**: `gettone_contrattuale`, `gettone_gara`, `canone`, `valenza`
  - **📊 LAYER CALCOLO**: RS (ragione sociale) | PdV (punto vendita) | User (utente)
  - **👥 CLUSTER**: Doppia funzione = chi gioca + valori specifici per cluster
  - **🎯 DRIVER**: FK a driver esistenti (pushati da Brand), solo lettura
  - **🚧 PALETTI**: Funzioni che sbloccano soglie/bonus
  - **🔒 CAP**: Funzioni che limitano counting (blocco o scala)
  - **📈 SOGLIE**: Progressive (somma fasce) o Regressive (tutto al valore max)
  - **🔧 FUNZIONI**: Solo condizioni logiche (`ruleBundle.conditions[]`) → TRUE/FALSE
  - **⚙️ OPERAZIONI**: Definite nel configuratore quando funzione = TRUE
  - **🤖 REGOLA BRAINSTORMING (OBBLIGATORIO)**:
    - Quando l'utente chiede "implementiamo una tipologia di configuratore" → **PRIMA fare brainstorming**
    - Porre domande basate su `docs/commissioning.md` per coprire tutti gli aspetti:
      - Layer principale? (RS/PdV/User)
      - Driver disponibili? (valenza/fatturato/n.vendite/canone)
      - Paletti? (condizioni sblocca)
      - CAP? (limiti counting con comportamento blocco/scala)
      - Modalità soglie? (progressive/regressive)
      - Operazioni sui 4 valori? (×, +, −, ÷, %)
    - **⚠️ CONFIGURATORI TIPO SONO GLOBALI**: Disponibili a TUTTI i tenant (`tenant_id = NULL`)
- **📊 GTM (GOOGLE TAG MANAGER) ARCHITECTURE**:
  - **❌ NO MCP AUTO-CONFIG**: Rimosso google-tag-manager-mcp, niente auto-configurazione
  - **📋 TABELLA CENTRALIZZATA**: `tenant_gtm_config` con Mixed RLS pattern
    - `tenant_id = NULL` → Row globale con Container ID (GTM-XXXXXXX)
    - `tenant_id = UUID` → Row per tenant con API Secret (encrypted via EncryptionKeyService)
  - **🏪 STORE TRACKING**: `store_tracking_config` contiene IDs per store (GA4, Google Ads, Facebook, TikTok)
  - **📢 CAMPAGNE**: Eredita config da store + aggiungono UTM parameters
  - **🔒 ENCRYPTION**: API Secrets criptati con AES-256-GCM via `EncryptionKeyService` centralizzato
  - **📄 SNIPPET FLOW**:
    1. Store configura tracking IDs nel modal Settings → Store → Marketing
    2. GTMSnippetGeneratorService legge Container ID da global row
    3. Campagna genera snippet con UTM: `GET /api/crm/stores/:storeId/gtm-snippet`
  - **📡 MEASUREMENT PROTOCOL**: GTMEventsService invia eventi a GA4 con API Secret tenant-specific
- **🚨 CSS UNITS RULE - OBBLIGATORIO PER TUTTI I NUOVI SVILUPPI**:
  - **⚠️ REGOLA ASSOLUTA**: TUTTI i nuovi file e modifiche DEVONO usare `rem` per dimensioni
  - **✅ SEMPRE rem**: font-size, padding, margin, gap, width, height, border-radius, icon sizes
  - **✅ px OK SOLO**: border-width (1-2px), box-shadow offset/blur (piccoli valori fissi)
  - **❌ MAI px per**: font-size, padding, margin, gap, width, height - CAUSE BUG DI SCALING!
  - **Motivo**: VITE_FONT_SCALE=80 scala solo rem/em, px resta fisso e rompe il layout
  - **Formula**: `rem = px / 16` (es: 20px → 1.25rem, 16px → 1rem, 14px → 0.875rem, 12px → 0.75rem)
  - **Inline styles**: Usare rem anche in style={{}} (es: `padding: '1.25rem'` non `padding: '20px'`)
  - **Tailwind OK**: Le classi Tailwind (p-4, w-6, gap-2) usano già rem internamente
  - **Refactor continuo**: Convertire pagine esistenti quando vengono toccate

# System Architecture
- **UI/UX Decisions**: The platform uses `shadcn/ui` (based on Radix UI) for consistent and accessible interfaces. All pages maintain a standard app structure with headers, sidebars, and white backgrounds. Responsive scaling is achieved by exclusively using `rem` units for new UI components, controlled by `VITE_FONT_SCALE=80`. Forms include Italian Business Validation with real-time feedback, localized error messages, and Zod schemas for data integrity.
- **Technical Implementations**: The backend leverages PostgreSQL with a 3-schema architecture (`w3suite`, `public`, `brand_interface`). Security features include OAuth2/OIDC, MFA, JWTs, and a 3-level RBAC system with Row-Level Security (RLS) driven by `app.tenant_id`. Key modules are a Universal Workflow Engine, Unified Notification System, Centralized Webhook Management, Task Management, and a Multi-Provider OAuth (MCP). AI integration consists of an AI Voice Agent with RAG, AI Enforcement Middleware, an AI Workflow Builder, and Intelligent Workflow Routing. The WMS supports diverse product types with dual-layer versioning, 13 logistic states, serialized/non-serialized items, immutable event logs, and historical snapshots. The Brand Interface offers a Workflow Builder and a Git-versioned JSON-based Master Catalog System. The Commissioning Module calculates commissions using a three-level architecture (Type, Template, Instance) with configurable functions and variables. GTM integration uses `tenant_gtm_config` with Mixed RLS and `store_tracking_config` for store-specific tracking, encrypting API Secrets via `EncryptionKeyService`.
- **System Design Choices**: The platform's hierarchical structure is Tenant → Commercial Area → Organization Entity → Store → Department → Team → User. A Cross-Store Architecture provides tenant-wide data visibility with Role-Based Access (RBA) and advanced filtering. Request routing employs "Functional First → First Wins" and "Shift-Based Routing" strategies. All system actions are managed through `action_definitions`, which is the single source of truth for the MCP Gateway, with routing by `UnifiedTriggerService`. User scope data is consistently derived from `user_stores`. VPS deployment is incremental using `deploy/incremental-deploy.sh` scripts to `/var/www/w3suite/`, secured via SSH with `deploy/keys/vps_key`. Frontend builds require `VITE_AUTH_MODE=oauth2` and `VITE_FONT_SCALE=80`. The `w3suite_prod` database is accessed securely via a local socket over SSH.

# External Dependencies
- PostgreSQL
- Redis
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
- Google Tag Manager (GTM)
- Seeweb (Cloud Provider for Production)
- Proxmox VE (Virtualization for Production)
- Fortinet FortiGate (Firewall for Production)
- Ceph (Distributed Storage for Production)