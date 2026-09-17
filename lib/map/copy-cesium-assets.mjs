/**
 * Copia Workers / Assets / Widgets / ThirdParty de Cesium a public/cesium
 * para que CESIUM_BASE_URL='/cesium/' funcione con Turbopack (Next 16).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const src = path.join(root, "node_modules", "cesium", "Build", "Cesium")
const dest = path.join(root, "public", "cesium")

const DIRS = ["Workers", "ThirdParty", "Assets", "Widgets"]

if (!fs.existsSync(src)) {
  console.warn("[copy-cesium] skip — node_modules/cesium/Build/Cesium no existe")
  process.exit(0)
}

fs.mkdirSync(dest, { recursive: true })

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true })
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name)
    const d = path.join(to, entry.name)
    if (entry.isDirectory()) copyDir(s, d)
    else fs.copyFileSync(s, d)
  }
}

for (const dir of DIRS) {
  const from = path.join(src, dir)
  if (!fs.existsSync(from)) {
    console.warn(`[copy-cesium] missing ${dir}`)
    continue
  }
  copyDir(from, path.join(dest, dir))
}

const css = path.join(src, "Widgets", "widgets.css")
if (fs.existsSync(css)) {
  fs.copyFileSync(css, path.join(dest, "Widgets", "widgets.css"))
}

console.log("[copy-cesium] public/cesium listo")
