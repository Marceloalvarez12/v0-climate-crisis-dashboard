"""Prueba de pantallas privadas contra PostgreSQL local aislado y Better Auth real.
No usa las credenciales de .env.local ni escribe en Neon.
"""
import argparse
import json
import os
import subprocess
import time
import secrets
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

INCIDENT = "20000000-0000-4000-8000-000000000001"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--browser-executable", required=True)
    args = parser.parse_args()
    output = Path("test-results/private-ui").resolve()
    output.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    for key in ("ARKIV_PRIVATE_KEY", "STELLAR_SECRET_KEY", "GOOGLE_AI_API_KEY", "OPENROUTER_API_KEY", "RESEND_API_KEY", "X_BEARER_TOKEN", "FACEBOOK_ACCESS_TOKEN", "INSTAGRAM_ACCESS_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"):
        env[key] = ""
    env.update(DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:3321/postgres", BETTER_AUTH_SECRET=secrets.token_urlsafe(48), RATE_LIMIT_REQUIRE_DISTRIBUTED="false", APP_URL="http://127.0.0.1:3320")
    ready = output / "database-ready"
    ready.unlink(missing_ok=True)
    fixture_log = (output / "database.log").open("w", encoding="utf-8")
    fixture = subprocess.Popen(["node", "--import", "tsx", "scripts/e2e-database.ts"], env=env, stdout=fixture_log, stderr=fixture_log)
    for _ in range(60):
        if ready.exists():
            break
        if fixture.poll() is not None:
            raise RuntimeError("No se pudo iniciar PostgreSQL de pruebas; revisar database.log")
        time.sleep(0.25)
    else:
        fixture.terminate()
        raise RuntimeError("Timeout al iniciar PostgreSQL de pruebas")

    errors, checks = [], []
    with (output / "server.log").open("w", encoding="utf-8") as log:
        server = subprocess.Popen(["node", "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3320"], env=env, stdout=log, stderr=log)
        try:
            for _ in range(60):
                try:
                    urlopen("http://127.0.0.1:3320/login", timeout=1).close()
                    break
                except OSError:
                    time.sleep(0.5)
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True, executable_path=args.browser_executable)
                try:
                    page = browser.new_page(viewport={"width": 1440, "height": 1000})
                    page.route("**/api/layers/cameras", lambda route: route.fulfill(status=503, content_type="application/json", body='{"error":"Cámaras no disponibles en esta prueba","cameras":[]}'))
                    page.on("pageerror", lambda e: errors.append(str(e)))
                    page.goto("http://127.0.0.1:3320/login", wait_until="networkidle")
                    page.get_by_label("Correo electrónico", exact=True).fill("admin@example.test")
                    page.get_by_label("Contraseña", exact=True).fill("test-password-local")
                    page.get_by_role("button", name="Ingresar", exact=True).click()
                    page.wait_for_url("http://127.0.0.1:3320/", timeout=20000)
                    for width in (1440, 320):
                        page.set_viewport_size({"width": width, "height": 1000})
                        for route in ("/", "/admin?section=control", "/admin?section=thresholds", "/admin?section=connections", "/admin?section=users", "/admin?section=resources"):
                            page.goto("http://127.0.0.1:3320" + route, wait_until="networkidle")
                            assert "/login" not in page.url, "La sesión de prueba no se conservó"
                            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 2"), f"Desborde en {route}, ancho {width}"
                            name = (route.split("=")[-1] if "=" in route else "dashboard") + f"-{width}.png"
                            page.screenshot(path=str(output / name), full_page=True)
                            checks.append(f"{route}: usable sin desborde a {width}px")
                    page.set_viewport_size({"width": 1440, "height": 1000})
                    page.goto("http://127.0.0.1:3320/admin?section=thresholds", wait_until="networkidle")
                    page.locator("#confidence").fill("85")
                    page.get_by_role("button", name="Guardar umbral", exact=True).click()
                    page.get_by_text("Umbral de análisis guardado", exact=True).wait_for()
                    page.reload(wait_until="networkidle")
                    assert page.locator("#confidence").input_value() == "85"
                    checks.append("Guardar umbral persiste el valor mediante la acción real del servidor")

                    page.goto("http://127.0.0.1:3320/admin?section=control", wait_until="networkidle")
                    page.get_by_role("button", name="Habilitar ingesta social", exact=True).click()
                    page.get_by_text("Ingesta social habilitada", exact=True).wait_for()
                    page.get_by_role("button", name="Ejecutar escaneo", exact=True).click()
                    page.get_by_text("Sin conectores sociales activos", exact=False).wait_for()
                    page.get_by_role("button", name="Pausar ingesta social", exact=True).click()
                    page.get_by_role("button", name="Pausar ingesta", exact=True).click()
                    page.get_by_text("Ingesta social deshabilitada", exact=True).wait_for()
                    checks.append("Control del agente habilita, informa ausencia de conectores y permite pausar")

                    page.goto("http://127.0.0.1:3320/admin?section=users", wait_until="networkidle")
                    page.get_by_label("Buscar usuarios", exact=True).fill("sin coincidencias")
                    page.get_by_text("No hay usuarios que coincidan con la búsqueda.", exact=True).wait_for()
                    page.get_by_label("Buscar usuarios", exact=True).fill("")
                    page.get_by_role("button", name="Crear operador", exact=True).click()
                    modal = page.get_by_role("dialog", name="Crear operador", exact=True)
                    modal.wait_for()
                    for _ in range(12):
                        page.keyboard.press("Tab")
                        assert page.evaluate("!!document.activeElement.closest('[role=dialog]')"), "El foco salió del diálogo"
                    page.keyboard.press("Escape")
                    assert not modal.is_visible()
                    checks.append("Búsqueda de usuarios, foco de teclado y cierre Escape del formulario funcionan")

                    page.route("**/api/recursos", lambda route: route.fulfill(status=503, content_type="application/json", body='{"error":"Fallo de prueba"}'))
                    page.get_by_role("button", name="Asignar recursos", exact=True).click()
                    assignment = page.get_by_role("dialog", name="Asignar recursos", exact=True)
                    assignment.get_by_role("alert").wait_for()
                    assert assignment.get_by_role("button", name="Guardar asignaciones", exact=True).is_disabled()
                    page.unroute("**/api/recursos")
                    assignment.get_by_role("button", name="Reintentar", exact=True).click()
                    assignment.get_by_role("button", name="Guardar asignaciones", exact=True).wait_for(state="visible")
                    page.wait_for_function("!document.querySelector('[role=dialog] button:last-child')?.disabled")
                    page.keyboard.press("Escape")
                    checks.append("Una carga fallida de asignaciones bloquea el guardado y permite reintentar")

                    page.goto("http://127.0.0.1:3320/admin?section=resources", wait_until="networkidle")
                    page.get_by_role("button", name="Crear recurso", exact=True).click()
                    form = page.get_by_role("dialog", name="Ficha del recurso", exact=True)
                    form.get_by_label("Nombre del recurso", exact=True).fill("Unidad personalizada de prueba")
                    form.get_by_label("Base del recurso", exact=True).fill("Base nueva")
                    assert form.get_by_label("Nombre del recurso", exact=True).input_value() == "Unidad personalizada de prueba"
                    form.get_by_role("button", name="Crear Recurso", exact=True).click()
                    form.wait_for(state="hidden")
                    assert any(r["nombre"] == "Unidad personalizada de prueba" for r in page.request.get("http://127.0.0.1:3320/api/recursos").json())
                    checks.append("Crear recurso conserva el nombre manual y persiste los campos del formulario")

                    page.goto("http://127.0.0.1:3320/?incidente=" + INCIDENT, wait_until="networkidle")
                    detail = page.get_by_role("dialog")
                    detail.get_by_role("button", name="Despachar recursos", exact=True).click()
                    page.get_by_role("dialog").get_by_role("button", name="+", exact=True).first.click()
                    page.get_by_role("dialog").get_by_role("button", name="Confirmar despacho", exact=True).click()
                    page.get_by_role("dialog").get_by_role("button", name="Confirmar despacho", exact=True).click()
                    page.get_by_text("Recursos despachados", exact=True).first.wait_for()
                    page.get_by_role("button", name="Volver al mapa", exact=True).click()
                    page.get_by_role("button", name="Confirmar llegada", exact=True).wait_for()
                    assert page.request.get("http://127.0.0.1:3320/api/incidentes/" + INCIDENT).json()["estado"] == "activo"
                    denied = page.request.patch("http://127.0.0.1:3320/api/incidentes", data={"id": INCIDENT, "estado": "atendido"})
                    assert denied.status == 409
                    page.once("dialog", lambda dialog: dialog.accept())
                    page.get_by_role("button", name="Confirmar llegada", exact=True).click()
                    page.get_by_role("button", name="Liberar recurso", exact=True).wait_for()
                    page.once("dialog", lambda dialog: dialog.accept())
                    page.get_by_role("button", name="Liberar recurso", exact=True).click()
                    page.wait_for_function("![...document.querySelectorAll('button')].some(b => b.textContent === 'Liberar recurso')")
                    page.goto("http://127.0.0.1:3320/?incidente=" + INCIDENT, wait_until="networkidle")
                    page.once("dialog", lambda dialog: dialog.accept())
                    page.get_by_role("dialog").get_by_role("button", name="Finalizar atención", exact=True).click()
                    page.get_by_text("Atención finalizada: Ubicación de prueba", exact=True).wait_for()
                    assert page.request.get("http://127.0.0.1:3320/api/incidentes/" + INCIDENT).json()["estado"] == "atendido"
                    checks.append("Selección, despacho, llegada, liberación y finalización pasan por la aplicación; cerrar con recursos asignados devuelve 409")
                    page.goto("http://127.0.0.1:3320/seguimiento/" + INCIDENT, wait_until="networkidle")
                    page.get_by_role("heading", name="Estado de tu reporte", exact=True).wait_for()
                    for width in (1440, 320):
                        page.set_viewport_size({"width": width, "height": 1000})
                        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 2")
                        page.screenshot(path=str(output / f"seguimiento-{width}.png"), full_page=True)
                    assert "Ubicación de prueba" not in page.locator("body").inner_text()
                    checks.append("Seguimiento de un reporte real del flujo de prueba carga en escritorio y celular sin exponer su ubicación exacta")
                    page.route("**/api/incidentes/" + INCIDENT, lambda route: route.fulfill(status=503, content_type="application/json", body='{"error":"Fallo de prueba"}'))
                    page.reload(wait_until="networkidle")
                    page.get_by_role("heading", name="No se pudo cargar el seguimiento", exact=True).wait_for()
                    assert page.get_by_role("button", name="Reintentar", exact=True).is_visible()
                    checks.append("El seguimiento distingue un fallo de conexión y ofrece reintentar")
                    assert not errors, errors
                except Exception:
                    page.screenshot(path=str(output / "failure.png"), full_page=True)
                    print(page.locator("body").inner_text()[-3000:])
                    raise
                finally:
                    browser.close()
        finally:
            server.terminate()
            server.wait(timeout=10)
            fixture.terminate()
            fixture.wait(timeout=10)
            fixture_log.close()
            (output / "result.json").write_text(json.dumps({"checks": checks, "errors": errors, "transport": "isolated local PostgreSQL + Better Auth"}, indent=2, ensure_ascii=False), encoding="utf-8")
    assert "INTERNAL_SERVER_ERROR" not in (output / "server.log").read_text(encoding="utf-8"), "Error interno en el servidor de pruebas"
    print(json.dumps({"checks": checks, "errors": errors}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
