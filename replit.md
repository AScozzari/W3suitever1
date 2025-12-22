# Overview
W3 Suite is a multi-tenant enterprise platform designed to centralize and optimize business operations across various domains including CRM, POS, WMS, Analytics, HR, CMS, and Bidding. Its primary goal is to enhance efficiency, market responsiveness, and strategic decision-making, offering a comprehensive solution for modern businesses.

# User Preferences
- Preferred communication style: Simple, everyday language
- **🎯 DEFAULT TENANT: STAGING** (slug: `staging`, id: `00000000-0000-0000-0000-000000000001`)
  - **❌ NEVER use demo, w3-demo, or other tenant slugs** - ALWAYS use `staging`
  - **Route pattern**: `/staging/wms/inventory`, `/staging/crm/dashboard`, etc.
  - **Suppliers are brand-pushed** from tenant_id `00000000-0000-0000-0000-000000000000`
- **❌ NEVER create shared/ folder - IT DOES NOT EXIST**
- **❌ NEVER reference shared/schema.ts - IT DOES EXIST**
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
  - **❌ FORBIDDEN - Template Literals with tenantSlug**
- **TEAM MEMBERSHIP RULES (ANTI SELF-APPROVAL)**:
  - **🔒 Regola**: Se sei supervisore (primario o secondario) di un team, NON puoi essere membro (`userMembers`) dello stesso team
  - **✅ Supervisore multi-team**: Un supervisore PUÒ supervisionare più team dello stesso dipartimento
  - **✅ Supervisore come membro altrove**: Un supervisore PUÒ essere membro di un ALTRO team (anche stesso dipartimento)
  - **❌ Auto-approvazione**: Prevenuta dal vincolo supervisore ≠ membro stesso team
- **TEAM TYPE RULES (FUNCTIONAL vs TEMPORARY)**:
  - **🔒 Functional Teams**: Max 1 per dipartimento per utente - rappresenta il team "primario" permanente
  - **⏰ Temporary/Project Teams**: Nessun limite - l'utente può appartenere a multipli team temporanei per lo stesso dipartimento
  - **Tooltip**: Spiega all'utente il significato di ogni tipo di team
- **REQUEST ROUTING (FUNCTIONAL FIRST → FIRST WINS)**:
  - **Step 1**: Se l'utente ha un team FUNCTIONAL per il dipartimento della richiesta → route al supervisore primario
  - **Step 2**: Se nessun team functional, trova TUTTI i team temporanei dell'utente → notifica TUTTI i supervisori (First Wins)
  - **⚡ First Wins Pattern**: Il primo supervisore che risponde "vince" e gestisce la richiesta
  - **HTTP 409 Conflict**: Se un second supervisore prova ad approvare, riceve errore "Richiesta già gestita"
- **SHIFT-BASED ROUTING (ROUTING IBRIDO TURNI)**:
  - **📋 Categorie Operative**: `cambio_turno`, `straordinario`, `timbratura`, `turno_extra` → verificano turno attivo
  - **📋 Categorie Amministrative**: Tutto il resto (ferie, permessi, malattia) → sempre sede anagrafica
  - **🏪 Logica Routing**:
    1. Se richiesta è OPERATIVA E utente ha turno attivo in sede diversa dalla sua anagrafica → route a supervisore sede turno
    2. Se richiesta è OPERATIVA MA nessun turno attivo altrove → route a supervisore sede anagrafica
    3. Se richiesta è AMMINISTRATIVA → sempre supervisore sede anagrafica
  - **📊 Tracciabilità**: Metadata richiesta include `shiftBasedRouting` con storeId, storeName, shiftId
  - **🔧 Implementazione**: `request-trigger-service.ts` → `getActiveShiftStore()` + `isOperationalCategory()`
  - **📁 Action Tags Config**: `apps/backend/api/src/lib/action-tags.ts` → `routingCategory` per ogni tag
- **CROSS-STORE ARCHITECTURE (PATTERN FONDAMENTALE)**:
  - **🌐 Default View**: SEMPRE cross-store (tenant-wide) - tutti i negozi visibili
  - **🔐 Access Control**: Permessi basati su RUOLO, non su selezione negozio
  - **📊 Data Queries**: Omettere storeId per vista cross-store, passare solo per filtri specifici
  - **👤 Admin Role**: Vede tutto, tutti gli utenti, tutti i negozi, senza filtri obbligatori
  - **❌ MAI**: Auto-selezionare il primo negozio come default
  - **❌ MAI**: Richiedere selezione negozio per visualizzare dati
  - **✅ SEMPRE**: Mostrare aggregato cross-store, con filtri opzionali per drill-down
