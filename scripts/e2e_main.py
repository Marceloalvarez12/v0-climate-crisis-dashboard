"""Prueba de navegador del proyecto principal sin credenciales externas.

Solo usa HTTP local. No crea reportes, usuarios ni despachos en una base real.
El envío del formulario se intercepta exclusivamente para comprobar su UI.
"""

import argparse
import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--browser-executable")
    parser.add_argument("--output", default="test-results/main")
    args = parser.parse_args()
    base = args.base_url.rstrip("/")
    if urlparse(base).hostname not in ("localhost", "127.0.0.1"):
        raise SystemExit("Solo se admiten pruebas contra un servidor local")
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    checks, errors = [], []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=args.browser_executable)
        context = browser.new_context(viewport={"width": 1440, "height": 1000})
        request = context.request
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))

        def api(path, method="GET", data=None, expected=200):
            response = request.fetch(base + path, method=method, data=data, timeout=45000)
            assert response.status == expected, f"{method} {path}: {response.status} {response.text()[:200]}"
            return response.json()

        try:
            for route in ("/login", "/recuperar", "/restablecer", "/mapa", "/reportar", "/auditoria", "/stellar-auditoria"):
                response = page.goto(base + route, wait_until="networkidle", timeout=45000)
                assert response.status == 200
                assert page.locator("body").inner_text().strip()
                assert "Entorno de demostración" not in page.locator("body").inner_text()
                page.screenshot(path=str(output / (route.strip("/") + ".png")), full_page=True)
                checks.append(f"Pantalla pública {route} carga sin excepción JavaScript")

            for route in ("/", "/admin", "/admin?section=users"):
                page.goto(base + route, wait_until="networkidle")
                assert urlparse(page.url).path == "/login", page.url
            checks.append("Dashboard y administración redirigen al login sin sesión")
            for route, method in (("/api/recursos", "GET"), ("/api/incidentes", "PATCH"), ("/api/operaciones", "GET"), ("/api/agent-logs", "GET"), ("/api/simulacion", "POST")):
                response = request.fetch(base + route, method=method, data={}, timeout=20000)
                assert response.status in (401, 503), f"Ruta privada accesible: {route}, {response.status}"
            checks.append("APIs operativas y antiguos controles de simulación no permiten acceso anónimo")

            for route in ("/mapa", "/reportar", "/auditoria", "/stellar-auditoria"):
                page.set_viewport_size({"width": 320, "height": 844})
                page.goto(base + route, wait_until="networkidle")
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 2"), f"Desborde horizontal: {route}"
            page.screenshot(path=str(output / "zk-mobile-320.png"), full_page=True)
            checks.append("Páginas ciudadanas sin desborde horizontal a 320 px")

            page.set_viewport_size({"width": 1280, "height": 1000})
            page.route("https://nominatim.openstreetmap.org/**", lambda route: route.abort())
            submitted = []

            def intercept_report(route):
                submitted.append(route.request.post_data_json)
                route.fulfill(status=503, content_type="application/json", body=json.dumps({"error": "No se pudo guardar el reporte de prueba"}))

            page.route("**/api/incidentes/zk-report", intercept_report)
            page.goto(base + "/reportar", wait_until="networkidle")
            page.locator("#ubicacion").fill("Punto manual de prueba")
            page.locator(".leaflet-container").click(position={"x": 180, "y": 140})
            page.get_by_text("ubicación marcada manualmente", exact=True).wait_for()
            page.locator("#tipo").click()
            page.get_by_role("option", name="Incendio", exact=True).click()
            page.get_by_role("button", name="Enviar reporte", exact=True).click()
            page.get_by_text("No se pudo guardar el reporte de prueba", exact=True).wait_for()
            assert submitted and -27 <= submitted[0]["lat"] <= -26.5
            assert -65.5 <= submitted[0]["lng"] <= -65
            checks.append("Pin manual funciona con geocodificador caído y el formulario informa el fallo de persistencia (transporte interceptado)")

            proof = api("/api/incidentes/zk-verify", "POST", {"lat": -26.8241, "lng": -65.2226})
            assert proof["valid"] is True
            verified = api("/api/stellar/verify", "POST", proof["contractArgs"])
            assert verified["valid"] is True and verified["isSimulated"] is True
            checks.append("Prueba Groth16 real generada y verificada localmente, sin declarar transacción")
            page.goto(base + "/stellar-auditoria", wait_until="networkidle")
            page.get_by_role("button", name="Generar ejemplo", exact=True).click()
            page.wait_for_function("document.querySelector('#proofA').value.length > 100")
            page.get_by_role("button", name="Verificar prueba", exact=True).click()
            page.get_by_role("heading", name="Prueba válida", exact=True).wait_for()
            checks.append("Botones Generar ejemplo y Verificar prueba completan el flujo ZK en pantalla")
            page.goto(base + "/auditoria", wait_until="networkidle")
            page.get_by_label("Clave de entidad Arkiv", exact=True).fill("invalid-key")
            page.get_by_role("button", name="Buscar registro", exact=True).click()
            assert page.get_by_role("heading", name="Verificar un registro en Arkiv", exact=True).is_visible()
            assert not page.get_by_text("Entidad confirmada", exact=True).count()
            checks.append("El formulario Arkiv rechaza una clave inválida sin mostrar una confirmación")
            api("/api/incidentes/arkiv-verify/not-a-key", expected=400)
            api("/api/incidentes/zk-report", "POST", {}, expected=400)
            api("/api/incidentes", "POST", {"large": "x" * (256 * 1024 + 1)}, expected=413)
            checks.append("Entradas inválidas y cuerpo excesivo se rechazan")
            assert not errors, "Errores JavaScript: " + "; ".join(errors)
        finally:
            (output / "result.json").write_text(json.dumps({"checks": checks, "browser_errors": errors, "live_integrations_verified": False}, indent=2, ensure_ascii=False), encoding="utf-8")
            browser.close()

    for check in checks:
        print("OK:", check)
    print(f"{len(checks)} comprobaciones correctas; resultados: {output}")


if __name__ == "__main__":
    main()
