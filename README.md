# Crisis Dashboard

Real-time emergency management dashboard for San Miguel de Tucumán, Argentina. Monitors climate crisis events (floods, fires, storms, civil unrest), dispatches resources, and uses AI to analyze social media for incident detection.

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4 + Radix UI primitives
- **Maps**: Leaflet + React-Leaflet (dark CARTO tiles)
- **Charts**: Recharts
- **Data Fetching**: SWR
- **AI**: Google Gemini 1.5 Flash (social media analysis)
- **Database**: Supabase (PostgreSQL)
- **Notifications**: Sonner toasts
- **Deployment**: Vercel

## Architecture

```
app/
├── page.tsx              # Main dashboard (responsive: desktop + mobile tabs)
├── layout.tsx            # Root layout with theme provider
└── api/
    ├── incidentes/       # CRUD for incidents
    └── recursos/         # CRUD for resources

components/dashboard/
├── ai-activity-log/      # AI agent panel + social media connectors
├── crisis-map/           # Leaflet map + incident markers + deploy modals
├── analytics-panel.tsx  # Metrics: response time, resolution rate, severity
├── resources-panel.tsx  # Resource list with status (available/dispatched/busy)
├── broadcast-panel.tsx  # Emergency broadcast to civil defense
├── dev-panel.tsx        # Simulation controls (SWR mutate, dev mode)
├── header.tsx           # Top bar with alert count and controls
└── live-alert.tsx       # Pulsing alert notifications

hooks/
├── use-incident-simulator.ts  # Generates simulated incidents (4min interval)
├── use-resource-lifecycle.ts # Auto-transitions: dispatched → busy → available
├── use-simulation-loop.ts     # Coordinates simulation + Supabase sync
├── use-auto-resolve.ts        # Auto-resolves incidents after timeout
└── use-toast.ts              # Toast hook (shadcn/sonner)

lib/
├── api.ts               # Centralized fetch helpers (all validate res.ok)
├── mock-data.ts         # Simulated incident locations (Tucumán)
├── types.ts             # Domain types (Incident, Resource, DbIncident, etc.)
├── supabase/
│   ├── client.ts        # Browser Supabase client
│   └── server.ts        # Server-side Supabase client (for API routes)
└── agents/
    ├── gemini-analyzer.ts    # Gemini 1.5 Flash integration
    ├── social-media-agent.ts # Orchestrates X/IG/FB connectors
    ├── types.ts
    └── connectors/
        ├── base.ts           # Base connector interface
        ├── x-connector.ts    # Twitter/X connector
        ├── instagram-connector.ts
        ├── facebook-connector.ts
        └── mock-connector.ts  # For development without live social data
```

## Features

### Live Incident Map
- Dark CARTO map tiles centered on Tucumán (`-26.8241, -65.2226`)
- Incident markers color-coded by severity (critical/high/medium/low)
- Filter by source: social media, sensors, cameras
- Click incident → deploy resources modal

### AI Activity Log
- Gemini 1.5 Flash analyzes X/Instagram/Facebook for crisis signals
- Auto-creates incidents from social posts with confidence scoring
- Dispatches nearest available resource automatically
- Activity timeline with agent reasoning panel

### Resource Management
- Real-time resource status from Supabase (SWR polling every 2s)
- Status flow: `available → dispatched → busy → available`
- Automatic lifecycle transitions (50s dispatched, 60s busy)
- ETA countdown for en-route resources

### Analytics Panel
- Active incident count by severity
- Average response time
- Resolution rate
- AI agent accuracy trend

### Simulation Mode (Dev Panel)
- Toggle simulation on/off
- Inject custom incidents
- View active dispatches with ETA countdown
- Force mutate SWR cache for testing

### Broadcast
- Send emergency alert to Civil Defense and Fire Department
- Pre-formatted WhatsApp/Civil Defense messages
- Copy-to-clipboard with toast confirmation

## Key Implementation Details

### Hydration Safety
Random values (affected people count, resource ETAs) are generated client-side only via `useEffect` to prevent server/client mismatches.

### API Response Validation
All fetch calls validate `res.ok` before parsing JSON. Failed requests throw descriptive errors instead of silent failures.

### setTimeout Cleanup
`use-resource-lifecycle.ts` maintains a module-level `Map` of active timers. Timeouts are cleared on component unmount and when a resource lifecycle completes to prevent memory leaks.

### Incident Respawn
When a DB incident is resolved, a new simulated incident respawns at a random Tucumán location after 2 minutes to keep the map populated.

### Location Concurrency Rule
The simulator enforces that a single location cannot have two active incidents simultaneously. The `occupiedLocationsRef` Set tracks this without relying on async state.

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database Schema (Supabase)

**incidentes**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tipo | text | flood, fire, storm, looting, violence, accident, general |
| severidad | text | critical, high, medium, low |
| ubicacion | text | Human-readable location name |
| latitud | float8 | Latitude |
| longitud | float8 | Longitude |
| personas_afectadas | int4 | Affected people count |
| fuente | text | social, sensor, camera |
| fuente_detalles | jsonb | Platform-specific metadata |
| created_at | timestamptz | Creation timestamp |

**recursos**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tipo | text | ambulance, firefighter, helicopter, boat, shelter, medical, police |
| nombre | text | Resource name |
| estado | text | available, dispatched, busy |
| ubicacion | text | Current location |
| incidente_id | uuid | FK to incidentes (nullable) |