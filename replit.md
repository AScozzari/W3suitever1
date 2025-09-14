# Overview

W3 Suite is a comprehensive, multi-tenant enterprise platform for business management, featuring a strictly structured monorepo architecture. It includes CRM, POS, Warehouse, Analytics, HR, CMS, and Bidding modules, all designed with a WindTre glassmorphism aesthetic (orange #FF6900, purple #7B2CBF). The platform utilizes OAuth2/OIDC authentication with MFA, PostgreSQL with Row Level Security (RLS), and a feature-first architecture. A separate Brand Interface HQ system, designed for centralized control and cross-tenant management, operates independently with its own database schema and API. The project aims to provide a robust, scalable, and secure solution for enterprise operations.

# User Preferences

- Preferred communication style: Simple, everyday language
- **CRITICAL**: NO shared/ folder - Schema MUST be in apps/backend/api/src/db/schema/ (exact structure)
- **NEVER create shared/ folder again** - Use direct imports from backend schema location
- **UI/UX CONSISTENCY RULE**: Tutte le pagine devono mantenere la struttura dell'app con header e sidebar
- **PAGE STRUCTURE**: Non creare pagine indipendenti, integrare contenuto nella dashboard esistente
- **BACKGROUND RULE**: Tutte le pagine devono avere sfondo bianco (#ffffff) con header e sidebar
- **DATABASE ARCHITECTURE**: Always use 3-schema structure (w3suite, public, brand_interface)
- **COMPONENT-FIRST APPROACH (OBBLIGATORIO)**:
  1. **SEMPRE shadcn/ui FIRST** - Check 48 componenti disponibili prima di creare custom
  2. **Copy & Paste workflow** - `npx shadcn@latest add [component-name]`
  3. **No component reinvention** - usa Button, Card, Dialog, Form, Table esistenti
  4. **Accessibility built-in** - Radix primitives garantiscono WCAG compliance
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
  - **`[brand_interface]`** = Schema Brand Interface (brand_users, brand_tenants, etc.)

# System Architecture

The project is structured as an enterprise monorepo, separating tenant-facing applications (W3 Suite) from a centralized Brand Interface HQ system.

**Monorepo Structure:**
- **apps/**: Contains distinct applications:
    - **frontend/web/**: W3 Suite SPA (React) with glassmorphism UI for tenants.
    - **frontend/brand-web/**: Brand Interface SPA (React) for HQ operations, with multi-workspace dashboard and dedicated authentication.
    - **backend/api/**: NestJS API for W3 Suite, handling authentication, RBAC, tenancy (RLS), and audit logs.
    - **backend/brand-api/**: NestJS API for Brand Interface, managing analytics, pricing, campaigns, and event propagation.
    - **backend/workers/brand-propagation/**: BullMQ consumer for brand-to-tenant event propagation.
    - **backend/cms-render/**: Edge renderer (Astro/Workers) for public landing pages.
- **packages/**: Shared libraries and components:
    - **ui/**: Design system components (Tailwind+shadcn, glassmorphism styling).
    - **tokens/**: Tailwind preset and CSS variables.
    - **sdk/**: TypeScript client SDKs for Suite and Brand APIs.
    - **dwh/**: Data Warehouse query types and utilities.
    - **cms-core/**: CMS schema and logic.
    - **cms-render/**: Shared rendering blocks.
    - **agents/**: AI tools for development.
- **db/**: Database migration scripts for OLTP (Suite), Brand API, and DWH.

**UI/UX Design:**
- **Glassmorphism WindTre Design System**: Uses specific brand colors (orange #FF6900, purple #7B2CBF) and glassmorphism effects for UI elements.
- **Component-First Approach**: Prioritizes `shadcn/ui` components (48 available) for consistency, accessibility, and efficiency.
- **Styling**: Relies on CSS variables for colors, Tailwind CSS for spacing, responsive design, and utility-based styling.
- **Typography**: Inter as primary font, JetBrains Mono for monospaced text.
- **Branding**: Tenant-customizable logos and colors.

**Technical Implementations:**
- **Database Architecture**: 3-schema structure: `w3suite` (tenant-specific), `public` (reference data), and `brand_interface` (Brand Interface isolated system).
- **Security**: OAuth2/OIDC with MFA, JWTs, PostgreSQL RLS for tenant isolation, and granular RBAC.
- **Multitenancy**: RLS at the database level, `TenantProvider` for context switching, and global unique constraints for entity codes (Tenant, Ragione Sociale, Punto Vendita).
- **Organizational Hierarchy**: Pyramid structure: TENANT (Organization) > RAGIONI SOCIALI (Legal Entities) > PUNTI VENDITA (Sales Points) > RISORSE (Employees/Users).
- **Brand Interface Features**: Centralized Super Admin role, cross-tenant campaign creation, pricing management, business driver definition, and selective deployment via BullMQ event propagation.

# External Dependencies

## Database Services
- **Replit Native PostgreSQL**: Built-in PostgreSQL 16 database managed by Replit, providing `DATABASE_URL` environment variable, integrated rollback, and connection pooling. Utilizes Neon infrastructure transparently.

## Authentication Services
- **OAuth2/OIDC Enterprise**: OpenID Connect provider for user authentication. Requires `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `OAUTH_ISSUER_URL`, `OAUTH_REDIRECT_URI`, `JWT_SECRET`, and `SESSION_SECRET` environment variables.

## UI Component Ecosystem
- **SHADCN/UI**: Primary UI component library (48 components available), integrated via copy-paste.
- **TAILWIND ECOSYSTEM (Backup Components)**: Headless UI, Flowbite, daisyUI, Preline UI, FlyonUI, TailGrids are available as alternative/backup component sources.
- **Existing Project Components**: Custom components in `packages/ui/` (Button, Card, Header, Table, Sidebar, Form Fields) and `packages/tokens/` (Tailwind preset, glass utilities, text gradients, CSS variables).

## Icon & Utility Libraries
- **Lucide React**: Icon library.
- **TanStack React Query**: Server state management and caching.
- **React Hook Form**: Form handling with validation.
- **Radix UI**: Headless component primitives (underlying shadcn/ui).

## Development Tools
- **Vite**: Frontend build tool.
- **Drizzle Kit**: Database schema management and migrations.
- **PostCSS**: CSS processing with Tailwind CSS.
- **ESBuild**: Production bundling for server code.

## Replit Platform Integration
- **Vite Plugin**: For runtime error modal and cartographer integration.
- **Environment Detection**: Conditional plugin loading based on `REPL_ID`.
- **Development Banner**: Replit branding script for external access.