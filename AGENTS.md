# Zntinel — Proyecto principal

Next.js App Router, TypeScript, Tailwind v4, Neon/PostgreSQL y Better Auth, Arkiv y Stellar. Esta carpeta contiene el sistema operativo real. La copia Zntinel-simulador es una referencia visual separada.

- Sin motor de simulación, administrador ficticio ni fallback a memoria.
- Conservar el diseño del panel del agente; sus eventos y métricas deben identificar su fuente real.
- No cerrar incidentes ni liberar recursos por temporizadores.
- Despachar no equivale a finalizar la atención. Usar confirmaciones operativas explícitas y compare-and-set.
- Sesiones y roles se verifican en lib/auth.ts y proxy.ts; auditar administración con el actor de la sesión verificada.
- El mapa y el seguimiento públicos no exponen coordenadas exactas de ciudadanos, contacto ni pruebas completas.
- Solo presentar auditoría on-chain con evidencia confirmada; la verificación Groth16 local es real pero no crea una transacción.
- Integraciones y migraciones: README.md y docs/main-adaptation.md.
- Validación: npm test, npm run lint, npx tsc --noEmit, npm run zk:check y npm run build.
