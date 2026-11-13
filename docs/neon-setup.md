# Neon y autenticación

Zntinel usa Neon/PostgreSQL para datos, usuarios, credenciales hasheadas,
sesiones, recuperación y auditoría. Better Auth implementa email/contraseña,
cookies HttpOnly y tokens de recuperación. No hay registro público ni clientes
de Supabase. La conexión existe exclusivamente en el servidor.

## Instalación

```powershell
npm ci
# Crear .env.local desde .env.example, si todavía no existe.
# Pegar DATABASE_URL y configurar APP_URL con el origen real.
npm run db:setup
npm run db:check
npm run db:admin
npm run dev
```

`DATABASE_URL` es la cadena PostgreSQL completa de **Connect** en Neon, no una
API key. Para la aplicación usar conexión pooled (`-pooler`) y conservar SSL y
channel binding. El cliente exige verificación completa del certificado para
hosts de Neon. Referencias: [Neon](https://neon.com/docs/connect/connection-pooling)
y [node-postgres](https://node-postgres.com/features/ssl).

`db:setup` genera `BETTER_AUTH_SECRET` aleatorio en `.env.local` si falta y aplica
las migraciones. Conserva el secreto existente y nunca imprime credenciales.
En producción configurar ese mismo secreto en el alojamiento; cambiarlo
invalida las cookies anteriores. `APP_URL` debe coincidir exactamente con el
origen de la aplicación; HTTPS en producción. Nunca publicar estas variables
con prefijo `NEXT_PUBLIC_` ni subir `.env.local` al repositorio.

`db:admin` solicita nombre, email y contraseña oculta de 12–128 caracteres.
Crea el primer administrador real; falla si ya hay uno activo. No tiene cuenta
ni contraseña predeterminada. Para automatización admite variables
`BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` en
el entorno del proceso; no guardarlas permanentemente ni pasarlas como argumentos.
Los operadores posteriores se crean desde Administración → Usuarios.

## Esquema y seguridad

`migrations/001-neon.sql` crea el esquema completo en una base vacía: tablas
operativas y tablas `user`, `session`, `account`, `verification`, `rateLimit`
de [Better Auth](https://better-auth.com/docs/concepts/database).
El ejecutor registra checksum por migración y usa una transacción con bloqueo
asesor transaccional, compatible con el pooler. Puede repetirse sin reinicializar
datos. Si una tabla existente colisiona, revierte; no borra ni reemplaza datos.

Se inicia el agente deshabilitado y confianza 80; no se insertan incidentes,
recursos ni usuarios de ejemplo. La base nueva no copia automáticamente los
datos ni las cuentas de una instalación anterior. Las migraciones antiguas
de Supabase quedaron archivadas en `docs/legacy-supabase/`; no ejecutarlas en Neon.

Las sesiones duran 8 horas y se consultan en servidor, sin caché de autorización
en cookies. Se comprueba el perfil activo y su rol en proxy y operaciones
sensibles. Suspender o cambiar el rol elimina las sesiones del usuario. Una
cuenta suspendida no puede crear una sesión nueva. Las asignaciones de recursos
se reemplazan junto con su auditoría en una sola transacción. Las consultas
parametrizadas y compare-and-set conservan la exclusión de doble despacho.

La aplicación no expone PostgreSQL al navegador ni usa las políticas RLS
específicas de Supabase. Mantener DATABASE_URL solo en el backend, con permisos
limitados al esquema de la aplicación. Las credenciales de propietario que
entrega Neon sirven para instalar; para despliegue conviene un rol de aplicación
sin permisos DDL, y usar propietario solo para migraciones.

## Recuperación

Configurar `RESEND_API_KEY` y `MAIL_FROM` (remitente verificado). El correo lleva
un enlace de Better Auth que vuelve a `/restablecer`. El token es de un solo uso;
cambiar la contraseña revoca las sesiones. Sin correo configurado se informa
indisponibilidad y no se finge un envío. La respuesta pública no confirma si
existe una dirección. Ver [integración Next.js](https://better-auth.com/docs/integrations/next).

## Datos y cuentas existentes

Antes de importar, exportar y respaldar la base anterior. Importar las tablas
operativas conservando IDs y referencias mediante una migración revisada para
ese origen. No ejecutar un dump de `auth`, políticas o funciones `auth.uid()`
de Supabase contra este esquema. Las cuentas requieren un procedimiento
separado de migración y restablecimiento: no se transfieren contraseñas ni
sesiones automáticamente. No presentar una base nueva como datos históricos
ya migrados.

## Validación

```powershell
npm test
npm run test:database
npm run lint
npx tsc --noEmit
npm run build
```

`test:database` ejecuta SQL real en PostgreSQL/WASM local y usa Better Auth real;
jamás carga `.env.local`. Incluye persistencia JSON, búsquedas con caracteres de
SQL, compare-and-set, restricciones de referencias, asignaciones con rollback y
auditoría, login/cookies, registro deshabilitado, suspensión, recuperación de
un solo uso y revocación de sesiones. `scripts/e2e_private_ui.py` usa una base
local aislada para probar las pantallas con Chromium; los datos de prueba no
se insertan en Neon. Esa implementación local no certifica la concurrencia de
un servidor PostgreSQL multisesión completo.

## Resultado de esta preparación

La conexión Neon fue comprobada con TLS y certificado verificado. Se aplicó el
esquema sobre una base vacía y se comprobó que una segunda ejecución conserva
las migraciones existentes. No se crearon usuarios, reportes ni recursos remotos.
Para ingresar queda ejecutar `npm run db:admin` y definir la cuenta real.

Validación: 26 pruebas existentes más 6 pruebas de PostgreSQL/autenticación,
20 comprobaciones privadas de navegador y 15 públicas. TypeScript, ESLint,
compilación e integridad de artefactos ZK correctos. El correo externo no se
validó con un envío real.

Se actualizaron Next.js a 16.4.6 y dependencias con correcciones compatibles.
La auditoría restante señala una actualización mayor de Zod y dependencias de
documentación de Arkiv/minimatch. Esa auditoría no equivale a una certificación
integral de seguridad; los cambios mayores requieren su revisión específica.
