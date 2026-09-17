# Plan de Integración: Zntinel × God's Eye View

**Objetivo:** Elevar Zntinel de un dashboard 2D funcional a un **Sistema de Comando y Control 3D profesional** para gestión de crisis climáticas, integrando los componentes de mayor valor de God's Eye View (GEV).

---

## Fase 1: Fundación 3D — Reemplazar Leaflet por Cesium

### Estado actual
- Mapa 2D con Leaflet + CartoDB dark tiles
- Marcadores estáticos para incidentes y recursos
- Sin relieve, sin edificios 3D, sin contexto geográfico real

### Objetivo
Globo 3D fotorealístico con terreno, edificios (Photorealistic 3D Tiles de Google), y visualización de crisis en contexto real.

### Tareas

| # | Tarea | Archivos a tocar | Complejidad |
|---|-------|-------------------|-------------|
| 1.1 | Instalar `cesium` + `@cesium/engine` + `resium` (wrapper React para Cesium) | `package.json` | Baja |
| 1.2 | Crear `components/dashboard/crisis-map-3d.tsx` — componente Cesium standalone | Nuevo | Media |
| 1.3 | Integrar Cesium Ion token vía `.env.local` (gratis para uso no comercial) | `.env.local`, `next.config.mjs` | Baja |
| 1.4 | Adaptar `use-map-data.ts` para exponer datos en formato Cesium (Entity collection) | `components/dashboard/crisis-map/use-map-data.ts` | Media |
| 1.5 | Renderizar incidentes como `Entity` con `billboard` (icono) + `label` + `polyline` (trail) | `crisis-map-3d.tsx` | Media |
| 1.6 | Renderizar recursos como `Entity` con modelos 3D (ambulancia, helicóptero, etc.) o glifos | `crisis-map-3d.tsx` | Media |
| 1.7 | Fly-to animation al seleccionar incidente desde la lista o el mapa | `crisis-map-3d.tsx` | Baja |
| 1.8 | **Fallback:** Mantener Leaflet para mobile (detectar `navigator.hardwareConcurrency < 4` o user-agent mobile) | `page.tsx` | Baja |

### Checkpoints de verificación
- [ ] `pnpm dev` levanta sin errores de Cesium
- [ ] El globo carga con terreno 3D en Tucumán
- [ ] Click en incidente de la lista hace fly-to suave al punto 3D
- [ ] Mobile sigue usando Leaflet (performance)

---

## Fase 2: Capas de Datos Live (de GEV → Zntinel)

GEV tiene ~40 fuentes de datos. Las que aportan valor directo a crisis management:

### 2.1 Terremotos (USGS)
- **Fuente GEV:** `src/layers/earthquakes/` → servidor proxy USGS
- **Integración:** Nueva capa en el mapa 3D con `Entity` por sismo
- **Valor:** Alerta sísmica en tiempo real, magnitud, profundidad
- **Adaptación:** Filtrar por región (Argentina/NOA), mostrar solo M≥3.0

### 2.2 Clima / Open-Meteo
- **Fuente GEV:** `server/providers/` + `src/app/data.js` (weather effects)
- **Integración:** Capa de condiciones meteorológicas en el mapa 3D
- **Valor:** Visualizar tormentas, vientos, precipitación en tiempo real sobre el terreno 3D
- **Adaptación:** Usar para predecir trayectoria de incendios / inundaciones

### 2.3 Cámaras Públicas (CCTV)
- **Fuente GEV:** `src/layers/cctv/` + múltiples proveedores (Austin, Tallinn, Finland, etc.)
- **Integración:** Capa de cámaras públicas argentinas / latinoamericanas
- **Valor:** Verificación visual de incidentes reportados
- **Adaptación:** Enfocarse en fuentes de Argentina (si existen APIs públicas) o usar feeds genéricos

### 2.4 Tráfico (OSRM + TomTom)
- **Fuente GEV:** `src/layers/traffic/`, `src/layers/directions/`
- **Integración:** Capa de tráfico live + cálculo de rutas de evacuación / acceso para recursos
- **Valor:** ETA realista para recursos despachados, rutas alternativas

### 2.5 Fuentes descartadas (no aportan a crisis)
- Vuelos (OpenSky/adsb.lol) → demasiado noise, no relevante
- Barcos (AIS) → Zntinel es terrestre
- Satélites → no operacional para crisis diaria
- Instalaciones militares → fuera de scope
- Radio → nice-to-have, no crítico

