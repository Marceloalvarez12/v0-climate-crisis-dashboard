# AGENTS.md

## Project Overview

Next.js 16 (App Router) + TypeScript dashboard for climate emergency management in San Miguel de Tucumán. Simulated-data build: runs **without login** and with a **dual data layer** — Supabase (PostgreSQL) when credentials exist, in-memory store seeded with simulated data otherwise. Includes the public citizen report flow (/reportar, /mapa, /seguimiento) and the admin panel.

## Data layer (dual mode) — `lib/db.ts`

`getDb()` returns a `DataStore` selected at runtime:

- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set → `lib/db-supabase.ts` (real Supabase, same queries as the PMV schema: `incidentes`, `recursos`, `config_sistema`, `perfiles`, `asignaciones_recursos`).
- Not set → `lib/mock-db.ts` (in-memory store on `globalThis`, HMR-safe, seeded with 5 incidents + 11 resources + `agent_mode.autonomous=true` + demo profiles). Incident/resource IDs are real UUIDs.

**No services or routes import `@/lib/supabase` directly** — everything goes through the `DataStore` interface. `lib/auth.ts` replaces Supabase Auth: `requireStaff()` always returns a demo admin profile, `auditAdmin()` writes to the store's audit log. `proxy.ts` only enforces body-size cap + rate limits; every page and API is public.

## Developer Commands

```bash
npm install      # Install dependencies
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
```

## Dev Mode

In local development only, append `?dev=true` to enable the simulation control panel (bottom-left corner). It has a social post composer (Facebook/Instagram/X), injects citizen ZK reports, and toggles the simulated social feed. The panel is unavailable in production and simulated social mentions are rejected outside development.

## Social Hashtag Trigger

Social incidents are created ONLY from posts containing the trigger hashtag (`#AlertaTucuman`, override with `NEXT_PUBLIC_TRIGGER_HASHTAG`). There is no random incident spawning anymore.

- Single pipeline: `lib/services/social-incident-service.ts` → `ingestSocialPost()` (hashtag filter → dedup by post id → LLM/heuristic analysis → gazetteer geocoding → corroborate or create).
- Entry points: `POST /api/social/mention` (webhook, supports `?dryRun=true`) and `SocialMediaAgent.runScan()` (`POST /api/agent`).
- `UsgsConnector` and `EonetConnector` are not active sources: incidents require an incoming citizen report or social mention. The dashboard no longer triggers agent scans. Historical USGS/EONET rows remain in Supabase but are excluded from incident reads and analytics with `isNonReportIncident`; do not delete them without approval. `/api/incidentes/respawn` returns 410. Real reports are not auto-resolved or expired by simulation maintenance.
- Analyzer fallback chain: OpenRouter → Gemini → `lib/agents/heuristic-analyzer.ts` (rule-based, no key needed).
- Isomorphic helpers (safe in client): `lib/agents/hashtag.ts`, `lib/agents/tucuman-gazetteer.ts`, `lib/social-feed-simulator.ts`.
- Active social incidents show in the map's Active tab with a "Pending Validation" badge; posts dedup via `fuente_detalles.related_post_ids`.
- Without `.env.local` everything works against the in-memory store. `dryRun` on the social endpoint requires `x-api-secret: <API_SECRET>` (or any call in development); production rejects dry-runs.
- Citizen ZK reports require real `zk/build/` wasm/zkey/verification_key.json artifacts. Missing artifacts or failed verification return an error, never a synthetic proof. The circuit declares coordinates private, but exact coordinates remain in operational DB fields; public map responses are approximate.
- Quick check: `curl -X POST "localhost:3000/api/social/mention" -H "Content-Type: application/json" -d '{"platform":"facebook","author":"x","text":"Incendio en Yerba Buena #AlertaTucuman","simulated":true}'`

## Environment Variables (.env.local)

All env vars are optional — without any of them the app runs in simulated memory mode.

- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — enable real Supabase mode (both required together)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — only needed if client-side Supabase is reintroduced
- `GOOGLE_AI_API_KEY` — Gemini API for AI analysis
- `API_SECRET` — Server-to-server auth for social/agent APIs only. Never set `NEXT_PUBLIC_API_SECRET` (old deployed value must be rotated if it was shared).
- `ARKIV_PRIVATE_KEY` — Blockchain signing key (**never prefix with NEXT_PUBLIC_**)

Arkiv dispatch endpoint falls back to simulated mode if `ARKIV_PRIVATE_KEY` is `'0xREEMPLAZAR_CON_TU_PRIVATE_KEY_AQUI'`.

## Admin & User Management (no login)

- This build has **no authentication**: `/login`, `/recuperar`, `/restablecer`, `/auth/callback` were removed. `lib/auth.ts` stubs `requireStaff()` (demo admin profile) and `auditAdmin()` (store audit log).
- `/admin` is open, sidebar layout (`?section=`): **control** (agent kill switch → `config_sistema.agent_mode`), **thresholds** (`auto_resolve_minutes`, `confidence_threshold`), **connections** (read-only configured flags), **users** (demo profiles; create operator / roles / suspend are simulated via the store), **resources** (full CRUD via `/api/recursos`). Components live in `components/admin/`.
- `/api/recursos`: full CRUD, public. Dispatch uses compare-and-set (`estado=available` required) → `409` on concurrent claims. With Supabase mode, `cantidad`/`cantidad_disponible` require `supabase-migration-recursos-cantidad.sql`.
- `lib/services/config-service.ts` — `getSystemConfig`/`getConfigNumber`, tolerant reads with 10s cache. Agent/social ingest fail closed when `agent_mode` is absent (memory store seeds it `autonomous=true`).
- With real Supabase, `replace_operator_resources` and `registrar_auditoria` RPCs come from `supabase-auth-hardening.sql` (kept in the PMV branch, not in this repo).

