# Revisión de pantallas y funcionalidades — 12 de noviembre de 2026

Se revisó el diseño contra el dashboard existente: fondos oscuros, bordes discretos,
logo Zntinel y acentos cian, rojo, verde y ámbar. Se conservaron la estructura del
dashboard y el aspecto del panel del agente.

## Pantallas revisadas

| Pantallas | Comprobación |
| --- | --- |
| Dashboard y sus paneles | Escritorio y 320 px; accesos ciudadanos, acceso administrativo por rol y navegación desde una alerta hacia el incidente. |
| Administración: agente | Habilitar, pausar con confirmación, escaneo manual e información explícita cuando no hay conectores. |
| Administración: umbrales | Guardado del umbral real de análisis. Se retiró el control de auto-cierre inexistente. |
| Administración: conexiones | Estado de configuración sin secretos ni referencia a un fallback en memoria. |
| Administración: usuarios | Tarjetas adaptables, búsqueda, roles, recuperación, alta y asignación; mensajes visibles ante fallos. |
| Administración: recursos | Búsqueda legible en celular, cantidades y estados efectivos, creación y protección de unidades asignadas. |
| Login, recuperación y contraseña | Carga, formularios y coherencia visual; las solicitudes de correo reales requieren Neon y Resend configurados. |
| Mapa y formulario ciudadanos | 320 px, privacidad, pin manual con geocodificador caído y error de persistencia identificable. |
| Seguimiento | Escritorio y 320 px con un reporte del flujo de prueba; error de conexión diferenciado y botón Reintentar. |
| Auditorías | Generar ejemplo ZK, verificar la prueba y rechazar una clave Arkiv incorrecta. |

## Funcionalidades corregidas

- Los botones administrativos ya no silencian errores en la consola.
- Una carga fallida de asignaciones bloquea el guardado, evitando reemplazar
  accidentalmente una asignación existente por una selección vacía.
- Los formularios modales mantienen el foco de teclado y se cierran con Escape;
  las operaciones pendientes no se cierran accidentalmente por el fondo.
- El nombre manual de un recurso se conserva al editar su base o tipo.
- Las acciones operativas se ofrecen según el rol de la sesión. Los permisos
  siguen verificándose también en el servidor.
- El agente abre el incidente para seleccionar unidades; no despacha el primer
  recurso disponible sin esa selección.
- Se muestran descripción y contacto del ciudadano únicamente en la ficha
  operativa, además del enlace a su seguimiento público.
- La edición de una ficha no convierte un recurso en camino en uno que ya llegó.
  Se impide retirar o redimensionar una unidad asignada.
- Los grupos y contadores no incluyen como disponibles recursos en camino o
  en servicio. Los estados se muestran desde el registro operativo, sin
  deducir una llegada a partir de las cantidades.
- Mapa, recursos, asignaciones e indicadores muestran errores y opciones de
  reintento. La falta de datos no se presenta como ausencia de incidentes.
- Las notificaciones y la validación satelital sin proveedor no se ofrecen como
  acciones disponibles. Una captura de cámara no se etiqueta como video en vivo.

## Evidencia

- 26 pruebas automáticas de permisos, límites y operaciones de recursos.
- 15 comprobaciones E2E públicas: `scripts/e2e_main.py`.
- 20 comprobaciones E2E privadas: `scripts/e2e_private_ui.py`.
- TypeScript, ESLint y build de producción correctos.
- Capturas y resultados: `test-results/main/` y `test-results/private-ui/`.

Las pruebas privadas atraviesan el login, las acciones de servidor y las APIs
de la aplicación contra PostgreSQL local aislado y Better Auth real, en puertos
3320/3321. La base y sus registros de prueba existen solo en el proceso de
pruebas; no hay un bypass ni un fallback de demostración en la aplicación.

Se verificó la secuencia completa seleccionar → despachar → confirmar llegada
→ liberar → finalizar. Intentar finalizar con una unidad asignada devuelve 409.
El cierre no se produce automáticamente por el paso del tiempo.

La conexión TLS y las migraciones Neon se verificaron por separado. Los envíos
de correo, servicios satelitales y transacciones externas requieren sus
credenciales. Las pruebas no crearon usuarios, reportes ni despachos en Neon.

## Actualización Neon

La prueba privada ahora usa PostgreSQL local aislado y Better Auth real, sin el
transporte HTTP anterior. Ver [neon-setup.md](neon-setup.md).
