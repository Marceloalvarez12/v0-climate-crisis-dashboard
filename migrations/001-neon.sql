-- PostgreSQL / Neon. No sample users or operational records.
CREATE TABLE "user" (
  id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false, image text,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE session (
  id text PRIMARY KEY, "expiresAt" timestamptz NOT NULL, token text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "ipAddress" text, "userAgent" text, "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX session_user_idx ON session("userId");
CREATE INDEX session_expiry_idx ON session("expiresAt");
CREATE TABLE account (
  id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" text, "refreshToken" text, "idToken" text,
  "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, scope text, password text,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("providerId", "accountId")
);
CREATE INDEX account_user_idx ON account("userId");
CREATE TABLE verification (
  id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_identifier_idx ON verification(identifier);
CREATE TABLE "rateLimit" (id text PRIMARY KEY, key text NOT NULL UNIQUE, count integer NOT NULL, "lastRequest" bigint NOT NULL);
CREATE TABLE perfiles (
  id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  rol text NOT NULL CHECK (rol IN ('admin','operador','agente_ia','visualizador')),
  status text NOT NULL DEFAULT 'suspendido' CHECK (status IN ('activo','suspendido'))
);
CREATE TABLE incidentes (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tipo text NOT NULL, severidad text NOT NULL, ubicacion text NOT NULL,
  latitud double precision NOT NULL CHECK (latitud BETWEEN -90 AND 90),
  longitud double precision NOT NULL CHECK (longitud BETWEEN -180 AND 180),
  personas_afectadas integer NOT NULL DEFAULT 0 CHECK (personas_afectadas >= 0),
  fuente text NOT NULL, fuente_detalles jsonb NOT NULL DEFAULT '{}', estado text NOT NULL,
  arkiv_key text, arkiv_entity_key text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX incidentes_created_idx ON incidentes(created_at DESC);
CREATE INDEX incidentes_estado_created_idx ON incidentes(estado,created_at DESC);
CREATE INDEX incidentes_ubicacion_idx ON incidentes(ubicacion);
CREATE INDEX incidentes_details_idx ON incidentes USING gin(fuente_detalles jsonb_path_ops);
CREATE INDEX incidentes_arkiv_idx ON incidentes((fuente_detalles->>'arkiv_entity_key'));
CREATE INDEX incidentes_analysis_arkiv_idx ON incidentes((fuente_detalles->'ai_analysis'->>'arkiv_entity_key'));
CREATE INDEX incidentes_detection_arkiv_idx ON incidentes((fuente_detalles->>'detection_arkiv_key'));
CREATE TABLE recursos (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text, tipo text NOT NULL, nombre text NOT NULL,
  estado text NOT NULL CHECK (estado IN ('available','dispatched','busy','retired')),
  ubicacion text NOT NULL, incidente_id text REFERENCES incidentes(id) ON DELETE RESTRICT,
  cantidad integer NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  cantidad_disponible integer NOT NULL DEFAULT 1 CHECK (cantidad_disponible >= 0 AND cantidad_disponible <= cantidad),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX recursos_incidente_idx ON recursos(incidente_id);
CREATE INDEX recursos_tipo_idx ON recursos(tipo) WHERE estado <> 'retired';
CREATE TABLE config_sistema (clave text PRIMARY KEY, valor jsonb NOT NULL);
INSERT INTO config_sistema(clave,valor) VALUES ('agent_mode','{"autonomous":false}'),('confidence_threshold','{"value":80}');
CREATE TABLE asignaciones_recursos (
  operador_id text NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  recurso_id text NOT NULL REFERENCES recursos(id) ON DELETE RESTRICT,
  PRIMARY KEY(operador_id,recurso_id)
);
CREATE INDEX asignaciones_recurso_idx ON asignaciones_recursos(recurso_id);
CREATE TABLE auditoria_admin (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  admin_id text NOT NULL REFERENCES perfiles(id) ON DELETE RESTRICT,
  accion text NOT NULL, detalle jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auditoria_admin_actor_idx ON auditoria_admin(admin_id,created_at DESC);
CREATE TABLE agent_events (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type text NOT NULL CHECK (type IN ('monitoring','analysis','alert','complete')),
  message text NOT NULL, source text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_events_created_idx ON agent_events(created_at DESC);
CREATE INDEX agent_events_scan_idx ON agent_events(created_at DESC) WHERE type='complete' AND source='Escaneo social';