## API Security

All `/api/*` routes are **public** in this build (no session). `proxy.ts` still enforces the 256 KiB body cap and rate limits; `x-api-secret: <API_SECRET>` remains an optional check inside service endpoints that use it (`hasOperatorAccess` in zk-report dryRun).

Rate limiting is applied via `lib/rate-limit.ts`: Redis REST with atomic Lua counters when `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are configured; bounded local counters otherwise. `RATE_LIMIT_REQUIRE_DISTRIBUTED=true` requires Redis and rejects APIs with 503 on missing configuration/outages. Limits: 200 API requests/min, 3 citizen report attempts/10min, 10 ZK proof generations/min per IP. The proxy rejects API bodies larger than 256 KiB before parsing them. See `docs/rate-limiting.md`; the hosting proxy must sanitize client IP headers.

## Architecture

- `app/` — Next.js App Router pages and API routes
- `app/api/incidentes/` — Core API routes for incident management
- `app/api/agent/` — AI agent endpoint (Gemini analysis)
- `app/auditoria/page.tsx` — Public blockchain audit portal (`/auditoria`)
- `app/mapa/page.tsx` — Public read-only live map (`/mapa`); backed by `app/api/public/incidentes` (sanitized fields, no `fuente_detalles`)
- `lib/services/` — Business logic layer (IncidentService, ArkivService, api-response helpers)
- `lib/db.ts` — Data layer selector (Supabase ⇄ memory). `lib/supabase.ts` is only used by `lib/db-supabase.ts`.
- `lib/config.ts` — Centralized constants (limits, timeouts, coordinates, keywords)
- `lib/agents/` — Social media connectors and Gemini analyzer
- `hooks/` — Custom React hooks (simulation, realtime, etc.)

## Framework Quirks

- **Tailwind CSS v4** — Uses CSS-based config in `app/globals.css`, no `tailwind.config.js`. PostCSS plugin is `@tailwindcss/postcss`.
- **Next.js build** — TypeScript errors fail the build. No env vars are required at build time: `lib/db.ts` selects the store lazily at request time.
- **shadcn/ui** — Components use `components.json` schema. Aliases: `@/components/ui`, `@/lib/utils`, `@/hooks`.
- **Arkiv SDK** — Uses `@arkiv-network/sdk` with `braga` chain and `http()` transport for wallet client.

## Key Integrations

### Arkiv Blockchain
- Network: Braga Testnet
- Explorer: `https://explorer.braga.hoodi.arkiv.network/entity/{entityKey}`
- Dispatch creates entity with 7-day lease; AI detection entities start with 1-hour lease
- `ArkivService` in `lib/services/arkiv-service.ts` handles all blockchain operations with automatic simulated mode fallback

### Live updates
- The UI polls via SWR (`useMapData`, 3s refresh). No Realtime/WebSocket dependency — works in both storage modes.

### Google Gemini
- Model: `gemini-2.0-flash`
- Used by `SocialMediaAgent` for filtering and severity classification

## Code Conventions

- **API Routes** use `lib/services/api-response.ts` helpers (`apiSuccess`, `apiError`, `apiValidationError`, `apiNotFound`)
- **Business logic** lives in `lib/services/` — route handlers should be thin wrappers
- **Constants** are centralized in `lib/config.ts` — avoid magic numbers in code
- **Validation** uses Zod schemas in `lib/validation.ts`

## Known Issues (To Be Addressed)

### Security
- Rotate `API_SECRET` if it was ever deployed as `NEXT_PUBLIC_API_SECRET`; removing it from the source does not invalidate already published bundles.
- Enable the configured distributed rate limiter in production; IP quotas still need a trusted proxy and edge protection against distributed abuse.
- With real Supabase, admin actions that change Auth and `perfiles` span two services and cannot be made atomic by a database transaction alone. Monitor and reconcile partial failures.
- Never commit `.env.local` or secrets; keep service role, Gemini and blockchain keys server-side.

### Performance
- **Sequential queries per mention**: `ingestSocialPost()` runs up to 4 sequential Supabase queries per hashtag post (dedup, location, count, insert). Consider an RPC if volume grows.

### Validation
- `npm run lint` requires zero warnings. `npm test` covers the rate limiter without external services. `npx tsc --noEmit` and lint should run before publishing.

### Architecture
- **Next.js request gate**: Rate limiting and the body cap use the Next.js 16 `proxy.ts` convention.
- **Rate limiting activation**: Without Redis env vars, counters remain local. Configure Redis and `RATE_LIMIT_REQUIRE_DISTRIBUTED=true` for shared enforcement across serverless instances.

## Testing

`npm test` runs rate limiter tests; `npm run zk:check` generates and verifies real ZK proofs. Manual dashboard testing via `?dev=true` simulation panel.
