# Overview
W3 Suite is a multi-tenant enterprise platform designed to centralize and optimize business operations across various modules, including CRM, POS, WMS, Analytics, HR, CMS, and Bidding. Its primary goal is to enhance operational efficiency and market responsiveness through a scalable, secure, and comprehensive business solution, featuring a distinctive WindTre glassmorphism design. The project aims to deliver a unified platform that streamlines diverse business functions, improves data insights, and supports strategic decision-making, with a business vision to become the leading integrated business operations platform.

# User Preferences
- Preferred communication style: Simple, everyday language
- **🎯 DEFAULT TENANT: STAGING** (slug: `staging`, id: `00000000-0000-0000-0000-000000000001`)
  - **❌ NEVER use demo, w3-demo, or other tenant slugs** - ALWAYS use `staging`
  - **Route pattern**: `/staging/wms/inventory`, `/staging/crm/dashboard`, etc.
  - **Suppliers are brand-pushed** from tenant_id `00000000-0000-0000-0000-000000000000`
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
  - **HTTP 409 Conflict**: Se un secondo supervisore prova ad approvare, riceve errore "Richiesta già gestita"
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
- **ORGANIZATIONAL HIERARCHY (SCOPING PIRAMIDALE)**:
  - **🏢 Struttura**: Tenant → Commercial Area → Legal Entity → Store → Department → Team → User
  - **📊 Reference Data (public schema)**: `commercial_areas` (4 aree: AREA1-4), shared across tenants
  - **🏪 Tenant Data (w3suite schema)**: `stores`, `legal_entities`, `departments`, `teams`, `users`
  - **🏬 Departments Table**: `w3suite.departments` con FK opzionale `store_id` per dipartimenti store-specific
  - **🔗 Team-Departments**: Tabella junction `team_departments` per relazione many-to-many
  - **🎯 Cascading Filters (User Modal)**: Area selection → filters Legal Entities → filters Stores
  - **⚠️ Area Mismatch Validation (Team Modal)**: Warning quando supervisor appartiene a area diversa dai membri
- **VOIP/SIP CONFIGURATION (REGOLA ASSOLUTA)**:
  - **📞 WebSocket URL Format**: SEMPRE `wss://{sipServer}/ws` sulla porta 443
  - **❌ MAI usare porta 8443** - non esiste, usare sempre 443
  - **❌ MAI hardcodare server** - usare SEMPRE `sipServer` dall'estensione
  - **✅ wsPort**: Sempre 443 per WSS
  - **✅ wsPath**: Sempre `/ws`
  - **✅ URL Pattern**: `wss://{extension.sipServer}/ws`
- **VPS Deploy Rules (OBBLIGATORIO)**:
  - **❌ NEVER use `npm run build`** for VPS deploy - produces wrong output file
  - **✅ ALWAYS use `deploy/vps-deploy.sh`** or manual esbuild command below
  - **Build Command**: `npx esbuild apps/backend/api/src/index.ts --bundle --platform=node --target=node18 --external:pg-native --external:sharp --external:canvas --outfile=dist/server.cjs`
  - **Output File**: `dist/server.cjs` (81MB) - NOT `dist/index.js`
  - **VPS Symlink**: `/var/www/w3suite/current/server.cjs` → release folder
  - **PM2 Script Path**: `/var/www/w3suite/current/server.cjs`
  - **❌ NEVER overwrite on VPS**:
    - `.env.production` (secrets, DB, Redis, VITE_FONT_SCALE)
    - `.env` (local overrides)
    - `ecosystem.config.cjs` (PM2 config)
  - **FRONTEND DEPLOY (OBBLIGATORIO)**:
    1. Build: `cd apps/frontend/web && VITE_FONT_SCALE=80 npx vite build`
    2. Upload: `scp -r apps/frontend/web/dist/* root@82.165.16.223:/var/www/w3suite/apps/frontend/web/dist/`
    3. VPS Path: `/var/www/w3suite/apps/frontend/web/dist/`
    4. **⚠️ SEMPRE**: Includere `VITE_FONT_SCALE=80` nel comando build!
