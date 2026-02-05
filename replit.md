# replit.md

## Overview

This is a **Spring Boot Project Generator** - a web application that allows developers to configure and download customized Spring Boot starter projects as ZIP files. Similar to Spring Initializr, users can select Java version, dependencies, package names, and optional scaffolding features (CRUD, authentication, seed data). The application generates a complete Maven-based Spring Boot project structure on demand.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React Hook Form for form state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for page transitions and interactive feedback
- **Build Tool**: Vite with path aliases (`@/` for client/src, `@shared/` for shared)

The frontend is a single-page application with a form-based UI for configuring Spring Boot projects. It handles Blob responses for ZIP file downloads.

### Backend Architecture
- **Framework**: Express.js 5 on Node.js with TypeScript
- **API Pattern**: REST API with type-safe route definitions in `@shared/routes.ts`
- **Validation**: Zod schemas for request/response validation, shared between client and server
- **ZIP Generation**: JSZip library for creating downloadable project archives on-the-fly

Key endpoints:
- `POST /api/generate` - Generates and returns a ZIP file with the configured Spring Boot project
- `GET /api/stats` - Returns analytics on total projects generated and popular dependencies

### Data Storage
- **Database**: PostgreSQL via `pg` driver
- **ORM**: Drizzle ORM with schema defined in `@shared/schema.ts`
- **Migrations**: Drizzle Kit (`drizzle.config.ts`) for schema management
- **Purpose**: Logs project generations for analytics (group ID, artifact ID, Java version, selected dependencies)

### Shared Code Pattern
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts` - Database table definitions and Zod validation schemas
- `routes.ts` - API endpoint definitions with paths, methods, and type-safe input/output schemas

This pattern ensures type safety across the full stack and single source of truth for API contracts.

### Build System
- **Development**: Vite dev server with HMR, proxied through Express
- **Production**: 
  - Client: Vite builds to `dist/public`
  - Server: esbuild bundles to `dist/index.cjs` with selective dependency bundling for faster cold starts

## External Dependencies

### Database
- **PostgreSQL**: Required for logging project generations. Connection via `DATABASE_URL` environment variable.
- **connect-pg-simple**: Session storage (configured but sessions not actively used in current routes)

### UI Component Libraries
- **Radix UI**: Headless primitives for accessible components (dialogs, dropdowns, forms, etc.)
- **shadcn/ui**: Pre-styled components built on Radix, configured via `components.json`
- **Lucide React**: Icon library

### Key NPM Packages
- `jszip` - Creates ZIP archives for project downloads
- `zod` - Schema validation for API requests/responses
- `drizzle-orm` + `drizzle-zod` - Database ORM with Zod schema generation
- `react-hook-form` + `@hookform/resolvers` - Form management with Zod integration
- `framer-motion` - Animation library
- `date-fns` - Date formatting utilities

### Development Tools
- **@replit/vite-plugin-runtime-error-modal** - Runtime error overlay for development
- **@replit/vite-plugin-cartographer** - Replit-specific dev tooling