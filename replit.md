# Overview
W3 Suite is a multi-tenant enterprise platform designed to centralize business operations across various modules, including CRM, POS, WMS, Analytics, HR, CMS, and Bidding. It features a distinctive WindTre glassmorphism design, robust security measures, and utilizes PostgreSQL with Row Level Security (RLS) for stringent tenant isolation. The platform's primary goal is to significantly enhance operational efficiency and capitalize on market opportunities by providing a scalable, secure, and comprehensive business solution.

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
- **VOIP/SIP CONFIGURATION (REGOLA ASSOLUTA)**:
  - **📞 WebSocket URL Format**: SEMPRE `wss://{sipServer}/ws` sulla porta 443
  - **❌ MAI usare porta 8443** - non esiste, usare sempre 443
  - **❌ MAI hardcodare server** - usare SEMPRE `sipServer` dall'estensione
  - **✅ wsPort**: Sempre 443 per WSS
  - **✅ wsPath**: Sempre `/ws`
  - **✅ URL Pattern**: `wss://{extension.sipServer}/ws`
- **🔒 PENDING: VPS SSL/HTTPS Setup (TODO DOMANI)**:
  - **Domain**: w3suite.it (comprato, su Aruba - da trasferire DNS a Cloudflare)
  - **VPS IP**: 82.165.16.223
  - **certbot**: Già installato su VPS
  - **nginx**: Configurato per w3suite.it (server_name aggiornato)
  - **Azione**: Configurare DNS A record su Cloudflare → 82.165.16.223 (proxy OFF)
  - **Comando certbot**: `certbot --nginx -d w3suite.it --no-redirect`
  - **VoIP richiede HTTPS**: WebRTC non funziona su HTTP (media devices blocked)
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
  - **Deploy Steps**:
    1. Build: `npx esbuild ... --outfile=dist/server.cjs`
    2. Upload: `scp dist/server.cjs root@82.165.16.223:/var/www/w3suite/releases/TIMESTAMP/`
    3. Symlink: `ln -s /var/www/w3suite/releases/TIMESTAMP /var/www/w3suite/current`
    4. Restart: `pm2 delete w3-api && pm2 start current/server.cjs --name w3-api --update-env && pm2 save`
  - **SSH Access**: `ssh -i ~/.ssh/vps_deploy root@82.165.16.223`
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
- **UI/UX Decisions**: Utilizes a WindTre Glassmorphism Design System, implemented with `shadcn/ui`, `@w3suite/frontend-kit`, CSS variables, and Tailwind CSS. All pages maintain a consistent app structure with a header, sidebar, and white background.
- **Monorepo Structure**: Centralized code organization for efficient management.
- **Database Architecture**: Employs a 3-schema approach (`w3suite`, `public`, `brand_interface`) with PostgreSQL and Row Level Security (RLS) to ensure robust multitenancy and tenant isolation.
- **Security**: Implements OAuth2/OIDC, Multi-Factor Authentication (MFA), JSON Web Tokens (JWTs), and a 3-level Role-Based Access Control (RBAC) system with Italian role templates and granular permissions.
- **Core Systems**: Includes a Universal Workflow System, Unified Notification System, Centralized Webhook System, Task Management System, and a Multi-Provider OAuth System (MCP).
- **AI Integration**: Features AI Enforcement Middleware, an AI Workflow Builder (using OpenAI `gpt-4o` for ReactFlow DSL), Intelligent Workflow Routing, an AI Tools Ecosystem with PDC Analyzer (GPT-4 for PDF contract analysis), an AI Voice Agent System (OpenAI Realtime API `gpt-4o-realtime`), and an AI Funnel Orchestration System (`funnel-orchestrator-assistant`). An AI Voice Agent RAG System leveraging `pgvector` for WindTre offers is also integrated.
- **CRM Module**: Focuses on a person-centric identity graph, omnichannel engagement, pipeline management, GDPR compliance, lead-to-deal workflows, and a Customer 360° Dashboard.
- **Campaign Management**: Supports dual-mode campaign creation (wizard/advanced) and enforces GDPR Consent.
- **Deployment & Governance**: Features a Deploy Center Auto-Commit System (Git-like versioning) and Bidirectional Branch Linking.
- **Brand Interface**: Includes a Workflow Builder (n8n-style with Zustand, 5 specialized node components, 106 MCP nodes) and a Master Catalog System (hybrid architecture for template governance using JSON files with Git versioning).
- **VoIP Telephony**: Provides Enterprise WebRTC, multi-store trunks, SIP, WebRTC extensions, CRM integration for call actions, CDR analytics, policy-based routing, and EDGVoIP PBX Integration with per-tenant API keys. The VoIP architecture includes bidirectional sync with `edgvoip` as a potential `syncSource` and detailed `syncStatus`.
- **RBAC System**: Offers 10 Italian role templates with 215 granular permissions, including default assignments for roles like Amministratore and Store Manager.
- **Workflow Database Operations**: Provides secure SELECT, INSERT, UPDATE, DELETE operations on the `w3suite` schema with a visual query builder, RLS enforcement, prepared statements, and table/column validation.
- **Store Working Stats API**: Aggregates working days and hours for stores using multiple tables with double-layer tenant isolation.
- **Shift Template Versioning System**: Ensures immutable version tracking for shift templates.
- **WMS Module (CQRS Architecture)**: Supports PHYSICAL and VIRTUAL/CANVAS/SERVICE product types. Features dual-layer product versioning, 13 logistic states, management of serialized and non-serialized products, an immutable event log (`wms_stock_movements`), a read model (`wms_inventory_balances`) for real-time quantities, and historical snapshots (`wms_inventory_snapshots`). Includes document tables for purchase orders, sales, transfers, and returns. Designed for high scalability with PostgreSQL partitioning. The Enterprise Inventory Dashboard provides KPI cards, traffic light stock status, pagination, multi-format export, and cross-store views.
- **WMS Core Definitions**: Defines "CONDIZIONE" (physical state), "STATO LOGISTICO" (logistic phase), and "STOCK" (aggregated quantities), with distinct views for serialized items.
- **WMS Movement Type Configuration**: 15 movement types taxonomy (5 inbound, 6 outbound, 4 internal) with per-tenant configuration via System Config page. Movement types include: purchase, customer_return, transfer_in, warranty_return, trade_in (inbound); sale, supplier_return, transfer_out, doa, pullback, loan (outbound); adjustment, damage, demo, internal_use (internal). Each type supports: enabled/disabled toggle, approval workflow requirement, linked workflow template, and required documents. API endpoints: `/api/wms/movement-type-configs` (GET/POST/PATCH) with RBAC protection via `wms.settings.read/write` permissions.
- **System Config Page**: Modular settings dashboard at `/settings/system` with tabs for WMS Movements, VoIP, HR, CRM, Notifications. WMS tab displays collapsible sections by direction with toggle controls and workflow template selectors.

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