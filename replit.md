# Overview

W3 Suite è una piattaforma enterprise multitenant completa per la gestione aziendale con architettura monorepo rigorosamente strutturata. Include moduli CRM, POS, Magazzino, Analytics, HR, CMS, Gare con design system glassmorphism WindTre (arancione #FF6900, viola #7B2CBF). Autenticazione OAuth2/OIDC con MFA, PostgreSQL con RLS, feature-first architecture.

# User Preferences

- Preferred communication style: Simple, everyday language
- **CRITICAL**: NO shared/ folder - Schema MUST be in apps/backend/api/src/db/schema/ (exact structure)
- **NEVER create shared/ folder again** - Use direct imports from backend schema location
- **UI/UX CONSISTENCY RULE**: Tutte le pagine devono mantenere la struttura dell'app con header e sidebar
- **PAGE STRUCTURE**: Non creare pagine indipendenti, integrare contenuto nella dashboard esistente
- **BACKGROUND RULE**: Tutte le pagine devono avere sfondo bianco (#ffffff) con header e sidebar

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

### 🏢 TENANT (Organizzazione)
- **Livello**: Root dell'organizzazione
- **Contenuto**: Una o più Ragioni Sociali
- **Permessi**: Isolamento completo RLS PostgreSQL

### 🏛️ RAGIONI SOCIALI  
- **Livello**: Entità giuridiche all'interno del Tenant
- **Relazione**: Molte-a-Uno con Tenant
- **Contenuto**: Punti vendita associati

### 🏪 PUNTI VENDITA
- **Livello**: Unità operative fisiche/virtuali
- **Relazione**: Molte-a-Uno con Ragioni Sociali
- **Attributi Base**: Nome, indirizzo, codice, stato operativo
- **Brand Association**: WindTre e/o Very Mobile
- **Canale**: Franchising | Top Dealer | Dealer
- **Clusterizzazione**: Per potenziale su driver business:
  - Fisso (fibra, ADSL)
  - Mobile (contratti, ricariche)
  - Energia (gas, luce)  
  - Protezione (antivirus, backup)
  - Assicurazione (auto, casa, vita)

### 👥 RISORSE (Dipendenti)
- **Livello**: Persone che lavorano nell'organizzazione
- **Abilitazioni Cascading**:
  - **Tenant-wide**: Accesso completo organizzazione
  - **Ragione Sociale**: Una o più RS specifiche
  - **Punto Vendita**: Uno o più PV specifici
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
- **Replit Auth**: OpenID Connect provider for user authentication
- **Required Environment Variables**: 
  - REPL_ID (Replit application identifier)
  - SESSION_SECRET (session encryption key)
  - ISSUER_URL (OIDC issuer, defaults to replit.com/oidc)
  - REPLIT_DOMAINS (allowed domains for auth)

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