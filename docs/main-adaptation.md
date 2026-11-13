# Proyecto principal: adaptación de las mejoras visuales

Esta carpeta es el sistema operativo real. La recuperación inicial se hizo desde
el simulador `306c1e8`, pero las instrucciones posteriores del usuario y su adjunto
exigen separar ambos productos. La copia `Zntinel-simulador` no fue modificada.

## Cambios

| Área | Comportamiento del proyecto principal |
| --- | --- |
| Datos | Neon/PostgreSQL; faltan credenciales → error explícito, nunca datos en memoria. |
| Acceso | Login, recuperación y cambio de contraseña mediante Better Auth y Neon; perfil activo, roles, administración protegida. |
| Administración | Usuarios, asignaciones, umbrales, kill switch, conexiones por flags sin devolver secretos. Auditoría con actor de sesión verificada; asignaciones transaccionales. |
| Dashboard | Se conserva la identidad oscura, logo, tres columnas y pestañas móviles; accesos ciudadanos visibles. |
| Agente | Se mantiene el panel visual. Sin tareas inventadas, métricas crecientes o fuentes ficticias. Reportes reales más eventos persistidos en `agent_events`. |
| Mapa | Se mantienen mosaicos oscuros, satélite/topografía, filtros, severidad, activos e historial. El filtro de oscuridad afecta solo los mosaicos. |
| Recursos | Compare-and-set para despacho, parciales visibles, llegada y liberación explícitas. Despachar no finaliza la atención. |
| Finalización | Acción confirmada por operador; se rechaza mientras haya recursos en camino o en servicio. No se libera ningún recurso por tiempo transcurrido. |
| Bitácora | Último estado guardado de incidentes y recursos con fecha, fuente y responsable cuando está disponible. No pretende reconstruir un historial que no existe en la base. |
| Indicadores | Datos consultados, sin tiempo de respuesta inventado. Se conservan textos en español. |
| Mapa ciudadano | Solo campos públicos; ubicación ciudadana aproximada y validación social basada en confirmación operativa. No inicia ningún motor. |
| Formulario | Dirección/pin, selección manual independiente del reverse geocoding, timeout del buscador, confirmación sin redirección automática, ID de seguimiento separado del hash Stellar. |
| Seguimiento | Consulta específica de recursos por incidente, estado público mínimo, errores de conexión distintos de un 404. |
| Auditoría | Solo entidades Arkiv confirmadas; pruebas Groth16 reales y ejemplos con artefactos vigentes. Verificación local distinta de transacción confirmada. |

El motor automático, la base ficticia, el usuario administrador de demostración
y los módulos de generación aleatoria se retiraron de esta carpeta. Pueden
recuperarse del historial de Git o de la copia separada. No se borraron registros
remotos. Las filas históricas marcadas como simuladas se excluyen de las lecturas
operativas y públicas.

## Preparación del entorno real

La configuración vigente está en [neon-setup.md](neon-setup.md). Se reemplazaron
los datos y el login de Supabase por Neon/PostgreSQL y Better Auth. La migración
completa crea el esquema desde cero sin cuentas ni reportes de ejemplo.

La conexión Neon facilitada se verificó con TLS y certificado válido y se aplicó
`001-neon.sql` sobre una base sin tablas. No se importaron datos ni cuentas antiguas.
El primer administrador se crea mediante `npm run db:admin`.

## Verificación

- `npm test`: 26 pruebas, incluyendo permisos públicos/privados, roles, fallo
  cerrado sin base, exclusión de filas simuladas, doble asignación, llegada,
  liberación, cantidades y despachos parciales. Los casos de API de recursos usan
  un transporte de prueba; no certifican una instancia remota de PostgreSQL.
- TypeScript, ESLint y build de producción verificados sin claves externas.
- `scripts/e2e_main.py`: navegador contra `next start` local; páginas públicas,
  redirecciones al login, denegación de APIs privadas, 320 px, pin manual con
  geocodificador caído, rechazo de entradas y prueba ZK real local.
- Ejecución de Chromium completada: 13 comprobaciones correctas, sin excepciones
  JavaScript. Evidencia en `test-results/main/result.json` y capturas del mismo directorio.
- El transporte de envío del formulario se intercepta para probar la UI de
  error sin crear reportes. No se presenta como una prueba de persistencia real.

Las pruebas de autenticación y SQL usan PostgreSQL local aislado; la conexión y
el esquema Neon se comprueban separadamente. Las integraciones de correo y blockchain
requieren sus credenciales y no se presentan como verificadas de extremo a extremo.

Para repetir las pruebas de navegador, con Python Playwright y Chromium:

```powershell
npm run build
npm run start -- --hostname 127.0.0.1 --port 3210
# En otra terminal:
python scripts/e2e_main.py --base-url http://127.0.0.1:3210
# Opcional: --browser-executable "C:/ruta/chrome-headless-shell.exe"
```

Resultados y capturas: `test-results/main/`, ignorados por Git.

La revisión posterior de pantallas y acciones, incluidos los flujos privados con
PostgreSQL local aislado, está documentada en [usability-review.md](usability-review.md).
