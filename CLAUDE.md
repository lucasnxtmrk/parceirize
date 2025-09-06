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

**Parceirize** is a Next.js 14 discount club management platform with three distinct user roles:
- **Administradores** → `/dashboard` routes - manage customers, partners, vouchers
- **Clientes** → `/carteirinha` routes - digital membership card, browse vouchers
- **Parceiros** → `/relatorio` routes - sales reporting, voucher management

### Core Directory Structure

```
src/app/
├── (administrador)/    # Admin-only routes (role-protected)
├── (clientes)/        # Customer-only routes  
├── (parceiros)/       # Partner-only routes
├── (other)/           # Public routes (auth, errors, home)
├── api/               # API Route Handlers
└── middleware.js      # Role-based route protection
```

### Authentication System

- **NextAuth.js** with JWT tokens (`src/app/api/auth/[...nextauth]/options.js`)
- **Credentials provider** with bcryptjs password hashing
- **Database authentication** via UNION query across `clientes`, `parceiros`, `admins` tables
- **Automatic role-based redirects** after login handled by middleware

### Database Architecture

**PostgreSQL** with raw SQL queries (no ORM):
- `clientes` - Customer data with carteirinha (membership card) system
- `parceiros` - Partners with nicho (niche) categorization  
- `admins` - Administrative users
- `vouchers` - Discount vouchers linked to partners
- `integracoes` - SGP third-party integration settings

Key patterns:
- User roles determined by which table contains their record
- Status management (ativo/inativo) for customers and partners
- External SGP integration for customer synchronization

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