- **ENTITY ARCHITECTURE (DUAL-TABLE SEPARATION)**:
  - **🏢 `organization_entities`**: Ragioni Sociali del tenant/organizzazione (collegate a stores via `organization_entity_id`)
    - Endpoint: `GET/POST/PUT/DELETE /api/organization-entities`
    - Frontend: dropdown "Ragione Sociale" in StoreFormModal
  - **🤝 `legal_entities`**: Partner esterni con ruolo (Fornitori, Enti Finanzianti, Operatori)
    - **🔄 Propagazione**: Quando `is_supplier=true` → crea record in `suppliers`, `is_financial_entity=true` → `financial_entities`, etc.
    - **📋 Ruoli disponibili**: Fornitore, Ente Finanziante, Operatore (flags booleani sulla tabella)
  - **⚠️ IMPORTANTE**: Le due tabelle servono scopi diversi - NON confonderle!
  - **🔧 Stores FK**: Usare `organizationEntityId` (colonna `organization_entity_id`), `legalEntityId` è DEPRECATED
- **ORGANIZATIONAL HIERARCHY (SCOPING PIRAMIDALE)**:
  - **🏢 Struttura**: Tenant → Commercial Area → Organization Entity (RS) → Store → Department → Team → User
  - **📊 Reference Data (public schema)**: `commercial_areas` (4 aree: AREA1-4), shared across tenants
  - **🏪 Tenant Data (w3suite schema)**: `stores`, `organization_entities`, `legal_entities`, `departments`, `teams`, `users`
  - **🏬 Departments Table**: `w3suite.departments` con FK opzionale `store_id` per dipartimenti store-specific
  - **🔗 Team-Departments**: Tabella junction `team_departments` per relazione many-to-many
  - **🎯 Cascading Filters (User Modal)**: Area selection → filters Organization Entities → filters Stores
  - **⚠️ Area Mismatch Validation (Team Modal)**: Warning quando supervisor appartiene a area diversa dai membri
- **VOIP/SIP CONFIGURATION (REGOLA ASSOLUTA)**:
  - **📞 WebSocket URL Format**: SEMPRE `wss://{sipServer}/ws` sulla porta 443
  - **❌ MAI usare porta 8443** - non esiste, usare sempre 443
  - **❌ MAI hardcodare server** - usare SEMPRE `sipServer` dall'estensione
  - **✅ wsPort**: Sempre 443 per WSS
  - **✅ wsPath**: Sempre `/ws`
  - **✅ URL Pattern**: `wss://{extension.sipServer}/ws`
- **VPS Deploy Rules (OBBLIGATORIO)**:
  - **🚀 DEPLOY COMMAND**: Quando l'utente scrive "deploia sulla VPS", usare SEMPRE lo script incrementale chiedendo quale tipo:
    - `./deploy/incremental-deploy.sh backend` - Solo backend (più comune)
    - `./deploy/incremental-deploy.sh frontend` - Solo frontend
    - `./deploy/incremental-deploy.sh full` - Entrambi
  - **✅ INCREMENTAL DEPLOY**: Lo script sincronizza solo file sorgenti modificati e builda sulla VPS
  - **📁 File protetti** (esclusi da rsync in `deploy/rsync-exclude.txt`):
    - `.env.production`, `.env`, `ecosystem.config.cjs`
  - **❌ NEVER use full bundle upload** (85MB) - usa sempre deploy incrementale
  - **VPS Symlink**: `/var/w3suite/current/server.cjs`
  - **PM2 Process**: `w3-api` (porta 3004)
  - **FRONTEND DEPLOY**:
    - Build on VPS con `VITE_FONT_SCALE=80`
    - Output: `/var/w3suite/apps/frontend/web/dist/`
- **VPS DIRECTORY STRUCTURE (UGUALE A REPLIT)**:
  - **📁 Root**: `/var/www/w3suite/` (come root Replit)
  - **📁 Apps**: `/var/w3suite/apps/` (backend, frontend, voice-gateway)
  - **📁 Packages**: `/var/w3suite/packages/`
  - **📁 Configs**: `/var/w3suite/configs/`
  - **❌ MAI**: Non esiste più `/var/www/w3suite/app/` (struttura vecchia eliminata)
  - **✅ SEMPRE**: Usare path senza `/app/` intermedio
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
  - **❌ NEVER**: Forget `VITE_FONT_SCALE=80` when building frontend for VPS