- **VITE_FONT_SCALE (UI Zoom)**:
  - **Location**: Set at BUILD time, not runtime (Vite bakes env vars)
  - **Current Value**: `VITE_FONT_SCALE=80` (80% = 20% smaller like browser zoom)
  - **Hook**: `useProductionScale()` in `App.tsx` applies `html { font-size: X% }`
  - **Values**: 100=normal, 90=10% smaller, 80=20% smaller, 70=30% smaller
  - **Scales**: Everything using `rem`/`em` (Tailwind, shadcn) - NOT `px` values
  - **❌ NEVER**: Use custom CSS folder approach (gets overwritten on deploy)
  - **❌ NEVER**: Forget `VITE_FONT_SCALE=80` when building frontend for VPS

# System Architecture
- **UI/UX Decisions**: Employs a WindTre Glassmorphism Design System, built with `shadcn/ui` and `@w3suite/frontend-kit`. It uses CSS variables and Tailwind CSS for styling, adhering to a consistent monorepo layout featuring a fixed header, sidebar, white backgrounds, and build-time controlled UI zoom via `VITE_FONT_SCALE`.
- **Technical Implementations**:
    - **Database**: PostgreSQL with a 3-schema approach (`w3suite`, `public`, `brand_interface`) and Row Level Security (RLS) for multi-tenancy.
    - **Security**: OAuth2/OIDC, MFA, JWTs, and a 3-level RBAC system with Italian role templates.
    - **Core Systems**: Universal Workflow, Unified Notification, Centralized Webhook, Task Management, and Multi-Provider OAuth (MCP).
    - **AI Integration**: AI Enforcement Middleware, AI Workflow Builder, Intelligent Workflow Routing, an AI Tools Ecosystem (PDC Analyzer), an AI Voice Agent System, and an AI Voice Agent RAG System.
    - **CRM Module**: Person-centric identity graph, omnichannel engagement, pipeline management, GDPR compliance, lead-to-deal workflows, and a Customer 360° Dashboard.
    - **Campaign Management**: Supports dual-mode campaign creation (wizard and advanced) with enforced GDPR Consent.
    - **Deployment & Governance**: Manages deployments via a Deploy Center Auto-Commit System and Bidirectional Branch Linking. VPS deployments adhere to specific build commands and environment variable handling.
    - **Brand Interface**: Workflow Builder (n8n-style with Zustand and 106 MCP nodes) and a Master Catalog System (hybrid architecture using JSON files with Git versioning).
    - **VoIP Telephony**: Enterprise-grade WebRTC with multi-store trunks, SIP, WebRTC extensions, CRM integration, CDR analytics, policy-based routing, and EDGVoIP PBX Integration with per-tenant API keys. VoIP/SIP configuration strictly uses `wss://{sipServer}/ws` on port 443.
    - **WMS Module (CQRS Architecture)**: Supports PHYSICAL and VIRTUAL/CANVAS/SERVICE products, dual-layer product versioning, 13 logistic states, serialized/non-serialized product management, immutable event logs, read models, historical snapshots, and document tables. It includes an Enterprise Inventory Dashboard with KPIs and cross-store views.
    - **WMS Movement Type Configuration**: A taxonomy of 15 movement types configurable per-tenant via a System Config page, featuring approval workflows and linked workflow templates.
    - **System Config Page**: A modular settings dashboard at `/settings/system` with tabs for WMS Movements, VoIP, HR, CRM, and Notifications.
    - **Business Drivers Architecture**: Multi-tenant drivers stored in `w3suite.drivers` with RLS for source types and product type associations.
    - **Organizational Hierarchy**: A pyramidal scoping structure (Tenant → Commercial Area → Legal Entity → Store → Department → Team → User) governing team membership, type, request routing, and cross-store data access.

# External Dependencies
- **PostgreSQL**: Replit Native PostgreSQL 16 (via Neon).
- **Redis**: Used for BullMQ and the Unified Notification System.
- **OAuth2/OIDC Enterprise**: For user authentication.
- **SHADCN/UI**: UI component library.
- **Radix UI**: Headless component primitives.
- **Lucide React**: Icon library.
- **TanStack React Query**: For server state management.
- **React Hook Form**: Handles form management and validation.
- **Vite**: Frontend build tool.
- **Drizzle Kit**: For database schema management.
- **PostCSS**: CSS pre-processing.
- **ESBuild**: Server-side code bundling.
- **Nginx**: As a reverse proxy.
- **OpenAI**: Provides AI services (`gpt-4o`, `gpt-4o-realtime`).