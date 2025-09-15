# Overview

W3 Suite is a multi-tenant enterprise platform within a structured monorepo, offering CRM, POS, Warehouse, Analytics, HR, CMS, and Bidding modules. It features a WindTre glassmorphism design, OAuth2/OIDC with MFA, PostgreSQL with Row Level Security, and a feature-first architecture. A separate Brand Interface HQ system provides centralized control and cross-tenant management. The project aims to deliver a scalable, secure, and comprehensive business management solution.

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

The project employs an enterprise monorepo structure, separating tenant-facing applications (W3 Suite) from a centralized Brand Interface HQ system.

**Embedded Nginx Architecture:**
A Node.js master process orchestrates an embedded Nginx reverse proxy, routing traffic to internal services:
- W3 Suite Frontend (Port 3000)
- W3 Suite Backend (Port 3004)
- Brand Frontend (Port 3001)
- Brand Backend (Port 3002)

**Monorepo Structure:**
- **`apps/`**: Contains `frontend/web/` (W3 Suite SPA), `frontend/brand-web/` (Brand Interface SPA), `backend/api/` (W3 Suite API), `backend/brand-api/` (Brand Interface API), `backend/workers/brand-propagation/` (BullMQ consumer), and `backend/cms-render/` (Edge renderer).
- **`packages/`**: Shared libraries including `ui/` (Design system), `tokens/` (Tailwind preset), `sdk/` (TypeScript client SDKs), `dwh/`, `cms-core/`, `cms-render/`, and `agents/`.
- **`db/`**: Database migration scripts.

**UI/UX Design:**
- **Glassmorphism WindTre Design System**: Utilizes brand colors (#FF6900, #7B2CBF) and glassmorphism effects.
- **Component-First Approach**: Prioritizes `shadcn/ui` components for consistency and accessibility, complemented by CSS variables and Tailwind CSS.
- **Typography**: Inter (primary) and JetBrains Mono (monospaced).
- **Branding**: Supports tenant-customizable logos and colors.

**Technical Implementations:**
- **Database Architecture**: A 3-schema structure (`w3suite`, `public`, `brand_interface`) for data isolation and management.
- **Security**: OAuth2/OIDC with MFA, JWTs, PostgreSQL RLS for tenant isolation, and granular RBAC.
- **Multitenancy**: RLS at the database level, `TenantProvider` for context, and global unique constraints.
- **Organizational Hierarchy**: Defines relationships between TENANTs, RAGIONI SOCIALI (Legal Entities), PUNTI VENDITA (Sales Points), and RISORSE (Users).
- **Brand Interface Features**: Centralized Super Admin, cross-tenant campaign/pricing management, and event propagation via BullMQ.
- **Data Architecture Patterns**:
    - **Brand Base + Tenant Override**: For entities managed by both Brand and Tenants (e.g., Suppliers, Products), using a base table and an override table.
    - **Brand-Only**: For entities exclusively managed by Brand (e.g., Stores, Legal Entities), with tenant read-only access controlled by `assigned_tenants` array.

# External Dependencies

## Database Services
- **Replit Native PostgreSQL**: Built-in PostgreSQL 16 managed by Replit (via Neon).

## Authentication Services
- **OAuth2/OIDC Enterprise**: For user authentication.

## UI Component Ecosystem
- **SHADCN/UI**: Primary UI component library.
- **Existing Project Components**: Custom components in `packages/ui/` and `packages/tokens/`.

## Icon & Utility Libraries
- **Lucide React**: Icon library.
- **TanStack React Query**: Server state management.
- **React Hook Form**: Form handling.
- **Radix UI**: Headless component primitives.

## Development Tools
- **Vite**: Frontend build tool.
- **Drizzle Kit**: Database schema management.
- **PostCSS**: CSS processing.
- **ESBuild**: Server code bundling.

## Replit Platform Integration
- **Vite Plugin**: For runtime error modal and cartographer integration.
- **Environment Detection**: Conditional plugin loading based on `REPL_ID`.
- **Development Banner**: Replit branding script.