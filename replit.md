# Overview

W3 Suite è una piattaforma enterprise multitenant completa per la gestione aziendale con architettura monorepo rigorosamente strutturata. Include moduli CRM, POS, Magazzino, Analytics, HR, CMS, Gare con design system glassmorphism WindTre (arancione #FF6900, viola #7B2CBF). Autenticazione OAuth2/OIDC con MFA, PostgreSQL con RLS, feature-first architecture.

## 🚧 BRAND INTERFACE HQ - IMPLEMENTATO (10 Settembre 2025)
- **Brand Interface HQ**: Sistema di controllo centralizzato completamente separato
- **Port 5001**: Brand API backend con autenticazione JWT dedicata
- **Database Schema**: brand_interface schema isolato con tabelle dedicate (brand_users, brand_tenants, brand_roles, brand_audit_logs)
- **UI Dashboard**: Dashboard multi-workspace per gestione cross-tenant
- **Ruoli Gerarchici**: super_admin, area_manager, national_manager con RBAC completo
- **Workspaces**: Admin, Marketing, Sales, Operations con UI glassmorphism dedicata
- **Test Suite**: 12 test completi per validazione sicurezza e funzionalità
- **Autenticazione**: JWT con bcrypt per production, seed data con 3 utenti test
- **Note**: Per eseguire Brand Interface, avviare `cd apps/backend/brand-api && tsx src/index.ts` su porta 5001

## ✅ MIGRAZIONE DATABASE COMPLETATA (10 Settembre 2025)
- Architettura a 3 schemi implementata con successo
- **w3suite schema**: Tutte le tabelle tenant-specific (users, tenants, stores, roles, etc.)
- **public schema**: Solo dati di riferimento (commercial_areas, countries, channels, etc.) 
- **brand_interface schema**: Sistema isolato Brand Interface
- RLS policies attive con tenant isolation funzionante
- Tutti gli API endpoint testati e funzionanti

# User Preferences

- Preferred communication style: Simple, everyday language
- **CRITICAL**: NO shared/ folder - Schema MUST be in apps/backend/api/src/db/schema/ (exact structure)
- **NEVER create shared/ folder again** - Use direct imports from backend schema location
- **UI/UX CONSISTENCY RULE**: Tutte le pagine devono mantenere la struttura dell'app con header e sidebar
- **PAGE STRUCTURE**: Non creare pagine indipendenti, integrare contenuto nella dashboard esistente
- **BACKGROUND RULE**: Tutte le pagine devono avere sfondo bianco (#ffffff) con header e sidebar
- **DATABASE ARCHITECTURE**: Always use 3-schema structure (w3suite, public, brand_interface)

# System Architecture - W3 Suite Enterprise Monorepo

## 🏗️ STRUTTURA MONOREPO ENTERPRISE (ESATTA DA DOCUMENTO TECNICO)

### apps/
- **frontend/web/** - SPA "Suite" (tenant-facing) React + Glassmorphism WindTre
  - src/app/ - bootstrap, router, providers, theme
  - src/layout/ - AppShell/Header/Sidebar (glass effects)
  - src/features/ - feature-first: cassa/, magazzino/, settings/, crm/, gare/, report/, hr/, cms/
  - src/core/ - api client, access guard, hooks comuni
  - src/styles/ - tailwind.css, tokens bridge
  
- **frontend/brand-web/** - SPA "Brand Interface" (HQ)
  - src/app/ - bootstrap brand, OIDC brand
  - src/layout/ - shell con settori (marketing/sales/ops/admin)
  - src/core/ - BrandAccessProvider, guards, scope switcher
  - src/features/ - sales/, marketing/, ops/, amministrativo/, dev-tools/

- **backend/api/** - NestJS Suite (OLTP)
  - src/core/ - auth (OIDC+MFA), rbac, tenancy (RLS), audit, settings-base
  - src/db/ - schema/, migrations/, seed/
  - src/modules/ - DDD-lite per dominio

- **backend/brand-api/** - NestJS Brand (DWH + orchestrazione)
  - src/auth/, src/rbac/ - ruoli per settore + scope rete
  - src/analytics/ - query DWH (read-only)
  - src/pricing/, src/campaigns/, src/templates/
  - src/propagation/ - emitter eventi (BullMQ) → workers

- **backend/workers/brand-propagation/** - consumer eventi brand→tenant (BullMQ)
- **backend/cms-render/** - renderer edge (Astro/Workers) per landing pubbliche

### apps/frontend/brand-web/
- **BRAND INTERFACE UI** - Sistema HQ completamente separato
  - src/pages/Dashboard.tsx - Dashboard multi-workspace con overview e analytics
  - src/components/BrandLayout.tsx - Layout principale con glassmorphism
  - src/components/workspaces/ - Admin, Marketing, Sales, Operations workspaces
  - src/contexts/BrandAuthContext.tsx - Autenticazione JWT per Brand Interface
  - src/contexts/BrandTenantContext.tsx - Gestione multi-tenant cross-organizzazione
  
### apps/backend/brand-api/
- **BRAND INTERFACE BACKEND** - API dedicate per sistema HQ
  - src/db/schema/brand-interface.ts - Schema database dedicato brand_interface
  - src/core/storage.ts - Storage layer per brand_users, brand_tenants, brand_roles
  - src/core/auth.ts - JWT authentication per super admin
  - src/core/routes.ts - API endpoints per Brand Interface operations
  - src/db/seed-brand.ts - Seed data per ambiente di test

### packages/
- **ui/** - design system (Tailwind+shadcn, glass) Button, Card, Table, Sidebar, Header
- **tokens/** - Tailwind preset + CSS vars (palette W3: arancio/viola/nero)  
- **sdk/** - client TS: sdk.api (suite) + sdk.brand (brand-api)
- **dwh/** - query/typing DWH (zod/types, sql tagged)
- **cms-core/** - schema/logic CMS (sites/pages/forms, publish)
- **cms-render/** - blocchi di rendering condivisi (Astro/React)
- **agents/** - strumenti AI per dev (PR-only): runner/, adapters/, orchestrator/, prompts/

### db/
- **oltp/** - migrazioni OLTP (Suite)
- **brand/** - migrazioni Brand API (cataloghi, deployments)  
- **dwh/** - schema DWH (read-only)

### Infrastruttura
- **configs/** - preset condivisi: eslint/, prettier/, tsconfig/, vite/, jest/
- **.github/workflows/** - CI/CD per ogni app + agent-orchestrator
- **docker/** - Dockerfile per ogni servizio + docker-compose.dev.yml
- **scripts/** - DX & ops: db.reset.ts, codegen.ts, dwh.sync.ts

## 🎨 DESIGN SYSTEM WINDTRE
- **Colori Brand**: Arancione #FF6900, Viola #7B2CBF, Nero/Bianco
- **Effetti**: Glassmorphism completo con backdrop-blur, rgba backgrounds
- **Typography**: Inter + JetBrains Mono
- **Spacing**: Scale xs→4xl, Border radius sm→full
- **Animazioni**: glass-float, glass-pulse, gradient-shift

## 🔐 ARCHITETTURA SICUREZZA ENTERPRISE  
- **Auth**: OAuth2/OIDC con Authorization Code + PKCE, MFA obbligatorio
- **Tokens**: JWT con capabilities, refresh automatico
- **Database**: PostgreSQL con RLS (Row Level Security) per isolamento tenant
- **RBAC**: Ruoli granulari per settore, scope per rete
- **Session**: PostgreSQL-based sessions, HTTP-only cookies

## 🏢 MULTITENANT ENTERPRISE
- **Isolamento**: RLS a livello database per separazione dati tenant
- **Context**: TenantProvider per context switching automatico
- **Billing**: Override billing per tenant, flags feature
- **Branding**: Logo/colori personalizzabili per tenant

## 🏗️ ARCHITETTURA ORGANIZZATIVA ENTERPRISE

### Gerarchia Entità Piramidale
```
TENANT (Organizzazione)
├── RAGIONI SOCIALI (1+)
    ├── PUNTI VENDITA 
        ├── RISORSE (Dipendenti)
```

## 🔒 UNICITÀ GLOBALE CODICI ENTERPRISE
- **✅ IMPLEMENTATA**: Vincoli UNIQUE globali per tutti i codici cross-tenant
- **Codici Ragioni Sociali**: Univoci in tutto il progetto (tutti i tenant)
- **Codici Punti Vendita**: Univoci in tutto il progetto (tutti i tenant)  
- **Codici Tenant**: Univoci globalmente
- **Database**: Constraints attivi impediscono duplicati automaticamente

### 🏢 TENANT (Organizzazione)
- **Livello**: Root dell'organizzazione
- **Contenuto**: Una o più Ragioni Sociali (relazione 1:N OBBLIGATORIA)
- **Codice**: UNIVOCO GLOBALE cross-tenant
- **Permessi**: Isolamento completo RLS PostgreSQL

### 🏛️ RAGIONI SOCIALI  
- **Livello**: Entità giuridiche all'interno del Tenant
- **Relazione**: Molte-a-Uno OBBLIGATORIA con Tenant (1:1 verso organizzazione)
- **Codice**: UNIVOCO GLOBALE cross-tenant  
- **Contenuto**: Punti vendita associati (relazione 1:N)

### 🏪 PUNTI VENDITA
- **Livello**: Unità operative fisiche/virtuali
- **Relazione OBBLIGATORIA**: Molte-a-Uno con Ragioni Sociali (1:1 verso ragione sociale)
- **Relazione CANALE**: 1:1 OBBLIGATORIA con Canale (deve scegliere un canale)
- **Relazione BRAND**: 1:N OBBLIGATORIA con Brand (almeno un brand, può avere più brand)
- **Codice**: UNIVOCO GLOBALE cross-tenant
- **Attributi Base**: Nome, indirizzo, codice, stato operativo
- **Canali Disponibili**: Franchising | Top Dealer | Dealer
- **Brand Disponibili**: WindTre e/o Very Mobile (multiselect)
- **Clusterizzazione**: Per potenziale su driver business:
  - Fisso (fibra, ADSL)
  - Mobile (contratti, ricariche)
  - Energia (gas, luce)  
  - Protezione (antivirus, backup)
  - Assicurazione (auto, casa, vita)
- **CAMPI OBBLIGATORI NEI MODAL**: Tutti i campi relazionali sono obbligatori

### 👥 RISORSE (Dipendenti/Utenti)
- **Livello**: Persone che lavorano nell'organizzazione
- **Relazione OBBLIGATORIA**: 1:N con Ragioni Sociali (possono scegliere più ragioni sociali)
- **Relazione MULTIPLA**: N:M con Punti Vendita (possono scegliere più PV)
- **Punto Vendita Default**: UNO dei PV selezionati come preferenza default (modificabile)
- **Utilizzo Futuro**: Il PV default verrà usato per funzioni automatiche
- **Abilitazioni Cascading**:
  - **Tenant-wide**: Accesso completo organizzazione
  - **Ragione Sociale**: Una o più RS specifiche (con obbligo di scelta)
  - **Punto Vendita**: Uno o più PV specifici (con default)
- **Permessi**: Sistema RBAC granulare

### 🎯 BRAND INTERFACE - SUPER ADMIN
- **Ruolo**: Super Admin centralizzato
- **Scope**: Cross-tenant operations
- **Funzionalità**:
  - Creazione Campagne (globali/specifiche per organizzazione)
  - Gestione Listini prezzi
  - Definizione nuovi Asset Business "Driver"
  - Deploy selettivo: tutte le organizzazioni OR organizzazione specifica
- **Propagazione**: Sistema eventi BullMQ → workers per deployment

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Environment**: Requires DATABASE_URL environment variable

## Authentication Services  
- **OAuth2/OIDC Enterprise**: OpenID Connect provider for user authentication
- **Required Environment Variables**: 
  - OAUTH_CLIENT_ID (OAuth2 client identifier)
  - OAUTH_CLIENT_SECRET (OAuth2 client secret)
  - OAUTH_ISSUER_URL (OIDC issuer URL, e.g., Keycloak, Auth0)
  - OAUTH_REDIRECT_URI (OAuth2 callback URL)
  - JWT_SECRET (JWT token encryption key)
  - SESSION_SECRET (session encryption key)

## UI Component Libraries
- **Radix UI**: Headless component primitives for accessibility
- **Lucide React**: Icon library for consistent iconography
- **TanStack React Query**: Server state management and caching
- **React Hook Form**: Form handling with validation

## Development Tools
- **Vite**: Frontend build tool with React plugin
- **Drizzle Kit**: Database schema management and migrations
- **PostCSS**: CSS processing with Tailwind CSS
- **ESBuild**: Production bundling for server code

## Replit Platform Integration
- **Vite Plugin**: Runtime error modal and cartographer integration
- **Environment Detection**: Conditional plugin loading based on REPL_ID
- **Development Banner**: Replit branding script for external access