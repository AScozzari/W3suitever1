# Overview

This is a full-stack web application called "W3 Suite Development Hub" built as a cross-project development and code sharing platform for enterprise multi-tenant applications. The application serves as a centralized hub for managing code sharing strategies, templates, and references across multiple related projects in a suite. It demonstrates various architectural patterns for code reuse and project organization on the Replit platform.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **Authentication Flow**: Protected routes with automatic redirects based on authentication status

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Development**: tsx for TypeScript execution in development
- **Production Build**: esbuild for server bundling
- **API Structure**: RESTful endpoints with centralized route registration
- **Middleware**: Custom logging, JSON parsing, and error handling

## Authentication & Session Management
- **Provider**: Replit Auth (OpenID Connect)
- **Strategy**: Passport.js with OpenID Client strategy
- **Session Storage**: PostgreSQL-based sessions using connect-pg-simple
- **Security**: HTTP-only cookies with CSRF protection

## Database Architecture
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with TypeScript schema definitions
- **Migration**: Drizzle Kit for schema management
- **Connection**: Connection pooling with @neondatabase/serverless
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`

## Project Structure
- **Monorepo Style**: Organized with client, server, and shared directories
- **Client**: React frontend with component-based architecture
- **Server**: Express backend with modular route organization  
- **Shared**: Common TypeScript types and database schemas
- **Component Library**: shadcn/ui components for consistent design system

## Development Workflow
- **Hot Reloading**: Vite HMR for frontend, tsx watch mode for backend
- **Type Safety**: Strict TypeScript configuration across all modules
- **Path Aliases**: Configured aliases for clean imports (@/, @shared/, @assets/)
- **Error Handling**: Runtime error overlay in development with Replit integration

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