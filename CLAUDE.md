# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Express + Vite HMR) on port 3002
npm run build     # Build client (Vite → dist/public) + server (esbuild → dist/index.js)
npm run start     # Run production server on port 3000
npm run check     # TypeScript type-check (also aliased as npm run lint)
npm run db:push   # Push Drizzle schema changes to PostgreSQL
```

No test suite is configured.

## Architecture

Full-stack TypeScript monorepo (single `package.json`). The app is a SaaS for construction company management (quotes, projects, scheduling, CRM, invoicing, team management).

```
client/src/       — React 18 + Vite frontend
server/           — Express backend (API routes, email, team auth)
shared/           — Drizzle ORM schema (shared types)
supabase/         — DB migrations & SQL scripts
```

**Vite config:** root is `client/`, builds to `dist/public`. Path aliases: `@` → `client/src`, `@shared` → `shared`.

**Deployment:** Vercel hosts the static SPA (`dist/public`). The Express server must be deployed separately (Railway, Fly, etc.).

## Frontend

**Routing:** Wouter (`useLocation`). Public routes: `/`, `/login`, `/auth`, `/team-members-login`, `/invite/*`. Protected dashboard routes are gated by `<ProtectedRoute>` in `client/src/App.tsx`.

**State:**
- Auth state: `AuthContext` (`client/src/context/AuthContext.tsx`) via Supabase JWT
- Business data: feature-specific custom hooks (`useClients`, `useChantiers`, `useDevis`, `useFactures`, `useRendezVous`, `useCrmPipeline`, `useBranding`, `useProfilEntreprise`, `useCataloguePrestations`, etc.)
- Global project state: `ChantiersContext`
- React Query (`queryClient`) is configured with `staleTime: Infinity` and no refetch-on-focus — cache is invalidated manually

**Data hooks pattern:** Each hook manages local `state[]`, `loading`, `error`, sets up a Supabase real-time Postgres Change subscription on mount, and exposes CRUD methods (`save*`, `delete*`) that call Supabase JS SDK directly then `refresh()`.

**UI stack:** Radix UI primitives + Shadcn/ui components (`components/ui/`), Tailwind CSS, Framer Motion animations, glassmorphism/mesh-gradient visual style (`GlobalBackground.tsx`). Forms use React Hook Form + Zod.

## Backend

**Entry:** `server/index.ts` — Express app, serves Vite dev middleware in development or `dist/public` in production.

**Routes registered in `server/routes.ts`:**
- `/api/crm/*` — CRM email sending via Resend (`server/crmEmail.ts`)
- `/api/team/*` — Team member PIN-based auth (`server/teamMemberAuth.ts`)

## Auth Flow

Two parallel auth systems:
1. **Owner (admin):** Supabase email/password → JWT session managed by `AuthContext`
2. **Team members:** PIN login via `POST /api/team/login` → server calls Supabase RPC → returns custom session token stored in `localStorage`

`<ProtectedRoute>` checks `useAuth().loading` then redirects unauthenticated users to `/login`.

## Environment Variables

See `.env.example` (root) and `client/.env.example`. Key vars:

| Variable | Where used |
|---|---|
| `VITE_SUPABASE_URL` | Client + server |
| `VITE_SUPABASE_ANON_KEY` | Client + server |
| `VITE_OWNER_ID` | Client — Supabase Auth user UUID for the business owner |
| `RESEND_API_KEY` / `RESEND_FROM` | Server only |

`load-app-env.ts` merges root `.env` and `client/.env` at startup and replicates Supabase credentials to server-side vars.

## Database

Supabase (PostgreSQL). Tables: `clients`, `chantiers`, `devis`, `factures`, `team_members`, `rendez_vous`, `user_profiles`, and others. Drizzle ORM schema in `shared/schema.ts` is the source of truth for migrations (`npm run db:push`). Real-time subscriptions use Supabase Postgres Change Listener.
