# Zntinel — Centro de crisis de Tucumán

Proyecto principal: reportes ciudadanos, gestión de incidentes y despacho operativo con Better Auth, Neon/PostgreSQL, análisis social y auditoría Arkiv/Stellar.

Esta versión no inicia simuladores ni usa un administrador de ejemplo. El diseño oscuro del dashboard y del panel del agente se conserva; su actividad proviene de reportes y eventos registrados. La copia de demostración permanece separada en Zntinel-simulador.

## Ejecutar localmente

1. Ejecutar npm ci.
2. Copiar `.env.example` a `.env.local` y pegar la cadena de Neon en `DATABASE_URL`; configurar `APP_URL`.
3. Ejecutar `npm run db:setup` y `npm run db:admin` para crear el esquema y el primer administrador.
4. Ejecutar `npm run dev` y abrir http://localhost:3000.

Sin credenciales, las páginas ciudadanas pueden cargarse pero las operaciones que requieren base de datos fallan explícitamente. Las páginas privadas redirigen al login; no hay fallback a memoria.

## Acceso

- /login, /recuperar y /restablecer: ingreso y recuperación mediante Better Auth, con sesiones persistidas en Neon.
- /: centro de control para perfiles activos.
- /admin: solo administradores; control del agente, umbrales, conexiones, usuarios y recursos.
- /mapa y /reportar: acceso ciudadano sin registro.
- /seguimiento/[id]: seguimiento público con ubicación aproximada, sin contacto ni prueba completa.
- /auditoria y /stellar-auditoria: consultas de comprobantes; una verificación local no implica una transacción blockchain.

Los permisos se verifican en proxy.ts y en las operaciones administrativas. API_SECRET solo habilita las APIs de servicio /api/agent y /api/social/mention; no otorga acceso a usuarios, administración o despacho. No usar NEXT_PUBLIC_API_SECRET.

## Base de datos

El esquema completo está en `migrations/001-neon.sql`: datos operativos, usuarios,
credenciales hasheadas, sesiones, recuperación y auditoría. No hay registro público
ni usuarios predeterminados. Las migraciones son transaccionales y verifican checksum.

Ver [configuración de Neon](docs/neon-setup.md) para instalar, crear el primer
administrador, configurar correo y migrar datos existentes. `npm run db:check`
comprueba conexión, TLS y tablas sin mostrar credenciales. `.env.local` está ignorado
por Git. No se copian automáticamente datos o cuentas de la base anterior.

## Atención operativa

Despachar mantiene el incidente activo y asigna el recurso mediante compare-and-set; una segunda asignación del mismo recurso devuelve 409. Los fallos parciales muestran cuántos recursos se enviaron.

El operador confirma la llegada y libera cada recurso desde el panel. Finalizar atención requiere una acción explícita y recursos liberados. El registro blockchain del despacho no cierra el incidente. No hay temporizadores de viaje, cierre automático ni liberación automática.

La bitácora operativa muestra el último estado guardado de incidentes y recursos, no una reconstrucción completa de cambios históricos. Los eventos del agente se guardan por separado; no se inventan escaneos, fuentes conectadas, cifras ni confianza.

## Integraciones

- Social: solo menciones con #AlertaTucuman (configurable). OpenRouter → Gemini → reglas. Los reportes simulados se rechazan y una ubicación no identificable no se reemplaza por coordenadas aleatorias.
- Neon/PostgreSQL: datos y sesiones persistentes; credenciales solo del servidor y autorización por perfil activo.
- ZK: los artefactos reales están incluidos en zk/build. La prueba se verifica localmente; faltantes o pruebas inválidas fallan cerradas. Ver zk/README.md.
- Stellar: solo invoca el contrato configurado cuando STELLAR_ZK_VK_SHA256 coincide con la clave local; sin ello la verificación es local y se informa como tal.
- Arkiv: publicar únicamente claves de entidades confirmadas; sin configuración o ante errores se informa auditoría no confirmada.
- Correo: requiere RESEND_API_KEY y MAIL_FROM. La difusión masiva no tiene un proveedor implementado y no muestra envíos ficticios.
- Rate limit: Redis REST opcional en local; exigir RATE_LIMIT_REQUIRE_DISTRIBUTED=true en un despliegue de varias instancias. Ver docs/rate-limiting.md.

## Validar

npm test
npm run test:database
npm run lint
npx tsc --noEmit
npm run zk:check
npm run build

Ver docs/main-adaptation.md para alcance, evidencia y límites de la validación. No publicar sin verificar configuración real, migraciones, roles y conectividad de los servicios externos.
