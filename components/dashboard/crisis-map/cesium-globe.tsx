"use client"

import { useEffect, useRef, useState } from "react"
import type { Incident } from "@/lib/types"
import { severityHex } from "@/components/dashboard/crisis-map/incident-helpers"
import { createZntinelViewer, type CesiumModule, type ZntinelViewer } from "@/lib/map/create-cesium-viewer"
import { incidentBillboardCanvas, pulseRadiusMeters } from "@/lib/map/cesium-markers"
import { TUCUMAN_CENTER } from "@/lib/map/tucuman"

interface CesiumGlobeProps {
  incidents: Incident[]
  selectedId: string | null
  onSelect: (incident: Incident) => void
  onInitError?: () => void
}

export function CesiumGlobe({ incidents, selectedId, onSelect, onInitError }: CesiumGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<ZntinelViewer | null>(null)
  const cesiumRef = useRef<CesiumModule | null>(null)
  const onSelectRef = useRef(onSelect)
  const incidentsRef = useRef(incidents)
  const [ready, setReady] = useState(false)

  onSelectRef.current = onSelect
  incidentsRef.current = incidents

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let cancelled = false
    let handler: import("cesium").ScreenSpaceEventHandler | undefined
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "/cesium/Widgets/widgets.css"
    document.head.appendChild(link)

    createZntinelViewer(el)
      .then(({ viewer, Cesium }) => {
        if (cancelled) {
          viewer.destroy()
          return
        }
        viewerRef.current = viewer
        cesiumRef.current = Cesium

        handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
        handler.setInputAction((click: { position: import("cesium").Cartesian2 }) => {
          const picked = viewer.scene.pick(click.position)
          if (!Cesium.defined(picked) || !picked.id) return
          const id = String(picked.id.id)
          const incident = incidentsRef.current.find((item) => item.id === id)
          if (incident) onSelectRef.current(incident)
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

        setReady(true)
      })
      .catch((err) => {
        console.error("[CesiumGlobe] init failed", err)
        onInitError?.()
      })

    return () => {
      cancelled = true
      setReady(false)
      handler?.destroy()
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy()
      }
      viewerRef.current = null
      cesiumRef.current = null
      if (link.parentNode) link.parentNode.removeChild(link)
    }
  }, [onInitError])

  useEffect(() => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!ready || !viewer || !Cesium) return

    const incoming = new Set(incidents.map((item) => item.id))
    const toRemove: string[] = []
    for (const entity of viewer.entities.values) {
      if (!incoming.has(String(entity.id))) toRemove.push(String(entity.id))
    }
    for (const id of toRemove) viewer.entities.removeById(id)

    for (const incident of incidents) {
      const color = Cesium.Color.fromCssColorString(severityHex(incident.severity))
      const position = Cesium.Cartesian3.fromDegrees(
        incident.coordinates.lng,
        incident.coordinates.lat,
        40,
      )
      const existing = viewer.entities.getById(incident.id)
      if (existing) {
        existing.position = new Cesium.ConstantPositionProperty(position)
        continue
      }

      const radius = pulseRadiusMeters(incident.severity)
      viewer.entities.add({
        id: incident.id,
        name: incident.location,
        position,
        billboard: {
          image: incidentBillboardCanvas(incident),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scale: 0.85,
        },
        ellipse: {
          semiMajorAxis: radius,
          semiMinorAxis: radius,
          material: color.withAlpha(0.22),
          outline: true,
          outlineColor: color.withAlpha(0.7),
          height: 0,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        label: {
          text: incident.location.split(" - ")[0] ?? incident.location,
          font: "11px sans-serif",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, 8),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString("#0a0c10").withAlpha(0.72),
          scaleByDistance: new Cesium.NearFarScalar(500, 1, 40_000, 0.35),
        },
      })
    }

    viewer.scene.requestRender()
  }, [incidents, ready])

  useEffect(() => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!ready || !viewer || !Cesium || !selectedId) return
    const incident = incidentsRef.current.find((item) => item.id === selectedId)
    if (!incident) return

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        incident.coordinates.lng,
        incident.coordinates.lat,
        TUCUMAN_CENTER.focusHeightM,
      ),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      },
      duration: 1.35,
    })
  }, [selectedId, ready])

  return (
    <div className="relative h-full w-full bg-[#0a0c10]">
      <div ref={containerRef} className="h-full w-full" />
      {!ready && (
        <div className="absolute inset-0 z-[1] flex items-center justify-center bg-[#0a0c10]/80">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading 3D globe...</p>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2 left-2 z-10 rounded border border-border bg-card/90 px-2 py-1 text-[9px] text-muted-foreground">
        Powered by Esri — Esri, Maxar, Earthstar Geographics
      </div>
    </div>
  )
}