### Arquitectura de capas (inspirada en GEV)
```
src/layers/
  earthquakes/      ← USGS live
  weather/          ← Open-Meteo live
  cctv/             ← Cámaras públicas
  traffic/          ← OSRM/TomTom
  incidents/        ← Datos Zntinel (Supabase)
  resources/        ← Datos Zntinel (Supabase)
```

Cada capa expone:
- `source.ts` — fetch/normalización de datos
- `layer.ts` — adapter a Cesium EntityCollection
- `types.ts` — tipos propios

---

## Fase 3: UI/UX Profesional — De Dashboard a C2 Console

### 3.1 HUD Overlay (Heads-Up Display)
Inspirado en `src/hud.js` de GEV. Superposición de métricas críticas sobre el mapa 3D:

```
┌─────────────────────────────────────────────┐
│ [ZNTINEL]        14:32:07 UTC    [LIVE]     │
├─────────────────────────────────────────────┤
│                                             │
│   ┌─── GLOBE 3D ───┐   ┌─── METRICS ───┐   │
│   │                │   │ Risk: CRITICAL │   │
│   │   [Cesium]     │   │ Affected: 1,240│   │
│   │                │   │ ETA: 8 min     │   │
│   │                │   └────────────────┘   │
│   │                │                        │
│   └────────────────┘   [MINI-MAP RADAR]     │
│                                             │
│ ┌─ CONTACTS ─┐ ┌─ CAMERA FEED ─┐           │
│ │ Res-001    │ │ [CCTV-023]     │           │
│ │ Res-002    │ │ 12:31:07       │           │
│ └────────────┘ └────────────────┘           │
└─────────────────────────────────────────────┘
```

### 3.2 Modos de Visualización (de GEV)
- **Normal:** Satélite + terreno 3D
- **FLIR / Térmico:** Para incendios — muestra heatmap de temperatura
- **NVG (Visión Nocturna):** Para operaciones nocturnas
- **Radar / Precipitación:** Overlay de lluvia/nubes desde Open-Meteo
- **Inundación:** Simulación de nivel de agua sobre terreno 3D

Implementación: Shaders GLSL post-processing sobre el canvas de Cesium. GEV tiene los shaders en `src/ui/effects.js` y `src/bloom.js`.

### 3.3 Panel de Contexto Global
De GEV: "Global Context" — al activar, muestra el panorama completo con todas las capas. Al volver, restaura la vista exacta.

En Zntinel: Toggle "Situación General" vs "Foco en Incidente".

### 3.4 Transiciones Cinematográficas
- Fly-to suave entre incidentes
- Orbita automática alrededor de un punto crítico
- Zoom out/in al cambiar de modo

### 3.5 Share Links con Estado
Serializar en URL: cámara, modo de visualización, capas activas, incidente trackeado.

---

## Fase 4: Voice Control — Portar de GEV

### Estado actual
- Zntinel tiene AI Agent (Gemini 2.0 Flash) que escanea redes sociales
- No tiene control por voz

### Objetivo
Permitir al operador controlar el sistema con comandos de voz, manos libres.

### Tareas
| # | Tarea | Complejidad |
|---|-------|-------------|
| 4.1 | Integrar OpenAI Realtime API (igual que GEV) | Media |
| 4.2 | Crear `src/voice/realtimeController.ts` — adaptar de GEV | Alta |
| 4.3 | Definir comandos de voz para Zntinel: | Media |
| | - "Centrar en incidente crítico" → fly-to | |
| | - "Despachar ambulancia a [ubicación]" → dispatch | |
| | - "Mostrar clima" → toggle capa weather | |
| | - "Activar modo térmico" → toggle FLIR | |
| | - "Situación general" → global context | |
| 4.4 | UI: Botón de micrófono flotante + indicador de escucha | Baja |
| 4.5 | Fallback a texto si no hay micrófono | Baja |

### Arquitectura
```
src/voice/
  realtimeController.ts   ← WebSocket a OpenAI Realtime
  commands.ts             ← Mapeo de intenciones → acciones
  actions.ts              ← Acciones que mutan el estado de Zntinel
  session.ts              ← Gestión de sesión de voz
```

---

## Fase 5: Profesionalización del Código

