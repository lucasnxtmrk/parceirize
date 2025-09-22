# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev          # Start development server on port 3000
bun dev              # Alternative using bun (preferred, faster)

# Production build and start
npm run build        # TypeScript compile + Next.js build
npm run start        # Start production server on port 3100

# Code quality
npm run lint         # Run ESLint analysis
npm run format       # Format code with Prettier (150 char width, no semicolons)

# Database
node scripts/run-init.js    # Initialize database with scripts/init.sql
node scripts/seed.js        # Seed database (basic structure)
node gerar_hash.js         # Generate bcrypt password hashes
```

## Architecture Overview

**Parceirize** is a Next.js 14 discount club management platform with a 4-level hierarchical structure:
- **ADMIN** (Superadmin) → Manages provedores, full system control
- **PROVEDORES** (Tenant Admins) → `/dashboard` routes - manage their own parceiros and clientes, pay for platform access
- **PARCEIROS** (Partners/Stores) → `/painel` routes - sales reporting, voucher management within their provedor
- **CLIENTES** (End Users) → `/carteirinha` routes - digital membership card, browse vouchers from their provedor's parceiros

### Hierarchical Structure
```
ADMIN
├── PROVEDOR A
│   ├── PARCEIRO A1
│   ├── PARCEIRO A2
│   ├── CLIENTE A1
│   └── CLIENTE A2
├── PROVEDOR B
│   ├── PARCEIRO B1
│   ├── CLIENTE B1
│   └── CLIENTE B2
```

Each provedor operates as an isolated tenant with their own ecosystem of parceiros and clientes.

### Core Directory Structure

```
src/app/
├── (administrador)/    # Provedor routes (tenant admin) - /dashboard
├── (clientes)/        # Customer routes - /carteirinha
├── (parceiros)/       # Partner routes - /painel
├── (other)/           # Public routes (auth, errors, home)
├── api/               # API Route Handlers with tenant isolation
└── middleware.js      # Role-based route protection + tenant isolation
```

### Authentication System

- **NextAuth.js** with JWT tokens (`src/app/api/auth/[...nextauth]/options.js`)
- **Credentials provider** with bcryptjs password hashing
- **Database authentication** via UNION query across `clientes`, `parceiros`, `admins` tables
- **Tenant isolation** - each provedor has isolated data access to their own parceiros/clientes
- **Automatic role-based redirects** after login handled by middleware
- **Superadmin access** for full system control and provedor management

### Database Architecture

**PostgreSQL** with raw SQL queries (no ORM):
- `admins` - Administrative users (includes superadmin and provedores)
- `clientes` - Customer data with carteirinha system + `provedor_id` for tenant isolation
- `parceiros` - Partners with nicho categorization + `provedor_id` for tenant isolation
- `vouchers` - Discount vouchers linked to partners
- `integracoes` - SGP third-party integration settings per provedor

Key patterns:
- **Tenant isolation**: All data filtered by `provedor_id` except for superadmin
- **4-level hierarchy**: ADMIN → PROVEDOR → PARCEIRO/CLIENTE relationship
- User roles determined by which table contains their record + `tipo` field in admins
- Status management (ativo/inativo) for all user levels
- Payment control for provedores (manual payment to maintain platform access)
- External SGP integration for customer synchronization per provedor

### Technology Stack

- **Next.js 14** with App Router and TypeScript
- **React Bootstrap + SCSS** for styling
- **PostgreSQL** with direct `pg` connections
- **Environment**: `.env` with `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`

### Key API Patterns

- `/api/admin/*` - Administrative endpoints (protected by role)
- `/api/parceiro/*` - Partner-specific endpoints  
- `/api/vouchers` - Voucher management and listing
- `/api/validarVoucher` - QR code voucher validation
- All API routes use direct SQL queries with connection pooling

### Development Notes

- **Path aliases**: `@/*` maps to `src/*` via tsconfig.json
- **Port configuration**: Dev on 3000, production on 3100
- **Password hashing**: Use `gerar_hash.js` utility for manual password generation
- **Database init**: Run `scripts/run-init.js` to set up initial schema
- **Role testing**: Switch between user types by logging in with different accounts from respective tables