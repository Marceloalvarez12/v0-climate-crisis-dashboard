# Recuperación del proyecto — 12 de noviembre de 2026

> Registro histórico de la recuperación inicial. Luego se adaptó esta carpeta
> al proyecto principal con autenticación real y sin simulador. El estado vigente
> está en README.md y docs/main-adaptation.md. Las pruebas de este informe se
> realizaron sobre la copia inicial de demostración, antes de esa adaptación.

Se reconstruyó `D:\MARCELO ALVAREZ\Downloads\Zntinel` en una copia independiente.
La carpeta original no existía al comenzar la recuperación.

## Fuentes recuperadas

- Repositorio: https://github.com/Marceloalvarez12/v0-climate-crisis-dashboard
- Base: `origin/main`, commit `306c1e8` (`Implementar simulador autónomo de emergencias`).
- Respaldo local conservado: `D:\MARCELO ALVAREZ\Downloads\Zntinel-simulador`.
- Rama de recuperación: `codex/reconstruct-zntinel`.
- Plan adjunto y conversación de este chat del 8–9 de octubre de 2026.

Se compararon los archivos de código, documentación, pruebas, recursos públicos
y artefactos ZK del respaldo con el checkout recuperado. Las cinco diferencias
detectadas correspondían a finales de línea; no había cambios de contenido ni
archivos adicionales que recuperar en esos directorios. Las dependencias se
instalaron desde `package-lock.json` con `npm ci`; no se copió `node_modules`.

## Diferencia entre el chat y la versión actual del repositorio

El chat documenta una versión operativa con Supabase Auth, roles y reportes reales.
Después, el commit `af1626a` eliminó el login y agregó un almacenamiento dual;
el commit `306c1e8` incorporó el simulador autónomo. La recuperación conserva esa
versión posterior del repositorio, sin reintroducir silenciosamente el modelo
anterior.

Siguen presentes los artefactos Groth16, verificaciones de integridad, pruebas de
despacho y rate limiting, sanitización pública y separación entre comprobantes
locales y transacciones blockchain. El comportamiento de autenticación y los
ciclos automáticos del simulador son distintos a los descritos antes en el chat.

Esta versión permite acceso público a páginas y APIs administrativas. Usarla con
datos de prueba; si se configura Supabase, debe ser una base dedicada al simulador.
La recuperación no incluye credenciales ni certifica el estado de RLS, migraciones,
usuarios, contratos o servicios externos.

## Ejecutar

```powershell
npm ci
npm run dev
```

Abrir http://localhost:3000. No se necesita `.env.local` para la demo en memoria.
`.env.example` documenta las integraciones opcionales.

```powershell
npm test
npm run lint
npx tsc --noEmit
npm run zk:check
npm run build
```

Los mensajes `ERROR` del circuito durante `zk:check` son esperados en los casos
negativos; el comando debe finalizar con código 0 y el resumen de pruebas correctas.

## Validación de la copia recuperada

- `npm ci`: instalación completada desde el lockfile (665 paquetes). npm informa
  incompatibilidades de peer dependencies entre ESLint 10 y algunos plugins;
  la ejecución de lint se completó sin errores ni advertencias de código.
- `npm test`: 12 pruebas aprobadas.
- `npm run lint` y `npx tsc --noEmit`: correctos.
- `npm run zk:check`: integridad y pruebas criptográficas positivas/negativas correctas.
- `npm run build`: producción compilada; 24 páginas generadas.
- Chromium contra `next start` local: 13 comprobaciones aprobadas sin errores
  JavaScript en las páginas visitadas. Incluye escritorio/móvil, generación de
  incidentes, reporte ciudadano con Groth16 real, privacidad del seguimiento,
  reinicio que preserva al ciudadano y rechazos de entradas inválidas.

Las capturas y `result.json` están en `test-results/reconstruction/` (ignorado por
Git). El reporte de prueba solo existió en memoria; no se usaron credenciales de
Supabase, correo ni firmas de blockchain.

El smoke E2E es reproducible con Python Playwright y Chromium instalados:

```powershell
# Terminal 1, después de npm run build:
npm run start -- --hostname 127.0.0.1 --port 3210

# Terminal 2, solo contra una instancia local en memoria:
python scripts/e2e_smoke.py --base-url http://127.0.0.1:3210
# Si Chromium no está en la ubicación esperada por Playwright:
# agregar --browser-executable "C:/ruta/chrome-headless-shell.exe"
```
