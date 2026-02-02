# Overview
W3 Suite is an AI-powered, multi-tenant enterprise platform designed to centralize business operations across various modules like CRM, POS, WMS, Analytics, HR, and CMS. Its primary purpose is to enhance operational efficiency, deliver data-driven insights, and support strategic decision-making through advanced AI capabilities. The project aims to establish W3 Suite as a leading AI-native operating system for modern enterprises, holding significant market potential and ambitious growth plans.

# User Preferences
- Preferred communication style: Simple, everyday language
- Always use `staging` tenant slug. Never use `demo`, `w3-demo`, or other tenant slugs.
- Never create `shared/` folder.
- Never reference `shared/schema.ts`.
- All pages must maintain the app structure with header and sidebar.
- Do not create independent pages; integrate content into the existing dashboard.
- All pages must have a white background (`#ffffff`) with header and sidebar.
- Always use `app.tenant_id` for setting the tenant context.
- Always use `db.transaction()` or `withTenantTransaction()` to ensure `set_config` and queries use the same connection from the pool.
- Always use `false` as the third parameter for `set_config` (session-scoped).
- Always use shadcn/ui first.
- Use copy & paste workflow for shadcn/ui components (`npx shadcn@latest add [component-name]`).
- Do not reinvent components; use existing shadcn/ui components like Button, Card, Dialog, Form, Table.
- All interactive elements must have `data-testid`.
- Always use TypeScript interfaces.
- Always use `useTenantNavigation` hook to avoid double tenant slug in URLs.
- When asked to deploy to VPS, always use incremental deploy script: `./deploy/incremental-deploy.sh [backend|frontend|full]`.
- Frontend build command must include `VITE_AUTH_MODE=oauth2` and `VITE_FONT_SCALE=80`.
- When the user asks to "implement a configurator type," first brainstorm by asking questions based on `docs/commissioning.md`.
- All new files and modifications must use `rem` for dimensions (font-size, padding, margin, gap, width, height, border-radius, icon sizes).
- Only `px` is acceptable for `border-width` (1-2px) and `box-shadow` offset/blur (small fixed values).
- Never use `px` for font-size, padding, margin, gap, width, or height.
- Use `rem` for inline styles (e.g., `padding: '1.25rem'`).
- Always use these prefixes in prompts to avoid ambiguity on which scope to work: `[W3]`, `[BRAND]`, `[w3suite]`, `[PUBLIC]`, `[brand_interface]`.
- Do not use inline hex colors.
- Do not create custom components when shadcn/ui or frontend-kit has one.
- Do not use white/solid backgrounds without glassmorphism.
- Do not use text on colored backgrounds without contrast check.
- Always use CSS variables, component reuse, accessibility, and mobile-first approach.
- Always check frontend-kit before creating anything.
- Always use templates to avoid structural issues.
- Always import from `@w3suite/frontend-kit`, not create new.
- Never duplicate existing components.
- Never use hex colors directly.

# System Architecture
- **UI/UX Decisions**: The platform uses `shadcn/ui` for consistent and accessible interfaces, adhering to a component-first approach. Pages maintain a standard structure with headers, sidebars, and white backgrounds. Responsive scaling is achieved by exclusively using `rem` units for new UI components, controlled by `VITE_FONT_SCALE=80`. Forms incorporate Italian Business Validation with real-time feedback, localized error messages, and Zod schemas. Design tokens and templates are preferred over inline styles and custom layouts.
- **Technical Implementations**: The backend is built on PostgreSQL with a 3-schema architecture (`w3suite`, `public`, `brand_interface`). Security features include OAuth2/OIDC, MFA, JWTs, and a 3-level RBAC system with Row-Level Security (RLS) driven by the `app.tenant_id` context. Key modules include a Universal Workflow Engine, Unified Notification System, Centralized Webhook Management, Task Management, and a Multi-Provider OAuth (MCP) Gateway. AI integration features an AI Voice Agent with RAG, AI Enforcement Middleware, an AI Workflow Builder, and Intelligent Workflow Routing. The WMS supports diverse product types with dual-layer versioning, 13 logistic states, serialized/non-serialized items, immutable event logs, and historical snapshots. The Brand Interface offers a Workflow Builder and a Git-versioned JSON-based Master Catalog System. The Commissioning Module calculates commissions using a three-level architecture (Type, Template, Instance) with configurable functions and variables. GTM integration uses a centralized `tenant_gtm_config` with Mixed RLS and `store_tracking_config` for store-specific tracking, encrypting API Secrets via `EncryptionKeyService`.
- **System Design Choices**: The platform's hierarchical data structure is Tenant → Commercial Area → Organization Entity → Store → Department → Team → User. A Cross-Store Architecture provides tenant-wide data visibility with Role-Based Access (RBA) and advanced filtering. Request routing employs "Functional First → First Wins" and "Shift-Based Routing" strategies. All system actions are managed through `action_definitions`, which serves as the single source of truth for the MCP Gateway, with routing handled by `UnifiedTriggerService`. User scope data is consistently derived from `user_stores`. VPS deployment is incremental using `deploy/incremental-deploy.sh` scripts to `/var/www/w3suite/`, secured via SSH with `deploy/keys/vps_key`. Frontend builds require `VITE_AUTH_MODE=oauth2` and `VITE_FONT_SCALE=80`. The `w3suite_prod` database is accessed securely via a local socket over SSH.

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