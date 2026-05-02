"use client"

import { Brain, Rocket, Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { ActivityItem } from "./types"

// ---------------------------------------------------------------------------
// Botones de acción sobre una alerta (Desplegar / Notificar / Descartar)
// ---------------------------------------------------------------------------

interface AlertActionsProps {
  activity:   ActivityItem
  onDeploy:   (activity: ActivityItem) => void
  onNotify:   (activity: ActivityItem) => void
  onDismiss:  (id: string) => void
}

export function AlertActions({ activity, onDeploy, onNotify, onDismiss }: AlertActionsProps) {
  return (
    <div className="flex items-center gap-1.5 mt-2">
      <Button
        size="sm"
        variant="default"
        className="h-6 text-[10px] px-2 gap-1"
        onClick={() => onDeploy(activity)}
      >
        <Rocket className="h-3 w-3" />
        Desplegar
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-6 text-[10px] px-2 gap-1"
        onClick={() => onNotify(activity)}
      >
        <Bell className="h-3 w-3" />
        Notificar
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 ml-auto"
        onClick={() => onDismiss(activity.id)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dialog de confirmación para desplegar / notificar
// ---------------------------------------------------------------------------

interface ConfirmDialogState {
  open:     boolean
  type:     "deploy" | "notify"
  activity: ActivityItem | null
}

interface ConfirmActionDialogProps {
  state:      ConfirmDialogState
  onChange:   (open: boolean) => void
  onConfirm:  () => void
}

export function ConfirmActionDialog({ state, onChange, onConfirm }: ConfirmActionDialogProps) {
  return (
    <AlertDialog open={state.open} onOpenChange={onChange}>
      <AlertDialogContent className="z-[9999]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {state.type === "deploy" ? (
              <>
                <Rocket className="h-5 w-5 text-primary" />
                Confirmar Despliegue de Recursos
              </>
            ) : (
              <>
                <Bell className="h-5 w-5 text-accent" />
                Confirmar Notificación a Autoridades
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {state.type === "deploy" ? (
                <>
                  <p>Está a punto de desplegar unidades de emergencia a:</p>
                  <p className="font-semibold text-foreground">{state.activity?.location}</p>
                </>
              ) : (
                <>
                  <p>Notificar a las siguientes autoridades:</p>
                  <ul className="text-sm space-y-1">
                    <li>- Defensa Civil de Tucumán</li>
                    <li>- Cuerpo de Bomberos</li>
                    <li>- Policía de Tucumán</li>
                  </ul>
                  <p className="font-semibold text-foreground">Ubicación: {state.activity?.location}</p>
                </>
              )}

              {state.activity?.confidence && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Brain className="h-3 w-3" />
                      Nivel de Confianza IA
                    </span>
                    <span className="text-sm font-bold text-purple-400">{state.activity.confidence}%</span>
                  </div>
                  <Progress value={state.activity.confidence} className="h-2" />
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {state.type === "deploy" ? "Confirmar Despliegue" : "Confirmar Notificación"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