### 5.1 Estructura modular de capas (de GEV)
GEV organiza cada fuente de datos como un módulo independiente. Zntinel debería hacer lo mismo:

```
src/
  layers/                 ← NUEVO: cada capa es un módulo
    incidents/
    resources/
    earthquakes/
    weather/
    cctv/
    traffic/
  data/                   ← NUEVO: fuentes de datos
    usgs.ts
    open-meteo.ts
    cctv-providers.ts
  voice/                  ← NUEVO: control por voz
  app/                    ← Next.js app router (existente)
  components/             ← React components (existente)
  lib/                    ← Utils, API, types (existente)
```

### 5.2 Sistema de fuentes abstracto
Cada fuente de datos implementa:
```ts
interface DataSource<T> {
  id: string
  name: string
  fetch(): Promise<T[]>
  intervalMs: number
  enabled: boolean
}
```

### 5.3 Tests
- Unit tests para cada capa (igual que GEV: `npm run test`)
- Smoke test: `curl` a cada API endpoint después de build

### 5.4 Documentación
- `DATA_SOURCES.md` — atribución y licencias (copiar patrón de GEV)
- `README.md` actualizado con stack 3D

---

## Roadmap Sugerido

### Sprint 1 (1-2 semanas): Fundación 3D
- Fase 1 completa: Cesium integrado, incidentes y recursos en 3D
- Checkpoint: demo funcional con fly-to

### Sprint 2 (1 semana): Datos Live
- Fase 2: USGS + Open-Meteo integrados
- Checkpoint: terremotos y clima visibles en el globo

### Sprint 3 (1-2 semanas): UI Profesional
- Fase 3: HUD, modos de visualización, transiciones
- Checkpoint: se ve como una consola C2 real

### Sprint 4 (1-2 semanas): Voice Control
- Fase 4: comandos de voz funcionales
- Checkpoint: operador puede controlar todo sin mouse

### Sprint 5 (1 semana): Polish
- Fase 5: refactor, tests, docs
- Checkpoint: código listo para demo/producción

---

## Recursos de GEV a Portar

| Archivo GEV | Qué portar | A dónde en Zntinel |
|-------------|-----------|---------------------|
| `src/app/application.js` | Inicialización de Cesium, viewer | `components/dashboard/crisis-map-3d.tsx` |
| `src/layers/earthquakes/` | Fuente USGS, renderer de sismos | `src/layers/earthquakes/` |
| `src/ui/effects.js` | Shaders GLSL (FLIR, NVG, etc.) | `src/vfx/shaders/` |
| `src/hud.js` | HUD overlay | `components/dashboard/hud-overlay.tsx` |
| `src/voice/realtimeController.js` | Control por voz | `src/voice/realtimeController.ts` |
| `src/voice/commands.js` | Parser de comandos | `src/voice/commands.ts` |
| `src/ui/shareRestoration.js` | Serialización de estado en URL | `lib/share-state.ts` |
| `src/data/dataCredits.js` | Atribución de datos | `lib/data-credits.ts` |

---

## Licencias y Atribución (IMPORTANTE)

GEV tiene datasets con licencias restrictivas. Para Zntinel:

| Dataset | Licencia | Acción |
|---------|----------|--------|
| Cesium Ion (default) | Gratis personal/no comercial | Obtener token propio |
| Google 3D Tiles | Propio API key + billing | Opcional, solo si se quiere máxima calidad |
| USGS Earthquakes | Dominio público (US govt) | ✅ Usar libremente |
| Open-Meteo | CC BY 4.0 | ✅ Usar con atribución |
| OpenStreetMap | ODbL 1.0 | ✅ Usar con atribución |
| TeleGeography cables | CC BY-NC-SA 3.0 | ❌ NO usar (non-commercial) |
| OpenSky/adsb.lol | Non-commercial | ❌ NO usar |

---

## Conclusión

God's Eye View es una **mina de oro técnica** para Zntinel. No se integra como un todo (arquitecturas incompatibles), pero sus componentes individuales (Cesium 3D, fuentes de datos live, shaders, voice control) elevan Zntinel de un dashboard administrativo a un **sistema de comando y control de clase mundial**.

**Prioridad:** Fase 1 (3D) → Fase 2 (datos live) → Fase 3 (UI polish). Voice control es un diferenciador potente pero puede esperar.