# System Architecture
- **UI/UX Decisions**: WindTre Glassmorphism design with a fixed header/sidebar, white backgrounds, and build-time UI zoom (`VITE_FONT_SCALE=80`). The UI leverages `shadcn/ui`, Radix UI, CSS variables, and Tailwind CSS.
- **Technical Implementations**:
    - **Database**: PostgreSQL with a 3-schema architecture (`w3suite`, `public`, `brand_interface`) and Row Level Security (RLS).
    - **Security**: OAuth2/OIDC, MFA, JWTs, and 3-level Role-Based Access Control (RBAC).
    - **Core Systems**: Universal Workflow Engine, Unified Notification System, Centralized Webhook management, Task Management, and Multi-Provider OAuth (MCP).
    - **AI Integration**: AI Enforcement Middleware, AI Workflow Builder, Intelligent Workflow Routing, AI Tools Ecosystem, and an AI Voice Agent System with RAG.
    - **CRM Module**: Person-centric identity graph, omnichannel engagement, pipeline management, GDPR compliance, lead-to-deal workflows, and Customer 360° Dashboard.
    - **Deployment & Governance**: Deploy Center Auto-Commit System, Bidirectional Branch Linking, and an incremental VPS deployment script (`./deploy/incremental-deploy.sh`). VPS uses `/var/www/w3suite/` and SSH access via `ssh -i deploy/keys/vps_key root@82.165.16.223`, with DB access via local socket (`sudo -u postgres psql -d w3suite_prod`).
    - **Brand Interface**: Workflow Builder (Zustand with MCP nodes) and a Master Catalog System (Git-versioned JSON).
    - **VoIP Telephony**: Enterprise-grade WebRTC with multi-store trunks, SIP, WebRTC extensions, CRM integration, CDR analytics, policy-based routing, and EDGVoIP PBX Integration. WebSocket connections use `wss://{extension.sipServer}/ws` on port 443.
    - **WMS Module (CQRS)**: Implements CQRS pattern, supporting diverse product types, dual-layer product versioning, 13 logistic states, serialized/non-serialized product management, immutable event logs, read models, historical snapshots, and document tables. Includes an Enterprise Inventory Dashboard with KPIs and cross-store views, and tenant-configurable WMS Movement Type Configuration with approval workflows.
    - **System Config Page**: Modular settings dashboard at `/settings/system`, organized into tabs.
- **System Design Choices**:
    - **Business Drivers Architecture**: Multi-tenant drivers stored in `w3suite.drivers` with RLS.
    - **Organizational Hierarchy**: Pyramidal scoping (Tenant → Commercial Area → Organization Entity (RS) → Store → Department → Team → User) governs team structures and data access, including rules for membership and dynamic request routing.
    - **Entity Architecture**: Dual-table separation with `organization_entities` for tenant's legal business entities (linked to stores via `organization_entity_id`) and `legal_entities` for external partners with roles (suppliers, financial entities, operators). `organizationEntityId` is used for stores.
    - **Cross-Store Architecture**: Default view is always cross-store (tenant-wide); access control is role-based, not store selection-based. Data queries omit `storeId` for cross-store views, with optional filters.
    - **Request Routing**: Implements "Functional First → First Wins" and "Shift-Based Routing" mechanisms for intelligent request routing.

# External Dependencies
- **PostgreSQL**: Replit Native PostgreSQL 16 (via Neon)
- **Redis**: For BullMQ and Unified Notification System
- **OAuth2/OIDC Enterprise**: Authentication and authorization
- **SHADCN/UI**: Primary UI component library
- **Radix UI**: Headless component primitives
- **Lucide React**: Icon library
- **TanStack React Query**: Server state management
- **React Hook Form**: Form management and validation
- **Vite**: Frontend build tool
- **Drizzle Kit**: Database schema management
- **PostCSS**: CSS pre-processing
- **ESBuild**: Bundles server-side code
- **Nginx**: Reverse proxy
- **OpenAI**: AI services (`gpt-4o`, `gpt-4o-realtime`)